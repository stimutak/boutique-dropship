/**
 * Currency utility functions for the application
 */

// Currency configuration for different locales
export const localeCurrencies = {
  'en': 'USD',
  'es': 'EUR',
  'fr': 'EUR',
  'de': 'EUR',
  'it': 'EUR',
  'zh': 'CNY',
  'ja': 'JPY',
  'ar': 'SAR',
  'he': 'ILS',
  'ru': 'RUB',
  'pt': 'EUR',
  'ko': 'KRW'
};

/**
 * Get the appropriate currency for a given locale
 * @param {string} locale - The locale code (e.g., 'en', 'es', 'fr')
 * @returns {string} The currency code (e.g., 'USD', 'EUR')
 */
export function getCurrencyForLocale(locale) {
  // Extract language code from locale (e.g., 'en-US' -> 'en')
  const languageCode = locale.split('-')[0];
  return localeCurrencies[languageCode] || 'USD';
}

/**
 * Format a price with the appropriate currency symbol and formatting
 * @param {number} amount - The amount to format
 * @param {string} currency - The currency code (e.g., 'USD', 'EUR')
 * @param {string} locale - The locale for formatting (optional)
 * @returns {string} The formatted price
 */
export function formatPrice(amount, currency = 'USD', locale = 'en') {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: currency === 'JPY' || currency === 'KRW' ? 0 : 2,
      maximumFractionDigits: currency === 'JPY' || currency === 'KRW' ? 0 : 2
    }).format(amount);
  } catch (error) {
    // Fallback for unsupported locales or currencies
    const symbols = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      CNY: '¥',
      JPY: '¥',
      KRW: '₩',
      SAR: 'ر.س',
      ILS: '₪',
      RUB: '₽',
      CAD: 'C$',
      AUD: 'A$',
      INR: '₹'
    };
    
    const symbol = symbols[currency] || currency + ' ';
    const decimals = (currency === 'JPY' || currency === 'KRW') ? 0 : 2;
    return `${symbol}${amount.toFixed(decimals)}`;
  }
}

/**
 * Convert amount from one currency to another (placeholder - needs real exchange rates)
 * @param {number} amount - The amount to convert
 * @param {string} fromCurrency - The source currency
 * @param {string} toCurrency - The target currency
 * @returns {number} The converted amount
 */
export function convertCurrency(amount, fromCurrency, toCurrency) {
  // This is a placeholder implementation
  // In a real application, you would fetch actual exchange rates
  const exchangeRates = {
    USD: 1,
    EUR: 0.85,
    GBP: 0.73,
    CNY: 6.36,
    JPY: 110.0,
    KRW: 1180.0,
    SAR: 3.75,
    ILS: 3.20,
    RUB: 74.0,
    CAD: 1.25,
    AUD: 1.35,
    INR: 74.5
  };
  
  if (fromCurrency === toCurrency) {return amount;}
  
  // Convert to USD first, then to target currency
  const usdAmount = amount / (exchangeRates[fromCurrency] || 1);
  return usdAmount * (exchangeRates[toCurrency] || 1);
}

/**
 * Parse a price string to extract the numeric value
 * @param {string} priceString - The price string to parse
 * @returns {number} The numeric value
 */
export function parsePrice(priceString) {
  // Remove currency symbols and non-numeric characters except decimal points
  const cleanedString = priceString.replace(/[^0-9.-]/g, '');
  return parseFloat(cleanedString) || 0;
}

/**
 * Format a number as a percentage
 * @param {number} value - The value to format (e.g., 0.15 for 15%)
 * @param {number} decimals - Number of decimal places
 * @returns {string} The formatted percentage
 */
export function formatPercentage(value, decimals = 1) {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Get currency symbol for a currency code
 * @param {string} currency - The currency code
 * @returns {string} The currency symbol
 */
export function getCurrencySymbol(currency) {
  const symbols = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    CNY: '¥',
    JPY: '¥',
    KRW: '₩',
    SAR: 'ر.س',
    ILS: '₪',
    RUB: '₽',
    CAD: 'C$',
    AUD: 'A$',
    INR: '₹'
  };
  
  return symbols[currency] || currency;
}

export default {
  formatPrice,
  getCurrencyForLocale,
  convertCurrency,
  parsePrice,
  formatPercentage,
  getCurrencySymbol,
  localeCurrencies
};