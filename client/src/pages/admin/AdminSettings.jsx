import { useTranslation } from 'react-i18next'
import AdminLayout from '../../components/Layout/AdminLayout'

const AdminSettings = () => {
  const { t } = useTranslation()

  return (
    <AdminLayout>
      <div className="admin-settings">
        <h1>{t('admin.settings.title')}</h1>
        <p>Settings functionality will be implemented in a future sprint</p>
      </div>
    </AdminLayout>
  )
}

export default AdminSettings