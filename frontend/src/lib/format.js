const isMissing = (value) => value === null || value === undefined || Number.isNaN(Number(value))

// Indian digit grouping (1,23,456) for rupee amounts. Missing data shows "—", not ₹0.
export function formatRupees(value) {
    if (isMissing(value)) return '—'
    return `₹${Number(value).toLocaleString('en-IN')}`
}

export function formatPercent(value, digits = 1) {
    if (isMissing(value)) return '—'
    return `${Number(value).toFixed(digits)}%`
}

// Probability (0-1) -> "63.4%".
export function formatProbability(value) {
    if (isMissing(value)) return '—'
    return `${(Number(value) * 100).toFixed(1)}%`
}

export function formatNumber(value, digits = 2) {
    if (isMissing(value)) return '—'
    return Number(Number(value).toFixed(digits)).toString()
}
