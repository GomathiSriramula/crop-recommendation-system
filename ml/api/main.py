from pathlib import Path
import pickle
import logging
from time import perf_counter
from typing import Any

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sklearn.model_selection import train_test_split
from pydantic import BaseModel, Field
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeoutError

from .counterfactual import generate_counterfactual
from .explain import (
    explain_top_prediction_features,
    feature_contribution_sentence,
    mean_absolute_shap_importance,
)


logger = logging.getLogger(__name__)


MODEL_PATH = (
    Path(__file__).resolve().parent.parent
    / "ml-file"
    / "crop_recommendation_best_model.pkl"
)
DATASET_PATH = (
    Path(__file__).resolve().parent.parent
    / "datasets"
    / "Crop_recommendation.csv"
)
ECONOMICS_PATH = (
    Path(__file__).resolve().parent.parent
    / "datasets"
    / "econmic.csv"
)
SHAP_BACKGROUND_SIZE = 100
SHAP_BACKGROUND_RANDOM_STATE = 42


class CropPredictionRequest(BaseModel):
    nitrogen: float = Field(alias="N", ge=0, le=140)
    phosphorus: float = Field(alias="P", ge=5, le=145)
    potassium: float = Field(alias="K", ge=5, le=205)
    temperature: float = Field(ge=8.8, le=43.7)
    humidity: float = Field(ge=14.2, le=100)
    ph: float = Field(ge=3.5, le=9.94)
    rainfall: float = Field(ge=20.2, le=298.6)

    model_config = {"populate_by_name": True}


class SoilAnalysisRequest(BaseModel):
    crop: str = Field(min_length=1)
    nitrogen: float = Field(alias="N", ge=0, le=140)
    phosphorus: float = Field(alias="P", ge=5, le=145)
    potassium: float = Field(alias="K", ge=5, le=205)
    ph: float = Field(ge=3.5, le=9.94)

    model_config = {"populate_by_name": True}


class SoilAnalysisItem(BaseModel):
    status: str
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
    target_crop: str
    changes: list[CounterfactualChange]


COUNTERFACTUAL_TIMEOUT_SECONDS = 10


