import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
// Authentication now uses httpOnly cookies instead of Redux token
import AdminLayout from '../../components/Layout/AdminLayout'
import { formatPrice, getCurrencyForLocale } from '../../utils/currency'
import './AdminDashboard.css'

const AdminDashboard = () => {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [analytics, setAnalytics] = useState(null)
  const [recentOrders, setRecentOrders] = useState([])
  const [topProducts, setTopProducts] = useState([])
  const [systemStatus, setSystemStatus] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Authentication is now handled via httpOnly cookies
  const currentCurrency = getCurrencyForLocale(i18n.language)

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Fetch analytics data
      const analyticsResponse = await fetch('/api/admin/analytics/dashboard', {
        credentials: 'include'
      })

      if (!analyticsResponse.ok) {
        throw new Error('Failed to fetch analytics data')
      }

      const analyticsData = await analyticsResponse.json()
      setAnalytics(analyticsData.analytics)

      // Fetch recent orders
      const ordersResponse = await fetch('/api/admin/orders?limit=5&sort=-createdAt', {
        credentials: 'include'
      })

      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json()
        setRecentOrders(ordersData.orders || [])
      }

      // Fetch top products
      const productsResponse = await fetch('/api/admin/analytics/products?limit=5&sort=revenue', {
        credentials: 'include'
      })

      if (productsResponse.ok) {
        const productsData = await productsResponse.json()
        setTopProducts(productsData.products || [])
      }

      // Fetch system status
      const statusResponse = await fetch('/api/admin/products?filter=lowStock', {
        credentials: 'include'
      })

      if (statusResponse.ok) {
        const statusData = await statusResponse.json()
        const userStatsResponse = await fetch('/api/admin/users/stats', {
          credentials: 'include'
        })
        
        let userStats = { newUsersToday: 0 }
        if (userStatsResponse.ok) {
          const userData = await userStatsResponse.json()
          userStats = userData.stats || userStats
        }

        setSystemStatus({
          lowStockProducts: statusData.products || [],
          pendingOrdersCount: recentOrders.filter(order => order.status === 'pending').length,
          newUsersToday: userStats.newUsersToday || 0
        })
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const handleCardClick = (section) => {
    navigate(`/admin/${section}`)
  }

  const handleQuickAction = (action) => {
    switch (action) {
      case 'add-product':
        navigate('/admin/products/new')
        break
      case 'view-orders':
        navigate('/admin/orders')
        break
      case 'manage-users':
        navigate('/admin/users')
        break
      case 'export-reports':
        handleExportReports()
        break
      default:
        break
    }
  }

  const handleExportReports = async () => {
    try {
      const response = await fetch('/api/admin/analytics/export?type=dashboard', {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to export reports')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `dashboard-report-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error exporting reports:', err)
      alert('Failed to export reports')
    }
  }

  const formatOrderDate = (dateString) => {
    return new Date(dateString).toLocaleDateString(i18n.language)
  }

  const getProductName = (product) => {
    return product.name?.[i18n.language] || product.name?.en || 'Unknown Product'
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="admin-dashboard" data-testid="admin-dashboard">
          <div className="loading">{t('common.loading')}</div>
        </div>
      </AdminLayout>
    )
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="admin-dashboard" data-testid="admin-dashboard">
          <div className="error">{error}</div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="admin-dashboard" data-testid="admin-dashboard">
        {/* Dashboard Header */}
        <div className="dashboard-header">
          <div className="dashboard-title-section">
            <p className="dashboard-subtitle">{t('admin.dashboard.overview')}</p>
          </div>
          <div className="dashboard-actions">
            <button 
              data-testid="refresh-dashboard-btn"
              onClick={fetchDashboardData}
              className="refresh-btn"
            >
              {t('admin.dashboard.refresh')}
            </button>
          </div>
        </div>

        {/* Summary Statistics Cards */}
        <div className="dashboard-stats">
          <div 
            data-testid="total-revenue-card"
            className="stat-card clickable"
            onClick={() => handleCardClick('orders')}
          >
            <div className="stat-icon">💰</div>
            <div className="stat-content">
              <h3>{formatPrice(analytics?.metrics?.sales?.totalRevenue || 0, currentCurrency, i18n.language)}</h3>
              <p>{t('admin.dashboard.totalRevenue')}</p>
              <span className="stat-subtitle">{t('admin.dashboard.thisMonth')}</span>
            </div>
          </div>

          <div 
            data-testid="total-orders-card"
            className="stat-card clickable"
            onClick={() => handleCardClick('orders')}
          >
            <div className="stat-icon">📋</div>
            <div className="stat-content">
              <h3>{analytics?.metrics?.sales?.totalOrders || 0}</h3>
              <p>{t('admin.dashboard.totalOrders')}</p>
              <span className="stat-subtitle">{t('admin.dashboard.thisMonth')}</span>
            </div>
          </div>

          <div 
            data-testid="total-products-card"
            className="stat-card clickable"
            onClick={() => handleCardClick('products')}
          >
            <div className="stat-icon">📦</div>
            <div className="stat-content">
              <h3>{analytics?.metrics?.products?.totalProducts || 0}</h3>
              <p>{t('admin.dashboard.totalProducts')}</p>
              <span className="stat-subtitle">{analytics?.metrics?.products?.activeProducts || 0} {t('admin.dashboard.active')}</span>
            </div>
          </div>

          <div 
            data-testid="total-users-card"
            className="stat-card clickable"
            onClick={() => handleCardClick('users')}
          >
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <h3>{analytics?.metrics?.users?.totalUsers || 0}</h3>
              <p>{t('admin.dashboard.totalUsers')}</p>
              <span className="stat-subtitle">{analytics?.metrics?.users?.newUsersThisWeek || 0} {t('admin.dashboard.newThisWeek')}</span>
            </div>
          </div>

          <div 
            data-testid="total-reviews-card"
            className="stat-card clickable"
            onClick={() => handleCardClick('reviews')}
          >
            <div className="stat-icon">⭐</div>
            <div className="stat-content">
              <h3>{analytics?.metrics?.reviews?.totalReviews || 0}</h3>
              <p>{t('admin.dashboard.totalReviews')}</p>
              <span className="stat-subtitle">{analytics?.metrics?.reviews?.pendingReviews || 0} {t('admin.dashboard.pending')}</span>
            </div>
          </div>
        </div>

        {/* Main Dashboard Content */}
        <div className="dashboard-main-content">
          {/* Left Column */}
          <div className="dashboard-left-column">
            {/* Recent Activity Section */}
            <div data-testid="recent-activity-section" className="dashboard-section">
              <h2>{t('admin.dashboard.recentActivity')}</h2>
              {recentOrders.length === 0 ? (
                <div className="empty-state">
                  <p>{t('admin.dashboard.noRecentOrders')}</p>
                </div>
              ) : (
                <div className="recent-orders">
                  {recentOrders.map((order) => (
                    <div key={order._id} className="recent-order-item">
                      <div className="order-info">
                        <div className="order-number">{order.orderNumber}</div>
                        <div className="order-customer">
                          {order.customer?.firstName} {order.customer?.lastName}
                        </div>
                        <div className="order-date">{formatOrderDate(order.createdAt)}</div>
                      </div>
                      <div className="order-details">
                        <div className="order-amount">
                          {formatPrice(order.total, order.currency, i18n.language)}
                        </div>
                        <div className={`order-status status-${order.status}`}>
                          {t(`admin.orders.${order.status}`)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Products Section */}
            <div data-testid="top-products-section" className="dashboard-section">
              <h2>{t('admin.dashboard.topProducts')}</h2>
              {topProducts.length === 0 ? (
                <div className="empty-state">
                  <p>{t('admin.dashboard.noTopProducts')}</p>
                </div>
              ) : (
                <div className="top-products">
                  {topProducts.map((product, index) => (
                    <div key={product._id} className="top-product-item">
                      <div className="product-rank">#{index + 1}</div>
                      {product.images?.[0] && (
                        <img 
                          src={product.images[0]} 
                          alt={getProductName(product)}
                          className="product-thumbnail"
                        />
                      )}
                      <div className="product-info">
                        <div className="product-name">{getProductName(product)}</div>
                        <div className="product-stats">
                          <span className="units-sold">{product.unitsSold || 0} {t('admin.dashboard.unitsSold')}</span>
                          <span className="product-revenue">
                            {formatPrice(product.revenue || 0, product.currency || currentCurrency, i18n.language)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="dashboard-right-column">
            {/* Quick Actions Section */}
            <div data-testid="quick-actions-section" className="dashboard-section">
              <h2>{t('admin.dashboard.quickActions')}</h2>
              <div className="quick-actions">
                <button 
                  data-testid="add-product-btn"
                  className="quick-action-btn"
                  onClick={() => handleQuickAction('add-product')}
                >
                  <span className="action-icon">➕</span>
                  {t('admin.dashboard.addProduct')}
                </button>
                <button 
                  data-testid="view-orders-btn"
                  className="quick-action-btn"
                  onClick={() => handleQuickAction('view-orders')}
                >
                  <span className="action-icon">📋</span>
                  {t('admin.dashboard.viewOrders')}
                </button>
                <button 
                  data-testid="manage-users-btn"
                  className="quick-action-btn"
                  onClick={() => handleQuickAction('manage-users')}
                >
                  <span className="action-icon">👥</span>
                  {t('admin.dashboard.manageUsers')}
                </button>
                <button 
                  data-testid="export-reports-btn"
                  className="quick-action-btn"
                  onClick={() => handleQuickAction('export-reports')}
                >
                  <span className="action-icon">📊</span>
                  {t('admin.dashboard.exportReports')}
                </button>
              </div>
            </div>

            {/* System Status Section */}
            <div data-testid="system-status-section" className="dashboard-section">
              <h2>{t('admin.dashboard.systemStatus')}</h2>
              <div className="system-status">
                <div className="status-item">
                  <div className="status-label">{t('admin.dashboard.lowStockAlerts')}</div>
                  <div className="status-value warning">
                    {systemStatus?.lowStockProducts?.length || 0}
                  </div>
                </div>
                <div className="status-item">
                  <div className="status-label">{t('admin.dashboard.pendingOrders')}</div>
                  <div className="status-value">
                    {systemStatus?.pendingOrdersCount || 0}
                  </div>
                </div>
                <div className="status-item">
                  <div className="status-label">{t('admin.dashboard.newUsersToday')}</div>
                  <div className="status-value success">
                    {systemStatus?.newUsersToday || 0}
                  </div>
                </div>
              </div>
            </div>

            {/* Revenue Chart Placeholder */}
            <div data-testid="revenue-chart-placeholder" className="dashboard-section">
              <h2>{t('admin.dashboard.revenueChart')}</h2>
              <div className="chart-placeholder">
                <div className="chart-placeholder-icon">📈</div>
                <p>{t('admin.dashboard.analyticsComingSoon')}</p>
                <small>{t('admin.dashboard.chartWillBeAvailable')}</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

export default AdminDashboard