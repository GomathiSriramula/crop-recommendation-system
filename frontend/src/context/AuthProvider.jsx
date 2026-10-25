import { useCallback, useEffect, useMemo, useState } from 'react'
import api, { setUnauthorizedHandler } from '../lib/api'
import { clearResult } from '../lib/resultStorage'
import { TOKEN_KEY } from '../lib/storageKeys'
import AuthContext from './contextValue'

function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(Boolean(token))
  // Set when the server could not be reached while restoring the session. The token
  // is kept (we do NOT log the user out because of a network blip).
  const [sessionError, setSessionError] = useState('')
  const [attempt, setAttempt] = useState(0)

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    // Never leave one user's recommendation readable by the next user of this tab.
    clearResult()
    setToken(null)
    setUser(null)
    setSessionError('')
    setLoading(false)
  }, [])

  // Any 401 from the API (e.g. expired token) signs the user out.
  useEffect(() => {
    setUnauthorizedHandler(logout)
    return () => setUnauthorizedHandler(null)
  }, [logout])

  // Restore the session on page load. login()/register() set the user themselves,
  // so skip the extra /auth/me request when we already have one.
  useEffect(() => {
    if (!token || user) {
      return undefined
    }

    const controller = new AbortController()
    api.get('/auth/me', { signal: controller.signal })
      .then(({ data }) => {
        setUser(data.user)
        setSessionError('')
        setLoading(false)
      })
      .catch((error) => {
        // An aborted request (React StrictMode re-run, unmount) must not touch state,
        // otherwise loading would flip to false while the real request is still pending.
        if (controller.signal.aborted) return
        // Only an authentication failure ends the session. The 401 interceptor already
        // calls logout(); network errors / 5xx must not sign the user out.
        if (error.response?.status === 401) {
          logout()
        } else {
          setSessionError('Cannot reach the server right now. Please try again shortly.')
          setLoading(false)
        }
      })

    return () => controller.abort()
  }, [token, user, logout, attempt])

  const retrySession = useCallback(() => {
    setSessionError('')
    setLoading(true)
    setAttempt((current) => current + 1)
  }, [])

  const authenticate = useCallback(async (path, credentials) => {
    const { data } = await api.post(path, credentials)
    localStorage.setItem(TOKEN_KEY, data.token)
    clearResult()
    setToken(data.token)
    setUser(data.user)
    setLoading(false)
    return data
  }, [])

  const login = useCallback((credentials) => authenticate('/auth/login', credentials), [authenticate])
  const register = useCallback((credentials) => authenticate('/auth/register', credentials), [authenticate])

  // Keep several open tabs in sync: logging out (or in) in one tab updates the others.
  useEffect(() => {
    const onStorage = (event) => {
      if (event.key !== TOKEN_KEY) return
      setToken(event.newValue)
      if (!event.newValue) {
        setUser(null)
        setLoading(false)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const value = useMemo(() => ({
    token,
    user,
    loading,
    sessionError,
    retrySession,
    isAuthenticated: Boolean(token && user),
    login,
    register,
    logout,
  }), [token, user, loading, sessionError, retrySession, login, register, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export { AuthProvider }
