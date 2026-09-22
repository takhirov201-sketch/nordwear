import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FiSearch, FiX } from 'react-icons/fi'
import './SearchBar.css'

function SearchBar({ onSearch }) {
  const { t } = useTranslation()
  const [inputValue, setInputValue] = useState('')
  const timeoutRef = useRef(null)

  const handleChange = (e) => {
    const value = e.target.value
    setInputValue(value)

    if (timeoutRef.current) clearTimeout(timeoutRef.current)

    timeoutRef.current = setTimeout(() => {
      onSearch(value)
    }, 400)
  }

  const handleClear = () => {
    setInputValue('')
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    onSearch('')
  }

  return (
    <div className="search-bar-container">
      <div className="search-bar">
        <FiSearch className="search-icon" />
        <input
          type="text"
          value={inputValue}
          onChange={handleChange}
          placeholder={t('search.placeholder')}
          className="search-input"
        />
        {inputValue && (
          <button type="button" className="search-clear" onClick={handleClear} aria-label="clear search">
            <FiX />
          </button>
        )}
      </div>
    </div>
  )
}

export default SearchBar
