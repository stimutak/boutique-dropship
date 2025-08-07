const express = require('express');
const { body, validationResult } = require('express-validator');
const Settings = require('../models/Settings');
const { requireAdmin } = require('../middleware/auth');
const { validateCSRFToken } = require('../middleware/sessionCSRF');
const { ErrorCodes } = require('../utils/errorHandler');
const router = express.Router();

// GET /api/settings/public - Get public settings (no auth required)
router.get('/public', async (req, res) => {
  try {
    const publicSettings = await Settings.getPublicSettings();
    
    res.json({
      success: true,
      data: publicSettings,
      meta: {
        count: Object.keys(publicSettings).length,
        cached: false // TODO: Add caching in future
      }
    });
    
  } catch (error) {
    console.error('Error fetching public settings:', error);
    res.error(500, ErrorCodes.SETTINGS_FETCH_ERROR, 'Failed to fetch public settings');
  }
});

// GET /api/settings - Get all settings (admin only)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { category, active } = req.query;
    
    // Build query
    const query = {};
    if (category) {
      query.category = category;
    }
    if (active !== undefined) {
      query.isActive = active === 'true';
    }
    
    const settings = await Settings.find(query)
      .populate('lastModifiedBy', 'firstName lastName email')
      .sort({ category: 1, sortOrder: 1, label: 1 });
    
    // Group by category
    const settingsByCategory = {};
    settings.forEach(setting => {
      if (!settingsByCategory[setting.category]) {
        settingsByCategory[setting.category] = [];
      }
      settingsByCategory[setting.category].push(setting.toAdminJSON());
    });
    
    res.json({
      success: true,
      data: {
        settings: settingsByCategory,
        total: settings.length,
        categories: Object.keys(settingsByCategory).sort()
      },
      meta: {
        filters: { category, active }
      }
    });
    
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.error(500, ErrorCodes.SETTINGS_FETCH_ERROR, 'Failed to fetch settings');
  }
});

// GET /api/settings/categories - Get available categories
router.get('/categories', requireAdmin, async (req, res) => {
  try {
    const categories = await Settings.distinct('category');
    
    // Get counts for each category
    const categoriesWithCounts = await Promise.all(
      categories.map(async (category) => {
        const total = await Settings.countDocuments({ category });
        const active = await Settings.countDocuments({ category, isActive: true });
        return {
          name: category,
          total,
          active,
          inactive: total - active
        };
      })
    );
    
    res.json({
      success: true,
      data: categoriesWithCounts.sort((a, b) => a.name.localeCompare(b.name))
    });
    
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.error(500, ErrorCodes.SETTINGS_FETCH_ERROR, 'Failed to fetch categories');
  }
});

// GET /api/settings/:key - Get specific setting
router.get('/:key', requireAdmin, async (req, res) => {
  try {
    const { key } = req.params;
    
    const setting = await Settings.findOne({ key })
      .populate('lastModifiedBy', 'firstName lastName email')
      .populate('changeHistory.changedBy', 'firstName lastName email');
    
    if (!setting) {
      return res.error(404, ErrorCodes.SETTING_NOT_FOUND, 'Setting not found');
    }
    
    res.json({
      success: true,
      data: setting.toAdminJSON()
    });
    
  } catch (error) {
    console.error('Error fetching setting:', error);
    res.error(500, ErrorCodes.SETTINGS_FETCH_ERROR, 'Failed to fetch setting');
  }
});

// PUT /api/settings/:key - Update setting value
router.put('/:key', requireAdmin, validateCSRFToken, [
  body('value').exists().withMessage('Value is required'),
  body('reason').optional().isString().trim().isLength({ max: 200 }).withMessage('Reason must be less than 200 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.validationError(errors);
    }
    
    const { key } = req.params;
    const { value, reason } = req.body;
    const userId = req.user.id;
    
    const setting = await Settings.findOne({ key });
    if (!setting) {
      return res.error(404, ErrorCodes.SETTING_NOT_FOUND, 'Setting not found');
    }
    
    // Validate the new value
    const validationErrors = setting.validateValue(value);
    if (validationErrors.length > 0) {
      return res.error(400, ErrorCodes.VALIDATION_ERROR, validationErrors.join(', '));
    }
    
    // Store old value for comparison
    const oldValue = setting.value;
    
    // Update the setting
    setting.value = value;
    setting.lastModifiedBy = userId;
    
    // Add to change history
    setting.changeHistory.unshift({
      oldValue,
      newValue: value,
      changedBy: userId,
      changedAt: new Date(),
      reason: reason || 'Updated via admin panel'
    });
    
    // Keep only last 5 changes
    if (setting.changeHistory.length > 5) {
      setting.changeHistory = setting.changeHistory.slice(0, 5);
    }
    
    await setting.save();
    
    res.json({
      success: true,
      message: 'Setting updated successfully',
      data: setting.toAdminJSON(),
      meta: {
        requiresRestart: setting.requiresRestart,
        oldValue,
        newValue: value
      }
    });
    
  } catch (error) {
    console.error('Error updating setting:', error);
    res.error(500, ErrorCodes.SETTINGS_UPDATE_ERROR, 'Failed to update setting');
  }
});

