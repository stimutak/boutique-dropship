const request = require('supertest');
const express = require('express');
const { AppError, globalErrorHandler } = require('../middleware/errorHandler');
const { i18nMiddleware } = require('../utils/i18n');
const { errorResponse, ErrorCodes } = require('../utils/errorHandler');

describe('i18n Error Integration', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(i18nMiddleware);
    app.use(errorResponse);

    // Test routes
    app.get('/test-apperror', (req, res, next) => {
      next(new AppError('Product not found', 404, ErrorCodes.PRODUCT_NOT_FOUND));
    });

    app.get('/test-res-error', (req, res) => {
      res.error(404, ErrorCodes.PRODUCT_NOT_FOUND, 'Product not found');
    });

    app.get('/test-validation', (req, res) => {
      const mockValidationErrors = {
        array: () => [
          { msg: 'Invalid email', param: 'email', location: 'body' }
        ]
      };
      res.validationError(mockValidationErrors);
    });

    app.use(globalErrorHandler);
  });

  describe('Error message translation', () => {
    test('should return English error by default', async () => {
      const response = await request(app)
        .get('/test-apperror')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Product not found'
        }
      });
    });

    test('should return Spanish error when locale is es', async () => {
      const response = await request(app)
        .get('/test-apperror')
        .set('x-locale', 'es')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Producto no encontrado'
        }
      });
    });

    test('should return French error when locale is fr', async () => {
      const response = await request(app)
        .get('/test-apperror')
        .set('x-locale', 'fr')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Produit non trouvé'
        }
      });
    });

    test('should return Arabic error when locale is ar', async () => {
      const response = await request(app)
        .get('/test-apperror')
        .set('x-locale', 'ar')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'المنتج غير موجود'
        }
      });
    });

    test('should return Hebrew error when locale is he', async () => {
      const response = await request(app)
        .get('/test-apperror')
        .set('x-locale', 'he')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'המוצר לא נמצא'
        }
      });
    });

    test('should handle Chinese locale', async () => {
      const response = await request(app)
        .get('/test-apperror')
        .set('x-locale', 'zh')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: '产品未找到'
        }
      });
    });

    test('should handle Japanese locale', async () => {
      const response = await request(app)
        .get('/test-apperror')
        .set('x-locale', 'ja')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: '商品が見つかりません'
        }
      });
    });

    test('should handle German locale', async () => {
      const response = await request(app)
        .get('/test-apperror')
        .set('x-locale', 'de')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Produkt nicht gefunden'
        }
      });
    });
  });

  describe('Error response helpers', () => {
    test('res.error should return translated error', async () => {
      const response = await request(app)
        .get('/test-res-error')
        .set('x-locale', 'es')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Producto no encontrado'
        }
      });
    });

    test('validation errors should use default locale', async () => {
      const response = await request(app)
        .get('/test-validation')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: [
            { field: 'email', message: 'Invalid email', location: 'body' }
          ]
        }
      });
    });
  });

  describe('Development mode', () => {
    const originalEnv = process.env.NODE_ENV;

    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    test('should include additional debug info in development', async () => {
      const response = await request(app)
        .get('/test-apperror')
        .set('x-locale', 'es')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PRODUCT_NOT_FOUND');
      expect(response.body.error.message).toBe('Producto no encontrado');
      expect(response.body.error.originalMessage).toBe('Product not found');
      expect(response.body.error.locale).toBe('es');
      expect(response.body.error.stack).toBeDefined();
    });
  });

  describe('RTL language support', () => {
    test('should set RTL flag for Arabic', async () => {
      const app = express();
      app.use(i18nMiddleware);
      
      app.get('/test-rtl', (req, res) => {
        res.json({
          locale: req.locale,
          isRTL: req.isRTL
        });
      });

      const response = await request(app)
        .get('/test-rtl')
        .set('x-locale', 'ar')
        .expect(200);

      expect(response.body).toEqual({
        locale: 'ar',
        isRTL: true
      });
    });

    test('should set RTL flag for Hebrew', async () => {
      const app = express();
      app.use(i18nMiddleware);
      
      app.get('/test-rtl', (req, res) => {
        res.json({
          locale: req.locale,
          isRTL: req.isRTL
        });
      });

      const response = await request(app)
        .get('/test-rtl')
        .set('x-locale', 'he')
        .expect(200);

      expect(response.body).toEqual({
        locale: 'he',
        isRTL: true
      });
    });

    test('should not set RTL flag for LTR languages', async () => {
      const app = express();
      app.use(i18nMiddleware);
      
      app.get('/test-rtl', (req, res) => {
        res.json({
          locale: req.locale,
          isRTL: req.isRTL
        });
      });

      const response = await request(app)
        .get('/test-rtl')
        .set('x-locale', 'en')
        .expect(200);

      expect(response.body).toEqual({
        locale: 'en',
        isRTL: false
      });
    });
  });

  describe('Fallback behavior', () => {
    test('should fallback to English for unsupported locale', async () => {
      const response = await request(app)
        .get('/test-apperror')
        .set('x-locale', 'ru') // Russian not supported
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Product not found'
        }
      });
    });

    test('should use default message when translation missing', async () => {
      const app = express();
      app.use(express.json());
      app.use(i18nMiddleware);
      
      app.get('/test-custom', (req, res, next) => {
        // Using a code that doesn't exist in translations
        next(new AppError('This is a custom error', 400, 'CUSTOM_ERROR_CODE'));
      });
      
      app.use(globalErrorHandler);

      const response = await request(app)
        .get('/test-custom')
        .set('x-locale', 'es')
        .expect(400);

      expect(response.body.error.message).toBe('This is a custom error');
    });
  });
});