import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import AdminLayout from '../../components/Layout/AdminLayout'
import './AdminOrders.css'

const AdminOrders = () => {
  const { t } = useTranslation()
  const { token } = useSelector(state => state.auth)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedOrder, setSelectedOrder] = useState(null)

  // Fetch orders
  useEffect(() => {
    fetchOrders()
  }, [selectedStatus])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const url = selectedStatus === 'all' 
        ? '/api/admin/orders'
        : `/api/admin/orders?status=${selectedStatus}`
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) throw new Error('Failed to fetch orders')
      
      const data = await response.json()
      setOrders(data.data?.orders || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) throw new Error('Failed to update order status')
      
      // Refresh orders
      fetchOrders()
      setSelectedOrder(null)
    } catch (err) {
      alert('Error updating order: ' + err.message)
    }
  }

  const statusColors = {
    pending: '#f59e0b',
    processing: '#3b82f6',
    shipped: '#8b5cf6',
    delivered: '#10b981',
    cancelled: '#ef4444'
  }

  if (loading) return <AdminLayout><div className="loading">Loading orders...</div></AdminLayout>
  if (error) return <AdminLayout><div className="error">Error: {error}</div></AdminLayout>

  return (
    <AdminLayout>
      <div className="admin-orders">
        <div className="orders-header">
          <h1>Order Management</h1>
          <div className="order-filters">
            <select 
              value={selectedStatus} 
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="status-filter"
            >
              <option value="all">All Orders</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="orders-stats">
          <div className="stat-card">
            <h3>Total Orders</h3>
            <p className="stat-value">{orders.length}</p>
          </div>
          <div className="stat-card">
            <h3>Pending</h3>
            <p className="stat-value">{orders.filter(o => o.status === 'pending').length}</p>
          </div>
          <div className="stat-card">
            <h3>Processing</h3>
            <p className="stat-value">{orders.filter(o => o.status === 'processing').length}</p>
          </div>
          <div className="stat-card">
            <h3>Completed</h3>
            <p className="stat-value">{orders.filter(o => o.status === 'delivered').length}</p>
          </div>
        </div>

        <div className="orders-table">
          <table>
            <thead>
              <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Total</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order._id}>
                  <td>{order.orderNumber}</td>
                  <td>{order.customer?.email || order.email}</td>
                  <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                  <td>${order.total?.toFixed(2)}</td>
                  <td>
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: statusColors[order.status] }}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td>
                    <button 
                      onClick={() => setSelectedOrder(order)}
                      className="btn btn-sm btn-primary"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Order Detail Modal */}
        {selectedOrder && (
          <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <h2>Order Details: {selectedOrder.orderNumber}</h2>
              
              <div className="order-detail-section">
                <h3>Customer Information</h3>
                <p>Email: {selectedOrder.customer?.email || selectedOrder.email}</p>
                <p>Name: {selectedOrder.shipping?.firstName} {selectedOrder.shipping?.lastName}</p>
                <p>Phone: {selectedOrder.shipping?.phone}</p>
              </div>

              <div className="order-detail-section">
                <h3>Shipping Address</h3>
                <p>{selectedOrder.shipping?.street}</p>
                <p>{selectedOrder.shipping?.city}, {selectedOrder.shipping?.state} {selectedOrder.shipping?.postalCode}</p>
                <p>{selectedOrder.shipping?.country}</p>
              </div>

              <div className="order-detail-section">
                <h3>Order Items</h3>
                {selectedOrder.items?.map((item, idx) => (
                  <div key={idx} className="order-item">
                    <span>{item.product?.name || 'Product'}</span>
                    <span>Qty: {item.quantity}</span>
                    <span>${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
                <div className="order-total">
                  <strong>Total: ${selectedOrder.total?.toFixed(2)}</strong>
                </div>
              </div>

              <div className="order-detail-section">
                <h3>Update Status</h3>
                <select 
                  value={selectedOrder.status}
                  onChange={(e) => updateOrderStatus(selectedOrder._id, e.target.value)}
                  className="status-select"
                >
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <button 
                onClick={() => setSelectedOrder(null)}
                className="btn btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

export default AdminOrders