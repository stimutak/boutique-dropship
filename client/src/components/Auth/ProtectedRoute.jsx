import { useSelector } from 'react-redux'
import { Navigate } from 'react-router-dom'

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useSelector(state => state.auth)

  if (isLoading) {
    return <div className="loading">Loading...</div>
  }

  return isAuthenticated ? children : <Navigate to="/login" />
}

export default ProtectedRoute