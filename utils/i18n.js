/**
 * Backend i18n configuration for error messages
 * Following CLAUDE.md constraints:
 * - Support for 10+ languages including RTL
 * - Simple implementation without unnecessary complexity
 */

// Error message translations for all supported languages
const errorTranslations = {
  en: {
    // Common errors
    VALIDATION_ERROR: 'Invalid input data',
    NOT_FOUND: 'Resource not found',
    UNAUTHORIZED: 'Unauthorized access',
    FORBIDDEN: 'Access forbidden',
    INTERNAL_ERROR: 'Internal server error',
    BAD_REQUEST: 'Bad request',
    
    // Authentication errors
    INVALID_CREDENTIALS: 'Invalid email or password',
    USER_EXISTS: 'User with this email already exists',
    EMAIL_IN_USE: 'Email address is already in use',
    USER_NOT_FOUND: 'User not found',
    TOKEN_INVALID: 'Invalid token',
    TOKEN_EXPIRED: 'Token has expired',
    INVALID_RESET_TOKEN: 'Password reset token is invalid or has expired',
    AUTHENTICATION_REQUIRED: 'Authentication required',
    REGISTRATION_ERROR: 'Failed to register user',
    ACCOUNT_DISABLED: 'Your account has been disabled',
    INSUFFICIENT_PERMISSIONS: 'Insufficient permissions to access this resource',
    
    // Product errors
    PRODUCT_NOT_FOUND: 'Product not found',
    INVALID_PRODUCT_ID: 'Invalid product ID',
    PRODUCTS_FETCH_ERROR: 'Failed to fetch products',
    PRODUCT_CREATION_ERROR: 'Failed to create product',
    PRODUCT_UPDATE_ERROR: 'Failed to update product',
    PRODUCT_DELETE_ERROR: 'Failed to delete product',
    SEARCH_ERROR: 'Search failed',
    CATEGORIES_ERROR: 'Failed to fetch categories',
    FILTERS_ERROR: 'Failed to fetch filter options',
    RECOMMENDATIONS_ERROR: 'Failed to fetch recommendations',
    MISSING_QUERY: 'Search query is required',
    
    // Cart errors
    CART_ADD_ERROR: 'Failed to add item to cart',
    CART_UPDATE_ERROR: 'Failed to update cart',
    CART_REMOVE_ERROR: 'Failed to remove item from cart',
    CART_CLEAR_ERROR: 'Failed to clear cart',
    CART_MERGE_ERROR: 'Failed to merge guest cart',
    CART_FETCH_ERROR: 'Failed to fetch cart',
    ITEM_NOT_FOUND: 'Item not found in cart',
    MAX_QUANTITY_EXCEEDED: 'Cannot exceed maximum quantity of 99',
    INVALID_QUANTITY: 'Invalid quantity',
    MISSING_PRODUCT_ID: 'Product ID is required',
    NOT_GUEST_USER: 'This endpoint is only for guest users',
    RESET_SESSION_ERROR: 'Failed to reset guest cart session',
    
    // Order errors
    ORDER_NOT_FOUND: 'Order not found',
    ORDER_CREATE_ERROR: 'Failed to create order',
    ORDER_UPDATE_ERROR: 'Failed to update order',
    ORDER_CANCEL_ERROR: 'Failed to cancel order',
    INVALID_ORDER_STATUS: 'Invalid order status',
    EMPTY_CART: 'Your cart is empty',
    
    // Payment errors
    PAYMENT_FAILED: 'Payment failed',
    PAYMENT_METHOD_INVALID: 'Invalid payment method',
    INSUFFICIENT_FUNDS: 'Insufficient funds',
    PAYMENT_REQUIRED: 'Payment is required',
    PAYMENT_CREATE_ERROR: 'Failed to create payment',
    PAYMENT_STATUS_ERROR: 'Failed to check payment status',
    
    // Integration errors
    MOLLIE_ERROR: 'Payment service error',
    WHOLESALER_ERROR: 'Wholesaler communication error',
    EMAIL_ERROR: 'Email service error'
  },
  es: {
    // Spanish translations
    VALIDATION_ERROR: 'Datos de entrada inválidos',
    NOT_FOUND: 'Recurso no encontrado',
    UNAUTHORIZED: 'Acceso no autorizado',
    FORBIDDEN: 'Acceso prohibido',
    INTERNAL_ERROR: 'Error interno del servidor',
    BAD_REQUEST: 'Solicitud incorrecta',
    
    INVALID_CREDENTIALS: 'Correo electrónico o contraseña inválidos',
    USER_EXISTS: 'Ya existe un usuario con este correo electrónico',
    USER_NOT_FOUND: 'Usuario no encontrado',
    TOKEN_INVALID: 'Token inválido',
    TOKEN_EXPIRED: 'El token ha expirado',
    AUTHENTICATION_REQUIRED: 'Se requiere autenticación',
    
    PRODUCT_NOT_FOUND: 'Producto no encontrado',
    CART_ADD_ERROR: 'Error al agregar artículo al carrito',
    ORDER_NOT_FOUND: 'Pedido no encontrado',
    PAYMENT_FAILED: 'Pago fallido',
    EMPTY_CART: 'Tu carrito está vacío'
  },
  fr: {
    // French translations
    VALIDATION_ERROR: 'Données d\'entrée invalides',
    NOT_FOUND: 'Ressource non trouvée',
    UNAUTHORIZED: 'Accès non autorisé',
    FORBIDDEN: 'Accès interdit',
    INTERNAL_ERROR: 'Erreur interne du serveur',
    BAD_REQUEST: 'Mauvaise requête',
    
    INVALID_CREDENTIALS: 'Email ou mot de passe invalide',
    USER_EXISTS: 'Un utilisateur avec cet email existe déjà',
    USER_NOT_FOUND: 'Utilisateur non trouvé',
    TOKEN_INVALID: 'Jeton invalide',
    TOKEN_EXPIRED: 'Le jeton a expiré',
    AUTHENTICATION_REQUIRED: 'Authentification requise',
    
    PRODUCT_NOT_FOUND: 'Produit non trouvé',
    CART_ADD_ERROR: 'Échec de l\'ajout de l\'article au panier',
    ORDER_NOT_FOUND: 'Commande non trouvée',
    PAYMENT_FAILED: 'Paiement échoué',
    EMPTY_CART: 'Votre panier est vide'
  },
  de: {
    // German translations
    VALIDATION_ERROR: 'Ungültige Eingabedaten',
    NOT_FOUND: 'Ressource nicht gefunden',
    UNAUTHORIZED: 'Nicht autorisierter Zugriff',
    FORBIDDEN: 'Zugriff verboten',
    INTERNAL_ERROR: 'Interner Serverfehler',
    BAD_REQUEST: 'Ungültige Anfrage',
    
    INVALID_CREDENTIALS: 'Ungültige E-Mail oder Passwort',
    USER_EXISTS: 'Ein Benutzer mit dieser E-Mail existiert bereits',
    USER_NOT_FOUND: 'Benutzer nicht gefunden',
    TOKEN_INVALID: 'Ungültiges Token',
    TOKEN_EXPIRED: 'Token ist abgelaufen',
    AUTHENTICATION_REQUIRED: 'Authentifizierung erforderlich',
    
    PRODUCT_NOT_FOUND: 'Produkt nicht gefunden',
    CART_ADD_ERROR: 'Fehler beim Hinzufügen zum Warenkorb',
    ORDER_NOT_FOUND: 'Bestellung nicht gefunden',
    PAYMENT_FAILED: 'Zahlung fehlgeschlagen',
    EMPTY_CART: 'Ihr Warenkorb ist leer'
  },
  zh: {
    // Chinese translations
    VALIDATION_ERROR: '输入数据无效',
    NOT_FOUND: '未找到资源',
    UNAUTHORIZED: '未授权访问',
    FORBIDDEN: '禁止访问',
    INTERNAL_ERROR: '服务器内部错误',
    BAD_REQUEST: '错误的请求',
    
    INVALID_CREDENTIALS: '无效的邮箱或密码',
    USER_EXISTS: '该邮箱已被注册',
    USER_NOT_FOUND: '用户未找到',
    TOKEN_INVALID: '无效的令牌',
    TOKEN_EXPIRED: '令牌已过期',
    AUTHENTICATION_REQUIRED: '需要身份验证',
    
    PRODUCT_NOT_FOUND: '产品未找到',
    CART_ADD_ERROR: '添加到购物车失败',
    ORDER_NOT_FOUND: '订单未找到',
    PAYMENT_FAILED: '支付失败',
    EMPTY_CART: '您的购物车是空的'
  },
  ja: {
    // Japanese translations
    VALIDATION_ERROR: '入力データが無効です',
    NOT_FOUND: 'リソースが見つかりません',
    UNAUTHORIZED: '認証されていません',
    FORBIDDEN: 'アクセスが禁止されています',
    INTERNAL_ERROR: 'サーバー内部エラー',
    BAD_REQUEST: '不正なリクエスト',
    
    INVALID_CREDENTIALS: 'メールアドレスまたはパスワードが無効です',
    USER_EXISTS: 'このメールアドレスは既に登録されています',
    USER_NOT_FOUND: 'ユーザーが見つかりません',
    TOKEN_INVALID: '無効なトークン',
    TOKEN_EXPIRED: 'トークンの有効期限が切れました',
    AUTHENTICATION_REQUIRED: '認証が必要です',
    
    PRODUCT_NOT_FOUND: '商品が見つかりません',
    CART_ADD_ERROR: 'カートへの追加に失敗しました',
    ORDER_NOT_FOUND: '注文が見つかりません',
    PAYMENT_FAILED: '支払いに失敗しました',
    EMPTY_CART: 'カートが空です'
  },
  ar: {
    // Arabic translations (RTL)
    VALIDATION_ERROR: 'بيانات الإدخال غير صالحة',
    NOT_FOUND: 'المورد غير موجود',
    UNAUTHORIZED: 'وصول غير مصرح',
    FORBIDDEN: 'الوصول محظور',
    INTERNAL_ERROR: 'خطأ داخلي في الخادم',
    BAD_REQUEST: 'طلب غير صالح',
    
    INVALID_CREDENTIALS: 'البريد الإلكتروني أو كلمة المرور غير صالحة',
    USER_EXISTS: 'يوجد مستخدم بهذا البريد الإلكتروني بالفعل',
    USER_NOT_FOUND: 'المستخدم غير موجود',
    TOKEN_INVALID: 'رمز غير صالح',
    TOKEN_EXPIRED: 'انتهت صلاحية الرمز',
    AUTHENTICATION_REQUIRED: 'المصادقة مطلوبة',
    
    PRODUCT_NOT_FOUND: 'المنتج غير موجود',
    CART_ADD_ERROR: 'فشل إضافة المنتج إلى السلة',
    ORDER_NOT_FOUND: 'الطلب غير موجود',
    PAYMENT_FAILED: 'فشل الدفع',
    EMPTY_CART: 'سلة التسوق فارغة'
  },
  he: {
    // Hebrew translations (RTL)
    VALIDATION_ERROR: 'נתוני הקלט אינם תקינים',
    NOT_FOUND: 'המשאב לא נמצא',
    UNAUTHORIZED: 'גישה לא מורשית',
    FORBIDDEN: 'הגישה אסורה',
    INTERNAL_ERROR: 'שגיאת שרת פנימית',
    BAD_REQUEST: 'בקשה לא תקינה',
    
    INVALID_CREDENTIALS: 'אימייל או סיסמה לא תקינים',
    USER_EXISTS: 'משתמש עם אימייל זה כבר קיים',
    USER_NOT_FOUND: 'המשתמש לא נמצא',
    TOKEN_INVALID: 'אסימון לא תקין',
    TOKEN_EXPIRED: 'תוקף האסימון פג',
    AUTHENTICATION_REQUIRED: 'נדרש אימות',
    
    PRODUCT_NOT_FOUND: 'המוצר לא נמצא',
    CART_ADD_ERROR: 'הוספת המוצר לסל נכשלה',
    ORDER_NOT_FOUND: 'ההזמנה לא נמצאה',
    PAYMENT_FAILED: 'התשלום נכשל',
    EMPTY_CART: 'סל הקניות ריק'
  }
};

