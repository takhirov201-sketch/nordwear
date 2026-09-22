import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

function ForbiddenPage() {
  const { t } = useTranslation()

  return (
    <div className="forbidden-page">
      <h1>{t('forbidden.title')}</h1>
      <p>{t('forbidden.message')}</p>
      <Link to="/" className="btn btn-primary">
        {t('forbidden.returnHome')}
      </Link>
    </div>
  )
}

export default ForbiddenPage
