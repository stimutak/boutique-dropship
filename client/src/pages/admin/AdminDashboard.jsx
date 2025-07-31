import { useTranslation } from 'react-i18next'
import AdminLayout from '../../components/Layout/AdminLayout'

const AdminDashboard = () => {
  const { t } = useTranslation()

  return (
    <AdminLayout>
      <div className="admin-dashboard">
        <h1>{t('admin.dashboard.title')}</h1>
        <div className="dashboard-content">
          <p>{t('admin.dashboard.overview')}</p>
        </div>
      </div>
    </AdminLayout>
  )
}

export default AdminDashboard