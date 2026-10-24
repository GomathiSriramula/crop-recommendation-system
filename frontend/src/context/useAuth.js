import { useContext } from 'react'
import AuthContext from './contextValue'

function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}

export default useAuth
