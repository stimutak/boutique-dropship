import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'

const AdminUserList = () => {
  const { t } = useTranslation()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const token = useSelector(state => state.auth?.token)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch users')
      }
      
      const data = await response.json()
      setUsers(data.users || [])
    } catch (err) {
      console.error('Error fetching users:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: !currentStatus })
      })
      
      if (!response.ok) {
        throw new Error('Failed to update user status')
      }
      
      // Refresh user list
      fetchUsers()
    } catch (err) {
      console.error('Error updating user status:', err)
      alert('Failed to update user status')
    }
  }

  if (loading) return <div>{t('common.loading')}</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div className="admin-user-list">
      <h2>{t('admin.users.title')} ({users.length})</h2>
      
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #ddd' }}>
            <th style={{ padding: '10px', textAlign: 'left' }}>{t('admin.users.email')}</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>{t('admin.users.name')}</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>{t('admin.users.role')}</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>{t('admin.users.status')}</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>{t('admin.users.registered')}</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>{t('common.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user._id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '10px' }}>{user.email}</td>
              <td style={{ padding: '10px' }}>{user.firstName} {user.lastName}</td>
              <td style={{ padding: '10px' }}>
                <span style={{ 
                  padding: '2px 8px', 
                  borderRadius: '4px',
                  backgroundColor: user.isAdmin ? '#6b46c1' : '#e5e7eb',
                  color: user.isAdmin ? 'white' : 'black',
                  fontSize: '0.875rem'
                }}>
                  {user.isAdmin ? t('admin.users.admin') : t('admin.users.customer')}
                </span>
              </td>
              <td style={{ padding: '10px' }}>
                <span style={{ 
                  padding: '2px 8px', 
                  borderRadius: '4px',
                  backgroundColor: user.isActive ? '#10b981' : '#ef4444',
                  color: 'white',
                  fontSize: '0.875rem'
                }}>
                  {user.isActive ? t('admin.users.active') : t('admin.users.inactive')}
                </span>
              </td>
              <td style={{ padding: '10px' }}>
                {new Date(user.createdAt).toLocaleDateString()}
              </td>
              <td style={{ padding: '10px' }}>
                <button
                  onClick={() => toggleUserStatus(user._id, user.isActive)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: user.isActive ? '#ef4444' : '#10b981',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '0.875rem'
                  }}
                >
                  {user.isActive ? t('admin.users.deactivate') : t('admin.users.activate')}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default AdminUserList