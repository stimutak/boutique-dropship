# Multi-Currency Support Implementation Plan

## Overview
Add multi-currency support to enable pricing in 7 currencies (USD, EUR, CNY, JPY, SAR, GBP, CAD) matching our i18n languages. Products store base price in USD with conversion rates, orders capture currency at purchase time.

## CLAUDE.md Compliance Check:
- ✅ Uses existing patterns
- ✅ Modifies existing files (Product.js, Order.js, routes)
- ✅ No duplicate/enhanced versions
- ✅ Simple implementation

## Currency Mapping (matches i18n locales):
- en: USD (US Dollar)
- es: EUR (Euro)
- fr: EUR (Euro)
- de: EUR (Euro)
- zh: CNY (Chinese Yuan)
- ja: JPY (Japanese Yen)
- ar: SAR (Saudi Riyal)

## Implementation Tasks:

### 1. Add Currency Fields to Product Model (2 hours)
**File**: `/models/Product.js`

Add to schema:
```javascript
baseCurrency: {
  type: String,
  default: 'USD',
  enum: ['USD', 'EUR', 'CNY', 'JPY', 'SAR', 'GBP', 'CAD']
},
prices: {
  USD: { type: Number, required: true },
  EUR: { type: Number },
  CNY: { type: Number },
  JPY: { type: Number },
  SAR: { type: Number },
  GBP: { type: Number },
  CAD: { type: Number }
}
```

### 2. Add Currency Fields to Order Model (1 hour)
**File**: `/models/Order.js`

Add to schema:
```javascript
currency: {
  type: String,
  required: true,
  enum: ['USD', 'EUR', 'CNY', 'JPY', 'SAR', 'GBP', 'CAD']
},
exchangeRate: {
  type: Number,
  required: true,
  default: 1
}
```

### 3. Create Currency Conversion Utility (2 hours)
**File**: `/utils/currency.js` (new file justified as utility)

Functions needed:
- `convertPrice(amount, fromCurrency, toCurrency, rates)`
- `formatPrice(amount, currency, locale)`
- `getCurrencyForLocale(locale)`
- `getExchangeRates()` - static rates initially

### 4. Update Product Routes (2 hours)
**File**: `/routes/products.js`

Modifications:
- Get user's currency from locale or preference
- Return prices in user's currency
- Include currency symbol in response

### 5. Frontend Currency Display Component (2 hours)
**File**: `/client/src/components/PriceDisplay.jsx` (new component)

Features:
- Display price with proper currency symbol
- Use Intl.NumberFormat for locale formatting
- Support all 7 currencies

### 6. Currency Rate Updates (2 hours)
**File**: `/scripts/updateCurrencyRates.js`

Features:
- Fetch rates from API or use static rates
- Update all product prices
- Run as cron job or manually

## Static Exchange Rates (Initial Implementation):
```javascript
const STATIC_RATES = {
  USD: 1,
  EUR: 0.85,
  GBP: 0.73,
  CNY: 6.45,
  JPY: 110.0,
  SAR: 3.75,
  CAD: 1.25
}
```

## Testing Requirements:
1. Product prices display correctly in all currencies
2. Orders capture currency at purchase time
3. Cart calculations use consistent currency
4. Mollie payment amounts are correct
5. Currency formatting matches locale

## Migration Strategy:
1. Add new fields with defaults
2. Populate prices for existing products
3. Update frontend to use new price display
4. Test with all locales

## Total Estimate: 1.5 days