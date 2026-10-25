// Turn an axios error into a message the user can act on. The backend sends
// { error, details: [{ path, message }] } for validation failures.
export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
    const data = error?.response?.data
    if (Array.isArray(data?.details) && data.details.length > 0) {
        return data.details.map((item) => item.message).join(' ')
    }
    if (data?.error) return data.error
    if (error?.code === 'ECONNABORTED') return 'The server took too long to respond. Please try again.'
    if (error && !error.response) return 'Cannot reach the server. Check your connection and try again.'
    return fallback
}

// Field -> message map from backend validation details (for per-field errors).
export function getFieldErrors(error) {
    const details = error?.response?.data?.details
    if (!Array.isArray(details)) return {}
    return Object.fromEntries(details.filter((item) => item.path).map((item) => [item.path, item.message]))
}
