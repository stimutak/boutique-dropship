import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { updateProfile, clearError } from '../store/slices/authSlice'

const Profile = () => {
  const dispatch = useDispatch()
  const { user, isLoading, error } = useSelector(state => state.auth)
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    addresses: [{
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'US'
    }]
  })

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        addresses: user.addresses && user.addresses.length > 0 
          ? user.addresses 
          : [{
              street: '',
              city: '',
              state: '',
              zipCode: '',
              country: 'US'
            }]
      })
    }
    
    return () => {
      dispatch(clearError())
    }
  }, [user, dispatch])

  const handleChange = (e) => {
    const { name, value } = e.target
    
    if (name.startsWith('address.')) {
      const field = name.split('.')[1]
      setFormData(prev => ({
        ...prev,
        addresses: [{
          ...prev.addresses[0],
          [field]: value
        }]
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    dispatch(updateProfile(formData))
  }

  return (
    <div className="profile-page">
      <div className="container">
        <h1>My Profile</h1>
        
        <form onSubmit={handleSubmit} className="profile-form">
          {/* Personal Information */}
          <section className="form-section">
            <h2>Personal Information</h2>
            
            <div className="form-row">
              <div className="form-group">
                <label>First Name</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Phone</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>
          </section>

          {/* Address Information */}
          <section className="form-section">
            <h2>Default Address</h2>
            
            <div className="form-group">
              <label>Street Address</label>
              <input
                type="text"
                name="address.street"
                value={formData.addresses[0]?.street || ''}
                onChange={handleChange}
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>City</label>
                <input
                  type="text"
                  name="address.city"
                  value={formData.addresses[0]?.city || ''}
                  onChange={handleChange}
                />
              </div>
              
              <div className="form-group">
                <label>State</label>
                <input
                  type="text"
                  name="address.state"
                  value={formData.addresses[0]?.state || ''}
                  onChange={handleChange}
                />
              </div>
              
              <div className="form-group">
                <label>ZIP Code</label>
                <input
                  type="text"
                  name="address.zipCode"
                  value={formData.addresses[0]?.zipCode || ''}
                  onChange={handleChange}
                />
              </div>
            </div>
          </section>

          {error && <div className="error">{error}</div>}
          
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={isLoading}
          >
            {isLoading ? 'Updating...' : 'Update Profile'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default Profile