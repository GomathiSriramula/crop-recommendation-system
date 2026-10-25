const { counterfactualTimeoutMs } = require("../config/env");
const { pickFeatures } = require("../config/features");
const { mlClient, mlErrorResponse } = require("../lib/mlClient");

async function counterfactual(req, res, next) {
    const input = pickFeatures(req.body);

    try {
        const { data } = await mlClient.post(
            "/counterfactual",
            { ...input, target_crop: req.body.target_crop },
            { timeout: counterfactualTimeoutMs },
        );

        if (!data || !Array.isArray(data.changes) || data.changes.length === 0) {
            return res.status(502).json({ error: "ML service returned an invalid counterfactual" });
        }
        return res.status(200).json(data);
    } catch (error) {
        const mapped = mlErrorResponse(error);
        if (mapped) {
            return res.status(mapped.status).json({ error: mapped.message });
        }
        return next(error);
    }
}

module.exports = { counterfactual };
