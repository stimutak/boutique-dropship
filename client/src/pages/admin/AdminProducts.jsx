import { useState } from 'react'
import { useDispatch } from 'react-redux'
import AdminLayout from '../../components/Layout/AdminLayout'
import AdminProductList from '../../components/admin/AdminProductList'
import BulkImportExport from '../../components/admin/BulkImportExport'
import { fetchAdminProducts } from '../../store/slices/adminProductsSlice'

const AdminProducts = () => {
  const [showBulkActions, setShowBulkActions] = useState(false)
  const dispatch = useDispatch()

  const handleImportComplete = (results) => {
    // Refresh product list after successful import
    if (results.summary.successCount > 0) {
      dispatch(fetchAdminProducts({ page: 1 }))
    }
  }

  return (
    <AdminLayout>
      <div className="admin-products-page">
        <div className="page-header">
          <button 
            className="bulk-toggle-button"
            onClick={() => setShowBulkActions(!showBulkActions)}
          >
            {showBulkActions ? 'Hide Bulk Actions' : 'Show Bulk Actions'}
          </button>
        </div>
        
        {showBulkActions && (
          <BulkImportExport onImportComplete={handleImportComplete} />
        )}
        
        <AdminProductList />
      </div>
    </AdminLayout>
  )
}

export default AdminProducts