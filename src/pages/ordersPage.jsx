import { useMemo, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector, useDispatch } from 'react-redux'
import { selectUser, setUser } from '../store/slices/authSlice'
import { Link } from 'react-router-dom'
import dbData from '../data/db.json'
import api from '../api/api'
import {
  FaHourglassHalf,
  FaCheck,
  FaTruck,
  FaCheckCircle,
  FaPhoneAlt,
  FaMapMarkerAlt,
  FaRegCalendarAlt,
  FaMoneyBillWave,
  FaChevronDown,
  FaTrashAlt,
} from 'react-icons/fa'
import {
  translateProductName,
  translateAudience,
} from '../utils/productTranslator'

const STATUS_ICONS = {
  pending: FaHourglassHalf,
  accepted: FaCheck,
  inTransit: FaTruck,
  delivered: FaCheckCircle,
}

const LOCALE_BY_LANGUAGE = { uz: 'uz-UZ', ru: 'ru-RU', en: 'en-US' }
const STATUS_KEYS = ['pending', 'accepted', 'inTransit', 'delivered']

// Orders carry `date` as YYYY-MM-DD and `createdAt` as a full ISO string.
// Prefer createdAt so sorting stays correct down to the minute.
function getOrderTimestamp(order) {
  const value = order?.createdAt || order?.date
  const parsed = value ? new Date(value).getTime() : Number.NaN
  return Number.isNaN(parsed) ? 0 : parsed
}

