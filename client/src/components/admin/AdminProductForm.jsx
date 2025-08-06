import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector, useDispatch } from 'react-redux'
import { createProduct, updateProduct, uploadProductImages, clearUploadedImages } from '../../store/slices/adminProductsSlice'
import ImageUpload from './ImageUpload'
import TagAutocomplete from './TagAutocomplete'
import WholesalerDropdown from './WholesalerDropdown'

const AdminProductForm = ({ product, onSave, onCancel }) => {
  const { t, i18n } = useTranslation()
  const dispatch = useDispatch()
  const { isLoading, error, uploadedImages, uploadProgress } = useSelector(state => state.adminProducts)
  
  // Supported languages for translations
  const supportedLanguages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' }
  ]
  
  // Form state
  const [currentLanguage, setCurrentLanguage] = useState('en')
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    shortDescription: '',
    price: '',
    category: '',
    tags: '',
    wholesaler: {
      name: '',
      email: '',
      productCode: '',
      cost: ''
    },
    isActive: true,
    inStock: true,
    images: [],
    translations: {}
  })
  
  const [errors, setErrors] = useState({})

  // Initialize form data when product prop changes
  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        slug: product.slug || '',
        description: product.description || '',
        shortDescription: product.shortDescription || '',
        price: product.price?.toString() || '',
        category: product.category || '',
        tags: product.tags ? product.tags.join(', ') : '',
        wholesaler: {
          name: product.wholesaler?.name || '',
          email: product.wholesaler?.email || '',
          productCode: product.wholesaler?.productCode || '',
          cost: product.wholesaler?.cost?.toString() || ''
        },
        isActive: product.isActive ?? true,
        inStock: product.inStock ?? true,
        images: product.images || [],
        translations: product.translations || {}
      })
    }
  }, [product])

  // Sync uploaded images from Redux to form data
  useEffect(() => {
    if (uploadedImages && uploadedImages.length > 0) {
      // Transform uploaded images to match Product schema format
      const transformedImages = uploadedImages.map((uploadedImage, index) => ({
        url: uploadedImage.url,
        alt: uploadedImage.originalName || `Product image ${index + 1}`,
        isPrimary: formData.images.length === 0 && index === 0 // First image is primary if no existing images
      }))
      
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...transformedImages]
      }))
      // Clear uploaded images from Redux after adding to form
      dispatch(clearUploadedImages())
    }
  }, [uploadedImages, dispatch, formData.images.length])

  // Generate slug from name
  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .trim()
  }

  // Parse tags from comma-separated string to array
  const parseTags = (tagsString) => {
    if (!tagsString || typeof tagsString !== 'string') {
      return []
    }
    return tagsString
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)
  }

  // Handle form field changes
  const handleInputChange = (field, value) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value }
      
      // Auto-generate slug when name changes
      if (field === 'name' && !product) {
        newData.slug = generateSlug(value)
      }
      
      // Auto-generate shortDescription from description if empty
      if (field === 'description' && !newData.shortDescription) {
        newData.shortDescription = value.substring(0, 200)
      }
      
      // Auto-generate wholesaler product code from name if empty
      if (field === 'name' && !newData.wholesaler.productCode) {
        newData.wholesaler.productCode = generateSlug(value).toUpperCase()
      }
      
      return newData
    })
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }))
    }
    
    // Clear wholesaler errors when updating wholesaler fields
    if (field === 'wholesaler') {
      const wholesalerErrors = Object.keys(errors).filter(key => key.startsWith('wholesaler.'))
      if (wholesalerErrors.length > 0) {
        setErrors(prev => {
          const newErrors = { ...prev }
          wholesalerErrors.forEach(key => delete newErrors[key])
          return newErrors
        })
      }
    }
  }

  // Handle wholesaler field changes specifically
  const handleWholesalerChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      wholesaler: {
        ...prev.wholesaler,
        [field]: value
      }
    }))
    
    // Clear error for this wholesaler field
    const errorKey = `wholesaler.${field}`
    if (errors[errorKey]) {
      setErrors(prev => ({ ...prev, [errorKey]: null }))
    }
  }

  // Handle translation changes
  const handleTranslationChange = (language, field, value) => {
    setFormData(prev => ({
      ...prev,
      translations: {
        ...prev.translations,
        [language]: {
          ...prev.translations[language],
          [field]: value
        }
      }
    }))
  }

  // Handle image upload
  const handleImageUpload = async (event) => {
    const files = Array.from(event.target.files)
    
    // Upload images to get URLs
    if (files.length > 0) {
      try {
        const result = await dispatch(uploadProductImages(files)).unwrap()
        // Images will be added to formData via the useEffect that watches uploadedImages
      } catch (error) {
        console.error('Failed to upload images:', error)
        // Show user-friendly error message based on error type
        let errorMessage = t('admin.products.imageUploadError') || 'Failed to upload images. Please try again.'
        
        if (error?.response?.data?.error?.code === 'FILE_TOO_LARGE') {
          errorMessage = t('admin.products.fileTooLarge') || 'File size exceeds 10MB limit. Please use smaller images.'
        } else if (error?.response?.data?.error?.code === 'TOO_MANY_FILES') {
          errorMessage = t('admin.products.tooManyFiles') || 'Maximum 10 files allowed at once.'
        } else if (error?.response?.data?.error?.code === 'INVALID_FILE_TYPE') {
          errorMessage = t('admin.products.invalidFileType') || 'Only image files (JPG, PNG, GIF, WebP) are allowed.'
        }
        
        alert(errorMessage)
      }
    }
  }

  // Remove uploaded image
  const removeImage = (index) => {
    // Since we're using Redux state, we need to update formData images
    const updatedImages = formData.images.filter((_, i) => i !== index)
    setFormData(prev => ({ ...prev, images: updatedImages }))
  }

  // Validate form
  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.name.trim()) {
      newErrors.name = t('errors.requiredField')
    }
    
    if (!formData.description.trim()) {
      newErrors.description = t('errors.requiredField')
    }
    
    if (!formData.shortDescription.trim()) {
      newErrors.shortDescription = t('errors.requiredField')
    }
    
    if (!formData.price || isNaN(parseFloat(formData.price))) {
      newErrors.price = t('errors.requiredField')
    }
    
    if (!formData.category) {
      newErrors.category = t('errors.requiredField')
    }
    
    // Validate wholesaler fields
    if (!formData.wholesaler.name.trim()) {
      newErrors['wholesaler.name'] = t('errors.requiredField')
    }
    
    if (!formData.wholesaler.email.trim()) {
      newErrors['wholesaler.email'] = t('errors.requiredField')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.wholesaler.email)) {
      newErrors['wholesaler.email'] = t('errors.invalidEmail')
    }
    
    if (!formData.wholesaler.productCode.trim()) {
      newErrors['wholesaler.productCode'] = t('errors.requiredField')
    }
    
    if (!formData.wholesaler.cost || isNaN(parseFloat(formData.wholesaler.cost))) {
      newErrors['wholesaler.cost'] = t('errors.requiredField')
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle image upload
  const handleImageUploadToServer = async (files) => {
    try {
      await dispatch(uploadProductImages(files)).unwrap()
    } catch (error) {
      console.error('Failed to upload images:', error)
    }
  }

  // Handle form submission
  const handleSubmit = async (event) => {
    event.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    const submitData = {
      ...formData,
      price: parseFloat(formData.price),
      tags: parseTags(formData.tags),
      wholesaler: {
        ...formData.wholesaler,
        cost: parseFloat(formData.wholesaler.cost)
      }
    }
    
    
    try {
      let result
      if (product) {
        // Update existing product
        result = await dispatch(updateProduct({ id: product._id, data: submitData }))
      } else {
        // Create new product
        result = await dispatch(createProduct(submitData))
      }
      
      // Check if the action was fulfilled (for Redux Toolkit async thunks)
      if (result.type && result.type.endsWith('/fulfilled')) {
        // Success case - call parent callback if provided
        if (onSave) {
          onSave(submitData)
        }
        
        // Show success feedback if no callback provided
        if (!onSave) {
          console.log('Product saved successfully')
        }
      } else if (result.type && result.type.endsWith('/rejected')) {
        // Handle rejection case
        console.error('Failed to save product:', result.payload)
      } else {
        // Fallback for non-RTK async thunks or different dispatch implementations
        // Try unwrap if available, otherwise assume success
        try {
          if (result.unwrap) {
            await result.unwrap()
          }
          
          // Success case - call parent callback if provided
          if (onSave) {
            onSave(submitData)
          }
          
          // Show success feedback if no callback provided
          if (!onSave) {
            console.log('Product saved successfully')
          }
        } catch (unwrapError) {
          console.error('Failed to save product:', unwrapError)
        }
      }
    } catch (error) {
      console.error('Failed to save product:', error)
      // The error should be handled by the Redux slice and displayed via the error state
    }
  }

  // Get current translation or fallback to main fields
  const getCurrentTranslation = (field) => {
    return formData.translations[currentLanguage]?.[field] || 
           (currentLanguage === 'en' ? formData[field] : '')
  }

  if (isLoading) {
    return (
      <div className="admin-product-form-loading">
        <p>{t('common.loading')}</p>
      </div>
    )
  }

  return (
    <div className="admin-product-form">
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="product-form">
        {/* Language Tabs */}
        <div className="language-tabs">
          {supportedLanguages.map((lang) => (
            <button
              key={lang.code}
              type="button"
              className={`language-tab ${currentLanguage === lang.code ? 'active' : ''}`}
              onClick={() => setCurrentLanguage(lang.code)}
            >
              {lang.name}
            </button>
          ))}
        </div>

        {/* Basic Information */}
        <div className="form-section">
          <h3>{t('Product Information')}</h3>
          
          <div className="form-group">
            <label htmlFor="product-name">
              {t('products.title')} *
            </label>
            <input
              id="product-name"
              type="text"
              value={currentLanguage === 'en' ? formData.name : getCurrentTranslation('name')}
              onChange={(e) => {
                if (currentLanguage === 'en') {
                  handleInputChange('name', e.target.value)
                } else {
                  handleTranslationChange(currentLanguage, 'name', e.target.value)
                }
              }}
              className={errors.name ? 'error' : ''}
            />
            {errors.name && <span className="error-text">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="product-slug">
              {t('Slug')}
            </label>
            <input
              id="product-slug"
              type="text"
              value={formData.slug}
              onChange={(e) => handleInputChange('slug', e.target.value)}
              disabled={!!product} // Only editable for new products
            />
          </div>

          <div className="form-group">
            <label htmlFor="product-description">
              {t('Description')} *
            </label>
            <textarea
              id="product-description"
              value={currentLanguage === 'en' ? formData.description : getCurrentTranslation('description')}
              onChange={(e) => {
                if (currentLanguage === 'en') {
                  handleInputChange('description', e.target.value)
                } else {
                  handleTranslationChange(currentLanguage, 'description', e.target.value)
                }
              }}
              rows={4}
              className={errors.description ? 'error' : ''}
            />
            {errors.description && <span className="error-text">{errors.description}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="product-short-description">
              {t('Short Description')} *
            </label>
            <input
              id="product-short-description"
              type="text"
              value={formData.shortDescription}
              onChange={(e) => handleInputChange('shortDescription', e.target.value)}
              className={errors.shortDescription ? 'error' : ''}
              maxLength={200}
              placeholder={t('Brief product summary (max 200 characters)')}
            />
            {errors.shortDescription && <span className="error-text">{errors.shortDescription}</span>}
          </div>
        </div>

        {/* Pricing and Category */}
        <div className="form-section">
          <h3>{t('Pricing & Category')}</h3>
          
          <div className="form-group">
            <label htmlFor="product-price">
              {t('products.price')} * (USD)
            </label>
            <input
              id="product-price"
              type="number"
              step="0.01"
              min="0"
              value={formData.price}
              onChange={(e) => handleInputChange('price', e.target.value)}
              className={errors.price ? 'error' : ''}
            />
            {errors.price && <span className="error-text">{errors.price}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="product-category">
              {t('Category')} *
            </label>
            <select
              id="product-category"
              value={formData.category}
              onChange={(e) => handleInputChange('category', e.target.value)}
              className={errors.category ? 'error' : ''}
            >
              <option value="">{t('Select Category')}</option>
              <option value="crystals">{t('products.categories.crystals')}</option>
              <option value="herbs">{t('products.categories.herbs')}</option>
              <option value="oils">{t('products.categories.oils')}</option>
              <option value="books">{t('products.categories.books')}</option>
              <option value="accessories">{t('products.categories.accessories')}</option>
            </select>
            {errors.category && <span className="error-text">{errors.category}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="product-tags">
              Tags
            </label>
            <TagAutocomplete
              value={formData.tags}
              onChange={(value) => handleInputChange('tags', value)}
              placeholder="Type to search tags (e.g. crystal, healing, meditation)"
            />
          </div>
        </div>

        {/* Wholesaler Information */}
        <div className="form-section">
          <h3>{t('Wholesaler Information')}</h3>
          
          <div className="form-group">
            <label htmlFor="wholesaler-dropdown">
              {t('Select Wholesaler')} *
            </label>
            <WholesalerDropdown
              value={formData.wholesaler}
              onChange={(wholesaler) => {
                setFormData(prev => ({
                  ...prev,
                  wholesaler: {
                    ...prev.wholesaler,
                    name: wholesaler.name,
                    email: wholesaler.email
                  }
                }))
                // Clear wholesaler errors
                setErrors(prev => {
                  const newErrors = { ...prev }
                  delete newErrors['wholesaler.name']
                  delete newErrors['wholesaler.email']
                  return newErrors
                })
              }}
            />
            {(errors['wholesaler.name'] || errors['wholesaler.email']) && (
              <span className="error-text">Please select or add a wholesaler</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="wholesaler-product-code">
              {t('Product Code')} *
            </label>
            <input
              id="wholesaler-product-code"
              type="text"
              value={formData.wholesaler.productCode}
              onChange={(e) => handleWholesalerChange('productCode', e.target.value)}
              className={errors['wholesaler.productCode'] ? 'error' : ''}
              placeholder={t('SKU or product code from wholesaler')}
            />
            {errors['wholesaler.productCode'] && <span className="error-text">{errors['wholesaler.productCode']}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="wholesaler-cost">
              {t('Wholesale Cost')} * (USD)
            </label>
            <input
              id="wholesaler-cost"
              type="number"
              step="0.01"
              min="0"
              value={formData.wholesaler.cost}
              onChange={(e) => handleWholesalerChange('cost', e.target.value)}
              className={errors['wholesaler.cost'] ? 'error' : ''}
              placeholder={t('Cost from wholesaler')}
            />
            {errors['wholesaler.cost'] && <span className="error-text">{errors['wholesaler.cost']}</span>}
          </div>
        </div>

        {/* Images */}
        <div className="form-section">
          <h3>{t('Image Upload')}</h3>
          
          <div className="image-upload-area">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              id="image-upload"
              style={{ display: 'none' }}
              disabled={isLoading}
            />
            <label htmlFor="image-upload" className="btn btn-secondary" style={{ cursor: 'pointer' }}>
              {isLoading ? t('common.loading') : t('admin.products.uploadImages')}
            </label>
            
            {/* Upload Progress */}
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="upload-progress">
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <span>{uploadProgress}%</span>
              </div>
            )}
            
            {/* Existing Images */}
            {formData.images.length > 0 && (
              <div className="existing-images">
                <h4>{t('Current Images')}</h4>
                <div className="image-grid">
                  {formData.images.map((image, index) => (
                    <div key={index} className="image-preview">
                      <img src={image.url} alt={image.alt} />
                      <button
                        type="button"
                        onClick={() => {
                          const newImages = formData.images.filter((_, i) => i !== index)
                          handleInputChange('images', newImages)
                        }}
                        className="remove-image"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Uploaded Images */}
            {uploadedImages.length > 0 && (
              <div className="uploaded-images">
                <h4>{t('Newly Uploaded')}</h4>
                <div className="image-grid">
                  {uploadedImages.map((image, index) => (
                    <div key={index} className="image-preview">
                      {image.url ? (
                        <img src={image.url} alt={image.alt || 'Uploaded image'} />
                      ) : (
                        <span>{image.filename || image.name || `Image ${index + 1}`}</span>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          const newUploadedImages = uploadedImages.filter((_, i) => i !== index)
                          // Update the Redux state by dispatching the clear action and re-setting
                          dispatch(clearUploadedImages())
                          if (newUploadedImages.length > 0) {
                            // We need to update Redux state with remaining images
                            // For now, just remove from local state
                          }
                        }}
                        className="remove-image"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Status */}
        <div className="form-section">
          <h3>{t('Status')}</h3>
          
          <div className="form-group checkbox-group">
            <label htmlFor="product-active">
              <input
                id="product-active"
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => handleInputChange('isActive', e.target.checked)}
              />
              {t('admin.products.active')}
            </label>
          </div>

          <div className="form-group checkbox-group">
            <label htmlFor="product-instock">
              <input
                id="product-instock"
                type="checkbox"
                checked={formData.inStock}
                onChange={(e) => handleInputChange('inStock', e.target.checked)}
              />
              {t('products.inStock')}
            </label>
          </div>
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={isLoading}>
            {isLoading ? t('common.loading') : t('common.save')}
          </button>
          
          {onCancel && (
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              {t('common.cancel')}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

export default AdminProductForm