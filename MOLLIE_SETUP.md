# Mollie Payment Gateway Setup Guide

## Overview
Mollie is our chosen payment provider for international transactions, supporting 25+ currencies and multiple payment methods across Europe and beyond.

## 🔑 Account Setup

### 1. Create Mollie Account
1. Go to [https://www.mollie.com](https://www.mollie.com)
2. Click "Sign up" and choose your country
3. Complete business verification (required for live payments)

### 2. Get API Keys
1. Log into Mollie Dashboard
2. Navigate to "Developers" → "API keys"
3. Copy your keys:
   - **Test API Key**: `test_xxxxxx` (for development)
   - **Live API Key**: `live_xxxxxx` (for production)

### 3. Update Environment Variables
```bash
# Development (.env.development)
MOLLIE_API_KEY=test_xxxxxx
MOLLIE_TEST_KEY=test_xxxxxx

# Production (.env.production)
MOLLIE_API_KEY=live_xxxxxx
NODE_ENV=production
```

## 🌍 International Configuration

### Enable Multiple Currencies
1. In Mollie Dashboard → "Settings" → "Website profiles"
2. Enable currencies you want to accept:
   - **Primary**: EUR, USD, GBP
   - **European**: CHF, SEK, NOK, DKK, PLN, CZK
   - **Global**: CAD, AUD, JPY, NZD, SGD, HKD
   - **Others**: Based on your target markets

### Payment Methods by Region
Mollie automatically shows relevant payment methods based on customer location:

#### Europe
- **iDEAL** (Netherlands)
- **Bancontact** (Belgium)
- **SEPA Direct Debit** (EU-wide)
- **Sofort** (Germany, Austria, Switzerland)
- **Giropay** (Germany)
- **EPS** (Austria)
- **Przelewy24** (Poland)

#### Global
- **Credit/Debit Cards** (Visa, Mastercard, Amex)
- **PayPal**
- **Apple Pay**
- **Google Pay**
- **Klarna** (Buy now, pay later)

## 💻 Code Configuration

### 1. Basic Setup
```javascript
// Already implemented in /routes/payments.js
const mollieClient = createMollieClient({ 
  apiKey: process.env.MOLLIE_API_KEY 
});
```

### 2. Multi-Currency Payment
```javascript
// When creating payment, specify currency
const payment = await mollieClient.payments.create({
  amount: {
    currency: 'EUR', // or USD, GBP, etc.
    value: '29.99'
  },
  description: `Order #${order.orderNumber}`,
  redirectUrl: `${process.env.FRONTEND_URL}/order/confirmation`,
  webhookUrl: `${process.env.API_URL}/api/payments/webhook`,
  metadata: {
    orderId: order._id.toString()
  },
  locale: 'en_US' // or customer's locale
});
```

### 3. Currency Configuration in .env
```bash
# Supported currencies (comma-separated)
MOLLIE_CURRENCIES=EUR,USD,GBP,CAD,AUD,JPY,CHF,SEK,NOK

# Default currency
DEFAULT_CURRENCY=USD

# Settlement currency (your bank account currency)
SETTLEMENT_CURRENCY=USD
```

## 🧪 Testing

### Test Cards
Use these test card numbers in development:
- **Successful payment**: 4242 4242 4242 4242
- **Failed payment**: 4000 0000 0000 0002
- **3D Secure**: 4000 0000 0000 3220

### Test Currencies
All currencies work in test mode with the test API key.

### Webhook Testing
Use ngrok for local webhook testing:
```bash
ngrok http 5001
# Update MOLLIE_WEBHOOK_URL with ngrok URL
```

## 🚀 Production Checklist

### Before Going Live
- [ ] Business verification completed in Mollie
- [ ] Live API key obtained
- [ ] Bank account verified for settlements
- [ ] Currencies enabled in dashboard
- [ ] Payment methods configured
- [ ] Webhook URL points to production
- [ ] Error handling implemented
- [ ] Refund flow tested

### Security
- [ ] API keys in environment variables only
- [ ] HTTPS enforced for webhooks
- [ ] Webhook signature verification enabled
- [ ] PCI compliance maintained (Mollie handles this)

## 📊 Dashboard Features

### Monitor in Real-Time
- Payment success rates by currency
- Popular payment methods by country
- Conversion rates
- Settlement reports

### Useful Integrations
- Slack notifications for payments
- Accounting software exports
- Analytics tools integration

## 🔗 Resources

- [Mollie API Documentation](https://docs.mollie.com/)
- [Supported Currencies](https://docs.mollie.com/payments/multicurrency)
- [Payment Methods](https://www.mollie.com/payments)
- [Webhook Guide](https://docs.mollie.com/webhooks/overview)
- [Testing Guide](https://docs.mollie.com/testing/testing)

## 📞 Support

- **Technical Support**: support@mollie.com
- **Dashboard**: https://www.mollie.com/dashboard
- **Status Page**: https://status.mollie.com/

---

Remember: Mollie handles all the complexity of international payments, PCI compliance, and currency conversion. You just need to specify the currency and amount!