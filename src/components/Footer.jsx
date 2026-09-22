import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

function Footer() {
  const { t } = useTranslation()

  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-copy">
          <strong>Nord Wear</strong>
          <small>{t('footer.rights', { year: new Date().getFullYear() })}</small>
        </div>
        <div className="footer-links">
          <Link to="/sustainability">{t('footer.sustainability')}</Link>
          <Link to="/support">{t('footer.support')}</Link>
          <Link to="/privacy">{t('footer.privacy')}</Link>
          <Link to="/delivery">{t('footer.delivery')}</Link>
        </div>
      </div>
    </footer>
  )
}

export default Footer
