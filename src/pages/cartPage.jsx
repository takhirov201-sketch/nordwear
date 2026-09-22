import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { FiCreditCard, FiShield, FiClock } from 'react-icons/fi'
import { FaTrash } from 'react-icons/fa'
import { MdDeleteForever } from 'react-icons/md'
import dbData from '../data/db.json'
import {
  translateProductName,
  translateProductColor,
  translateAudience,
} from '../utils/productTranslator'

const cartProductImages = Object.fromEntries(
  (dbData.products || []).map((product) => [product.id, (product.image || '').trim() || '/logo.png']),
)

function CartPage({ cartItems, currentUser, onUpdateQuantity, onClearCart, onRemoveItem }) {
  const { t } = useTranslation()
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const deliveryFee = 30000
  const discount = 0
  const total = subtotal + deliveryFee - discount

  const handleImageError = (event) => {
    const target = event.target
    target.onerror = null
    if (!target.src.includes('logo.png')) {
      console.warn(`Image failed to load: ${target.src}`)
      target.src = '/logo.png?t=' + Date.now()
    }
  }

  if (!currentUser) {
    return (
      <div className="page">
        <h2>{t('cart.title')}</h2>
        <div className="empty-state">
          <p>{t('cart.emptyMessage')}</p>
          <div className="empty-state-actions">
            <Link to="/login" className="login-prompt-button">
              {t('auth.loginButton')}
            </Link>
            <Link to="/register" className="login-prompt-button">
              {t('auth.registerLink')}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page cart-page">
      <div className="cart-page-top">
        <div>
          <h2>{t('cart.title')}</h2>
          <p className="cart-page-subtitle">{t('cart.subtitle', { count: cartItems.length })}</p>
        </div>
      </div>

      {cartItems.length === 0 ? (
        <div className="empty-state">
          <p>{t('cart.emptyTitle')}</p>
        </div>
      ) : (
        <>
          <div className="cart-layout">
            <div className="cart-list-panel">
              <div className="cart-list">
                {cartItems.map((item) => (
                  <article key={`${item.id}-${item.selectedSize}`} className="cart-card">
                    <img
                      src={item.image?.trim() || cartProductImages[item.id] || '/logo.png'}
                      alt={item.name}
                      onError={handleImageError}
                    />
                    <div className="cart-card-body">
                      <div className="cart-card-top">
                        <h3>{translateProductName(item)}</h3>
                        <p className="cart-card-price">{item.price.toLocaleString()} UZS</p>
                      </div>
                      <div className="cart-card-meta">
                        <span>{t('products.color')} {translateProductColor(item)}</span>
                        {item.selectedSize && <span>{t('products.selectedSize')} {item.selectedSize}</span>}
                        <span className="badge badge--forwho">{translateAudience(item.forWho || item.gender)}</span>
                        <span>ART: {item.id}</span>
                      </div>
                      <div className="quantity-control">
                        <button
                          type="button"
                          className="quantity-button decrement"
                          onClick={() => onUpdateQuantity(item.id, item.selectedSize, item.quantity - 1)}
                        >
                          -
                        </button>
                        <span className="quantity-value">{item.quantity}</span>
                        <button
                          type="button"
                          className="quantity-button increment"
                          onClick={() => onUpdateQuantity(item.id, item.selectedSize, item.quantity + 1)}
                        >
                          +
                        </button>
                        <button
                          type="button"
                          className="item-remove-button"
                          onClick={() => onRemoveItem(item.id, item.selectedSize)}
                        >
                          <MdDeleteForever />
                          <span>{t('cart.remove')}</span>
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <div className="cart-footer-actions">
                <Link to="/products" className="continue-shopping">
                  {t('cart.continueShopping')}
                </Link>
                <button type="button" className="clear-cart-button" onClick={onClearCart}>
                  <FaTrash /> {t('cart.clearCart')}
                </button>
              </div>
            </div>

            <aside className="cart-summary">
              <h3>{t('cart.orderSummary')}</h3>
              <div className="summary-row">
                <span>{t('cart.itemsCount', { count: cartItems.reduce((sum, item) => sum + item.quantity, 0) })}</span>
                <span>{subtotal.toLocaleString()} UZS</span>
              </div>
              <div className="summary-row">
                <span>{t('cart.delivery')}</span>
                <span>{deliveryFee.toLocaleString()} UZS</span>
              </div>
              <div className="summary-row">
                <span>{t('cart.discount')}</span>
                <span>- {discount.toLocaleString()} UZS</span>
              </div>
              <div className="summary-divider" />
              <div className="summary-row summary-total">
                <span>{t('cart.total')}</span>
                <strong>{total.toLocaleString()} UZS</strong>
              </div>

              <div className="promo-form">
                <input type="text" className="promo-input" placeholder={t('cart.promoPlaceholder')} />
                <button type="button" className="promo-button">
                  {t('cart.apply')}
                </button>
              </div>

              <Link to="/checkout" className="checkout-button">
                {t('cart.checkout')}
              </Link>

              <div className="summary-icons">
                <div className="summary-icon">
                  <FiCreditCard />
                  <span>{t('cart.onlinePayment')}</span>
                </div>
                <div className="summary-icon">
                  <FiShield />
                  <span>{t('cart.warranty')}</span>
                </div>
                <div className="summary-icon">
                  <FiClock />
                  <span>{t('cart.deliveryInfo')}</span>
                </div>
              </div>
            </aside>
          </div>

          <div className="cart-benefits">
            <div className="benefit-card">
              <h4>{t('cart.orderSummary')}</h4>
              <p>{t('cart.subtitle', { count: cartItems.length })}</p>
            </div>
            <div className="benefit-card">
              <h4>{t('cart.warranty')}</h4>
              <p>{t('cart.discount')}</p>
            </div>
            <div className="benefit-card">
              <h4>{t('cart.delivery')}</h4>
              <p>{t('cart.deliveryInfo')}</p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default CartPage
