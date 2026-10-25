import { RESULT_KEY } from './storageKeys'

// sessionStorage can be unavailable (private mode) or hold corrupt data, so every
// access is wrapped and a bad value is treated as "no result".
export function saveResult(result) {
    try {
        sessionStorage.setItem(RESULT_KEY, JSON.stringify(result))
    } catch {
        // ignore: the result page will just show "No result yet"
    }
}

export function loadResult() {
    try {
        const raw = sessionStorage.getItem(RESULT_KEY)
        const parsed = raw ? JSON.parse(raw) : null
        return parsed && typeof parsed === 'object' ? parsed : null
    } catch {
        return null
    }
}

export function clearResult() {
    try {
        sessionStorage.removeItem(RESULT_KEY)
    } catch {
        // ignore
    }
}