function OrdersPage() {
  const dispatch = useDispatch()
  const { t, i18n } = useTranslation()
  const currentUser = useSelector(selectUser)
  const orders = currentUser?.orders || []
  const isAdmin = currentUser?.role === 'admin'
  const [adminOrders, setAdminOrders] = useState([])
  const [adminOrdersLoading, setAdminOrdersLoading] = useState(false)
  const [adminOrdersError, setAdminOrdersError] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const [expandedOrderIds, setExpandedOrderIds] = useState(() => new Set())
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  const formatOrderDate = (order) => {
    const timestamp = getOrderTimestamp(order)
    if (!timestamp) return '—'
    const locale = LOCALE_BY_LANGUAGE[(i18n.language || 'uz').slice(0, 2)] || 'uz-UZ'
    return new Date(timestamp).toLocaleDateString(locale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const toggleOrderItems = (orderId) => {
    setExpandedOrderIds((prev) => {
      const next = new Set(prev)
      if (next.has(orderId)) {
        next.delete(orderId)
      } else {
        next.add(orderId)
      }
      return next
    })
  }

  const productImages = Object.fromEntries(
    (dbData.products || []).map((product) => [product.id, (product.image || '').trim()]),
  )

  const statusTabs = useMemo(
    () => [
      { key: 'all', label: t('orders.filter.all') },
      { key: 'pending', label: t('orders.filter.pending') },
      { key: 'accepted', label: t('orders.filter.accepted') },
      { key: 'inTransit', label: t('orders.filter.inTransit') },
      { key: 'delivered', label: t('orders.filter.delivered') },
    ],
    [t],
  )

  const statusLabelByKey = useMemo(
    () => ({
      pending: t('orders.filter.pending'),
      accepted: t('orders.filter.accepted'),
      inTransit: t('orders.filter.inTransit'),
      delivered: t('orders.filter.delivered'),
    }),
    [t],
  )

  // New orders store a language-independent key ('pending', 'accepted', ...).
  // Older orders stored the translated label, so we still match those by text.
  const normalizeStatus = (status) => {
    const value = (status || '').toString().toLowerCase()
    if (STATUS_KEYS.includes(value)) return value
    if (value.includes('kutil') || value.includes('pending') || value.includes('ожид')) {
      return 'pending'
    }
    if (value.includes('yetkazilgan') || value.includes('delivered') || value.includes('доставлено')) {
      return 'delivered'
    }
    if (value.includes('yetkazilmoqda') || value.includes('in transit') || value.includes('в пути') || value.includes('yo‘l') || value.includes('yo’lda')) {
      return 'inTransit'
    }
    if (value.includes('qabul qilingan') || value.includes('accepted') || value.includes('принято')) {
      return 'accepted'
    }
    return 'all'
  }

  const getStatusLabel = (status) => {
    const key = normalizeStatus(status)
    return statusLabelByKey[key] || status || t('orders.status')
  }

  const filteredOrders = useMemo(
    () => {
      const source = isAdmin ? adminOrders : orders
      return source.filter((order) => {
        const statusKey = normalizeStatus(order.status)
        return filterStatus === 'all' || statusKey === filterStatus
      })
    },
    [orders, adminOrders, filterStatus, isAdmin],
  )

  const getStatusClass = (status) => {
    const key = normalizeStatus(status)
    return `order-status order-status--${key}`
  }

  // The server rejects both of these unless the caller is an admin — the
  // isAdmin check here only keeps the UI from firing pointless requests.
  const handleStatusUpdate = async (orderId, nextStatusKey) => {
    if (!isAdmin) return
    const status = STATUS_KEYS.includes(nextStatusKey) ? nextStatusKey : 'pending'

    try {
      await api.patch(`/orders/${orderId}`, { status })
      await loadAdminOrders()
    } catch (err) {
      console.warn('Admin order status update failed', err)
    }
  }

  const handleDeleteOrder = async (orderId) => {
    if (!isAdmin) return

    try {
      await api.delete(`/orders/${orderId}`)
      await loadAdminOrders()
    } catch (err) {
      console.warn('Order delete failed', err)
    } finally {
      setConfirmDeleteId(null)
    }
  }

  const loadAdminOrders = async () => {
    setAdminOrdersLoading(true)
    try {
      // /orders already returns every buyer's orders for an admin, sorted
      const res = await api.get('/orders')
      setAdminOrders(Array.isArray(res.data) ? res.data : [])
      setAdminOrdersError(false)
    } catch (err) {
      console.warn('Failed to load orders', err)
      setAdminOrdersError(true)
    } finally {
      setAdminOrdersLoading(false)
    }
  }

  useEffect(() => {
    if (isAdmin) loadAdminOrders()
  }, [isAdmin])

  // Non-admins refresh their own orders from the server so statuses changed by
  // an admin show up without needing a re-login.
  useEffect(() => {
    if (isAdmin || !currentUser?.id) return

    let cancelled = false
    api
      .get('/orders')
      .then((res) => {
        if (!cancelled && Array.isArray(res.data)) {
          dispatch(setUser({ ...currentUser, orders: res.data }))
        }
      })
      .catch((err) => console.warn('Failed to refresh orders', err))

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, dispatch, isAdmin])

  const handleImageError = (event) => {
    const target = event.target
    target.onerror = null
    if (!target.src.includes('logo.png')) {
      target.src = '/logo.png?t=' + Date.now()
    }
  }

  return (
    <main className="orders-page">
      <section className="orders-header">
        <h1>{t('orders.title')}</h1>
        <p>{t('orders.description')}</p>
      </section>

      {isAdmin && adminOrdersError ? (
        <div className="empty-orders">
          <p>
            {t('orders.loadError')}
          </p>
          <button type="button" className="login-prompt-button" onClick={loadAdminOrders}>
            {t('orders.retry')}
          </button>
        </div>
      ) : (isAdmin ? adminOrders.length === 0 : orders.length === 0) ? (
        <div className="empty-orders">
          <p>{isAdmin && adminOrdersLoading ? t('orders.loading') : t('orders.noOrders')}</p>
          {!isAdmin && (
            <Link to="/products" className="login-prompt-button">
              {t('orders.backToProducts')}
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="orders-filter-tabs">
            {statusTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`orders-filter-tab ${filterStatus === tab.key ? 'active' : ''}`}
                onClick={() => setFilterStatus(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className={`orders-list ${isAdmin ? 'orders-list--admin' : ''}`}>
            {filteredOrders.map((order) => {
              const orderTotal = order.total ?? order.items?.reduce((sum, item) => sum + item.price * item.quantity, 0) ?? 0
              const statusKey = normalizeStatus(order.status)
              const StatusIcon = STATUS_ICONS[statusKey] || STATUS_ICONS.pending
              const primaryItem = order.items?.[0]
              const extraItemsCount = (order.items?.length || 0) - 1
              const phone = order.shippingInfo?.phone
              const address = [order.shippingInfo?.address, order.shippingInfo?.city].filter(Boolean).join(', ')
              const isItemsExpanded = expandedOrderIds.has(order.id)

              return (
                <article key={order.id} className="order-card">
                  <div className="order-top">
                    <div className="order-top-left">
                      <h2 className="order-title">
                        {t('orders.orderNumber', { id: order.id })}
                        {isAdmin && (order.userName || order.userEmail) ? ` · ${order.userName || order.userEmail}` : ''}
                      </h2>
                      <p className="order-date">{formatOrderDate(order)}</p>
                    </div>

                    {primaryItem && (
                      <div className="order-product-preview">
                        <img
                          src={primaryItem.image || productImages[primaryItem.id] || '/logo.png'}
                          alt={primaryItem.name}
                          onError={handleImageError}
                          className="order-product-image"
                        />
                        <div className="order-product-info">
                          <strong className="order-product-name">{translateProductName(primaryItem)}</strong>
                          <span className="order-product-meta">
                            {primaryItem.quantity} {t('admin.statsPanel.itemsUnit')} · {primaryItem.price.toLocaleString()} UZS
                          </span>
                          {primaryItem.selectedSize && (
                            <span className="order-product-size">{t('products.selectedSize')} {primaryItem.selectedSize}</span>
                          )}
                          <span className="badge badge--forwho" style={{ fontSize: '0.72rem', padding: '2px 8px', display: 'inline-block', marginTop: '4px' }}>
                            {translateAudience(primaryItem.forWho || primaryItem.gender)}
                          </span>
                          {extraItemsCount > 0 && (
                            <button
                              type="button"
                              className="order-product-extra"
                              onClick={() => toggleOrderItems(order.id)}
                            >
                              +{extraItemsCount} {t('admin.statsPanel.itemsUnit')}
                              <FaChevronDown
                                className={`order-product-extra-icon ${isItemsExpanded ? 'is-open' : ''}`}
                              />
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="order-top-right">
                      <span className="order-total-amount">{orderTotal.toLocaleString()} UZS</span>
                      <div className="order-status-row">
                        <span className={getStatusClass(order.status)}>
                          <StatusIcon size={12} />
                          {getStatusLabel(order.status)}
                        </span>

                        {isAdmin && (
                          <div className="order-delete-wrap">
                            <button
                              type="button"
                              className="order-delete-button"
                              aria-label={t('orders.deleteOrder')}
                              onClick={() =>
                                setConfirmDeleteId((prev) => (prev === order.id ? null : order.id))
                              }
                            >
                              <FaTrashAlt size={13} />
                            </button>

                            {confirmDeleteId === order.id && (
                              <>
                                <div
                                  className="order-delete-backdrop"
                                  onClick={() => setConfirmDeleteId(null)}
                                />
                                <div className="order-delete-popover">
                                  <p>{t('orders.deleteConfirm')}</p>
                                  <div className="order-delete-popover-actions">
                                    <button
                                      type="button"
                                      className="order-delete-cancel"
                                      onClick={() => setConfirmDeleteId(null)}
                                    >
                                      {t('orders.cancel')}
                                    </button>
                                    <button
                                      type="button"
                                      className="order-delete-confirm"
                                      onClick={() => handleDeleteOrder(order.id)}
                                    >
                                      {t('orders.delete')}
                                    </button>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {extraItemsCount > 0 && (
                    <div className={`order-items ${isItemsExpanded ? 'is-open' : ''}`}>
                      {order.items.slice(1).map((item) => (
                        <div key={`${item.id}-${item.selectedSize}`} className="order-item">
                          <img
                            src={item.image || productImages[item.id] || '/logo.png'}
                            alt={item.name}
                            onError={handleImageError}
                            className="order-item-image"
                          />
                          <div className="order-item-info">
                            <strong className="order-item-name">{translateProductName(item)}</strong>
                            <span className="order-item-meta">
                              {item.quantity} {t('admin.statsPanel.itemsUnit')} · {item.price.toLocaleString()} UZS
                              {item.selectedSize ? ` · ${t('products.selectedSize')} ${item.selectedSize}` : ''}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="order-body">
                    <div className="order-details">
                      <div className="order-detail-row">
                        <FaPhoneAlt className="order-detail-icon" />
                        <span className="order-detail-label">{t('checkout.phone')}:</span>
                        <span className="order-detail-value">{phone || '—'}</span>
                      </div>
                      <div className="order-detail-row">
                        <FaMapMarkerAlt className="order-detail-icon" />
                        <span className="order-detail-label">{t('checkout.deliveryAddress')}:</span>
                        <span className="order-detail-value">{address || '—'}</span>
                      </div>
                      <div className="order-detail-row">
                        <FaRegCalendarAlt className="order-detail-icon" />
                        <span className="order-detail-label">{t('orders.date')}:</span>
                        <span className="order-detail-value">{formatOrderDate(order)}</span>
                      </div>
                      <div className="order-detail-row">
                        <FaMoneyBillWave className="order-detail-icon" />
                        <span className="order-detail-label">{t('checkout.total')}:</span>
                        <span className="order-detail-value order-detail-value--bold">
                          {orderTotal.toLocaleString()} UZS
                        </span>
                      </div>
                    </div>

                    {isAdmin && (
                      <div className="order-actions">
                        {Object.entries(statusLabelByKey).map(([key, label]) => {
                          const Icon = STATUS_ICONS[key] || FaHourglassHalf
                          const isActive = statusKey === key
                          return (
                            <button
                              key={key}
                              type="button"
                              className={`order-action-button order-action-button--${key} ${isActive ? 'active' : ''}`}
                              onClick={() => handleStatusUpdate(order.id, key)}
                              disabled={isActive}
                            >
                              <Icon size={12} />
                              {label}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </article>
              )
            })}

            {filteredOrders.length === 0 && (
              <div className="empty-orders">
                <p>{t('orders.noMatching')}</p>
              </div>
            )}
          </div>
        </>
      )}
    </main>
  )
}

export default OrdersPage
