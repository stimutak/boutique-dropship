import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import './ImageUpload.css';

const ImageUpload = ({ onUploadComplete, maxFiles = 10, maxSizeMB = 5 }) => {
  const { t } = useTranslation();
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const token = useSelector(state => state.auth?.token);

  const validateFile = (file) => {
    const errors = [];
    
    // Check file type
    if (!file.type.startsWith('image/')) {
      errors.push(t('admin.products.imageUpload.onlyImageFiles'));
    }
    
    // Check file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      errors.push(t('admin.products.imageUpload.fileTooLarge', { maxSize: maxSizeMB }));
    }
    
    return errors;
  };

  const handleFileSelect = (files) => {
    const fileArray = Array.from(files);
    
    // Check max files limit
    if (fileArray.length > maxFiles) {
      setErrors([t('admin.products.imageUpload.maxImages', { max: maxFiles })]);
      return;
    }

    // Validate each file
    const newErrors = [];
    const validFiles = [];
    
    fileArray.forEach(file => {
      const fileErrors = validateFile(file);
      if (fileErrors.length > 0) {
        newErrors.push(...fileErrors);
      } else {
        validFiles.push(file);
      }
    });

    setErrors(newErrors);
    
    if (validFiles.length > 0) {
      setSelectedFiles(validFiles);
      
      // Generate previews
      const previewPromises = validFiles.map(file => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.readAsDataURL(file);
        });
      });
      
      Promise.all(previewPromises).then(newPreviews => {
        setPreviews(newPreviews);
      });
    }
  };

  const handleInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const removeFile = (index) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    setPreviews(newPreviews);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setErrors([]);

    try {
      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append('images', file);
      });

      const response = await fetch('/api/admin/products/images', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      
      if (data.success) {
        onUploadComplete(data.images);
        // Reset state after successful upload
        setSelectedFiles([]);
        setPreviews([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        throw new Error(data.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setErrors([t('admin.products.imageUpload.uploadFailed')]);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="image-upload-container">
      <div
        className={`image-drop-zone ${dragOver ? 'drag-over' : ''}`}
        data-testid="image-drop-zone"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          id="image-upload"
          data-testid="image-upload-input"
          multiple
          accept="image/*"
          onChange={handleInputChange}
          style={{ display: 'none' }}
        />
        
        <label htmlFor="image-upload" className="upload-button">
          {t('admin.products.imageUpload.uploadImages')}
        </label>

        {errors.length > 0 && (
          <div className="upload-errors">
            {errors.map((error, index) => (
              <div key={index} className="error-message">
                {error}
              </div>
            ))}
          </div>
        )}

        {selectedFiles.length > 0 && (
          <div className="selected-files">
            <h4>{t('admin.products.imageUpload.selectedFiles')}</h4>
            <div className="file-list">
              {selectedFiles.map((file, index) => (
                <div key={index} className="file-item">
                  {previews[index] && (
                    <img
                      src={previews[index]}
                      alt={file.name}
                      className="file-preview"
                    />
                  )}
                  <span className="file-name">{file.name}</span>
                  <button
                    type="button"
                    data-testid={`remove-file-${index}`}
                    onClick={() => removeFile(index)}
                    className="remove-file"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            
            <button
              type="button"
              onClick={handleUpload}
              disabled={uploading}
              className="start-upload-button"
            >
              {uploading 
                ? t('admin.products.imageUpload.uploading') 
                : t('admin.products.imageUpload.startUpload')
              }
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageUpload;