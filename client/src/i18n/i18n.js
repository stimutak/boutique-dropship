import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import all translations statically
import enTranslations from './locales/en/translation.json';
import esTranslations from './locales/es/translation.json';
import frTranslations from './locales/fr/translation.json';
import deTranslations from './locales/de/translation.json';
import zhTranslations from './locales/zh/translation.json';
import jaTranslations from './locales/ja/translation.json';
import arTranslations from './locales/ar/translation.json';
import heTranslations from './locales/he/translation.json';

// Initialize with static resources
const resources = {
  en: { translation: enTranslations },
  es: { translation: esTranslations },
  fr: { translation: frTranslations },
  de: { translation: deTranslations },
  zh: { translation: zhTranslations },
  ja: { translation: jaTranslations },
  ar: { translation: arTranslations },
  he: { translation: heTranslations }
};

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

i18n
  .use(LanguageDetector) // Detect user language
  .use(initReactI18next) // Pass i18n instance to react-i18next
  .init({
    resources,
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
    load: 'languageOnly'
  });

export default i18n;