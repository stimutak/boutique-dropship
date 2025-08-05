import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import AdminLayout from '../../components/Layout/AdminLayout'
import {
  setSettingsLoading,
  setSettingsError,
  setSettingsCategories,
  setSettingsByCategory,
  setSelectedCategory,
  setSettingValue,
  commitSettingChange,
  revertSettingChange,
  clearAllSettingChanges,
  updateSettingInCategory
} from '../../store/slices/adminSlice'
import './AdminSettings.css'

// Settings form input components
const SettingsFormInput = ({ setting, value, onChange, onRevert, hasChanges, error }) => {
  const { t } = useTranslation()

  const renderInput = () => {
    const inputValue = value !== undefined ? value : setting.value
    
    switch (setting.inputType) {
      case 'boolean':
        return (
          <div className="settings-input-wrapper">
            <label className="settings-toggle">
              <input
                type="checkbox"
                checked={inputValue || false}
                onChange={(e) => onChange(setting.key, e.target.checked)}
                className="settings-toggle-input"
              />
              <span className="settings-toggle-slider"></span>
            </label>
          </div>
        )

      case 'number':
        return (
          <input
            type="number"
            value={inputValue || ''}
            onChange={(e) => onChange(setting.key, parseFloat(e.target.value) || 0)}
            className={`settings-input ${error ? 'error' : ''}`}
            min={setting.validation?.min}
            max={setting.validation?.max}
            step={setting.validation?.step || 1}
          />
        )

      case 'select':
        return (
          <select
            value={inputValue || ''}
            onChange={(e) => onChange(setting.key, e.target.value)}
            className={`settings-select ${error ? 'error' : ''}`}
          >
            {setting.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )

      case 'multiselect':
        return (
          <div className="settings-multiselect">
            {setting.options?.map((option) => (
              <label key={option.value} className="settings-checkbox-label">
                <input
                  type="checkbox"
                  checked={(inputValue || []).includes(option.value)}
                  onChange={(e) => {
                    const currentValues = inputValue || []
                    const newValues = e.target.checked
                      ? [...currentValues, option.value]
                      : currentValues.filter(v => v !== option.value)
                    onChange(setting.key, newValues)
                  }}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        )

      case 'textarea':
        return (
          <textarea
            value={inputValue || ''}
            onChange={(e) => onChange(setting.key, e.target.value)}
            className={`settings-textarea ${error ? 'error' : ''}`}
            rows={4}
            maxLength={setting.validation?.maxLength}
          />
        )

      case 'email':
        return (
          <input
            type="email"
            value={inputValue || ''}
            onChange={(e) => onChange(setting.key, e.target.value)}
            className={`settings-input ${error ? 'error' : ''}`}
            maxLength={setting.validation?.maxLength}
          />
        )

      case 'url':
        return (
          <input
            type="url"
            value={inputValue || ''}
            onChange={(e) => onChange(setting.key, e.target.value)}
            className={`settings-input ${error ? 'error' : ''}`}
            maxLength={setting.validation?.maxLength}
          />
        )

      case 'password':
        return (
          <input
            type="password"
            value={inputValue || ''}
            onChange={(e) => onChange(setting.key, e.target.value)}
            className={`settings-input ${error ? 'error' : ''}`}
            maxLength={setting.validation?.maxLength}
            autoComplete="new-password"
          />
        )

      case 'color':
        return (
          <div className="settings-color-input">
            <input
              type="color"
              value={inputValue || '#000000'}
              onChange={(e) => onChange(setting.key, e.target.value)}
              className="settings-color-picker"
            />
            <input
              type="text"
              value={inputValue || ''}
              onChange={(e) => onChange(setting.key, e.target.value)}
              className={`settings-input ${error ? 'error' : ''}`}
              placeholder="#000000"
              pattern="^#[0-9A-Fa-f]{6}$"
            />
          </div>
        )

      case 'json':
        return (
          <textarea
            value={inputValue ? JSON.stringify(inputValue, null, 2) : ''}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value)
                onChange(setting.key, parsed)
              } catch (err) {
                // Handle JSON parsing errors
                onChange(setting.key, e.target.value)
              }
            }}
            className={`settings-textarea settings-json ${error ? 'error' : ''}`}
            rows={6}
            spellCheck="false"
          />
        )

      default: // text
        return (
          <input
            type="text"
            value={inputValue || ''}
            onChange={(e) => onChange(setting.key, e.target.value)}
            className={`settings-input ${error ? 'error' : ''}`}
            maxLength={setting.validation?.maxLength}
          />
        )
    }
  }

  return (
    <div className="settings-form-group">
      <div className="settings-form-header">
        <label className="settings-label">
          {setting.label}
          {setting.validation?.required && <span className="required">*</span>}
        </label>
        {hasChanges && (
          <button
            type="button"
            onClick={() => onRevert(setting.key)}
            className="settings-revert-btn"
            title={t('admin.settings.revertToOriginal')}
          >
            {t('admin.settings.revert')}
          </button>
        )}
      </div>
      
      {setting.description && (
        <p className="settings-description">{setting.description}</p>
      )}
      
      {renderInput()}
      
      {error && (
        <span className="settings-error-message">{error}</span>
      )}
      
      {setting.requiresRestart && hasChanges && (
        <span className="settings-restart-warning">
          {t('admin.settings.requiresRestart')}
        </span>
      )}
    </div>
  )
}

