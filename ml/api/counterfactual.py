import threading
from typing import Any

import dice_ml
import pandas as pd

from .explain import FEATURE_NAMES


COUNTERFACTUAL_RANDOM_SEED = 42
COUNTERFACTUAL_SAMPLE_SIZE = 1000


class CounterfactualError(ValueError):
    """Raised for expected, user-facing counterfactual failures (HTTP 422)."""


class CounterfactualGenerator:
    """Builds the DiCE objects once and reuses them for every request."""

    def __init__(self, model: Any, background_data: pd.DataFrame) -> None:
        self._model = model
        training_data = background_data.loc[:, list(FEATURE_NAMES)].copy()
        training_data["target"] = model.predict(training_data)
        data = dice_ml.Data(
            dataframe=training_data,
            continuous_features=list(FEATURE_NAMES),
            outcome_name="target",
        )
        dice_model = dice_ml.Model(model=model, backend="sklearn", model_type="classifier")
        self._explainer = dice_ml.Dice(data, dice_model, method="random")
        # DiCE keeps internal state while generating, so run one request at a time.
        self._lock = threading.Lock()

    def generate(self, query: pd.DataFrame, target_class: int) -> pd.DataFrame:
        """Return one counterfactual row (all 7 features) that the model maps to target_class."""
        query = query.loc[:, list(FEATURE_NAMES)]
        current_class = int(self._model.predict(query)[0])
        if current_class == target_class:
            raise CounterfactualError(
                "The model already recommends this crop for the given values."
            )

        with self._lock:
            result = self._explainer.generate_counterfactuals(
                query,
                total_CFs=1,
                desired_class=target_class,
                features_to_vary=list(FEATURE_NAMES),
                random_seed=COUNTERFACTUAL_RANDOM_SEED,
                sample_size=COUNTERFACTUAL_SAMPLE_SIZE,
                verbose=False,
            )

        if not result.cf_examples_list:
            raise CounterfactualError("No counterfactual could be found for this crop.")
        counterfactual = result.cf_examples_list[0].final_cfs_df
        if counterfactual is None or counterfactual.empty:
            raise CounterfactualError("No counterfactual could be found for this crop.")

        features = counterfactual.loc[:, list(FEATURE_NAMES)].reset_index(drop=True)
        # Never trust the generator blindly: confirm the model really picks the target.
        if int(self._model.predict(features.iloc[[0]])[0]) != target_class:
            raise CounterfactualError("No valid counterfactual could be found for this crop.")
        return features
