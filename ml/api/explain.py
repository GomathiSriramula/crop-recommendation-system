from typing import Any

import numpy as np
import pandas as pd
import shap


FEATURE_NAMES = ("N", "P", "K", "temperature", "humidity", "ph", "rainfall")
_FEATURE_LABELS = {
    "N": "nitrogen",
    "P": "phosphorus",
    "K": "potassium",
    "temperature": "temperature",
    "humidity": "humidity",
    "ph": "soil pH",
    "rainfall": "rainfall",
}
_FEATURE_UNITS = {
    "N": "mg/kg",
    "P": "mg/kg",
    "K": "mg/kg",
    "temperature": "°C",
    "humidity": "%",
    "ph": "",
    "rainfall": "mm",
}

_TREE_MODEL_NAMES = {
    "RandomForestClassifier",
    "RandomForestRegressor",
    "LGBMClassifier",
    "LGBMRegressor",
    "XGBClassifier",
    "XGBRegressor",
}


def _is_tree_model(model: Any) -> bool:
    model_name = type(model).__name__
    model_module = type(model).__module__.lower()

    return (
        model_name in _TREE_MODEL_NAMES
        or model_name.startswith("RandomForest")
        or "lightgbm" in model_module
        or "xgboost" in model_module
    )


def create_shap_explainer(
    model: Any,
    background_data: pd.DataFrame,
) -> shap.Explainer:
    """Create a SHAP explainer appropriate for the supplied estimator."""
    if _is_tree_model(model):
        return shap.TreeExplainer(model, data=background_data)

    if not hasattr(model, "predict_proba"):
        raise TypeError("Model must provide predict_proba for KernelExplainer")

    return shap.KernelExplainer(model.predict_proba, background_data)


def _class_feature_shap_values(
    shap_values: Any,
    sample_count: int,
    feature_count: int,
) -> np.ndarray:
    if isinstance(shap_values, list):
        class_values = [
            np.asarray(values, dtype=float) for values in shap_values
        ]
        if not class_values or any(
            values.ndim != 2
            or values.shape != (sample_count, feature_count)
            for values in class_values
        ):
            raise ValueError("SHAP list output has an unexpected shape")
        return np.stack(class_values, axis=0)

    values = np.asarray(shap_values, dtype=float)
    if values.ndim != 3:
        raise ValueError("SHAP output must be either list-of-arrays or a 3D array")
    if values.shape == (sample_count, feature_count, values.shape[2]):
        return np.moveaxis(values, 2, 0)
    if values.shape[1:] == (sample_count, feature_count):
        return values
    if values.shape[0] == sample_count and values.shape[2] == feature_count:
        return np.moveaxis(values, 1, 0)
    raise ValueError("Unable to infer class and feature axes from SHAP output")


def mean_absolute_shap_importance(
    model: Any,
    background_data: pd.DataFrame,
) -> dict[str, float]:
    """Calculate mean absolute SHAP values across rows and all output classes."""
    explainer = create_shap_explainer(model, background_data)
    shap_values = _class_feature_shap_values(
        explainer.shap_values(background_data),
        sample_count=len(background_data),
        feature_count=len(FEATURE_NAMES),
    )
    importance = np.abs(shap_values).mean(axis=(0, 1))
    return {
        feature: float(value)
        for feature, value in zip(FEATURE_NAMES, importance)
    }


def _extract_class_shap_values(
    shap_values: Any,
    class_index: int,
    feature_count: int,
) -> np.ndarray:
    if isinstance(shap_values, list):
        if class_index >= len(shap_values):
            raise ValueError("Class index is out of range for SHAP list output")
        class_values = np.asarray(shap_values[class_index], dtype=float)
        if class_values.ndim != 2 or class_values.shape[0] < 1:
            raise ValueError("SHAP list output must contain 2D arrays per class")
        return class_values[0]

    class_values = np.asarray(shap_values, dtype=float)
    if class_values.ndim != 3:
        raise ValueError("SHAP output must be either list-of-arrays or a 3D array")

    if class_values.shape[1] == feature_count:
        if class_index >= class_values.shape[2]:
            raise ValueError("Class index is out of range for SHAP 3D output")
        return class_values[0, :, class_index]

    if class_values.shape[2] == feature_count:
        if class_index >= class_values.shape[0]:
            raise ValueError("Class index is out of range for SHAP 3D output")
        return class_values[class_index, 0, :]

    raise ValueError("Unable to infer feature axis from SHAP 3D output")


def _extract_class_base_value(expected_value: Any, class_index: int) -> float:
    values = np.asarray(expected_value, dtype=float).reshape(-1)
    if class_index >= len(values):
        raise ValueError("Class index is out of range for SHAP base values")
    return float(values[class_index])


def explain_top_prediction_features(
    model: Any,
    sample: pd.DataFrame,
    background_data: pd.DataFrame,
    class_labels: Any = None,
) -> dict[str, Any]:
    missing_features = [feature for feature in FEATURE_NAMES if feature not in sample.columns]
    if missing_features:
        raise ValueError(f"Sample is missing feature columns: {missing_features}")

    input_features = sample.loc[:, list(FEATURE_NAMES)]
    probabilities = np.asarray(model.predict_proba(input_features), dtype=float)
    if probabilities.ndim != 2 or probabilities.shape[0] != 1:
        raise ValueError("predict_proba must return a 2D array for one input row")

    top_class_index = int(np.argmax(probabilities[0]))
    classes = getattr(model, "classes_", None)
    if classes is None or top_class_index >= len(classes):
        raise ValueError("Model classes_ are required to map top-1 class index")
    labels = classes if class_labels is None else class_labels
    if top_class_index >= len(labels):
        raise ValueError("Class labels are shorter than model classes")
    top_class = str(labels[top_class_index])

    explainer = create_shap_explainer(model, background_data)
    raw_shap_values = explainer.shap_values(input_features)
    feature_shap_values = _extract_class_shap_values(
        raw_shap_values,
        top_class_index,
        feature_count=len(FEATURE_NAMES),
    )
    if len(feature_shap_values) != len(FEATURE_NAMES):
        raise ValueError("SHAP values do not match expected feature count")
    base_value = _extract_class_base_value(explainer.expected_value, top_class_index)

    return {
        "crop": top_class,
        "probability": float(probabilities[0, top_class_index]),
        "base_value": base_value,
        "values": {
            feature: float(value)
            for feature, value in zip(FEATURE_NAMES, feature_shap_values)
        },
    }


def feature_contribution_sentence(
    feature: str,
    value: float,
    contribution: float,
    crop: str,
    background_data: pd.DataFrame,
) -> str:
    """Return a plain-English description of one feature's SHAP contribution."""
    if feature not in _FEATURE_LABELS:
        raise ValueError(f"Unknown feature: {feature}")

    magnitude = abs(contribution)
    if magnitude >= 0.2:
        strength = "strongly"
    elif magnitude >= 0.05:
        strength = "moderately"
    else:
        strength = "slightly"

    label = _FEATURE_LABELS[feature]
    median = float(background_data[feature].median())
    low = value < median
    value_prefix = "Low " if low else "High "
    unit = _FEATURE_UNITS[feature]
    formatted_value = f"{value:g}"
    display_value = f"{formatted_value} {unit}".strip()
    direction = "supports" if contribution >= 0 else "opposes"

    return (
        f"{value_prefix}{label} ({display_value}) {strength} "
        f"{direction} {crop}."
    )
