"""
Regression tests for all bug fixes applied to the SoilWise ML API.

Covers:
  Bug 1  - recommendations.length === 0 check (was !== 5)
  Bug 7  - module-level _COUNTERFACTUAL_EXECUTOR (no per-request thread creation)
  Bug 8  - /recommend calls explain_prediction once (not twice)
  Bug 12 - CORS origin reads FRONTEND_ORIGIN env var (default 5173, not 3000)
  Economics - chickpea and cotton CSV values corrected
  Existing - predict top-5, SHAP explanations, soil analysis, counterfactual, economics
"""
import csv
import os
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

ML_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ML_ROOT))

from api.main import app, _COUNTERFACTUAL_EXECUTOR  # noqa: E402
from fastapi.testclient import TestClient

client = TestClient(app)

VALID_PAYLOAD = {
    "N": 90,
    "P": 42,
    "K": 43,
    "temperature": 20.88,
    "humidity": 82,
    "ph": 6.5,
    "rainfall": 203,
}

# ---------------------------------------------------------------------------
# Bug 12 - CORS origin reads FRONTEND_ORIGIN env var (default 5173, not 3000)
# ---------------------------------------------------------------------------

def test_cors_allows_5173_by_default():
    """Bug 12 fix: default allowed origin must be 5173, not 3000."""
    resp = client.get("/health", headers={"Origin": "http://localhost:5173"})
    assert resp.status_code == 200
    acao = resp.headers.get("access-control-allow-origin", "")
    assert acao == "http://localhost:5173", (
        f"CORS must allow http://localhost:5173 by default; got '{acao}'"
    )


def test_cors_does_not_allow_3000_by_default():
    """Bug 12 fix: port 3000 must NOT be in the default allow-list."""
    resp = client.get("/health", headers={"Origin": "http://localhost:3000"})
    acao = resp.headers.get("access-control-allow-origin", "")
    assert acao != "http://localhost:3000", (
        "http://localhost:3000 must NOT be allowed after Bug 12 fix"
    )


# ---------------------------------------------------------------------------
# Bug 7 - module-level _COUNTERFACTUAL_EXECUTOR
# ---------------------------------------------------------------------------

def test_executor_is_module_level_singleton():
    """Bug 7 fix: _COUNTERFACTUAL_EXECUTOR must be a module-level ThreadPoolExecutor."""
    assert isinstance(_COUNTERFACTUAL_EXECUTOR, ThreadPoolExecutor), (
        "_COUNTERFACTUAL_EXECUTOR must be a ThreadPoolExecutor"
    )


def test_counterfactual_uses_shared_executor_submit(monkeypatch):
    """Bug 7 fix: /counterfactual must call submit() on the shared executor."""
    import api.main as main_module

    submit_calls = []
    real_submit = _COUNTERFACTUAL_EXECUTOR.submit

    def tracking_submit(*args, **kwargs):
        submit_calls.append(1)
        return real_submit(*args, **kwargs)

    monkeypatch.setattr(_COUNTERFACTUAL_EXECUTOR, "submit", tracking_submit)

    cf_df = pd.DataFrame([{
        "N": 91, "P": 43, "K": 44,
        "temperature": 26, "humidity": 81,
        "ph": 6.7, "rainfall": 210,
    }])
    monkeypatch.setattr(main_module, "generate_counterfactual", lambda *_: cf_df)

    resp = client.post("/counterfactual", json={**VALID_PAYLOAD, "target_crop": "rice"})
    assert resp.status_code == 200
    assert len(submit_calls) == 1, (
        "Shared executor's submit() was not called exactly once"
    )