// PUT /api/settings/:key/reset - Reset setting to default value
router.put('/:key/reset', requireAdmin, validateCSRFToken, [
  body('reason').optional().isString().trim().isLength({ max: 200 }).withMessage('Reason must be less than 200 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.validationError(errors);
    }
    
    const { key } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;
    
    const setting = await Settings.findOne({ key });
    if (!setting) {
      return res.error(404, ErrorCodes.SETTING_NOT_FOUND, 'Setting not found');
    }
    
    const oldValue = setting.value;
    await setting.resetToDefault(userId, reason || 'Reset to default via admin panel');
    
    res.json({
      success: true,
      message: 'Setting reset to default value',
      data: setting.toAdminJSON(),
      meta: {
        requiresRestart: setting.requiresRestart,
        oldValue,
        newValue: setting.defaultValue
      }
    });
    
  } catch (error) {
    console.error('Error resetting setting:', error);
    res.error(500, ErrorCodes.SETTINGS_UPDATE_ERROR, 'Failed to reset setting');
  }
});

// POST /api/settings - Create new setting (admin only)
router.post('/', requireAdmin, validateCSRFToken, [
  body('key').trim().isLength({ min: 1, max: 100 }).withMessage('Key is required and must be less than 100 characters'),
  body('category').isIn([
    'general', 'store', 'payment', 'shipping', 'email', 
    'security', 'internationalization', 'integration', 
    'analytics', 'maintenance'
  ]).withMessage('Invalid category'),
  body('label').trim().isLength({ min: 1, max: 200 }).withMessage('Label is required and must be less than 200 characters'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
  body('dataType').isIn(['string', 'number', 'boolean', 'array', 'object', 'json']).withMessage('Invalid data type'),
  body('inputType').isIn([
    'text', 'textarea', 'number', 'boolean', 'select', 
    'multiselect', 'email', 'url', 'password', 'color',
    'file', 'json', 'currency', 'language'
  ]).withMessage('Invalid input type'),
  body('value').exists().withMessage('Value is required'),
  body('defaultValue').exists().withMessage('Default value is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.validationError(errors);
    }
    
    const settingData = {
      ...req.body,
      lastModifiedBy: req.user.id
    };
    
    // Check for duplicate key
    const existingSetting = await Settings.findOne({ key: settingData.key });
    if (existingSetting) {
      return res.error(400, ErrorCodes.SETTING_KEY_EXISTS, 'Setting with this key already exists');
    }
    
    const setting = await Settings.create(settingData);
    
    res.status(201).json({
      success: true,
      message: 'Setting created successfully',
      data: setting.toAdminJSON()
    });
    
  } catch (error) {
    console.error('Error creating setting:', error);
    res.error(500, ErrorCodes.SETTINGS_CREATE_ERROR, 'Failed to create setting');
  }
});

// DELETE /api/settings/:key - Delete setting (admin only)
router.delete('/:key', requireAdmin, validateCSRFToken, async (req, res) => {
  try {
    const { key } = req.params;
    
    const setting = await Settings.findOneAndDelete({ key });
    if (!setting) {
      return res.error(404, ErrorCodes.SETTING_NOT_FOUND, 'Setting not found');
    }
    
    res.json({
      success: true,
      message: 'Setting deleted successfully',
      data: {
        key: setting.key,
        label: setting.label,
        category: setting.category
      }
    });
    
  } catch (error) {
    console.error('Error deleting setting:', error);
    res.error(500, ErrorCodes.SETTINGS_DELETE_ERROR, 'Failed to delete setting');
  }
});

