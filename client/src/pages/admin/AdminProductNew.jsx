import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import AdminLayout from '../../components/Layout/AdminLayout'
import AdminProductForm from '../../components/admin/AdminProductForm'

const AdminProductNew = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const handleSave = () => {
    // After successful save, navigate back to products list
    navigate('/admin/products')
  }

  const handleCancel = () => {
    navigate('/admin/products')
  }

  return (
    <AdminLayout>
      <div className="admin-product-new">
        <h1>{t('admin.products.add')}</h1>
        <AdminProductForm 
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </div>
    </AdminLayout>
  )
}

export default AdminProductNew