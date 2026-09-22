import { useTranslation } from 'react-i18next'

function HomePage() {
  const { t } = useTranslation()

  return (
    <div className="page home-page">
      <div className="home-hero">
        <section className="hero-copy">
          <span className="hero-label">{t('home.heroLabel')}</span>
          <h1 aos="fade-down-left">{t('home.heroTitle')}</h1>
          <p>{t('home.heroDescription')}</p>
          <div className="hero-features">
            <div className="feature-item">
              <span>{t('home.feature1')}</span>
              <span>›</span>
            </div>
            <div className="feature-item">
              <span>{t('home.feature2')}</span>
              <span>›</span>
            </div>
            <div className="feature-item">
              <span>{t('home.feature3')}</span>
              <span>›</span>
            </div>
          </div>
        </section>

        <div className="hero-image">
          <img src="/HomePageImg.png" alt="Nord Wear product" />
        </div>
      </div>
    </div>
  )
}

export default HomePage
