from typing import Any

import pandas as pd
import dice_ml

from .explain import FEATURE_NAMES


COUNTERFACTUAL_RANDOM_SEED = 42


def generate_counterfactual(
    model: Any,
    background_data: pd.DataFrame,
    query: pd.DataFrame,
    target_class: int,
) -> pd.DataFrame:
    """Generate one random DiCE counterfactual for the requested encoded class."""
    training_data = background_data.loc[:, list(FEATURE_NAMES)].copy()
    training_data["target"] = model.predict(training_data)
    data = dice_ml.Data(
        dataframe=training_data,
        continuous_features=list(FEATURE_NAMES),
        outcome_name="target",
    )
    dice_model = dice_ml.Model(model=model, backend="sklearn", model_type="classifier")
    explainer = dice_ml.Dice(data, dice_model, method="random")
    result = explainer.generate_counterfactuals(
        query.loc[:, list(FEATURE_NAMES)],
        total_CFs=1,
        desired_class=target_class,
        features_to_vary=list(FEATURE_NAMES),
        random_seed=COUNTERFACTUAL_RANDOM_SEED,
        sample_size=1000,
    )
    if not result.cf_examples_list:
        raise ValueError("DiCE did not generate a counterfactual")
    counterfactual = result.cf_examples_list[0].final_cfs_df
    if counterfactual is None or counterfactual.empty:
        raise ValueError("DiCE returned an empty counterfactual")
    return counterfactual.loc[:, list(FEATURE_NAMES)].reset_index(drop=True)
