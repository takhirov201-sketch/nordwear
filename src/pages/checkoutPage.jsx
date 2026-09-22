import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { selectUser, setUser } from '../store/slices/authSlice'
import validateForm from '../validations/validateForm'
import { useToast } from '../components/ToastProvider'
import LoadingSkeleton from '../components/LoadingSkeleton'
import api from '../api/api'
import { getProducts } from '../store/thunks/getProductsThunk'
import {
  translateProductName,
  translateAudience,
} from '../utils/productTranslator'

function CheckoutPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const currentUser = useSelector(selectUser)
  const cartItems = currentUser?.cart || []
  const [form, setForm] = useState({
    fullName: currentUser?.name || '',
    phone: '',
    city: '',
    address: '',
    paymentMethod: 'cash',
  })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { addToast } = useToast()

  const { t } = useTranslation()
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)
  const deliveryFee = 30000
  const discount = 0
  const total = subtotal + deliveryFee - discount

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setServerError('')
    const validationErrors = validateForm(form)
    const translatedErrors = Object.fromEntries(
      Object.entries(validationErrors).map(([field, key]) => [field, t(key)]),
    )
    setErrors(translatedErrors)
    if (Object.keys(validationErrors).length > 0) {
      return
    }

    if (!currentUser) {
      setServerError(t('checkout.loginRequired'))
      return
    }

    if (cartItems.length === 0) {
      setServerError(t('checkout.orderEmpty'))
      return
    }

    setIsSubmitting(true)

    try {
      // The server builds the order from the stored cart: it re-reads prices and
      // stock, decrements them, and clears the cart in one place. The client no
      // longer decides what anything costs.
      const res = await api.post('/orders', {
        shippingInfo: { ...form, paymentMethod: form.paymentMethod },
      })

      dispatch(setUser({ ...currentUser, cart: [], orders: [res.data, ...(currentUser.orders || [])] }))
      dispatch(getProducts())
      addToast({ message: t('checkout.orderSuccess'), type: 'success' })
      window.setTimeout(() => {
        navigate('/orders')
      }, 1500)
    } catch (error) {
      setServerError(t(error.messageKey || 'checkout.serverError'))
      setIsSubmitting(false)
    }
  }

  if (isSubmitting) {
    return (
      <main className="page checkout-page">
        <LoadingSkeleton variant="form" count={1} />
      </main>
    )
  }

  return (
    <main className="page checkout-page">
      <section className="checkout-top">
        <div>
          <div className="checkout-step-label">{t('checkout.step1')}</div>
          <h1>{t('checkout.step2')}</h1>
          <div className="checkout-step-label">{t('checkout.step3')}</div>
        </div>
      </section>

      {cartItems.length === 0 ? (
        <div className="empty-orders">
          <p>{t('checkout.orderEmpty')}</p>
        </div>
      ) : (
        <div className="checkout-layout">
          <div className="checkout-left">
            <form className="checkout-form" onSubmit={handleSubmit} noValidate>
              {serverError && <div className="auth-error">{serverError}</div>}

              <div className="form-section">
                <h2>{t('checkout.contactTitle')}</h2>
                <div className="field-grid">
                  <div className="auth-group">
                    <label htmlFor="fullName">{t('checkout.fullName')}</label>
                    <input
                      id="fullName"
                      name="fullName"
                      type="text"
                      value={form.fullName}
                      onChange={handleChange}
                      className="auth-input"
                      placeholder="John Doe"
                    />
                    {errors.fullName && <p className="auth-error">{errors.fullName}</p>}
                  </div>

                  <div className="auth-group">
                    <label htmlFor="phone">{t('checkout.phone')}</label>
                    <input
                      id="phone"
                      name="phone"
                      type="text"
                      value={form.phone}
                      onChange={handleChange}
                      className="auth-input"
                      placeholder="+998 90 123 45 67"
                    />
                    {errors.phone && <p className="auth-error">{errors.phone}</p>}
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h2>{t('checkout.deliveryTitle')}</h2>
                <div className="field-grid">
                  <div className="auth-group">
                    <label htmlFor="city">{t('checkout.city')}</label>
                    <select
                      id="city"
                      name="city"
                      value={form.city}
                      onChange={handleChange}
                      className="auth-input"
                    >
                      <option value="">{t('checkout.selectCity')}</option>
                      <option value="Toshkent">Toshkent</option>
                      <option value="Samarqand">Samarqand</option>
                      <option value="Buxoro">Buxoro</option>
                    </select>
                    {errors.city && <p className="auth-error">{errors.city}</p>}
                  </div>

                  <div className="auth-group">
                    <label htmlFor="address">{t('checkout.address')}</label>
                    <input
                      id="address"
                      name="address"
                      type="text"
                      value={form.address}
                      onChange={handleChange}
                      className="auth-input"
                      placeholder="Yunusobod tumani, A. Temur ko'chasi, 15-uy"
                    />
                    {errors.address && <p className="auth-error">{errors.address}</p>}
                  </div>
                </div>
              </div>

              <div className="form-section spacing-section">
                <div className="section-card active">
                  <div className="section-card-title">{t('checkout.standard')}</div>
                  <div className="section-card-subtitle">{t('checkout.standardInfo')}</div>
                  <div className="section-card-price">30 000 UZS</div>
                </div>
                <div className="section-card disabled">
                  <div className="section-card-title">{t('checkout.express')}</div>
                  <div className="section-card-subtitle">{t('checkout.expressInfo')}</div>
                  <div className="section-card-price">45 000 UZS</div>
                </div>
              </div>

              <div className="form-section">
                <h2>{t('checkout.paymentTitle')}</h2>
                <div className="payment-grid">
                  <button
                    type="button"
                    className={`payment-card ${form.paymentMethod === 'cash' ? 'active' : ''}`}
                    onClick={() => setForm((prev) => ({ ...prev, paymentMethod: 'cash' }))}
                  >
                    {t('checkout.cash')}
                  </button>
                  <button type="button" className="payment-card disabled" disabled>
                    CLICK
                  </button>
                  <button type="button" className="payment-card disabled" disabled>
                    Payme
                  </button>
                  <button type="button" className="payment-card disabled" disabled>
                    Uzcard / Humo
                  </button>
                </div>
              </div>

              {/* Mobile-only summary: shown on small screens between payment and submit */}
              <div className="mobile-summary">
                <div className="summary-card mobile">
                  <h3>{t('checkout.yourOrder')}</h3>
                  <div className="summary-items">
                    {cartItems.map((item) => (
                      <div key={`${item.id}-${item.selectedSize}`} className="summary-item">
                        <div>
                          <strong>{item.name}</strong>
                          <div className="summary-item-meta">{t('cart.quantity')}: {item.quantity}</div>
                          <div className="summary-item-meta">{t('products.selectedSize')} {item.selectedSize || '—'}</div>
                        </div>
                        <div>{(item.price * item.quantity).toLocaleString()} UZS</div>
                      </div>
                    ))}
                  </div>

                  <div className="promo-row">
                    <input type="text" className="promo-input" placeholder={t('checkout.promoPlaceholder')} />
                    <button type="button" className="promo-button">{t('checkout.apply')}</button>
                  </div>

                  <div className="summary-row">
                    <span>{t('cart.itemsCount', { count: itemCount })}</span>
                    <strong>{subtotal.toLocaleString()} UZS</strong>
                  </div>
                  <div className="summary-row">
                    <span>{t('cart.delivery')}</span>
                    <strong>{deliveryFee.toLocaleString()} UZS</strong>
                  </div>
                  <div className="summary-row">
                    <span>{t('cart.discount')}</span>
                    <strong>{discount.toLocaleString()} UZS</strong>
                  </div>
                  <div className="summary-divider" />
                  <div className="summary-row summary-total">
                    <span>{t('cart.total')}</span>
                    <strong>{total.toLocaleString()} UZS</strong>
                  </div>
                </div>
              </div>

              <div className="checkout-order-summary">
                <h3>{t('checkout.summaryTitle')}</h3>
                <div className="summary-row">
                  <span>{t('checkout.items')}:</span>
                  <strong>{itemCount}</strong>
                </div>
                <div className="summary-row">
                  <span>{t('checkout.delivery')}</span>
                  <strong>{deliveryFee.toLocaleString()} UZS</strong>
                </div>
                <div className="summary-row">
                  <span>{t('checkout.discount')}</span>
                  <strong>{discount.toLocaleString()} UZS</strong>
                </div>
                <div className="summary-divider" />
                <div className="summary-row summary-total">
                  <span>{t('checkout.total')}</span>
                  <strong>{total.toLocaleString()} UZS</strong>
                </div>
              </div>

              <button type="submit" className="auth-button checkout-submit" disabled={isSubmitting}>
                {isSubmitting ? t('checkout.submitting') : t('checkout.placeOrder')}
              </button>
            </form>
          </div>

          <aside className="checkout-summary-panel">
            <div className="summary-card">
              <h3>{t('checkout.yourOrder')}</h3>
              <div className="summary-items">
                {cartItems.map((item) => (
                  <div key={`${item.id}-${item.selectedSize}`} className="summary-item">
                    <div>
                      <strong>{translateProductName(item)}</strong>
                      <div className="summary-item-meta">{t('cart.quantity')}: {item.quantity}</div>
                      <div className="summary-item-meta">{t('products.selectedSize')} {item.selectedSize || '—'}</div>
                      <div className="summary-item-meta"><span className="badge badge--forwho">{translateAudience(item.forWho || item.gender)}</span></div>
                    </div>
                    <div>{(item.price * item.quantity).toLocaleString()} UZS</div>
                  </div>
                ))}
              </div>

              <div className="promo-row">
                <input type="text" className="promo-input" placeholder={t('checkout.promoPlaceholder')} />
                <button type="button" className="promo-button">{t('checkout.apply')}</button>
              </div>

              <div className="summary-row">
                <span>{t('cart.products')}</span>
                <strong>{subtotal.toLocaleString()} UZS</strong>
              </div>
              <div className="summary-row">
                <span>{t('cart.delivery')}</span>
                <strong>{deliveryFee.toLocaleString()} UZS</strong>
              </div>
              <div className="summary-divider" />
              <div className="summary-row summary-total">
                <span>{t('cart.total')}</span>
                <strong>{total.toLocaleString()} UZS</strong>
              </div>
            </div>
          </aside>
        </div>
      )}
    </main>
  )
}

export default CheckoutPage;
