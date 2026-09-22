import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import LoadingSkeleton from '../components/LoadingSkeleton'
import './loginPage.css'

function LoginPage({ onLogin, currentUser }) {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/'

  useEffect(() => {
    if (!currentUser) return

    const targetRoute = currentUser.role === 'admin' ? '/admin' : from
    navigate(targetRoute, { replace: true })
  }, [currentUser, from, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const result = await onLogin({ email, password })

    setLoading(false)
    if (result.success) {
      const nextRoute = result.user?.role === 'admin' ? '/admin' : from
      navigate(nextRoute, { replace: true })
    } else {
      setError(result.message || t('auth.loginFailed'))
    }
  }
  if (loading) {
    return (
      <main className="page login-page">
        <LoadingSkeleton variant="form" count={1} />
      </main>
    )
  }

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleSubmit}>
        <div className="login-brand">
          <img src="/logo.png" alt="Nord Wear" />
          <h3 className="login-title">{t('auth.welcome')}</h3>
          <p className="login-subtitle">{t('auth.signIn')}</p>
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

        <button className="form-button" type="submit" disabled={loading}>
          {loading ? t('auth.loggingIn') : t('auth.loginButton')}
        </button>

        {error && <p className="error-message">{error}</p>}

        <p className="form-footer">
          {t('auth.noAccount')} <Link to="/register">{t('auth.registerLink')}</Link>
        </p>
      </form>
    </div>
  )
}

export default LoginPage;