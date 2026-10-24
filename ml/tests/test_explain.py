import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest


ML_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ML_ROOT))

from api import explain  # noqa: E402


class _DummyModel:
    classes_ = np.array(["rice", "maize", "coffee"])

    def predict_proba(self, _features: pd.DataFrame) -> np.ndarray:
        return np.array([[0.2, 0.7, 0.1]], dtype=float)


class _DummyExplainer:
    expected_value = np.array([0.1, 0.2, 0.3], dtype=float)

    def __init__(self, shap_values: object) -> None:
        self._shap_values = shap_values

    def shap_values(self, _features: pd.DataFrame) -> object:
        return self._shap_values


def _sample_input() -> pd.DataFrame:
    return pd.DataFrame(
        [[90.0, 42.0, 43.0, 25.0, 80.0, 6.5, 200.0]],
        columns=list(explain.FEATURE_NAMES),
    )


def _background_data() -> pd.DataFrame:
    return pd.concat([_sample_input()] * 100, ignore_index=True)


def test_explain_top_prediction_with_shap_list_output(monkeypatch) -> None:
    shap_values = [
        np.array([[1, 2, 3, 4, 5, 6, 7]], dtype=float),
        np.array([[11, 12, 13, 14, 15, 16, 17]], dtype=float),
        np.array([[21, 22, 23, 24, 25, 26, 27]], dtype=float),
    ]
    monkeypatch.setattr(
        explain,
        "create_shap_explainer",
        lambda _model, _background: _DummyExplainer(shap_values),
    )

    result = explain.explain_top_prediction_features(
        model=_DummyModel(),
        sample=_sample_input(),
        background_data=_background_data(),
    )

    assert result["crop"] == "maize"
    assert result["values"] == {
        "N": 11.0,
        "P": 12.0,
        "K": 13.0,
        "temperature": 14.0,
        "humidity": 15.0,
        "ph": 16.0,
        "rainfall": 17.0,
    }


def test_explain_top_prediction_with_shap_3d_output(monkeypatch) -> None:
    shap_values = np.zeros((1, len(explain.FEATURE_NAMES), 3), dtype=float)
    shap_values[0, :, 1] = np.array([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7], dtype=float)
    monkeypatch.setattr(
        explain,
        "create_shap_explainer",
        lambda _model, _background: _DummyExplainer(shap_values),
    )

    result = explain.explain_top_prediction_features(
        model=_DummyModel(),
        sample=_sample_input(),
        background_data=_background_data(),
    )

    assert result["crop"] == "maize"
    assert result["values"] == {
        "N": 0.1,
        "P": 0.2,
        "K": 0.3,
        "temperature": 0.4,
        "humidity": 0.5,
        "ph": 0.6,
        "rainfall": 0.7,
    }


def test_feature_contribution_sentence_uses_value_and_impact() -> None:
    sentence = explain.feature_contribution_sentence(
        feature="rainfall",
        value=203,
        contribution=0.2465,
        crop="rice",
        background_data=pd.DataFrame({"rainfall": [50, 100, 150]}),
    )

    assert sentence == "High rainfall (203 mm) strongly supports rice."


def test_shap_contributions_sum_to_predicted_probability() -> None:
    from api.main import MODEL_BUNDLE, SHAP_BACKGROUND_DATA

    model = MODEL_BUNDLE["model"]
    sample = _sample_input()
    result = explain.explain_top_prediction_features(
        model=model,
        sample=sample,
        background_data=SHAP_BACKGROUND_DATA,
    )
    predicted_probability = float(model.predict_proba(sample)[0].max())

    assert len(result["values"]) == 7
    assert (
        result["base_value"] + sum(result["values"].values())
        == pytest.approx(predicted_probability, abs=1e-5)
    )
