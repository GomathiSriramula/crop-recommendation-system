import { Navigate, Outlet, useLocation } from 'react-router-dom'
import useAuth from '../context/useAuth'
import Spinner from './Spinner'

function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className="flex justify-center py-20 text-slate-500"><Spinner label="Checking your session..." /></div>
  }

  return isAuthenticated
    ? <Outlet />
    : <Navigate to="/login" replace state={{ from: location }} />
}

export default ProtectedRoute
