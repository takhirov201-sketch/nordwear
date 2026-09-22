import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Routes, Route, useLocation } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { logout as logoutAction, setUser, selectUser } from './store/slices/authSlice'
import { login } from './store/thunks/loginThunk'
import { register } from './store/thunks/registerThunk'
import { persistor } from './store/store'
import api, { getToken, clearToken } from './api/api'
import Navbar from './components/navbar'
import Footer from './components/Footer'
import HomePage from './pages/homePage'
import CartPage from './pages/cartPage'
import LoginPage from './pages/loginPage'
import RegisterPage from './pages/registerPage'
import ProductsPage from './pages/productsPage'
import NotFoundPage from './pages/notFoundPage'
import CheckoutPage from './pages/checkoutPage'
import OrdersPage from './pages/ordersPage'
import ForbiddenPage from './pages/forbiddenPage'
import InfoPage from './pages/infoPage'
import AdminDashboard from './components/adminDashboard'
import ProtectedRoute from './routes/protectedRoute'
import AdminRoute from './routes/adminRoute'
import { ToastProvider } from './components/ToastProvider'
import { ToastContainer } from 'react-toastify'
import { toastSuccess, toastWarning, toastError } from './lib/toastHelper'
import { translateProductName } from './utils/productTranslator'
import 'react-toastify/dist/ReactToastify.css'
import './App.css'

