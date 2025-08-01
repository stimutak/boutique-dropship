import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import './BulkImportExport.css';

const BulkImportExport = ({ onImportComplete }) => {
  const { t } = useTranslation();
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [importErrors, setImportErrors] = useState([]);
  const fileInputRef = useRef(null);
  const token = useSelector(state => state.auth?.token);

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      setImportErrors([t('admin.products.bulkImport.csvOnly')]);
      return;
    }

    setImporting(true);
    setImportErrors([]);
    setImportResults(null);

    try {
      const formData = new FormData();
      formData.append('csvFile', file);

      const response = await fetch('/api/admin/products/bulk-import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Import failed');
      }

      const data = await response.json();
      
      if (data.success) {
        setImportResults(data);
        if (onImportComplete) {
          onImportComplete(data);
        }
      } else {
        throw new Error(data.message || 'Import failed');
      }
    } catch (error) {
      console.error('Import error:', error);
      setImportErrors([t('admin.products.bulkImport.importFailed')]);
    } finally {
      setImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleExport = async (filters = {}) => {
    setExporting(true);
    
    try {
      const queryParams = new URLSearchParams(filters).toString();
      const url = `/api/admin/products/export${queryParams ? `?${queryParams}` : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Get filename from content-disposition header
      const contentDisposition = response.headers.get('content-disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : 'products-export.csv';

      // Create blob and download
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
    } catch (error) {
      console.error('Export error:', error);
      setImportErrors([t('admin.products.bulkImport.exportFailed')]);
    } finally {
      setExporting(false);
    }
  };

  const downloadTemplate = () => {
    const headers = [
      'name', 'slug', 'description', 'short_description', 'price', 'compare_at_price',
      'category', 'tags', 'chakra', 'element', 'zodiac', 'healing', 'origin', 'size', 'weight',
      'wholesaler_name', 'wholesaler_email', 'wholesaler_product_code', 'wholesaler_cost', 'min_order_qty',
      'seo_title', 'seo_description', 'seo_keywords', 'images', 'is_active', 'is_featured'
    ];

    const exampleRow = [
      'Rose Quartz Crystal',
      'rose-quartz-crystal',
      'Beautiful rose quartz crystal for love and healing',
      'Rose quartz crystal',
      '29.99',
      '39.99',
      'crystals',
      'healing,love,pink',
      'heart',
      'earth,water',
      'taurus,libra',
      'love,emotional healing,self-love',
      'Brazil',
      '5cm x 3cm',
      '150g',
      'Crystal Wholesaler Inc',
      'supplier@crystals.com',
      'RQ-001',
      '15.00',
      '1',
      'Rose Quartz Crystal - Love & Healing Stone',
      'Discover the healing powers of rose quartz crystal',
      'rose quartz,crystal,healing,love',
      'https://example.com/image1.jpg,https://example.com/image2.jpg',
      'true',
      'false'
    ];

    const csvContent = [
      headers.join(','),
      exampleRow.map(field => `"${field}"`).join(',')
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'product-import-template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="bulk-import-export">
      <div className="bulk-actions">
        {/* Import Section */}
        <div className="import-section">
          <h3>{t('admin.products.bulkImport.title')}</h3>
          <p>{t('admin.products.bulkImport.description')}</p>
          
          <div className="import-actions">
            <button
              type="button"
              onClick={downloadTemplate}
              className="template-button"
            >
              {t('admin.products.bulkImport.downloadTemplate')}
            </button>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              id="csv-upload"
            />
            <label htmlFor="csv-upload" className="import-button">
              {importing 
                ? t('admin.products.bulkImport.importing') 
                : t('admin.products.bulkImport.selectFile')
              }
            </label>
          </div>

          {/* Import Results */}
          {importResults && (
            <div className="import-results">
              <h4>{t('admin.products.bulkImport.importComplete')}</h4>
              <div className="results-summary">
                <p>{t('admin.products.bulkImport.totalRows')}: {importResults.summary.totalRows}</p>
                <p className="success-count">
                  {t('admin.products.bulkImport.successCount')}: {importResults.summary.successCount}
                </p>
                <p className="error-count">
                  {t('admin.products.bulkImport.errorCount')}: {importResults.summary.errorCount}
                </p>
              </div>
              
              {importResults.errors && importResults.errors.length > 0 && (
                <div className="import-errors">
                  <h5>{t('admin.products.bulkImport.importErrors')}</h5>
                  <ul>
                    {importResults.errors.map((error, index) => (
                      <li key={index}>
                        Row {error.row}: {error.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Error Messages */}
          {importErrors.length > 0 && (
            <div className="error-messages">
              {importErrors.map((error, index) => (
                <div key={index} className="error-message">
                  {error}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Export Section */}
        <div className="export-section">
          <h3>{t('admin.products.bulkImport.export')}</h3>
          <p>{t('admin.products.bulkImport.exportDescription')}</p>
          
          <button
            type="button"
            onClick={() => handleExport()}
            disabled={exporting}
            className="export-button"
          >
            {exporting 
              ? t('admin.products.bulkImport.exporting') 
              : t('admin.products.bulkImport.exportAll')
            }
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkImportExport;