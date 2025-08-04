import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import './SearchAutocomplete.css'

const SearchAutocomplete = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [isLoading, setIsLoading] = useState(false)
  const wrapperRef = useRef(null)
  const debounceTimer = useRef(null)

  // Handle clicks outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch autocomplete suggestions
  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }

    // Debounce the API call
    debounceTimer.current = setTimeout(async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/products/autocomplete?q=${encodeURIComponent(query)}`)
        if (response.ok) {
          const data = await response.json()
          setSuggestions(data.data || [])
          setShowSuggestions(true)
        }
      } catch (error) {
        console.error('Autocomplete error:', error)
      } finally {
        setIsLoading(false)
      }
    }, 300) // 300ms debounce

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [query])

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0) {
          handleSuggestionClick(suggestions[selectedIndex])
        } else {
          handleSearch()
        }
        break
      case 'Escape':
        setShowSuggestions(false)
        setSelectedIndex(-1)
        break
    }
  }

  const handleSearch = () => {
    if (query.trim()) {
      navigate(`/products?search=${encodeURIComponent(query.trim())}`)
      setShowSuggestions(false)
      setQuery('')
    }
  }

  const handleSuggestionClick = (suggestion) => {
    if (suggestion.type === 'tag') {
      navigate(`/products?search=${encodeURIComponent(suggestion.value)}`)
    } else {
      navigate(`/products/${suggestion.value}`)
    }
    setShowSuggestions(false)
    setQuery('')
  }

  const getIcon = (type) => {
    switch (type) {
      case 'product':
        return '🛍️'
      case 'tag':
        return '🏷️'
      case 'description':
        return '📝'
      case 'property':
        return '✨'
      default:
        return '🔍'
    }
  }

  return (
    <div className="search-autocomplete" ref={wrapperRef}>
      <div className="search-input-wrapper">
        <input
          type="text"
          className="search-input"
          placeholder={t('search.placeholder', 'Search products, tags, properties...')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 2 && setShowSuggestions(true)}
        />
        <button 
          className="search-button"
          onClick={handleSearch}
          aria-label="Search"
        >
          🔍
        </button>
      </div>

      {showSuggestions && (
        <div className="search-suggestions">
          {isLoading ? (
            <div className="suggestion-item loading">
              {t('search.loading', 'Searching...')}
            </div>
          ) : suggestions.length > 0 ? (
            <>
              {suggestions.map((suggestion, index) => (
                <div
                  key={`${suggestion.type}-${suggestion.value}-${index}`}
                  className={`suggestion-item ${selectedIndex === index ? 'selected' : ''}`}
                  onClick={() => handleSuggestionClick(suggestion)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <span className="suggestion-icon">{getIcon(suggestion.type)}</span>
                  <div className="suggestion-content">
                    <div className="suggestion-label">{suggestion.label}</div>
                    {suggestion.category && (
                      <div className="suggestion-meta">in {suggestion.category}</div>
                    )}
                    {suggestion.snippet && (
                      <div className="suggestion-snippet">...{suggestion.snippet}...</div>
                    )}
                    {suggestion.type === 'tag' && (
                      <div className="suggestion-meta">Tag</div>
                    )}
                    {suggestion.properties && (
                      <div className="suggestion-properties">
                        {suggestion.properties.chakra?.slice(0, 2).map(c => (
                          <span key={c} className="property-badge">{c}</span>
                        ))}
                        {suggestion.properties.element?.slice(0, 2).map(e => (
                          <span key={e} className="property-badge">{e}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div 
                className="suggestion-item see-all"
                onClick={handleSearch}
              >
                {t('search.seeAll', 'See all results for')} "{query}"
              </div>
            </>
          ) : query.length >= 2 ? (
            <div className="suggestion-item no-results">
              {t('search.noResults', 'No results found')}
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}

export default SearchAutocomplete