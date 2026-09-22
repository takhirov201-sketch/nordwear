import { useTranslation } from 'react-i18next'

function InfoPage({ page }) {
  const { t } = useTranslation()
  const base = `infoPages.${page}`

  return (
    <div className="page info-page">
      <div className="info-page-header">
        <h1>{t(`${base}.title`)}</h1>
        <p className="info-page-intro">{t(`${base}.intro`)}</p>
      </div>

      <div className="info-page-sections">
        {[1, 2, 3].map((index) => (
          <section key={index} className="info-page-section">
            <h2>{t(`${base}.section${index}Title`)}</h2>
            <p>{t(`${base}.section${index}Body`)}</p>
          </section>
        ))}
      </div>
    </div>
  )
}

export default InfoPage
