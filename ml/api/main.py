import logging
import os
import pickle
import secrets
import threading
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeoutError
from contextlib import asynccontextmanager
from pathlib import Path
from time import perf_counter
from typing import Any

import numpy as np
import pandas as pd
from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sklearn.model_selection import train_test_split

from .counterfactual import CounterfactualError, CounterfactualGenerator
from .explain import (
    FEATURE_NAMES,
    create_shap_explainer,
    explain_top_prediction_features,
    feature_contribution_sentence,
    mean_absolute_shap_importance,
)


logging.basicConfig(
    level=os.environ.get("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger("crop_api")

BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = BASE_DIR / "ml-file" / "crop_recommendation_best_model.pkl"
DATASET_PATH = BASE_DIR / "datasets" / "Crop_recommendation.csv"
ECONOMICS_PATH = BASE_DIR / "datasets" / "econmic.csv"

SHAP_BACKGROUND_SIZE = 100
SHAP_BACKGROUND_RANDOM_STATE = 42
COUNTERFACTUAL_TIMEOUT_SECONDS = int(os.environ.get("COUNTERFACTUAL_TIMEOUT_SECONDS", "20"))
# Optional shared secret. When set, every endpoint except /health requires the
# header "X-API-Key". The Express backend sends it from its ML_API_KEY setting.
ML_API_KEY = os.environ.get("ML_API_KEY", "")

SOIL_FEATURES = ("N", "P", "K", "ph")
ECONOMICS_COLUMNS = {
    "crop",
    "yield_kg_per_ha",
    "price_rs_per_quintal",
    "cost_rs_per_quintal",
}

# Advice shown when a soil value is outside the crop's typical range.
SOIL_SUGGESTIONS = {
    ("N", "Low"): "Add nitrogen: urea or ammonium sulphate, compost/FYM, or rotate with a legume crop.",
    ("N", "High"): "Reduce nitrogen fertilizer; excess N can cause lush weak growth and leaching.",
    ("P", "Low"): "Add phosphorus: SSP or DAP, bone meal, or well-rotted compost.",
    ("P", "High"): "Skip phosphorus fertilizer this season; excess P can lock up zinc and iron.",
    ("K", "Low"): "Add potassium: muriate of potash (MOP), sulphate of potash, or wood ash.",
    ("K", "High"): "Skip potassium fertilizer this season; excess K can limit magnesium and calcium uptake.",
    ("ph", "Low"): "Soil is too acidic for this crop: apply agricultural lime or dolomite to raise pH.",
    ("ph", "High"): "Soil is too alkaline for this crop: use elemental sulphur, gypsum or organic matter to lower pH.",
}


# --------------------------------------------------------------------------- #
# Request / response models
# --------------------------------------------------------------------------- #
class CropPredictionRequest(BaseModel):
    nitrogen: float = Field(alias="N", ge=0, le=140)
    phosphorus: float = Field(alias="P", ge=5, le=145)
    potassium: float = Field(alias="K", ge=5, le=205)
    temperature: float = Field(ge=8.8, le=43.7)
    humidity: float = Field(ge=14.2, le=100)
    ph: float = Field(ge=3.5, le=9.94)
    rainfall: float = Field(ge=20.2, le=298.6)

    model_config = {"populate_by_name": True}

    def as_feature_values(self) -> dict[str, float]:
        return {
            "N": self.nitrogen,
            "P": self.phosphorus,
            "K": self.potassium,
            "temperature": self.temperature,
            "humidity": self.humidity,
            "ph": self.ph,
            "rainfall": self.rainfall,
        }


class SoilAnalysisRequest(BaseModel):
    crop: str = Field(min_length=1)
    nitrogen: float = Field(alias="N", ge=0, le=140)
    phosphorus: float = Field(alias="P", ge=5, le=145)
    potassium: float = Field(alias="K", ge=5, le=205)
    ph: float = Field(ge=3.5, le=9.94)

    model_config = {"populate_by_name": True}


class SoilAnalysisItem(BaseModel):
    status: str
    value: float
    range_low: float
    range_high: float
    # Signed amount to ADD to reach the typical range: positive = raise,
    # negative = lower, 0 = already within range.
    change_needed: float
    suggestion: str


class SoilAnalysisResponse(BaseModel):
    crop: str
    analysis: dict[str, SoilAnalysisItem]


class EconomicsRequest(BaseModel):
    crops: list[str] = Field(min_length=1)


class CropEconomics(BaseModel):
    crop: str
    revenue_rs_per_ha: float
    cost_rs_per_ha: float
    profit_rs_per_ha: float
    roi_percent: float


class EconomicsResponse(BaseModel):
    results: list[CropEconomics]


class CropProbability(BaseModel):
    crop: str
    probability: float


class CropPrediction(BaseModel):
    predictions: list[CropProbability]


class RecommendationCrop(BaseModel):
    crop: str
    probability: float
    soil_analysis: dict[str, SoilAnalysisItem]
    economics: CropEconomics


class FeatureExplanation(BaseModel):
    feature: str
    contribution: float
    direction: str
    rank: int
    sentence: str


class ExplainResponse(BaseModel):
    crop: str
    probability: float
    base_value: float
    features: list[FeatureExplanation]


class RecommendationResponse(BaseModel):
    recommendations: list[RecommendationCrop]
    explanation: ExplainResponse


class FeatureImportanceItem(BaseModel):
    feature: str
    mean_absolute_shap: float


class FeatureImportanceResponse(BaseModel):
    features: list[FeatureImportanceItem]


class CounterfactualRequest(CropPredictionRequest):
    target_crop: str = Field(min_length=1)


class CounterfactualChange(BaseModel):
    feature: str
    original: float
    counterfactual: float
    change: float


class CounterfactualResponse(BaseModel):
    current_crop: str
    target_crop: str
    changes: list[CounterfactualChange]


# --------------------------------------------------------------------------- #
# Application state (loaded once at start-up)
# --------------------------------------------------------------------------- #
class MlState:
    def __init__(self) -> None:
        self.bundle: dict[str, Any] | None = None
        self.background: pd.DataFrame | None = None
        self.explainer: Any = None
        self.importance: dict[str, float] | None = None
        self.counterfactual: CounterfactualGenerator | None = None
        self.economics: pd.DataFrame | None = None
        self.error: str | None = "Service is starting"
        # SHAP explainers are not guaranteed to be thread-safe; serialise access.
        self.shap_lock = threading.Lock()


STATE = MlState()
_COUNTERFACTUAL_EXECUTOR = ThreadPoolExecutor(max_workers=2)


def load_model() -> dict[str, Any]:
    if not MODEL_PATH.is_file():
        raise FileNotFoundError(f"Model file not found: {MODEL_PATH}")

    # SECURITY: pickle can execute code on load. Only load model files you created.
    with MODEL_PATH.open("rb") as model_file:
        bundle = pickle.load(model_file)

    required_keys = {"model", "label_encoder", "feature_names", "crop_profile"}
    if not isinstance(bundle, dict) or not required_keys <= bundle.keys():
        raise ValueError("Model file does not contain the expected model bundle")
    if list(bundle["feature_names"]) != list(FEATURE_NAMES):
        raise ValueError(
            f"Model feature order {list(bundle['feature_names'])} does not match {list(FEATURE_NAMES)}"
        )

    return bundle


def load_shap_background(feature_names: list[str]) -> pd.DataFrame:
    if not DATASET_PATH.is_file():
        raise FileNotFoundError(f"SHAP background dataset not found: {DATASET_PATH}")

    dataset = pd.read_csv(DATASET_PATH)
    label_column = "label"
    required_columns = set(feature_names) | {label_column}
    if not required_columns <= set(dataset.columns):
        missing_columns = sorted(required_columns - set(dataset.columns))
        raise ValueError(f"SHAP background dataset is missing columns: {missing_columns}")
    if len(dataset) < SHAP_BACKGROUND_SIZE:
        raise ValueError(
            f"SHAP background dataset must contain at least {SHAP_BACKGROUND_SIZE} rows"
        )

    background, _ = train_test_split(
        dataset,
        train_size=SHAP_BACKGROUND_SIZE,
        stratify=dataset[label_column],
        random_state=SHAP_BACKGROUND_RANDOM_STATE,
    )
    return background[feature_names].reset_index(drop=True)


def load_economics() -> pd.DataFrame:
    if not ECONOMICS_PATH.is_file():
        raise FileNotFoundError(f"Economics data file not found: {ECONOMICS_PATH}")

    economics = pd.read_csv(ECONOMICS_PATH)
    economics.columns = economics.columns.str.strip().str.lower()
    if not ECONOMICS_COLUMNS <= set(economics.columns):
        raise ValueError("Economics data file is missing required columns")
    economics["crop"] = economics["crop"].astype(str).str.strip().str.lower()
    return economics.set_index("crop")


def initialise_state() -> None:
    """Load everything. Any failure leaves the service up but unhealthy (503)."""
    try:
        bundle = load_model()
        feature_names = list(bundle["feature_names"])
        background = load_shap_background(feature_names)
        explainer = create_shap_explainer(bundle["model"], background)
        importance = mean_absolute_shap_importance(bundle["model"], background, explainer)
        counterfactual = CounterfactualGenerator(bundle["model"], background)
        economics = load_economics()
    except Exception as error:  # noqa: BLE001 - any start-up failure must become a 503
        logger.exception("Unable to initialise the ML service")
        STATE.error = f"{type(error).__name__}: {error}"
        return

    STATE.bundle = bundle
    STATE.background = background
    STATE.explainer = explainer
    STATE.importance = importance
    STATE.counterfactual = counterfactual
    STATE.economics = economics
    STATE.error = None
    logger.info("ML service ready (model: %s)", bundle.get("model_name", "unknown"))


@asynccontextmanager
async def lifespan(_app: FastAPI):
    initialise_state()
    yield


app = FastAPI(title="Crop Recommendation API", version="1.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("FRONTEND_ORIGIN", "http://localhost:5173")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next: Any) -> Any:
    started_at = perf_counter()
    response = await call_next(request)
    duration_ms = (perf_counter() - started_at) * 1000
    logger.info(
        "%s %s -> %s in %.1fms",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    return response


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request,
    exception: RequestValidationError,
) -> JSONResponse:
    # jsonable_encoder: Pydantic error "ctx" can hold non-serialisable objects.
    errors = jsonable_encoder(exception.errors())
    logger.warning("Validation error for %s %s: %s", request.method, request.url.path, errors)
    return JSONResponse(status_code=422, content={"detail": errors})


@app.exception_handler(HTTPException)
async def http_exception_handler(
    request: Request,
    exception: HTTPException,
) -> JSONResponse:
    logger.warning(
        "HTTP error for %s %s: %s", request.method, request.url.path, exception.detail
    )
    return JSONResponse(status_code=exception.status_code, content={"detail": exception.detail})


@app.exception_handler(Exception)
async def unhandled_exception_handler(
    request: Request,
    exception: Exception,
) -> JSONResponse:
    logger.error(
        "Unhandled application error for %s %s",
        request.method,
        request.url.path,
        exc_info=exception,
    )
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


# --------------------------------------------------------------------------- #
# Dependencies and helpers
# --------------------------------------------------------------------------- #
def verify_api_key(x_api_key: str | None = Header(default=None)) -> None:
    if not ML_API_KEY:
        return
    if not x_api_key or not secrets.compare_digest(x_api_key, ML_API_KEY):
        raise HTTPException(status_code=401, detail="Invalid or missing API key")


PROTECTED = [Depends(verify_api_key)]


def require_ready() -> MlState:
    if STATE.error is not None or STATE.bundle is None:
        raise HTTPException(status_code=503, detail=STATE.error or "Service unavailable")
    return STATE


def build_feature_frame(values: dict[str, float], feature_names: list[str]) -> pd.DataFrame:
    features = pd.DataFrame([[values[name] for name in feature_names]], columns=feature_names)
    if not np.isfinite(features.to_numpy()).all():
        raise HTTPException(status_code=422, detail="All feature values must be finite")
    return features


def rank_predictions(state: MlState, features: pd.DataFrame) -> list[CropProbability]:
    model = state.bundle["model"]
    label_encoder = state.bundle["label_encoder"]
    probabilities = model.predict_proba(features)[0]
    labels = label_encoder.inverse_transform(np.asarray(model.classes_, dtype=int))
    ranked = sorted(
        (
            CropProbability(crop=str(label), probability=round(float(probability), 6))
            for label, probability in zip(labels, probabilities)
        ),
        key=lambda item: item.probability,
        reverse=True,
    )
    return ranked[:5]


def compute_soil_analysis(
    state: MlState,
    crop: str,
    values: dict[str, float],
) -> dict[str, SoilAnalysisItem]:
    crop_profile = state.bundle["crop_profile"]
    if crop not in crop_profile:
        raise HTTPException(status_code=404, detail=f"Unknown crop: {crop}")

    profile = crop_profile[crop]
    analysis: dict[str, SoilAnalysisItem] = {}
    for feature in SOIL_FEATURES:
        value = float(values[feature])
        low = float(profile.loc["low", feature])
        high = float(profile.loc["high", feature])
        range_label = f"{round(low, 2)} – {round(high, 2)}"
        if value < low:
            status, change_needed = "Low", round(low - value, 2)
            note = f"Below the typical dataset range ({range_label})."
        elif value > high:
            status, change_needed = "High", round(high - value, 2)  # negative: lower it
            note = f"Above the typical dataset range ({range_label})."
        else:
            status, change_needed = "Optimal", 0.0
            note = f"Within the typical dataset range ({range_label})."

        advice = SOIL_SUGGESTIONS.get((feature, status))
        analysis[feature] = SoilAnalysisItem(
            status=status,
            value=round(value, 2),
            range_low=round(low, 2),
            range_high=round(high, 2),
            change_needed=change_needed,
            suggestion=f"{note} {advice}" if advice else note,
        )
    return analysis


def compute_economics(state: MlState, crops: list[str]) -> list[CropEconomics]:
    rows = state.economics
    missing = [crop for crop in crops if crop.strip().lower() not in rows.index]
    if missing:
        raise HTTPException(status_code=404, detail=f"Unknown crop(s): {', '.join(missing)}")

    results = []
    for crop in crops:
        row = rows.loc[crop.strip().lower()]
        quintals = float(row["yield_kg_per_ha"]) / 100
        revenue = quintals * float(row["price_rs_per_quintal"])
        cost = quintals * float(row["cost_rs_per_quintal"])
        profit = revenue - cost
        roi = profit / cost * 100 if cost else 0.0
        results.append(
            CropEconomics(
                crop=crop,
                revenue_rs_per_ha=round(revenue, 2),
                cost_rs_per_ha=round(cost, 2),
                profit_rs_per_ha=round(profit, 2),
                roi_percent=round(roi, 2),
            )
        )
    return results


def compute_explanation(state: MlState, features: pd.DataFrame) -> ExplainResponse:
    model = state.bundle["model"]
    label_encoder = state.bundle["label_encoder"]
    try:
        with state.shap_lock:
            explanation = explain_top_prediction_features(
                model=model,
                sample=features,
                background_data=state.background,
                class_labels=label_encoder.inverse_transform(np.asarray(model.classes_, dtype=int)),
                explainer=state.explainer,
            )
    except (TypeError, ValueError, RuntimeError) as error:
        logger.exception("Unable to calculate SHAP explanation")
        raise HTTPException(status_code=500, detail="Unable to calculate SHAP explanation") from error

    ranked = sorted(explanation["values"].items(), key=lambda item: abs(item[1]), reverse=True)
    return ExplainResponse(
        crop=explanation["crop"],
        probability=float(explanation["probability"]),
        base_value=float(explanation["base_value"]),
        features=[
            FeatureExplanation(
                feature=feature,
                contribution=float(contribution),
                direction="supports" if contribution >= 0 else "opposes",
                rank=rank,
                sentence=feature_contribution_sentence(
                    feature=feature,
                    value=float(features.iloc[0][feature]),
                    contribution=float(contribution),
                    crop=explanation["crop"],
                    background_data=state.background,
                ),
            )
            for rank, (feature, contribution) in enumerate(ranked, start=1)
        ],
    )


# --------------------------------------------------------------------------- #
# Endpoints
# --------------------------------------------------------------------------- #
@app.get("/health")
def health() -> dict[str, str]:
    state = require_ready()
    return {"status": "ok", "model": str(state.bundle.get("model_name", "unknown"))}


@app.get("/feature-importance", response_model=FeatureImportanceResponse, dependencies=PROTECTED)
def feature_importance() -> FeatureImportanceResponse:
    state = require_ready()
    ranked = sorted(state.importance.items(), key=lambda item: item[1], reverse=True)
    return FeatureImportanceResponse(
        features=[
            FeatureImportanceItem(feature=feature, mean_absolute_shap=importance)
            for feature, importance in ranked
        ],
    )


@app.post("/counterfactual", response_model=CounterfactualResponse, dependencies=PROTECTED)
def counterfactual_prediction(request: CounterfactualRequest) -> CounterfactualResponse:
    state = require_ready()
    label_encoder = state.bundle["label_encoder"]
    try:
        target_class = int(label_encoder.transform([request.target_crop])[0])
    except ValueError as error:
        raise HTTPException(
            status_code=422, detail=f"Unknown target crop: {request.target_crop}"
        ) from error

    feature_names = list(state.bundle["feature_names"])
    query = build_feature_frame(request.as_feature_values(), feature_names)
    current_class = int(state.bundle["model"].predict(query)[0])
    current_crop = str(label_encoder.inverse_transform([current_class])[0])

    future = _COUNTERFACTUAL_EXECUTOR.submit(state.counterfactual.generate, query, target_class)
    try:
        generated_frame = future.result(timeout=COUNTERFACTUAL_TIMEOUT_SECONDS)
    except FutureTimeoutError as error:
        # A running thread cannot be killed; cancel() only helps if it has not started.
        future.cancel()
        raise HTTPException(status_code=504, detail="Counterfactual generation timed out") from error
    except CounterfactualError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except Exception as error:  # noqa: BLE001
        logger.exception("Counterfactual generation failed")
        raise HTTPException(status_code=500, detail="Unable to generate counterfactual") from error

    original = query.iloc[0]
    generated = generated_frame.iloc[0]
    return CounterfactualResponse(
        current_crop=current_crop,
        target_crop=request.target_crop,
        changes=[
            CounterfactualChange(
                feature=feature,
                original=float(original[feature]),
                counterfactual=round(float(generated[feature]), 4),
                change=round(float(generated[feature] - original[feature]), 4),
            )
            for feature in feature_names
        ],
    )


@app.post("/soil-analysis", response_model=SoilAnalysisResponse, dependencies=PROTECTED)
def analyze_soil(request: SoilAnalysisRequest) -> SoilAnalysisResponse:
    state = require_ready()
    values = {
        "N": request.nitrogen,
        "P": request.phosphorus,
        "K": request.potassium,
        "ph": request.ph,
    }
    if not np.isfinite(list(values.values())).all():
        raise HTTPException(status_code=422, detail="All feature values must be finite")
    return SoilAnalysisResponse(
        crop=request.crop,
        analysis=compute_soil_analysis(state, request.crop, values),
    )


@app.post("/economics", response_model=EconomicsResponse, dependencies=PROTECTED)
def calculate_economics(request: EconomicsRequest) -> EconomicsResponse:
    state = require_ready()
    return EconomicsResponse(results=compute_economics(state, request.crops))


@app.post("/predict", response_model=CropPrediction, dependencies=PROTECTED)
def predict_crop(request: CropPredictionRequest) -> CropPrediction:
    state = require_ready()
    features = build_feature_frame(request.as_feature_values(), list(state.bundle["feature_names"]))
    return CropPrediction(predictions=rank_predictions(state, features))


@app.post("/explain", response_model=ExplainResponse, dependencies=PROTECTED)
def explain_prediction(request: CropPredictionRequest) -> ExplainResponse:
    state = require_ready()
    features = build_feature_frame(request.as_feature_values(), list(state.bundle["feature_names"]))
    return compute_explanation(state, features)


@app.post("/recommend", response_model=RecommendationResponse, dependencies=PROTECTED)
def recommend_crops(request: CropPredictionRequest) -> RecommendationResponse:
    state = require_ready()
    values = request.as_feature_values()
    features = build_feature_frame(values, list(state.bundle["feature_names"]))

    # Each piece is computed exactly once and shared.
    predictions = rank_predictions(state, features)
    economics = {
        item.crop: item for item in compute_economics(state, [p.crop for p in predictions])
    }
    recommendations = [
        RecommendationCrop(
            crop=prediction.crop,
            probability=prediction.probability,
            soil_analysis=compute_soil_analysis(state, prediction.crop, values),
            economics=economics[prediction.crop],
        )
        for prediction in predictions
    ]
    return RecommendationResponse(
        recommendations=recommendations,
        explanation=compute_explanation(state, features),
    )
