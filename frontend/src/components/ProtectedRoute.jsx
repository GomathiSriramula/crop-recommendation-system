import { Navigate, Outlet, useLocation } from 'react-router-dom'
import useAuth from '../context/useAuth'
import Spinner from './Spinner'

function ProtectedRoute() {
  const { isAuthenticated, loading, token, sessionError, retrySession } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className="flex justify-center py-20 text-slate-500"><Spinner label="Checking your session..." /></div>
  }

  // The server could not be reached while restoring the session. The user is NOT
  // signed out; let them retry instead of bouncing them to the login page.
  if (!isAuthenticated && token && sessionError) {
    return (
      <div className="mx-auto max-w-md rounded-3xl bg-white p-8 text-center shadow-sm">
        <p role="alert" className="text-slate-700">{sessionError}</p>
        <button
          onClick={retrySession}
          className="mt-5 rounded-full bg-emerald-700 px-6 py-2 font-bold text-white hover:bg-emerald-800"
        >
          Try again
        </button>
      </div>
    )
  }

  return isAuthenticated
    ? <Outlet />
    : <Navigate to="/login" replace state={{ from: location }} />
}

export default ProtectedRoute