def test_counterfactual_does_not_shutdown_shared_executor(monkeypatch):
    """Bug 7 fix: executor.shutdown() must NOT be called per request."""
    import api.main as main_module

    shutdown_calls = []
    original_shutdown = _COUNTERFACTUAL_EXECUTOR.shutdown

    def tracking_shutdown(*args, **kwargs):
        shutdown_calls.append(1)
        # Do NOT call original - that would destroy the shared executor
        pass

    monkeypatch.setattr(_COUNTERFACTUAL_EXECUTOR, "shutdown", tracking_shutdown)

    cf_df = pd.DataFrame([{
        "N": 91, "P": 43, "K": 44,
        "temperature": 26, "humidity": 81,
        "ph": 6.7, "rainfall": 210,
    }])
    monkeypatch.setattr(main_module, "generate_counterfactual", lambda *_: cf_df)

    resp = client.post("/counterfactual", json={**VALID_PAYLOAD, "target_crop": "rice"})
    assert resp.status_code == 200
    assert len(shutdown_calls) == 0, (
        f"executor.shutdown() was called {len(shutdown_calls)} time(s) on the shared executor"
    )


# ---------------------------------------------------------------------------
# Bug 8 - /recommend must call explain_prediction exactly once
# ---------------------------------------------------------------------------

def test_explain_called_exactly_once_per_recommend(monkeypatch):
    """Bug 8 fix: explain_prediction must be called exactly once per /recommend."""
    import api.main as main_module

    explain_calls = []
    original_explain = main_module.explain_prediction

    def counting_explain(request):
        explain_calls.append(1)
        return original_explain(request)

    monkeypatch.setattr(main_module, "explain_prediction", counting_explain)

    resp = client.post("/recommend", json=VALID_PAYLOAD)
    assert resp.status_code == 200
    assert len(explain_calls) == 1, (
        f"explain_prediction was called {len(explain_calls)} time(s); expected 1 (Bug 8 fix)"
    )


def test_predict_crop_called_exactly_once_per_recommend(monkeypatch):
    """Bug 8 fix: predict_crop must be called exactly once per /recommend."""
    import api.main as main_module

    predict_calls = []
    original_predict = main_module.predict_crop

    def counting_predict(request):
        predict_calls.append(1)
        return original_predict(request)

    monkeypatch.setattr(main_module, "predict_crop", counting_predict)

    resp = client.post("/recommend", json=VALID_PAYLOAD)
    assert resp.status_code == 200
    assert len(predict_calls) == 1, (
        f"predict_crop was called {len(predict_calls)} time(s); expected 1 (Bug 8 fix)"
    )


# ---------------------------------------------------------------------------
# Bug 1 context - recommendation length must accept non-empty (not exactly 5)
# ---------------------------------------------------------------------------

def test_recommend_returns_at_least_one_crop():
    """Bug 1 context: /recommend must return at least 1 crop."""
    resp = client.post("/recommend", json=VALID_PAYLOAD)
    assert resp.status_code == 200
    assert len(resp.json()["recommendations"]) >= 1


def test_predict_returns_exactly_five():
    """Regression: /predict must still return exactly 5 crops."""
    resp = client.post("/predict", json=VALID_PAYLOAD)
    assert resp.status_code == 200
    assert len(resp.json()["predictions"]) == 5


def test_recommendations_sorted_by_probability():
    """Recommendations must be ordered highest-probability first."""
    resp = client.post("/recommend", json=VALID_PAYLOAD)
    assert resp.status_code == 200
    probs = [r["probability"] for r in resp.json()["recommendations"]]
    assert probs == sorted(probs, reverse=True)


# ---------------------------------------------------------------------------
# Bug 2 context - explanation feature validation
# ---------------------------------------------------------------------------

def test_explain_returns_all_seven_features():
    """Bug 2 context: /explain must return all 7 known features."""
    resp = client.post("/explain", json=VALID_PAYLOAD)
    assert resp.status_code == 200
    features = {f["feature"] for f in resp.json()["features"]}
    assert features == {"N", "P", "K", "temperature", "humidity", "ph", "rainfall"}


def test_explain_directions_are_valid():
    """Each feature must have direction 'supports' or 'opposes'."""
    resp = client.post("/explain", json=VALID_PAYLOAD)
    assert resp.status_code == 200
    for item in resp.json()["features"]:
        assert item["direction"] in {"supports", "opposes"}


def test_explain_features_sorted_by_abs_contribution():
    """Features must be ranked by |contribution| descending."""
    resp = client.post("/explain", json=VALID_PAYLOAD)
    assert resp.status_code == 200
    contribs = [abs(f["contribution"]) for f in resp.json()["features"]]
    assert contribs == sorted(contribs, reverse=True)