// PUT /api/settings/:key/toggle - Toggle setting active status
router.put('/:key/toggle', requireAdmin, validateCSRFToken, async (req, res) => {
  try {
    const { key } = req.params;
    
    const setting = await Settings.findOne({ key });
    if (!setting) {
      return res.error(404, ErrorCodes.SETTING_NOT_FOUND, 'Setting not found');
    }
    
    setting.isActive = !setting.isActive;
    setting.lastModifiedBy = req.user.id;
    await setting.save();
    
    res.json({
      success: true,
      message: `Setting ${setting.isActive ? 'activated' : 'deactivated'} successfully`,
      data: setting.toAdminJSON(),
      meta: {
        requiresRestart: setting.requiresRestart
      }
    });
    
  } catch (error) {
    console.error('Error toggling setting:', error);
    res.error(500, ErrorCodes.SETTINGS_UPDATE_ERROR, 'Failed to toggle setting');
  }
});

// POST /api/settings/bulk-update - Update multiple settings at once
router.post('/bulk-update', requireAdmin, validateCSRFToken, [
  body('updates').isArray({ min: 1 }).withMessage('Updates array is required with at least one item'),
  body('updates.*.key').trim().isLength({ min: 1 }).withMessage('Each update must have a key'),
  body('updates.*.value').exists().withMessage('Each update must have a value'),
  body('reason').optional().isString().trim().isLength({ max: 200 }).withMessage('Reason must be less than 200 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.validationError(errors);
    }
    
    const { updates, reason } = req.body;
    const userId = req.user.id;
    
    const results = [];
    const errors_encountered = [];
    let requiresRestart = false;
    
    // Process each update
    for (const update of updates) {
      try {
        const setting = await Settings.findOne({ key: update.key });
        if (!setting) {
          errors_encountered.push(`Setting '${update.key}' not found`);
          continue;
        }
        
        // Validate the new value
        const validationErrors = setting.validateValue(update.value);
        if (validationErrors.length > 0) {
          errors_encountered.push(`${update.key}: ${validationErrors.join(', ')}`);
          continue;
        }
        
        const oldValue = setting.value;
        setting.value = update.value;
        setting.lastModifiedBy = userId;
        
        // Add to change history
        setting.changeHistory.unshift({
          oldValue,
          newValue: update.value,
          changedBy: userId,
          changedAt: new Date(),
          reason: reason || 'Bulk update via admin panel'
        });
        
        if (setting.changeHistory.length > 5) {
          setting.changeHistory = setting.changeHistory.slice(0, 5);
        }
        
        await setting.save();
        
        if (setting.requiresRestart) {
          requiresRestart = true;
        }
        
        results.push({
          key: setting.key,
          label: setting.label,
          oldValue,
          newValue: update.value,
          success: true
        });
        
      } catch (error) {
        errors_encountered.push(`${update.key}: ${error.message}`);
      }
    }
    
    res.json({
      success: errors_encountered.length === 0,
      message: `Updated ${results.length} settings successfully`,
      data: {
        successful: results,
        errors: errors_encountered,
        totalRequested: updates.length,
        totalSuccessful: results.length,
        totalErrors: errors_encountered.length
      },
      meta: {
        requiresRestart
      }
    });
    
  } catch (error) {
    console.error('Error bulk updating settings:', error);
    res.error(500, ErrorCodes.SETTINGS_UPDATE_ERROR, 'Failed to bulk update settings');
  }
});

// GET /api/settings/export - Export settings configuration
router.get('/export', requireAdmin, async (req, res) => {
  try {
    const { category, format = 'json' } = req.query;
    
    const query = { isActive: true };
    if (category) {
      query.category = category;
    }
    
    const settings = await Settings.find(query)
      .sort({ category: 1, sortOrder: 1, label: 1 });
    
    if (format === 'json') {
      const exportData = {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        settings: settings.map(setting => ({
          key: setting.key,
          category: setting.category,
          label: setting.label,
          description: setting.description,
          value: setting.getTypedValue(),
          dataType: setting.dataType,
          inputType: setting.inputType,
          options: setting.options,
          validation: setting.validation,
          isPublic: setting.isPublic,
          sortOrder: setting.sortOrder
        }))
      };
      
      res.json({
        success: true,
        data: exportData
      });
    } else {
      res.error(400, ErrorCodes.INVALID_FORMAT, 'Only JSON format is currently supported');
    }
    
  } catch (error) {
    console.error('Error exporting settings:', error);
    res.error(500, ErrorCodes.SETTINGS_EXPORT_ERROR, 'Failed to export settings');
  }
});

module.exports = router;