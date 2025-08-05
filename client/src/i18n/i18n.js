import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpApi from 'i18next-http-backend';

// Dynamic imports for lazy loading (will be loaded on demand)
const loadTranslations = async (language) => {
  try {
    const translations = await import(`./locales/${language}/translation.json`);
    return translations.default;
  } catch (error) {
    console.warn(`Failed to load translations for ${language}:`, error);
    // Fallback to English if language fails to load
    if (language !== 'en') {
      return await import('./locales/en/translation.json').then(m => m.default);
    }
    return {};
  }
};

// Initialize with empty resources - will be loaded on demand
const resources = {};

// Supported languages configuration
export const supportedLanguages = {
  en: { name: 'English', flag: '🇺🇸', dir: 'ltr' },
  es: { name: 'Español', flag: '🇪🇸', dir: 'ltr' },
  fr: { name: 'Français', flag: '🇫🇷', dir: 'ltr' },
  de: { name: 'Deutsch', flag: '🇩🇪', dir: 'ltr' },
  zh: { name: '中文', flag: '🇨🇳', dir: 'ltr' },
  ja: { name: '日本語', flag: '🇯🇵', dir: 'ltr' },
  ar: { name: 'العربية', flag: '🇸🇦', dir: 'rtl' },
  he: { name: 'עברית', flag: '🇮🇱', dir: 'rtl' }
};

// Currency configuration per locale
export const localeCurrencies = {
  en: 'USD',
  es: 'EUR',
  fr: 'EUR',
  de: 'EUR',
  zh: 'CNY',
  ja: 'JPY',
  ar: 'SAR',
  he: 'ILS'
};

// Custom backend for dynamic imports
const customBackend = {
  type: 'backend',
  init: () => {},
  read: async (language, namespace, callback) => {
    try {
      const translations = await loadTranslations(language);
      callback(null, translations);
    } catch (error) {
      callback(error, null);
    }
  }
};

i18n
  .use(customBackend) // Use custom backend for dynamic imports
  .use(LanguageDetector) // Detect user language
  .use(initReactI18next) // Pass i18n instance to react-i18next
  .init({
    fallbackLng: 'en',
    debug: import.meta.env.DEV,
    
    detection: {
      order: ['localStorage', 'cookie', 'navigator', 'htmlTag'],
      caches: ['localStorage', 'cookie']
    },

    interpolation: {
      escapeValue: false // React already does escaping
    },

    // React specific options
    react: {
      useSuspense: false // Disable suspense mode for better error handling
    },

    // Load only the detected language initially
    load: 'languageOnly',
    preload: ['en'], // Always preload English as fallback
    
    // Backend options for lazy loading
    backend: {
      loadPath: '{{lng}}' // This will be handled by our custom backend
    }
  });

export default i18n;