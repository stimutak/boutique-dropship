import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import './WholesalerDropdown.css'

const WholesalerDropdown = ({ value, onChange }) => {
  const { token } = useSelector(state => state.auth)
  const [wholesalers, setWholesalers] = useState([])
  const [showNewForm, setShowNewForm] = useState(false)
  const [selectedWholesaler, setSelectedWholesaler] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [newWholesaler, setNewWholesaler] = useState({
    name: '',
    email: '',
    phone: '',
    website: '',
    notes: ''
  })
  const [errors, setErrors] = useState({})

  // Load existing wholesalers on mount
  useEffect(() => {
    fetchWholesalers()
  }, [])

  // Update parent when selection changes
  useEffect(() => {
    if (selectedWholesaler && selectedWholesaler !== 'new') {
      const wholesaler = wholesalers.find(w => w.email === selectedWholesaler)
      if (wholesaler) {
        onChange({
          name: wholesaler.name,
          email: wholesaler.email
        })
      }
    }
  }, [selectedWholesaler, wholesalers, onChange])

  // Set initial selection based on value prop
  useEffect(() => {
    if (value && value.email) {
      setSelectedWholesaler(value.email)
    }
  }, [value])

  const fetchWholesalers = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/admin/wholesalers', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setWholesalers(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching wholesalers:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectionChange = (e) => {
    const value = e.target.value
    setSelectedWholesaler(value)
    
    if (value === 'new') {
      setShowNewForm(true)
      onChange({ name: '', email: '' })
    } else {
      setShowNewForm(false)
    }
  }

  const validateNewWholesaler = () => {
    const newErrors = {}
    
    if (!newWholesaler.name.trim()) {
      newErrors.name = 'Name is required'
    }
    
    if (!newWholesaler.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newWholesaler.email)) {
      newErrors.email = 'Invalid email format'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleAddWholesaler = async () => {
    if (!validateNewWholesaler()) {
      return
    }
    
    try {
      setIsLoading(true)
      const response = await fetch('/api/admin/wholesalers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newWholesaler)
      })
      
      if (response.ok) {
        const data = await response.json()
        const addedWholesaler = data.data
        
        // Add to local list
        setWholesalers([...wholesalers, addedWholesaler])
        
        // Select the new wholesaler
        setSelectedWholesaler(addedWholesaler.email)
        
        // Update parent
        onChange({
          name: addedWholesaler.name,
          email: addedWholesaler.email
        })
        
        // Reset form
        setShowNewForm(false)
        setNewWholesaler({
          name: '',
          email: '',
          phone: '',
          website: '',
          notes: ''
        })
        setErrors({})
      } else {
        const error = await response.json()
        setErrors({ general: error.message || 'Failed to add wholesaler' })
      }
    } catch (error) {
      console.error('Error adding wholesaler:', error)
      setErrors({ general: 'Failed to add wholesaler' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleNewWholesalerChange = (field, value) => {
    setNewWholesaler(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }))
    }
  }

  return (
    <div className="wholesaler-dropdown">
      <div className="dropdown-container">
        <select
          value={selectedWholesaler}
          onChange={handleSelectionChange}
          className="wholesaler-select"
          disabled={isLoading}
        >
          <option value="">Select a wholesaler</option>
          {wholesalers.map(wholesaler => (
            <option key={wholesaler.email} value={wholesaler.email}>
              {wholesaler.name} ({wholesaler.email})
            </option>
          ))}
          <option value="new">+ Add New Wholesaler</option>
        </select>
      </div>

      {showNewForm && (
        <div className="new-wholesaler-form">
          <h4>Add New Wholesaler</h4>
          
          {errors.general && (
            <div className="error-message">{errors.general}</div>
          )}
          
          <div className="form-row">
            <div className="form-group">
              <label>Name *</label>
              <input
                type="text"
                value={newWholesaler.name}
                onChange={(e) => handleNewWholesalerChange('name', e.target.value)}
                className={errors.name ? 'error' : ''}
                placeholder="Wholesaler company name"
              />
              {errors.name && <span className="error-text">{errors.name}</span>}
            </div>
            
            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                value={newWholesaler.email}
                onChange={(e) => handleNewWholesalerChange('email', e.target.value)}
                className={errors.email ? 'error' : ''}
                placeholder="orders@wholesaler.com"
              />
              {errors.email && <span className="error-text">{errors.email}</span>}
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Phone</label>
              <input
                type="tel"
                value={newWholesaler.phone}
                onChange={(e) => handleNewWholesalerChange('phone', e.target.value)}
                placeholder="+1 234 567 8900"
              />
            </div>
            
            <div className="form-group">
              <label>Website</label>
              <input
                type="url"
                value={newWholesaler.website}
                onChange={(e) => handleNewWholesalerChange('website', e.target.value)}
                placeholder="https://wholesaler.com"
              />
            </div>
          </div>
          
          <div className="form-group">
            <label>Notes</label>
            <textarea
              value={newWholesaler.notes}
              onChange={(e) => handleNewWholesalerChange('notes', e.target.value)}
              placeholder="Additional information about this wholesaler"
              rows={3}
            />
          </div>
          
          <div className="form-actions">
            <button
              type="button"
              onClick={handleAddWholesaler}
              className="btn btn-primary"
              disabled={isLoading}
            >
              {isLoading ? 'Adding...' : 'Add Wholesaler'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowNewForm(false)
                setSelectedWholesaler('')
                setNewWholesaler({
                  name: '',
                  email: '',
                  phone: '',
                  website: '',
                  notes: ''
                })
                setErrors({})
              }}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default WholesalerDropdown