function App() {
  const dispatch = useDispatch()
  const currentUser = useSelector(selectUser)
  const { t } = useTranslation()

  function normalizeCartItems(items) {
    return items.map((item) => ({
      ...item,
      selectedSize: item.selectedSize || item.size?.[0] || '',
      image: item.image?.trim() || item.image || '/logo.png',
    }))
  }

  const location = useLocation()
  const [cartItems, setCartItems] = useState(() => normalizeCartItems(currentUser?.cart || []))

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCartItems(normalizeCartItems(currentUser?.cart || []))
  }, [currentUser])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [location.pathname])

  // Restore the session on load: the stored token is re-validated by the server,
  // so a revoked or expired one logs the user out instead of faking a session.
  useEffect(() => {
    if (!getToken()) return

    let cancelled = false
    api
      .get('/auth/me')
      .then((res) => {
        if (!cancelled && res.data?.user) dispatch(setUser(res.data.user))
      })
      .catch(() => {
        if (!cancelled) {
          clearToken()
          dispatch(logoutAction())
        }
      })

    return () => {
      cancelled = true
    }
  }, [dispatch])

  const saveCartForUser = async (cart, user) => {
    if (!user) return
    const normalizedCart = normalizeCartItems(cart)
    const updatedUser = { ...user, cart: normalizedCart }
    dispatch(setUser(updatedUser))

    try {
      // the server takes the cart owner from the token — no user id is sent
      await api.put('/cart', { cart: normalizedCart })
    } catch (error) {
      console.warn('Cart sync failed', error)
    }
  }

  const setCartAndSync = (nextCart) => {
    setCartItems(nextCart)
    if (currentUser) {
      saveCartForUser(nextCart, currentUser)
    }
  }

  const getProductLabel = (item) => {
    const name = translateProductName(item)
    const size = item.selectedSize || item.size?.[0] || ''
    return size ? `${name} (${size})` : name
  }

  const addToCart = (product, selectedSize) => {
    if (!currentUser) return false

    if (currentUser.role === 'admin') {
      toastError(t('toast.adminBlocked'))
      return false
    }

    const size = selectedSize || product.selectedSize || product.size?.[0] || null
    const existing = cartItems.find(
      (item) => item.id === product.id && item.selectedSize === size,
    )
    const nextCart = existing
      ? cartItems.map((item) =>
          item.id === product.id && item.selectedSize === size
            ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) }
            : item,
        )
      : [...cartItems, { ...product, selectedSize: size, quantity: 1, image: product.image?.trim() || product.image || '/logo.png' }]

    const updatedItem = nextCart.find(
      (item) => item.id === product.id && item.selectedSize === size,
    )

    setCartAndSync(nextCart)
    toastSuccess(t('toast.itemAdded', { item: getProductLabel(updatedItem), qty: updatedItem.quantity }))
    return true
  }

  const removeFromCart = (productId, selectedSize) => {
    const item = cartItems.find(
      (cartItem) => cartItem.id === productId && cartItem.selectedSize === selectedSize,
    )
    const nextCart = cartItems.filter(
      (item) => !(item.id === productId && item.selectedSize === selectedSize),
    )
    setCartAndSync(nextCart)
    if (item) {
      toastWarning(t('toast.itemRemoved', { item: getProductLabel(item) }))
    }
  }

  const updateCartItemQuantity = (productId, selectedSize, quantity) => {
    if (!currentUser) return
    const item = cartItems.find(
      (cartItem) => cartItem.id === productId && cartItem.selectedSize === selectedSize,
    )
    if (!item) return

    const nextCart = cartItems
      .map((cartItem) =>
        cartItem.id === productId && cartItem.selectedSize === selectedSize
          ? { ...cartItem, quantity: Math.min(quantity, cartItem.stock) }
          : cartItem,
      )
      .filter((cartItem) => cartItem.quantity > 0)

    setCartAndSync(nextCart)

    const updatedItem = nextCart.find(
      (cartItem) => cartItem.id === productId && cartItem.selectedSize === selectedSize,
    )
    const message = updatedItem
      ? t('toast.qtyUpdated', { item: getProductLabel(updatedItem), qty: updatedItem.quantity })
      : t('toast.itemRemoved', { item: getProductLabel(item) })

    const toastFn = updatedItem
      ? quantity > item.quantity
        ? toastSuccess
        : toastWarning
      : toastWarning

    toastFn(message)
  }

  const clearCart = () => {
    setCartAndSync([])
    toastError(t('toast.cartCleared'))
  }

  const cartCount = cartItems.length

  // thunks reject with translation keys so the message follows the selected language
  const translateAuthError = (message, fallbackKey) =>
    typeof message === 'string' && message.startsWith('auth.') ? t(message) : t(fallbackKey)

  const loginUser = async ({ email, password }) => {
    const normalizedEmail = email.trim().toLowerCase()
    const trimmedPassword = password.trim()
    if (!normalizedEmail || !trimmedPassword) {
      return { success: false, message: t('auth.invalidCredentials') }
    }

    try {
      const user = await dispatch(login({ email: normalizedEmail, password: trimmedPassword })).unwrap()
      const fullUser = { ...user, cart: user.cart || [] }
      setCartItems(normalizeCartItems(fullUser.cart))
      return { success: true, user: fullUser }
    } catch (message) {
      return { success: false, message: translateAuthError(message, 'auth.loginFailed') }
    }
  }

  const registerUser = async ({ name, email, password }) => {
    try {
      const user = await dispatch(register({ name, email, password })).unwrap()
      const fullUser = { ...user, cart: user.cart || [] }
      setCartItems(normalizeCartItems(fullUser.cart))
      return { success: true }
    } catch (message) {
      return { success: false, message: translateAuthError(message, 'auth.registerError') }
    }
  }

  const logout = () => {
    clearToken()
    dispatch(logoutAction())
    setCartItems([])
    persistor.purge()
  }

  return (
    <ToastProvider>
      <Navbar cartCount={cartCount} currentUser={currentUser} onLogout={logout} />
      <ToastContainer
        position="bottom-center"
        autoClose={1800}
        limit={1}
        hideProgressBar={true}
        newestOnTop={true}
        closeOnClick
        pauseOnFocusLoss={false}
        draggable={false}
        pauseOnHover={false}
        theme="dark"
      />
      <div className="route-transition" key={location.pathname}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/cart"
            element={
              <CartPage
                cartItems={cartItems}
                currentUser={currentUser}
                onUpdateQuantity={updateCartItemQuantity}
                onClearCart={clearCart}
                onRemoveItem={removeFromCart}
              />
            }
          />
          <Route path="/login" element={<LoginPage onLogin={loginUser} currentUser={currentUser} />} />
          <Route path="/register" element={<RegisterPage onRegister={registerUser} currentUser={currentUser} />} />
          <Route
            path="/products"
            element={
              <ProductsPage
                cartItems={cartItems}
                currentUser={currentUser}
                onAddToCart={addToCart}
                onUpdateQuantity={updateCartItemQuantity}
              />
            }
          />
          <Route path="/sustainability" element={<InfoPage page="sustainability" />} />
          <Route path="/support" element={<InfoPage page="support" />} />
          <Route path="/privacy" element={<InfoPage page="privacy" />} />
          <Route path="/delivery" element={<InfoPage page="delivery" />} />
          <Route path="*" element={<NotFoundPage />} />
          <Route
            path="/checkout"
            element={
              <ProtectedRoute>
                <CheckoutPage />
              </ProtectedRoute>
            }
          />
          <Route path="/orders" element={
            <ProtectedRoute>
              <OrdersPage />
            </ProtectedRoute>
          } />
          <Route path="/admin" element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          } />
          <Route path="/admin/orders" element={
            <AdminRoute>
              <OrdersPage />
            </AdminRoute>
          } />
          <Route path="/forbidden" element={<ForbiddenPage />} />
        </Routes>
      </div>
      <Footer />
    </ToastProvider>
  )
}

export default App
