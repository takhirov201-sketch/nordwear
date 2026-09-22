import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import LoadingSkeleton from '../components/LoadingSkeleton'
import './registerPage.css'

function RegisterPage({ onRegister, currentUser }) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (currentUser) {
      navigate('/')
    }
  }, [currentUser, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError(t('auth.enterName'))
      return
    }
    if (!email.trim()) {
      setError(t('auth.enterEmail'))
      return
    }
    if (!password) {
      setError(t('auth.enterPassword'))
      return
    }
    if (password !== confirm) {
      setError(t('auth.passwordsMatch'))
      return
    }

    setLoading(true)
    const result = await onRegister({ name, email, password })
    setLoading(false)

    if (result.success) {
      navigate('/')
    } else {
      setError(result.message || t('auth.registerError'))
    }
  }

  if (loading) {
    return (
      <main className="page register-page">
        <LoadingSkeleton variant="form" count={1} />
      </main>
    )
  }

  return (
    <div className="register-container">
      <form className="register-form" onSubmit={handleSubmit}>
        <div className="login-brand">
          <img src="/logo.png" alt="Nord Wear" />
          <h3 className="login-title">{t('auth.registerTitle')}</h3>
          <p className="login-subtitle">{t('auth.registerSubtitle')}</p>
        </div>

        <div className="form-group">
          <input
            className="form-input"
            type="text"
            placeholder={t('auth.namePlaceholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <input
            className="form-input"
            type="email"
            placeholder={t('auth.emailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <input
            className="form-input"
            type="password"
            placeholder={t('auth.passwordPlaceholder')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <input
            className="form-input"
            type="password"
            placeholder={t('auth.confirmPasswordPlaceholder')}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label className="terms">
            <input type="checkbox" required /> {t('auth.terms')}
          </label>
        </div>

        <button type="submit" className="form-button" disabled={loading}>
          {loading ? t('auth.registering') : t('auth.registerButton')}
        </button>

        {error && <p className="error-message">{error}</p>}

        <p className="form-footer">
          {t('auth.alreadyAccount')} <Link to="/login">{t('auth.loginButton')}</Link>
        </p>
      </form>
    </div>
  )
}

export default RegisterPage