/**
 * Get translated error message
 * @param {string} code - Error code
 * @param {string} locale - Language locale (e.g., 'en', 'es', 'ar')
 * @param {string} defaultMessage - Default message if translation not found
 * @returns {string} Translated error message
 */
function getErrorMessage(code, locale = 'en', defaultMessage = null) {
  const lang = errorTranslations[locale] || errorTranslations['en'];
  return lang[code] || defaultMessage || errorTranslations['en'][code] || code;
}

/**
 * Express middleware to add i18n support to request
 */
function i18nMiddleware(req, res, next) {
  // Get locale from header, query param, or default to 'en'
  const locale = req.headers['x-locale'] || req.query.lang || 'en';
  
  // Add i18n function to request
  req.i18n = (code, defaultMessage) => {
    return getErrorMessage(code, locale, defaultMessage);
  };
  
  req.locale = locale;
  req.isRTL = ['ar', 'he'].includes(locale);
  
  next();
}

/**
 * Get all supported locales
 */
function getSupportedLocales() {
  return Object.keys(errorTranslations);
}

/**
 * Check if a locale is supported
 */
function isLocaleSupported(locale) {
  return errorTranslations.hasOwnProperty(locale);
}

module.exports = {
  getErrorMessage,
  i18nMiddleware,
  getSupportedLocales,
  isLocaleSupported,
  errorTranslations
};