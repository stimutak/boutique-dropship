// Currency conversion utilities for multi-currency support

// Static exchange rates (relative to USD)
// In production, these would be fetched from an API
const STATIC_RATES = {
  USD: 1,
  EUR: 0.85,
  GBP: 0.73,
  CNY: 6.45,
  JPY: 110.0,
  SAR: 3.75,
  CAD: 1.25
};

// Map locales to currencies
const LOCALE_CURRENCY_MAP = {
  'en': 'USD',
  'es': 'EUR',
  'fr': 'EUR',
  'de': 'EUR',
  'zh': 'CNY',
  'ja': 'JPY',
  'ar': 'SAR'
};

// Currency symbols
const CURRENCY_SYMBOLS = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  CNY: '¥',
  JPY: '¥',
  SAR: 'ر.س',
  CAD: 'C$'
};

/**
 * Convert price from one currency to another
 * @param {number} amount - The amount to convert
 * @param {string} fromCurrency - Source currency code
 * @param {string} toCurrency - Target currency code
 * @param {object} rates - Exchange rates object (optional, uses static rates if not provided)
 * @returns {number} Converted amount
 */
function convertPrice(amount, fromCurrency, toCurrency, rates = STATIC_RATES) {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  // Convert to USD first (base currency)
  const usdAmount = amount / rates[fromCurrency];
  
  // Then convert to target currency
  const convertedAmount = usdAmount * rates[toCurrency];
  
  // Round to 2 decimal places for most currencies, 0 for JPY
  if (toCurrency === 'JPY') {
    return Math.round(convertedAmount);
  }
  
  return Math.round(convertedAmount * 100) / 100;
}

/**
 * Format price for display with proper currency symbol and locale formatting
 * @param {number} amount - The amount to format
 * @param {string} currency - Currency code
 * @param {string} locale - Locale code for formatting
 * @returns {string} Formatted price string
 */
function formatPrice(amount, currency, locale = 'en') {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: currency === 'JPY' ? 0 : 2,
      maximumFractionDigits: currency === 'JPY' ? 0 : 2
    }).format(amount);
  } catch (error) {
    // Fallback to simple formatting if Intl is not available
    const symbol = CURRENCY_SYMBOLS[currency] || currency;
    return `${symbol}${amount.toFixed(currency === 'JPY' ? 0 : 2)}`;
  }
}

/**
 * Get currency for a given locale
 * @param {string} locale - Locale code
 * @returns {string} Currency code
 */
function getCurrencyForLocale(locale) {
  return LOCALE_CURRENCY_MAP[locale] || 'USD';
}

/**
 * Get current exchange rates
 * @returns {object} Exchange rates object
 */
function getExchangeRates() {
  // In production, this would fetch from an API
  // For now, return static rates
  return STATIC_RATES;
}

/**
 * Calculate prices for all currencies given a base price
 * @param {number} basePrice - Price in base currency (USD)
 * @param {object} rates - Exchange rates object (optional)
 * @returns {object} Prices in all supported currencies
 */
function calculateAllPrices(basePrice, rates = STATIC_RATES) {
  const prices = {};
  
  Object.keys(rates).forEach(currency => {
    prices[currency] = convertPrice(basePrice, 'USD', currency, rates);
  });
  
  return prices;
}

/**
 * Get currency symbol
 * @param {string} currency - Currency code
 * @returns {string} Currency symbol
 */
function getCurrencySymbol(currency) {
  return CURRENCY_SYMBOLS[currency] || currency;
}

module.exports = {
  convertPrice,
  formatPrice,
  getCurrencyForLocale,
  getExchangeRates,
  calculateAllPrices,
  getCurrencySymbol,
  STATIC_RATES,
  LOCALE_CURRENCY_MAP,
  CURRENCY_SYMBOLS
};