// Category navigation component
const SettingsCategories = ({ categories, selectedCategory, onCategorySelect, hasUnsavedChanges }) => {
  const { t } = useTranslation()

  return (
    <div className="settings-categories">
      <h3 className="settings-categories-title">{t('admin.settings.categories')}</h3>
      <ul className="settings-categories-list">
        {categories.map((category) => (
          <li key={category} className="settings-category-item">
            <button
              type="button"
              onClick={() => onCategorySelect(category)}
              className={`settings-category-btn ${selectedCategory === category ? 'active' : ''}`}
            >
              {t(`admin.settings.categoryNames.${category}`)}
              {hasUnsavedChanges && (
                <span className="unsaved-indicator" title={t('admin.settings.unsavedChanges')}>
                  •
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

const AdminSettings = () => {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const { token } = useSelector(state => state.auth)
  
  const {
    categories,
    settingsByCategory,
    selectedCategory,
    loading,
    error,
    changes,
    hasUnsavedChanges
  } = useSelector(state => state.admin.settings)

  const [validationErrors, setValidationErrors] = useState({})
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Fetch settings data
  const fetchSettings = useCallback(async () => {
    try {
      dispatch(setSettingsLoading(true))
      dispatch(setSettingsError(null))

      const response = await fetch('/api/settings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error(t('admin.settings.fetchError'))
      }

      const data = await response.json()
      
      // The API returns settings already grouped by category
      const settingsByCategory = data.data.settings
      const categoryList = data.data.categories
      
      dispatch(setSettingsCategories(categoryList))
      dispatch(setSettingsByCategory(settingsByCategory))
    } catch (err) {
      console.error('Error fetching settings:', err)
      dispatch(setSettingsError(err.message))
    } finally {
      dispatch(setSettingsLoading(false))
    }
  }, [dispatch, token, t])

  // Load settings on component mount
  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  // Handle setting value change
  const handleSettingChange = (key, value) => {
    dispatch(setSettingValue({ key, value }))
    
    // Clear validation error for this field
    if (validationErrors[key]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[key]
        return newErrors
      })
    }
  }

  // Handle reverting a single setting
  const handleRevertSetting = (key) => {
    dispatch(revertSettingChange({ key }))
  }

  // Handle category selection
  const handleCategorySelect = (category) => {
    dispatch(setSelectedCategory(category))
  }

  // Validate settings
  const validateSettings = (settingsToValidate) => {
    const errors = {}
    
    settingsToValidate.forEach(setting => {
      const value = changes[setting.key] !== undefined ? changes[setting.key] : setting.value;
      
      if (setting.validation?.required && (!value || value === '')) {
        errors[setting.key] = t('admin.settings.validation.required');
        return;
      }
      
      if (setting.inputType === 'email' && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(value)) {
          errors[setting.key] = t('admin.settings.validation.invalidEmail');
        }
      }
      
      if (setting.inputType === 'url' && value) {
        try {
          new URL(value)
        } catch {
          errors[setting.key] = t('admin.settings.validation.invalidUrl');
        }
      }
      
      if (setting.inputType === 'number' && value !== undefined) {
        if (setting.validation?.min !== undefined && value < setting.validation.min) {
          errors[setting.key] = t('admin.settings.validation.minValue', { min: setting.validation.min });
        }
        if (setting.validation?.max !== undefined && value > setting.validation.max) {
          errors[setting.key] = t('admin.settings.validation.maxValue', { max: setting.validation.max });
        }
      }
      
      if (setting.validation?.minLength && value && value.length < setting.validation.minLength) {
        errors[setting.key] = t('admin.settings.validation.minLength', { min: setting.validation.minLength });
      }
      
      if (setting.validation?.maxLength && value && value.length > setting.validation.maxLength) {
        errors[setting.key] = t('admin.settings.validation.maxLength', { max: setting.validation.maxLength });
      }
    })
    
    return errors;
  }

  // Save settings
  const handleSaveSettings = async () => {
    try {
      const currentSettings = settingsByCategory[selectedCategory] || []
      const errors = validateSettings(currentSettings)
      
      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors)
        return
      }
      
      dispatch(setSettingsLoading(true))
      setValidationErrors({})
      
      // Prepare settings updates
      const updates = Object.entries(changes).map(([key, value]) => ({
        key,
        value
      }))
      
      if (updates.length === 0) {
        return
      }
      
      const response = await fetch('/api/settings/bulk-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ updates })
      })
      
      if (!response.ok) {
        throw new Error(t('admin.settings.saveError'))
      }
      
      const data = await response.json()
      
      // Update Redux state with saved settings
      data.data.successful.forEach(result => {
        dispatch(commitSettingChange({ key: result.key, value: result.newValue }))
        // Find the setting to get its category
        Object.keys(settingsByCategory).forEach(category => {
          const settingIndex = settingsByCategory[category].findIndex(s => s.key === result.key)
          if (settingIndex !== -1) {
            dispatch(updateSettingInCategory({
              category: category,
              key: result.key,
              updates: { value: result.newValue, updatedAt: new Date().toISOString() }
            }))
          }
        })
      })
      
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
      
    } catch (err) {
      console.error('Error saving settings:', err)
      dispatch(setSettingsError(err.message))
    } finally {
      dispatch(setSettingsLoading(false))
    }
  }

  // Save all changes across categories
  const handleSaveAllChanges = async () => {
    try {
      const errors = {}
      
      // Validate all changed settings across categories
      Object.keys(settingsByCategory).forEach(category => {
        const categoryErrors = validateSettings(settingsByCategory[category] || [])
        Object.assign(errors, categoryErrors)
      })
      
      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors)
        return
      }
      
      dispatch(setSettingsLoading(true))
      setValidationErrors({})
      
      const updates = Object.entries(changes).map(([key, value]) => ({
        key,
        value
      }))
      
      const response = await fetch('/api/settings/bulk-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ updates })
      })
      
      if (!response.ok) {
        throw new Error(t('admin.settings.saveError'))
      }
      
      const data = await response.json()
      
      // Update Redux state
      data.data.successful.forEach(result => {
        dispatch(commitSettingChange({ key: result.key, value: result.newValue }))
        // Find the setting to get its category
        Object.keys(settingsByCategory).forEach(category => {
          const settingIndex = settingsByCategory[category].findIndex(s => s.key === result.key)
          if (settingIndex !== -1) {
            dispatch(updateSettingInCategory({
              category: category,
              key: result.key,
              updates: { value: result.newValue, updatedAt: new Date().toISOString() }
            }))
          }
        })
      })
      
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
      
    } catch (err) {
      console.error('Error saving all settings:', err)
      dispatch(setSettingsError(err.message))
    } finally {
      dispatch(setSettingsLoading(false))
    }
  }

  // Revert all changes
  const handleRevertAllChanges = () => {
    dispatch(clearAllSettingChanges())
    setValidationErrors({})
  }

  // Reset category to defaults
  const handleResetCategoryToDefaults = async () => {
    try {
      if (!window.confirm(t('admin.settings.confirmResetCategory'))) {
        return
      }
      
      dispatch(setSettingsLoading(true))
      
      const currentSettings = settingsByCategory[selectedCategory] || []
      const resetPromises = currentSettings.map(async (setting) => {
        const response = await fetch(`/api/settings/${setting.key}/reset`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            reason: `Reset ${selectedCategory} category to defaults`
          })
        })
        
        if (!response.ok) {
          throw new Error(`Failed to reset ${setting.key}`)
        }
        
        return response.json()
      })
      
      await Promise.all(resetPromises)
      
      // Refresh settings to get the reset values
      await fetchSettings()
      dispatch(clearAllSettingChanges())
      setValidationErrors({})
      
    } catch (err) {
      console.error('Error resetting category:', err)
      dispatch(setSettingsError(err.message))
    } finally {
      dispatch(setSettingsLoading(false))
    }
  }

  const currentSettings = settingsByCategory[selectedCategory] || []

  if (loading && categories.length === 0) {
    return (
      <AdminLayout>
        <div className="admin-settings">
          <div className="loading">{t('common.loading')}</div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="admin-settings" data-testid="admin-settings">
        {/* Header */}
        <div className="settings-header">
          <div className="settings-title-section">
            <h1>{t('admin.settings.title')}</h1>
            <p className="settings-subtitle">{t('admin.settings.subtitle')}</p>
          </div>
          
          {hasUnsavedChanges && (
            <div className="settings-actions">
              <button
                type="button"
                onClick={handleRevertAllChanges}
                className="settings-btn settings-btn-secondary"
                disabled={loading}
              >
                {t('admin.settings.revertAll')}
              </button>
              <button
                type="button"
                onClick={handleSaveAllChanges}
                className="settings-btn settings-btn-primary"
                disabled={loading}
              >
                {loading ? t('common.saving') : t('admin.settings.saveAll')}
              </button>
            </div>
          )}
        </div>

        {/* Success message */}
        {saveSuccess && (
          <div className="settings-success-message" data-testid="save-success">
            {t('admin.settings.saveSuccess')}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="settings-error-message" data-testid="settings-error">
            {error}
          </div>
        )}

        {/* Main content */}
        <div className="settings-main-content">
          {/* Categories sidebar */}
          <aside className="settings-sidebar">
            <SettingsCategories
              categories={categories}
              selectedCategory={selectedCategory}
              onCategorySelect={handleCategorySelect}
              hasUnsavedChanges={hasUnsavedChanges}
            />
          </aside>

          {/* Settings form */}
          <main className="settings-content">
            {currentSettings.length === 0 ? (
              <div className="settings-empty-state">
                <p>{t('admin.settings.noSettingsInCategory')}</p>
              </div>
            ) : (
              <>
                <div className="settings-category-header">
                  <h2>{t(`admin.settings.categoryNames.${selectedCategory}`)}</h2>
                  <p className="settings-category-description">
                    {t(`admin.settings.categoryDescriptions.${selectedCategory}`)}
                  </p>
                  
                  <div className="settings-category-actions">
                    <button
                      type="button"
                      onClick={handleResetCategoryToDefaults}
                      className="settings-btn settings-btn-outline"
                      disabled={loading}
                    >
                      {t('admin.settings.resetToDefaults')}
                    </button>
                    
                    <button
                      type="button"
                      onClick={handleSaveSettings}
                      className="settings-btn settings-btn-primary"
                      disabled={loading || Object.keys(changes).length === 0}
                    >
                      {loading ? t('common.saving') : t('admin.settings.saveCategory')}
                    </button>
                  </div>
                </div>

                <form className="settings-form" onSubmit={(e) => e.preventDefault()}>
                  {currentSettings.map((setting) => (
                    <SettingsFormInput
                      key={setting.key}
                      setting={setting}
                      value={changes[setting.key]}
                      onChange={handleSettingChange}
                      onRevert={handleRevertSetting}
                      hasChanges={changes.hasOwnProperty(setting.key)}
                      error={validationErrors[setting.key]}
                    />
                  ))}
                </form>
              </>
            )}
          </main>
        </div>
      </div>
    </AdminLayout>
  )
}

export default AdminSettings