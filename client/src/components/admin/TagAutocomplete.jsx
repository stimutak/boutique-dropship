import { useState, useEffect, useRef } from 'react'
import './TagAutocomplete.css'

const TagAutocomplete = ({ value, onChange, placeholder }) => {
  const [inputValue, setInputValue] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [tags, setTags] = useState([])
  const [existingTags, setExistingTags] = useState([])
  const wrapperRef = useRef(null)
  const inputRef = useRef(null)
  const debounceTimer = useRef(null)

  // Parse initial value
  useEffect(() => {
    if (value) {
      const parsedTags = value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
      setTags(parsedTags)
    }
  }, [])

  // Update parent when tags change
  useEffect(() => {
    onChange(tags.join(', '))
  }, [tags, onChange])

  // Fetch existing tags from products
  useEffect(() => {
    fetchExistingTags()
  }, [])

  const fetchExistingTags = async () => {
    try {
      const response = await fetch('/api/products/tags')
      if (response.ok) {
        const data = await response.json()
        setExistingTags(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching tags:', error)
      // Use some common tags as fallback
      setExistingTags([
        'crystal', 'healing', 'meditation', 'chakra', 'energy',
        'spiritual', 'protection', 'cleansing', 'balance', 'wellness',
        'natural', 'organic', 'handmade', 'sacred', 'ritual',
        'incense', 'essential-oil', 'gemstone', 'mineral', 'quartz'
      ])
    }
  }

  // Handle clicks outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Filter suggestions based on input
  useEffect(() => {
    if (!inputValue) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }

    // Debounce suggestions
    debounceTimer.current = setTimeout(() => {
      const filtered = existingTags
        .filter(tag => 
          tag.toLowerCase().includes(inputValue.toLowerCase()) &&
          !tags.includes(tag)
        )
        .slice(0, 8)
      
      setSuggestions(filtered)
      setShowSuggestions(filtered.length > 0)
    }, 150)

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [inputValue, existingTags, tags])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (showSuggestions && selectedIndex >= 0) {
        addTag(suggestions[selectedIndex])
      } else if (inputValue.trim()) {
        addTag(inputValue.trim())
      }
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      // Remove last tag if backspace is pressed with empty input
      removeTag(tags.length - 1)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => 
        prev < suggestions.length - 1 ? prev + 1 : prev
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
      setSelectedIndex(-1)
    } else if (e.key === ',' || e.key === 'Tab') {
      if (inputValue.trim()) {
        e.preventDefault()
        addTag(inputValue.trim())
      }
    }
  }

  const addTag = (tag) => {
    const normalizedTag = tag.toLowerCase().replace(/[^a-z0-9-]/g, '-')
    if (normalizedTag && !tags.includes(normalizedTag)) {
      setTags([...tags, normalizedTag])
      // Add to existing tags if not already there
      if (!existingTags.includes(normalizedTag)) {
        setExistingTags([normalizedTag, ...existingTags])
      }
    }
    setInputValue('')
    setShowSuggestions(false)
    setSelectedIndex(-1)
  }

  const removeTag = (index) => {
    setTags(tags.filter((_, i) => i !== index))
  }

  const handleSuggestionClick = (tag) => {
    addTag(tag)
    inputRef.current?.focus()
  }

  return (
    <div className="tag-autocomplete" ref={wrapperRef}>
      <div className="tag-input-container">
        <div className="selected-tags">
          {tags.map((tag, index) => (
            <span key={index} className="tag-chip">
              {tag}
              <button
                type="button"
                className="tag-remove"
                onClick={() => removeTag(index)}
                aria-label={`Remove ${tag}`}
              >
                ×
              </button>
            </span>
          ))}
          <input
            ref={inputRef}
            type="text"
            className="tag-input"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => inputValue && setShowSuggestions(true)}
            placeholder={tags.length === 0 ? placeholder : ''}
          />
        </div>
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="tag-suggestions">
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion}
              className={`tag-suggestion ${selectedIndex === index ? 'selected' : ''}`}
              onClick={() => handleSuggestionClick(suggestion)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              {suggestion}
            </div>
          ))}
        </div>
      )}

      <div className="tag-help-text">
        Press Enter or comma to add a tag
      </div>
    </div>
  )
}

export default TagAutocomplete