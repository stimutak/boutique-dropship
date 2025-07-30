import { useTranslation } from 'react-i18next'
import { localeCurrencies } from '../i18n/i18n'

function PriceDisplay({ price, compareAtPrice, currency, displayPrice }) {
  const { i18n } = useTranslation()
  
  // If displayPrice is provided from backend, use it
  if (displayPrice) {
    return (
      <div className="price-display">
        {compareAtPrice && compareAtPrice > price && (
          <span className="compare-price" style={{ textDecoration: 'line-through', color: '#999', marginRight: '8px' }}>
            {formatPriceForDisplay(compareAtPrice, currency || localeCurrencies[i18n.language], i18n.language)}
          </span>
        )}
        <span className="current-price" style={{ fontWeight: 'bold', color: '#333' }}>
          {displayPrice}
        </span>
      </div>
    )
  }
  
  // Otherwise format locally
  const userCurrency = currency || localeCurrencies[i18n.language] || 'USD'
  
  return (
    <div className="price-display">
      {compareAtPrice && compareAtPrice > price && (
        <span className="compare-price" style={{ textDecoration: 'line-through', color: '#999', marginRight: '8px' }}>
          {formatPriceForDisplay(compareAtPrice, userCurrency, i18n.language)}
        </span>
      )}
      <span className="current-price" style={{ fontWeight: 'bold', color: '#333' }}>
        {formatPriceForDisplay(price, userCurrency, i18n.language)}
      </span>
    </div>
  )
}

// Helper function to format price
function formatPriceForDisplay(amount, currency, locale) {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: currency === 'JPY' ? 0 : 2,
      maximumFractionDigits: currency === 'JPY' ? 0 : 2
    }).format(amount)
  } catch (error) {
    // Fallback formatting
    const symbols = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      CNY: '¥',
      JPY: '¥',
      SAR: 'ر.س',
      CAD: 'C$'
    }
    const symbol = symbols[currency] || currency
    return `${symbol}${amount.toFixed(currency === 'JPY' ? 0 : 2)}`
  }
}

export default PriceDisplay