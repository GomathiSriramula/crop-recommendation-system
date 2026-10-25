import axios from 'axios'
import { TOKEN_KEY } from './storageKeys'

const baseURL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : '')

if (!baseURL) {
  // A production build without VITE_API_URL would call the visitor's own machine.
  throw new Error('VITE_API_URL is not set. Configure it before building for production.')
}

const api = axios.create({
  baseURL,
  timeout: 30000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// AuthProvider registers a handler so an expired/invalid token signs the user out
// everywhere instead of every page showing its own confusing error.
let unauthorizedHandler = null

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || ''
    const isAuthAttempt = url.startsWith('/auth/login') || url.startsWith('/auth/register')
    // A wrong password on the login form is also a 401 - do not treat it as "session expired".
    if (error.response?.status === 401 && !isAuthAttempt && unauthorizedHandler) {
      unauthorizedHandler()
    }
    return Promise.reject(error)
  },
)

export default api