def test_explain_ranks_sequential():
    """rank field must be 1..7 in order."""
    resp = client.post("/explain", json=VALID_PAYLOAD)
    assert resp.status_code == 200
    ranks = [f["rank"] for f in resp.json()["features"]]
    assert ranks == list(range(1, 8))


def test_explain_shap_sum_approx_probability():
    """SHAP: base_value + sum(contributions) approx equals predicted probability."""
    resp = client.post("/explain", json=VALID_PAYLOAD)
    assert resp.status_code == 200
    body = resp.json()
    total = body["base_value"] + sum(f["contribution"] for f in body["features"])
    assert abs(total - body["probability"]) < 1e-4, (
        f"SHAP sum {total:.6f} != probability {body['probability']:.6f}"
    )


# ---------------------------------------------------------------------------
# Economic CSV - chickpea and cotton corrected values
# ---------------------------------------------------------------------------

FORMULA_TOL = 0.01


def _api_economics(crop: str) -> dict:
    resp = client.post("/economics", json={"crops": [crop]})
    assert resp.status_code == 200
    return resp.json()["results"][0]


def test_chickpea_cost_corrected():
    """Chickpea cost was 41325.52 (wrong); must now be 41421.52."""
    result = _api_economics("chickpea")
    assert abs(result["cost_rs_per_ha"] - 41421.52) < FORMULA_TOL, (
        f"Chickpea cost regression: {result['cost_rs_per_ha']} != 41421.52"
    )


def test_chickpea_profit_corrected():
    """Chickpea profit was 28959.28 (wrong); must now be 28863.28."""
    result = _api_economics("chickpea")
    assert abs(result["profit_rs_per_ha"] - 28863.28) < FORMULA_TOL, (
        f"Chickpea profit regression: {result['profit_rs_per_ha']} != 28863.28"
    )


def test_chickpea_roi_corrected():
    """Chickpea ROI was 70.01 (wrong); must now be 69.68."""
    result = _api_economics("chickpea")
    assert abs(result["roi_percent"] - 69.68) < FORMULA_TOL, (
        f"Chickpea ROI regression: {result['roi_percent']} != 69.68"
    )


def test_cotton_cost_corrected():
    """Cotton cost was 19716.17 (wrong); must now be 19717.17."""
    result = _api_economics("cotton")
    assert abs(result["cost_rs_per_ha"] - 19717.17) < FORMULA_TOL, (
        f"Cotton cost regression: {result['cost_rs_per_ha']} != 19717.17"
    )


def test_cotton_profit_corrected():
    """Cotton profit was 9875.23 (wrong); must now be 9874.23."""
    result = _api_economics("cotton")
    assert abs(result["profit_rs_per_ha"] - 9874.23) < FORMULA_TOL, (
        f"Cotton profit regression: {result['profit_rs_per_ha']} != 9874.23"
    )


def test_all_22_crops_formula_consistent():
    """Every crop in econmic.csv must satisfy the API formula to within 0.01."""
    economics_path = ML_ROOT / "datasets" / "econmic.csv"
    with economics_path.open() as f:
        rows = [r for r in csv.DictReader(f) if r.get("crop")]

    names = [r["crop"] for r in rows]
    resp = client.post("/economics", json={"crops": names})
    assert resp.status_code == 200
    api_by = {r["crop"]: r for r in resp.json()["results"]}

    failures = []
    for row in rows:
        crop = row["crop"]
        y = float(row["yield_kg_per_ha"])
        p = float(row["price_rs_per_quintal"])
        c = float(row["cost_rs_per_quintal"])
        exp_rev   = (y / 100) * p
        exp_cost  = (y / 100) * c
        exp_profit = exp_rev - exp_cost
        exp_roi   = (exp_profit / exp_cost) * 100
        a = api_by[crop]
        if (abs(a["revenue_rs_per_ha"]  - exp_rev)    >= FORMULA_TOL
                or abs(a["cost_rs_per_ha"]  - exp_cost)   >= FORMULA_TOL
                or abs(a["profit_rs_per_ha"] - exp_profit) >= FORMULA_TOL
                or abs(a["roi_percent"]      - exp_roi)    >= FORMULA_TOL):
            failures.append(
                f"{crop}: rev={a['revenue_rs_per_ha']} (exp {exp_rev:.2f})  "
                f"cost={a['cost_rs_per_ha']} (exp {exp_cost:.2f})  "
                f"profit={a['profit_rs_per_ha']} (exp {exp_profit:.2f})  "
                f"roi={a['roi_percent']} (exp {exp_roi:.2f})"
            )
    assert not failures, "Formula inconsistencies:\n" + "\n".join(failures)


