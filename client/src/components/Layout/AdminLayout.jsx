import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import './AdminLayout.css'

const AdminLayout = ({ children }) => {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const { user } = useSelector(state => state.auth)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Determine if current language is RTL
  const isRTL = ['ar', 'he'].includes(i18n.language)

  const navigationItems = [
    {
      path: '/admin/dashboard',
      label: t('admin.navigation.dashboard'),
      icon: '📊'
    },
    {
      path: '/admin/products',
      label: t('admin.navigation.products'),
      icon: '📦'
    },
    {
      path: '/admin/orders',
      label: t('admin.navigation.orders'),
      icon: '📋'
    },
    {
      path: '/admin/reviews',
      label: t('admin.navigation.reviews'),
      icon: '⭐'
    },
    {
      path: '/admin/users',
      label: t('admin.navigation.users'),
      icon: '👥'
    },
    {
      path: '/admin/settings',
      label: t('admin.navigation.settings'),
      icon: '⚙️'
    }
  ]

  const isActivePath = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  return (
    <div className={`admin-layout ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Admin Sidebar */}
      <aside className={`admin-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="admin-sidebar-header">
          <h2 className="admin-logo">
            {sidebarCollapsed ? 'A' : t('admin.dashboard.title')}
          </h2>
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            aria-label="Toggle sidebar"
          >
            {sidebarCollapsed ? '→' : '←'}
          </button>
        </div>

        <nav className="admin-nav">
          <ul className="admin-nav-list">
            {navigationItems.map((item) => (
              <li key={item.path} className="admin-nav-item">
                <Link
                  to={item.path}
                  className={`admin-nav-link ${isActivePath(item.path) ? 'active' : ''}`}
                  title={sidebarCollapsed ? item.label : ''}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {!sidebarCollapsed && <span className="nav-label">{item.label}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="admin-main">
        {/* Admin Header */}
        <header className="admin-header">
          <div className="admin-header-content">
            <h1 className="admin-page-title">
              {t('admin.dashboard.title')}
            </h1>
            
            <div className="admin-header-actions">
              <div className="admin-user-info">
                <span className="admin-user-name">
                  {user?.firstName || 'Admin'}
                </span>
                <span className="admin-user-role">
                  {t('admin.users.admin')}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="admin-main-content">
          {children}
        </main>
      </div>
    </div>
  )
}

export default AdminLayout