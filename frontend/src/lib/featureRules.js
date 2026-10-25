// Input ranges = min/max of the training data. Keep in sync with the backend
// (src/config/features.js) and the ML service (Pydantic model).
//
// NOTE: N, P and K in the training dataset are RELATIVE values on the dataset's own
// scale, not laboratory mg/kg readings, so they are shown without a unit.
export const FEATURE_FIELDS = [
    { name: 'N', label: 'Nitrogen (N)', min: 0, max: 140, helperText: 'Dataset range: 0–140 (relative index, not mg/kg).' },
    { name: 'P', label: 'Phosphorus (P)', min: 5, max: 145, helperText: 'Dataset range: 5–145 (relative index, not mg/kg).' },
    { name: 'K', label: 'Potassium (K)', min: 5, max: 205, helperText: 'Dataset range: 5–205 (relative index, not mg/kg).' },
    { name: 'temperature', label: 'Temperature', min: 8.8, max: 43.7, helperText: 'Dataset range: 8.8–43.7 °C.' },
    { name: 'humidity', label: 'Humidity', min: 14.2, max: 100, helperText: 'Dataset range: 14.2–100 %.' },
    { name: 'ph', label: 'Soil pH', min: 3.5, max: 9.94, helperText: 'Dataset range: pH 3.5–9.94.' },
    { name: 'rainfall', label: 'Rainfall', min: 20.2, max: 298.6, helperText: 'Dataset range: 20.2–298.6 mm.' },
]

export const FEATURE_LABELS = {
    N: 'Nitrogen',
    P: 'Phosphorus',
    K: 'Potassium',
    temperature: 'Temperature',
    humidity: 'Humidity',
    ph: 'Soil pH',
    rainfall: 'Rainfall',
}

export const DEFAULT_INPUT = {
    N: 90,
    P: 42,
    K: 43,
    temperature: 25,
    humidity: 80,
    ph: 6.5,
    rainfall: 200,
}

// The 22 crops the model can recommend (used for the "what would it take?" selector).
export const CROPS = [
    'apple', 'banana', 'blackgram', 'chickpea', 'coconut', 'coffee', 'cotton', 'grapes',
    'jute', 'kidneybeans', 'lentil', 'maize', 'mango', 'mothbeans', 'mungbean', 'muskmelon',
    'orange', 'papaya', 'pigeonpeas', 'pomegranate', 'rice', 'watermelon',
]

export const FEATURE_NAMES = FEATURE_FIELDS.map((field) => field.name)
