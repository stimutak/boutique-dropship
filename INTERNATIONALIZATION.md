# Internationalization (i18n) Implementation Guide

## Overview
This document outlines the comprehensive internationalization strategy for the Boutique E-Commerce platform to support global customers with multiple languages, currencies, and regional preferences.

## 🌍 Core Requirements

### Languages (Phase 1)
- **Primary**: English (en-US)
- **European**: Spanish (es), French (fr), German (de), Italian (it), Portuguese (pt)
- **Asian**: Chinese Simplified (zh-CN), Japanese (ja), Korean (ko)
- **RTL**: Arabic (ar), Hebrew (he)

### Currencies (Phase 1)
- **Major**: USD, EUR, GBP, JPY, CNY
- **Regional**: CAD, AUD, CHF, SEK, NOK, INR, BRL, MXN
- **Supported by Mollie**: All major currencies including EUR, USD, GBP, CAD, AUD, JPY, and more
- **Crypto** (Phase 2): BTC, ETH, USDT (via separate crypto payment processor)

### Regional Considerations
- **Date/Time Formats**: ISO 8601 with locale display
- **Number Formats**: Decimal separators, thousand separators
- **Address Formats**: Country-specific validation
- **Phone Numbers**: International format with country codes
- **Measurements**: Metric/Imperial conversion

## 🏗️ Technical Architecture

### Frontend i18n Stack
```javascript
// Primary Framework: react-i18next
- i18next (core)
- react-i18next (React bindings)
- i18next-browser-languagedetector (auto-detection)
- i18next-http-backend (lazy loading translations)

// Supporting Libraries
- date-fns (date formatting with locales)
- react-number-format (currency/number display)
- rtl-css-js (RTL style conversion)
```

### Backend i18n Stack
```javascript
// Node.js Libraries
- i18n-node (server-side translations)
- currency.js (precise currency calculations)
- node-polyglot (pluralization rules)
- moment-timezone (timezone handling)
```

### Database Schema Updates

#### User Model
```javascript
{
  // Existing fields...
  preferences: {
    language: { type: String, default: 'en' },
    currency: { type: String, default: 'USD' },
    timezone: { type: String, default: 'UTC' },
    locale: { type: String, default: 'en-US' },
    measurementSystem: { 
      type: String, 
      enum: ['metric', 'imperial'], 
      default: 'metric' 
    }
  }
}
```

#### Product Model
```javascript
{
  // Existing fields...
  translations: {
    en: {
      name: String,
      description: String,
      features: [String]
    },
    // Additional languages...
  },
  prices: [{
    currency: String,
    amount: Number,
    isBase: Boolean
  }],
  measurements: {
    metric: {
      weight: Number, // grams
      dimensions: { length: Number, width: Number, height: Number } // cm
    },
    imperial: {
      weight: Number, // ounces
      dimensions: { length: Number, width: Number, height: Number } // inches
    }
  }
}
```

#### Order Model
```javascript
{
  // Existing fields...
  pricing: {
    currency: String,
    subtotal: Number,
    tax: Number,
    shipping: Number,
    total: Number,
    exchangeRate: Number, // Rate at time of order
    baseCurrencyTotal: Number // Always in USD for reporting
  },
  locale: {
    language: String,
    country: String,
    timezone: String
  }
}
```

## 📁 File Structure

```
/locales
├── en/
│   ├── common.json
│   ├── products.json
│   ├── checkout.json
│   ├── emails.json
│   └── admin.json
├── es/
│   └── ... (same structure)
├── fr/
│   └── ... (same structure)
└── ar/
    └── ... (same structure with RTL markers)
```

## 🔧 Implementation Steps

### Phase 1: Foundation (Week 1-2)
1. **Install i18n frameworks**
   ```bash
   npm install i18next react-i18next i18next-browser-languagedetector
   npm install i18n-node currency.js moment-timezone
   ```

2. **Create translation infrastructure**
   - Setup i18n configuration
   - Create language detection middleware
   - Build translation file structure
   - Implement language switcher component

3. **Update database models**
   - Add translation fields
   - Add currency fields
   - Migration scripts for existing data

### Phase 2: Currency Support (Week 3)
1. **Mollie multi-currency configuration**
   - Mollie supports 25+ currencies natively
   - Automatic currency detection based on customer location
   - Settlement in merchant's preferred currency
   
2. **Currency conversion service**
   ```javascript
   class CurrencyService {
     async getExchangeRates() {
       // Fetch from OpenExchangeRates API
       // Cache for 1 hour
     }
     
     convert(amount, from, to) {
       // Real-time conversion with fallback
     }
     
     formatPrice(amount, currency, locale) {
       // Locale-aware formatting
     }
   }
   ```

2. **Price display components**
   - Currency selector
   - Real-time price updates
   - Historical rate tracking

### Phase 3: Content Translation (Week 4-5)
1. **Static content**
   - UI strings
   - Error messages
   - Form labels
   - Navigation

