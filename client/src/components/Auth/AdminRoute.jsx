import { useSelector } from 'react-redux'
import { Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const AdminRoute = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useSelector(state => state.auth)
  const { t } = useTranslation()

  if (isLoading) {
    return <div className="loading">{t('common.loading')}</div>
  }

  // Check if user is authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" />
  }

  // Check if user is admin
  if (!user?.isAdmin) {
    return <Navigate to="/" />
  }

  return children
}

export default AdminRoute