app = FastAPI(title="Crop Recommendation API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next: Any) -> Any:
    started_at = perf_counter()
    try:
        response = await call_next(request)
    except Exception:
        logger.exception("Unhandled error while processing %s %s", request.method, request.url.path)
        raise
    duration_ms = (perf_counter() - started_at) * 1000
    logger.info(
        "%s %s completed with %s in %.2fms",
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
    logger.warning(
        "Validation error for %s %s: %s",
        request.method,
        request.url.path,
        exception.errors(),
    )
    return JSONResponse(status_code=422, content={"detail": exception.errors()})


@app.exception_handler(HTTPException)
async def http_exception_handler(
    request: Request,
    exception: HTTPException,
) -> JSONResponse:
    logger.warning(
        "HTTP error for %s %s: %s",
        request.method,
        request.url.path,
        exception.detail,
    )
    return JSONResponse(status_code=exception.status_code, content={"detail": exception.detail})


@app.exception_handler(Exception)
async def unhandled_exception_handler(
    request: Request,
    exception: Exception,
) -> JSONResponse:
    logger.exception(
        "Unhandled application error for %s %s",
        request.method,
        request.url.path,
        exc_info=exception,
    )
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


def load_model() -> dict[str, Any]:
    if not MODEL_PATH.is_file():
        raise FileNotFoundError(f"Model file not found: {MODEL_PATH}")

    with MODEL_PATH.open("rb") as model_file:
        bundle = pickle.load(model_file)

    required_keys = {"model", "label_encoder", "feature_names", "crop_profile"}
    if not isinstance(bundle, dict) or not required_keys <= bundle.keys():
        raise ValueError("Model file does not contain the expected model bundle")

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


try:
    MODEL_BUNDLE = load_model()
    SHAP_BACKGROUND_DATA = load_shap_background(MODEL_BUNDLE["feature_names"])
    FEATURE_IMPORTANCE = mean_absolute_shap_importance(
        MODEL_BUNDLE["model"],
        SHAP_BACKGROUND_DATA,
    )
except (FileNotFoundError, ValueError, pickle.PickleError, TypeError, RuntimeError) as error:
    MODEL_BUNDLE = None
    SHAP_BACKGROUND_DATA = None
    FEATURE_IMPORTANCE = None
    MODEL_LOAD_ERROR = str(error)
else:
    MODEL_LOAD_ERROR = None


@app.get("/health")
def health() -> dict[str, str]:
    if MODEL_BUNDLE is None:
        raise HTTPException(status_code=503, detail=MODEL_LOAD_ERROR)
    return {"status": "ok"}


@app.get("/feature-importance", response_model=FeatureImportanceResponse)
def feature_importance() -> FeatureImportanceResponse:
    if MODEL_BUNDLE is None or FEATURE_IMPORTANCE is None:
        raise HTTPException(status_code=503, detail=MODEL_LOAD_ERROR)

    ranked_features = sorted(
        FEATURE_IMPORTANCE.items(),
        key=lambda item: item[1],
        reverse=True,
    )
    return FeatureImportanceResponse(
        features=[
            FeatureImportanceItem(
                feature=feature,
                mean_absolute_shap=importance,
            )
            for feature, importance in ranked_features
        ],
    )


@app.post("/counterfactual", response_model=CounterfactualResponse)
def counterfactual_prediction(request: CounterfactualRequest) -> CounterfactualResponse:
    if MODEL_BUNDLE is None or SHAP_BACKGROUND_DATA is None:
        raise HTTPException(status_code=503, detail=MODEL_LOAD_ERROR)

    label_encoder = MODEL_BUNDLE["label_encoder"]
    try:
        target_class = int(label_encoder.transform([request.target_crop])[0])
    except ValueError as error:
        raise HTTPException(
            status_code=422,
            detail=f"Unknown target crop: {request.target_crop}",
        ) from error

    feature_names = MODEL_BUNDLE["feature_names"]
    values = request.model_dump(by_alias=True)
    values.pop("target_crop")
    query = pd.DataFrame([[values[name] for name in feature_names]], columns=feature_names)
    executor = ThreadPoolExecutor(max_workers=1)
    future = executor.submit(
        generate_counterfactual,
        MODEL_BUNDLE["model"],
        SHAP_BACKGROUND_DATA,
        query,
        target_class,
    )
    try:
        counterfactual = future.result(timeout=COUNTERFACTUAL_TIMEOUT_SECONDS)
    except FutureTimeoutError as error:
        future.cancel()
        raise HTTPException(
            status_code=504,
            detail="Counterfactual generation timed out",
        ) from error
    except (TypeError, ValueError, RuntimeError) as error:
        raise HTTPException(
            status_code=500,
            detail="Unable to generate counterfactual",
        ) from error
    finally:
        executor.shutdown(wait=False, cancel_futures=True)

    original = query.iloc[0]
    generated = counterfactual.iloc[0]
    return CounterfactualResponse(
        target_crop=request.target_crop,
        changes=[
            CounterfactualChange(
                feature=feature,
                original=float(original[feature]),
                counterfactual=float(generated[feature]),
                change=float(generated[feature] - original[feature]),
            )
            for feature in feature_names
        ],
    )


@app.post("/soil-analysis", response_model=SoilAnalysisResponse)
def analyze_soil(request: SoilAnalysisRequest) -> SoilAnalysisResponse:
    if MODEL_BUNDLE is None:
        raise HTTPException(status_code=503, detail=MODEL_LOAD_ERROR)

    crop_profile = MODEL_BUNDLE["crop_profile"]
    if request.crop not in crop_profile:
        raise HTTPException(status_code=404, detail=f"Unknown crop: {request.crop}")

    values = {
        "N": request.nitrogen,
        "P": request.phosphorus,
        "K": request.potassium,
        "ph": request.ph,
    }
    if not np.isfinite(list(values.values())).all():
        raise HTTPException(status_code=422, detail="All feature values must be finite")

    profile = crop_profile[request.crop]
    analysis = {}
    for feature, value in values.items():
        low = float(profile.loc["low", feature])
        high = float(profile.loc["high", feature])
        if value < low:
            status = "Low"
            change_needed = round(low - value, 2)
            suggestion = f"Increase {feature} by {change_needed} to reach the optimal range."
        elif value > high:
            status = "High"
            change_needed = round(value - high, 2)
            suggestion = f"Decrease {feature} by {change_needed} to reach the optimal range."
        else:
            status = "Optimal"
            change_needed = 0.0
            suggestion = f"{feature} is within the optimal range."

        analysis[feature] = SoilAnalysisItem(
            status=status,
            change_needed=change_needed,
            suggestion=suggestion,
        )

    return SoilAnalysisResponse(crop=request.crop, analysis=analysis)


@app.post("/economics", response_model=EconomicsResponse)
def calculate_economics(request: EconomicsRequest) -> EconomicsResponse:
    if not ECONOMICS_PATH.is_file():
        raise HTTPException(
            status_code=503,
            detail=f"Economics data file not found: {ECONOMICS_PATH}",
        )

    try:
        economics = pd.read_csv(ECONOMICS_PATH)
    except (OSError, pd.errors.ParserError) as error:
        raise HTTPException(
            status_code=503,
            detail=f"Unable to read economics data: {error}",
        ) from error

    required_columns = {
        "crop",
        "yield_kg_per_ha",
        "price_rs_per_quintal",
        "cost_rs_per_quintal",
    }
    if not required_columns <= set(economics.columns):
        raise HTTPException(
            status_code=503,
            detail="Economics data file is missing required columns",
        )

    rows = economics.set_index("crop")
    missing_crops = [crop for crop in request.crops if crop not in rows.index]
    if missing_crops:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown crop(s): {', '.join(missing_crops)}",
        )

    results = []
    for crop in request.crops:
        row = rows.loc[crop]
        revenue = float(row["yield_kg_per_ha"]) / 100 * float(
            row["price_rs_per_quintal"]
        )
        cost = float(row["yield_kg_per_ha"]) / 100 * float(
            row["cost_rs_per_quintal"]
        )
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

    return EconomicsResponse(results=results)


@app.post("/predict", response_model=CropPrediction)
def predict_crop(request: CropPredictionRequest) -> CropPrediction:
    if MODEL_BUNDLE is None:
        raise HTTPException(status_code=503, detail=MODEL_LOAD_ERROR)

    values = {
        "N": request.nitrogen,
        "P": request.phosphorus,
        "K": request.potassium,
        "temperature": request.temperature,
        "humidity": request.humidity,
        "ph": request.ph,
        "rainfall": request.rainfall,
    }
    feature_names = MODEL_BUNDLE["feature_names"]
    features = pd.DataFrame(
        [[values[name] for name in feature_names]],
        columns=feature_names,
    )
    if not np.isfinite(features.to_numpy()).all():
        raise HTTPException(status_code=422, detail="All feature values must be finite")

    model = MODEL_BUNDLE["model"]
    label_encoder = MODEL_BUNDLE["label_encoder"]
    probabilities = model.predict_proba(features)[0]
    labels = label_encoder.inverse_transform(np.arange(len(probabilities)))
    ranked_predictions = sorted(
        (
            CropProbability(crop=str(label), probability=round(float(probability), 6))
            for label, probability in zip(labels, probabilities)
        ),
        key=lambda prediction: prediction.probability,
        reverse=True,
    )
    return CropPrediction(predictions=ranked_predictions[:5])


@app.post("/explain", response_model=ExplainResponse)
def explain_prediction(request: CropPredictionRequest) -> ExplainResponse:
    if MODEL_BUNDLE is None or SHAP_BACKGROUND_DATA is None:
        raise HTTPException(status_code=503, detail=MODEL_LOAD_ERROR)

    values = {
        "N": request.nitrogen,
        "P": request.phosphorus,
        "K": request.potassium,
        "temperature": request.temperature,
        "humidity": request.humidity,
        "ph": request.ph,
        "rainfall": request.rainfall,
    }
    features = pd.DataFrame(
        [[values[name] for name in MODEL_BUNDLE["feature_names"]]],
        columns=MODEL_BUNDLE["feature_names"],
    )

    try:
        explanation = explain_top_prediction_features(
            model=MODEL_BUNDLE["model"],
            sample=features,
            background_data=SHAP_BACKGROUND_DATA,
            class_labels=MODEL_BUNDLE["label_encoder"].inverse_transform(
                MODEL_BUNDLE["model"].classes_
            ),
        )
    except (TypeError, ValueError, RuntimeError) as error:
        logger.exception("Unable to calculate SHAP explanation")
        raise HTTPException(
            status_code=500,
            detail="Unable to calculate SHAP explanation",
        ) from error

    ranked_features = sorted(
        explanation["values"].items(),
        key=lambda item: abs(item[1]),
        reverse=True,
    )
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
                    background_data=SHAP_BACKGROUND_DATA,
                ),
            )
            for rank, (feature, contribution) in enumerate(ranked_features, start=1)
        ],
    )


@app.post("/recommend", response_model=RecommendationResponse)
def recommend_crops(request: CropPredictionRequest) -> RecommendationResponse:
    prediction = predict_crop(request)
    crop_names = [item.crop for item in prediction.predictions]
    economics = calculate_economics(EconomicsRequest(crops=crop_names))
    economics_by_crop = {item.crop: item for item in economics.results}

    recommendations = []
    for prediction_item in prediction.predictions:
        soil_analysis = analyze_soil(
            SoilAnalysisRequest(
                crop=prediction_item.crop,
                N=request.nitrogen,
                P=request.phosphorus,
                K=request.potassium,
                ph=request.ph,
            )
        )
        recommendations.append(
            RecommendationCrop(
                crop=prediction_item.crop,
                probability=prediction_item.probability,
                soil_analysis=soil_analysis.analysis,
                economics=economics_by_crop[prediction_item.crop],
            )
        )

    return RecommendationResponse(
        recommendations=recommendations,
        explanation=explain_prediction(request),
    )
