import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector, useDispatch } from 'react-redux'
import { createProduct, updateProduct, uploadProductImages } from '../../store/slices/adminProductsSlice'
import ImageUpload from './ImageUpload'

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
    price: '',
    category: '',
    isActive: true,
    inStock: true,
    images: [],
    translations: {}
  })
  
  const [errors, setErrors] = useState({})
  const [uploadedImages, setUploadedImages] = useState([])

  // Initialize form data when product prop changes
  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        slug: product.slug || '',
        description: product.description || '',
        price: product.price?.toString() || '',
        category: product.category || '',
        isActive: product.isActive ?? true,
        inStock: product.inStock ?? true,
        images: product.images || [],
        translations: product.translations || {}
      })
    }
  }, [product])

  // Generate slug from name
  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .trim()
  }

  // Handle form field changes
  const handleInputChange = (field, value) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value }
      
      // Auto-generate slug when name changes
      if (field === 'name' && !product) {
        newData.slug = generateSlug(value)
      }
      
      return newData
    })
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }))
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
    setUploadedImages(prev => [...prev, ...files])
    
    // Immediately upload images to get URLs
    if (files.length > 0) {
      try {
        await dispatch(uploadProductImages(files)).unwrap()
      } catch (error) {
        console.error('Failed to upload images:', error)
      }
    }
  }

  // Remove uploaded image
  const removeImage = (index) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index))
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
    
    if (!formData.price || isNaN(parseFloat(formData.price))) {
      newErrors.price = t('errors.requiredField')
    }
    
    if (!formData.category) {
      newErrors.category = t('errors.requiredField')
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
    
    // Upload any pending images first
    if (uploadedImages.length > 0) {
      await handleImageUploadToServer(uploadedImages)
    }
    
    const submitData = {
      ...formData,
      price: parseFloat(formData.price),
      images: [...formData.images, ...uploadedImages.map(file => ({
        url: `/images/products/${file.name}`,
        alt: `${formData.name} image`,
        isPrimary: formData.images.length === 0
      }))]
    }
    
    try {
      if (product) {
        // Update existing product
        await dispatch(updateProduct({ id: product._id, data: submitData })).unwrap()
      } else {
        // Create new product
        await dispatch(createProduct(submitData)).unwrap()
      }
      
      // Call parent callback if provided
      if (onSave) {
        onSave(submitData)
      }
    } catch (error) {
      console.error('Failed to save product:', error)
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
              className="hidden"
              disabled={isLoading}
            />
            <label htmlFor="image-upload" className="upload-button">
              {isLoading ? t('common.uploading') : t('Upload Images')}
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
                  {uploadedImages.map((file, index) => (
                    <div key={index} className="image-preview">
                      <span>{file.name}</span>
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
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