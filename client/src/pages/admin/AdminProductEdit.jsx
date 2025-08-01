import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import AdminLayout from '../../components/Layout/AdminLayout'
import AdminProductForm from '../../components/admin/AdminProductForm'

const AdminProductEdit = () => {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const token = useSelector(state => state.auth?.token)

  useEffect(() => {
    fetchProduct()
  }, [id])

  const fetchProduct = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/products/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch product')
      }
      
      const data = await response.json()
      setProduct(data.product)
    } catch (err) {
      console.error('Error fetching product:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = () => {
    // After successful save, navigate back to products list
    navigate('/admin/products')
  }

  const handleCancel = () => {
    navigate('/admin/products')
  }

  if (loading) return <AdminLayout><div>{t('common.loading')}</div></AdminLayout>
  if (error) return <AdminLayout><div>Error: {error}</div></AdminLayout>
  if (!product) return <AdminLayout><div>Product not found</div></AdminLayout>

  return (
    <AdminLayout>
      <div className="admin-product-edit">
        <h1>{t('admin.products.edit')}</h1>
        <AdminProductForm 
          product={product}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </div>
    </AdminLayout>
  )
}

export default AdminProductEdit