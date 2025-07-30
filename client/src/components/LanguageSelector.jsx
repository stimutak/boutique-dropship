import { useTranslation } from 'react-i18next'
import { supportedLanguages } from '../i18n/i18n'

function LanguageSelector() {
  const { i18n } = useTranslation()

  const handleLanguageChange = (lng) => {
    i18n.changeLanguage(lng)
    // Update document direction for RTL languages
    document.documentElement.dir = supportedLanguages[lng].dir
    // Store preference
    localStorage.setItem('i18nextLng', lng)
  }

  return (
    <div className="language-selector">
      <select 
        value={i18n.language} 
        onChange={(e) => handleLanguageChange(e.target.value)}
        className="bg-white border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
      >
        {Object.entries(supportedLanguages).map(([code, lang]) => (
          <option key={code} value={code}>
            {lang.flag} {lang.name}
          </option>
        ))}
      </select>
    </div>
  )
}

export default LanguageSelector