2. **Dynamic content**
   - Product names/descriptions
   - Category names
   - Email templates
   - Admin interface

### Phase 4: Regional Features (Week 6)
1. **RTL Support**
   ```css
   /* Automatic RTL conversion */
   [dir="rtl"] {
     .component {
       /* RTL-specific styles */
     }
   }
   ```

2. **Regional formats**
   - Address validation per country
   - Phone number formatting
   - Date/time display
   - Measurement conversion

## 🚀 Best Practices

### 1. Translation Keys
```javascript
// Good: Semantic, hierarchical keys
t('checkout.shipping.title')
t('product.outOfStock')

// Bad: Text as keys
t('Add to Cart')
t('This product is out of stock')
```

### 2. Pluralization
```javascript
// Use ICU format
t('cart.items', { count: itemCount })
// en: "{count, plural, =0 {No items} one {# item} other {# items}}"
```

### 3. Currency Display
```javascript
// Always show currency code for clarity
formatCurrency(29.99, 'USD', 'en-US') // "$29.99 USD"
formatCurrency(29.99, 'EUR', 'de-DE') // "29,99 € EUR"
```

### 4. Date/Time
```javascript
// Store in UTC, display in user timezone
formatDate(date, locale, timezone)
```

## 📊 Performance Considerations

### 1. Translation Loading
- Lazy load language packs
- Split by route/feature
- Cache aggressively
- Fallback chains (es-MX → es → en)

### 2. Currency Updates
- Cache exchange rates (1 hour)
- Background updates
- Offline fallback rates
- WebSocket for real-time (optional)

### 3. SEO Optimization
```html
<!-- hreflang tags -->
<link rel="alternate" hreflang="en" href="https://example.com/en/" />
<link rel="alternate" hreflang="es" href="https://example.com/es/" />
<link rel="alternate" hreflang="x-default" href="https://example.com/" />

<!-- Structured data with translations -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": {
    "@language": "en",
    "@value": "Product Name"
  }
}
</script>
```

## 🧪 Testing Strategy

### 1. Unit Tests
```javascript
describe('CurrencyService', () => {
  it('converts currencies correctly', () => {
    expect(convert(100, 'USD', 'EUR', 0.85)).toBe(85);
  });
  
  it('handles missing exchange rates', () => {
    // Test fallback behavior
  });
});
```

### 2. Integration Tests
- Language switching
- Currency persistence
- Email generation in different languages
- RTL layout verification

### 3. E2E Tests
```javascript
// Test critical paths in multiple languages
['en', 'es', 'ar'].forEach(lang => {
  it(`completes checkout in ${lang}`, () => {
    cy.visit(`/${lang}/products`);
    // Test full flow
  });
});
```

## 📱 Mobile Considerations

1. **Responsive i18n**
   - Shorter translations for mobile
   - Touch-friendly language switcher
   - Efficient font loading for non-Latin scripts

2. **App-specific**
   - Device language detection
   - Offline translation caching
   - Regional app store descriptions

## 🔐 Security Considerations

1. **Input Validation**
   - Validate all translated content
   - Sanitize user-generated translations
   - Prevent XSS in dynamic translations

2. **Currency Security**
   - Validate exchange rates
   - Audit currency conversions
   - Prevent price manipulation

## 📈 Analytics & Monitoring

### Track Key Metrics
- Language preference distribution
- Currency usage patterns
- Translation load times
- Conversion rates by locale
- Error rates by language

### Monitoring Setup
```javascript
// Track language switches
analytics.track('Language Changed', {
  from: oldLang,
  to: newLang,
  page: currentPage
});

// Monitor translation errors
if (!translation) {
  errorLogger.warn('Missing translation', { key, language });
}
```

## 🚢 Deployment Strategy

### 1. Gradual Rollout
- Start with single language (en)
- Add languages incrementally
- A/B test currency display
- Monitor performance impact

### 2. CDN Configuration
- Serve translations from edge
- Geo-based routing
- Language-specific caching

### 3. Feature Flags
```javascript
if (featureFlag('multi-currency-enabled')) {
  // Show currency selector
}
```

## 🤝 Translation Workflow

### 1. Development Flow
```
Developer → Extract strings → Translation keys → Send to translators
                                                         ↓
Production ← Import translations ← Review ← Translate
```

### 2. Tools
- **Management**: Crowdin, Lokalise, or POEditor
- **Version Control**: Git with translation branches
- **Validation**: Automated completeness checks

### 3. Quality Assurance
- Professional translators for UI
- Native speakers for review
- Context screenshots for translators
- Glossary maintenance

## 📚 Resources

- [i18next Documentation](https://www.i18next.com/)
- [React i18n Best Practices](https://react.i18next.com/guides/best-practices)
- [CLDR Unicode Data](http://cldr.unicode.org/)
- [Currency API Providers Comparison](https://github.com/fawazahmed0/currency-api)

---

*This is a living document. Update as implementation progresses.*