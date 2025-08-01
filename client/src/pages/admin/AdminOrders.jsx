import { useTranslation } from 'react-i18next'
import AdminLayout from '../../components/Layout/AdminLayout'

const AdminOrders = () => {
  const { t } = useTranslation()

  return (
    <AdminLayout>
      <div className="admin-orders">
        <h1>{t('admin.orders.title')}</h1>
        <p>Order management functionality coming in Sprint 2</p>
      </div>
    </AdminLayout>
  )
}

export default AdminOrders