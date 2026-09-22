import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FiCheck, FiChevronDown } from 'react-icons/fi'
import { MdLanguage } from 'react-icons/md'

const languageCodes = ['uz', 'ru', 'en']

function normalizeLanguage(code) {
  if (!code) return 'uz'
  const short = String(code).slice(0, 2).toLowerCase()
  return languageCodes.includes(short) ? short : 'uz'
}

function safeLocalStorageGet(key) {
  try {
    return window.localStorage.getItem(key)
  } catch (error) {
    console.warn('localStorage unavailable:', error)
    return null
  }
}

function safeLocalStorageSet(key, value) {
  try {
    window.localStorage.setItem(key, value)
  } catch (error) {
    console.warn('Could not persist language to localStorage:', error)
  }
}

function LanguageSwitcher() {
  const { t, i18n } = useTranslation()
  const [language, setLanguage] = useState(() => {
    const stored = safeLocalStorageGet('appLanguage')
    return normalizeLanguage(stored || i18n.language || 'uz')
  })
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const selected = normalizeLanguage(language)
    if (selected && normalizeLanguage(i18n.language) !== selected) {
      i18n.changeLanguage(selected).catch((error) => {
        console.warn('Failed to change language:', error)
      })
    }
    safeLocalStorageSet('appLanguage', selected)
  }, [language, i18n])

  useEffect(() => {
    const handleLanguageChanged = (lng) => {
      setLanguage(normalizeLanguage(lng))
    }
    i18n.on('languageChanged', handleLanguageChanged)
    return () => {
      i18n.off('languageChanged', handleLanguageChanged)
    }
  }, [i18n])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const changeLanguage = (langCode) => {
    setLanguage(langCode)
    setOpen(false)
  }

  const languages = languageCodes.map((code) => ({
    code,
    name: t(`language.${code}`),
  }))

  const currentLanguage = languages.find((item) => item.code === language) || languages[0]

  return (
    <div className="custom-language-switcher" ref={ref}>
      <button
        type="button"
        className={`custom-language-switcher-trigger ${open ? 'is-open' : ''}`}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <MdLanguage className="custom-language-switcher-icon language-icon" />
        <span className="lang-code">{currentLanguage.code.toUpperCase()}</span>
        <span className="lang-name">{currentLanguage.name}</span>
        <FiChevronDown className={`custom-language-switcher-icon chevron ${open ? 'is-open' : ''}`} />
      </button>
      {open && (
        <div className="custom-language-switcher-content" role="listbox">
          {languages.map((languageOption) => (
            <button
              key={languageOption.code}
              type="button"
              className={`custom-language-switcher-item ${languageOption.code === language ? 'selected' : ''}`}
              onClick={() => changeLanguage(languageOption.code)}
              role="option"
              aria-selected={languageOption.code === language}
            >
              <span className="lang-code">{languageOption.code.toUpperCase()}</span>
              <span className="lang-name">{languageOption.name}</span>
              {languageOption.code === language && <FiCheck className="custom-language-switcher-check" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default LanguageSwitcher;
