import sys
from pathlib import Path

from fastapi.testclient import TestClient


ML_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ML_ROOT))

from api.main import app  # noqa: E402


client = TestClient(app)


VALID_PREDICTION = {
    "N": 90,
    "P": 42,
    "K": 43,
    "temperature": 20.88,
    "humidity": 82,
    "ph": 6.5,
    "rainfall": 203,
}


def test_health() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_shap_background_is_stratified_sample() -> None:
    from api.main import SHAP_BACKGROUND_DATA

    assert SHAP_BACKGROUND_DATA is not None
    assert len(SHAP_BACKGROUND_DATA) == 100
    assert list(SHAP_BACKGROUND_DATA.columns) == [
        "N",
        "P",
        "K",
        "temperature",
        "humidity",
        "ph",
        "rainfall",
    ]


def test_cors_allows_local_frontend() -> None:
    response = client.get(
        "/health",
        headers={"Origin": "http://localhost:5173"},
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_predict_returns_top_five() -> None:
    response = client.post("/predict", json=VALID_PREDICTION)

    assert response.status_code == 200
    assert len(response.json()["predictions"]) == 5


def test_predict_rejects_out_of_range_input() -> None:
    payload = {**VALID_PREDICTION, "N": 141}

    response = client.post("/predict", json=payload)

    assert response.status_code == 422
    assert response.json()["detail"]


def test_feature_importance_returns_all_features() -> None:
    response = client.get("/feature-importance")

    assert response.status_code == 200
    features = response.json()["features"]
    assert {item["feature"] for item in features} == {
        "N",
        "P",
        "K",
        "temperature",
        "humidity",
        "ph",
        "rainfall",
    }
    assert all(item["mean_absolute_shap"] >= 0 for item in features)


def test_counterfactual_returns_changes_for_all_features(monkeypatch) -> None:
    import pandas as pd

    counterfactual = pd.DataFrame([{
        "N": 91,
        "P": 43,
        "K": 44,
        "temperature": 26,
        "humidity": 81,
        "ph": 6.7,
        "rainfall": 210,
    }])
    monkeypatch.setattr(
        "api.main.generate_counterfactual",
        lambda *_args: counterfactual,
    )

    response = client.post(
        "/counterfactual",
        json={**VALID_PREDICTION, "target_crop": "rice"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["target_crop"] == "rice"
    assert [item["feature"] for item in body["changes"]] == [
        "N", "P", "K", "temperature", "humidity", "ph", "rainfall",
    ]
    assert body["changes"][0]["change"] == 1.0


def test_counterfactual_rejects_unknown_crop() -> None:
    response = client.post(
        "/counterfactual",
        json={**VALID_PREDICTION, "target_crop": "not-a-crop"},
    )

    assert response.status_code == 422


def test_explain_returns_ranked_feature_contributions(monkeypatch) -> None:
    monkeypatch.setattr(
        "api.main.explain_top_prediction_features",
        lambda **_: {
            "crop": "rice",
            "probability": 0.7,
            "base_value": 0.1,
            "values": {
                "N": -0.2,
                "P": 0.8,
                "K": 0.1,
                "temperature": -0.5,
                "humidity": 0.0,
                "ph": 0.3,
                "rainfall": 0.4,
            },
        },
    )

    response = client.post("/explain", json=VALID_PREDICTION)

    assert response.status_code == 200
    body = response.json()
    assert body["crop"] == "rice"
    assert [item["feature"] for item in body["features"]] == [
        "P",
        "temperature",
        "rainfall",
        "ph",
        "N",
        "K",
        "humidity",
    ]
    assert body["features"][0] == {
        "feature": "P",
        "contribution": 0.8,
        "direction": "supports",
        "rank": 1,
        "sentence": "Low phosphorus index (42) strongly supports rice.",
    }
    assert body["features"][4]["direction"] == "opposes"


def test_soil_analysis_returns_four_features() -> None:
    response = client.post(
        "/soil-analysis",
        json={"crop": "rice", "N": 80, "P": 47, "K": 40, "ph": 6.36},
    )

    assert response.status_code == 200
    assert set(response.json()["analysis"]) == {"N", "P", "K", "ph"}


def test_soil_analysis_rejects_unknown_crop() -> None:
    response = client.post(
        "/soil-analysis",
        json={"crop": "unknown", "N": 80, "P": 47, "K": 40, "ph": 6.36},
    )

    assert response.status_code == 404
    assert "Unknown crop" in response.json()["detail"]


def test_soil_analysis_rejects_invalid_input() -> None:
    response = client.post(
        "/soil-analysis",
        json={"crop": "rice", "N": -1, "P": 47, "K": 40, "ph": 6.36},
    )

    assert response.status_code == 422


def test_economics_returns_requested_crops() -> None:
    response = client.post("/economics", json={"crops": ["rice", "banana"]})

    assert response.status_code == 200
    assert [item["crop"] for item in response.json()["results"]] == ["rice", "banana"]


def test_economics_rejects_unknown_crop() -> None:
    response = client.post("/economics", json={"crops": ["unknown"]})

    assert response.status_code == 404
    assert "Unknown crop" in response.json()["detail"]


def test_economics_rejects_empty_crop_list() -> None:
    response = client.post("/economics", json={"crops": []})

    assert response.status_code == 422


def test_recommend_combines_top_five_results() -> None:
    response = client.post("/recommend", json=VALID_PREDICTION)

    assert response.status_code == 200
    body = response.json()
    recommendations = body["recommendations"]
    assert len(recommendations) == 5
    assert {"probability", "soil_analysis", "economics"} <= recommendations[0].keys()
    assert len(body["explanation"]["features"]) == 7
    assert body["explanation"]["crop"] == recommendations[0]["crop"]


def test_recommend_rejects_invalid_input() -> None:
    payload = {**VALID_PREDICTION, "rainfall": 0}

    response = client.post("/recommend", json=payload)

    assert response.status_code == 422