# ---------------------------------------------------------------------------
# Existing end-to-end regression (must not break after fixes)
# ---------------------------------------------------------------------------

def test_health_ok():
    assert client.get("/health").status_code == 200


def test_predict_valid_input_200():
    resp = client.post("/predict", json=VALID_PAYLOAD)
    assert resp.status_code == 200
    preds = resp.json()["predictions"]
    assert all(0 <= p["probability"] <= 1 for p in preds)


def test_predict_out_of_range_422():
    assert client.post("/predict", json={**VALID_PAYLOAD, "N": 141}).status_code == 422


def test_recommend_valid_input_200():
    resp = client.post("/recommend", json=VALID_PAYLOAD)
    assert resp.status_code == 200
    body = resp.json()
    rec = body["recommendations"][0]
    assert {"crop", "probability", "soil_analysis", "economics"} <= rec.keys()


def test_recommend_explanation_crop_matches_top_recommendation():
    """explanation.crop must equal the #1 recommendation crop."""
    resp = client.post("/recommend", json=VALID_PAYLOAD)
    assert resp.status_code == 200
    body = resp.json()
    assert body["explanation"]["crop"] == body["recommendations"][0]["crop"]


def test_recommend_invalid_rainfall_422():
    assert client.post("/recommend", json={**VALID_PAYLOAD, "rainfall": 0}).status_code == 422


def test_soil_analysis_four_parameters():
    resp = client.post(
        "/soil-analysis",
        json={"crop": "rice", "N": 80, "P": 47, "K": 40, "ph": 6.36},
    )
    assert resp.status_code == 200
    assert set(resp.json()["analysis"]) == {"N", "P", "K", "ph"}


def test_soil_analysis_unknown_crop_404():
    resp = client.post(
        "/soil-analysis",
        json={"crop": "unknown_xyz", "N": 80, "P": 47, "K": 40, "ph": 6.36},
    )
    assert resp.status_code == 404


def test_economics_known_crops_200():
    resp = client.post("/economics", json={"crops": ["rice", "banana"]})
    assert resp.status_code == 200
    assert [r["crop"] for r in resp.json()["results"]] == ["rice", "banana"]


def test_economics_unknown_crop_404():
    assert client.post("/economics", json={"crops": ["not_real"]}).status_code == 404


def test_economics_empty_list_422():
    assert client.post("/economics", json={"crops": []}).status_code == 422


def test_feature_importance_all_seven_features():
    resp = client.get("/feature-importance")
    assert resp.status_code == 200
    features = {f["feature"] for f in resp.json()["features"]}
    assert features == {"N", "P", "K", "temperature", "humidity", "ph", "rainfall"}


def test_counterfactual_returns_all_feature_changes(monkeypatch):
    import api.main as main_module
    cf_df = pd.DataFrame([{
        "N": 91, "P": 43, "K": 44,
        "temperature": 26, "humidity": 81,
        "ph": 6.7, "rainfall": 210,
    }])
    monkeypatch.setattr(main_module, "generate_counterfactual", lambda *_: cf_df)
    resp = client.post("/counterfactual", json={**VALID_PAYLOAD, "target_crop": "rice"})
    assert resp.status_code == 200
    assert [c["feature"] for c in resp.json()["changes"]] == [
        "N", "P", "K", "temperature", "humidity", "ph", "rainfall"
    ]


def test_counterfactual_unknown_crop_422():
    resp = client.post(
        "/counterfactual",
        json={**VALID_PAYLOAD, "target_crop": "not-a-crop"},
    )
    assert resp.status_code == 422
