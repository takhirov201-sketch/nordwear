import { useState, useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate, Link, NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FaShoppingCart, FaUserCircle } from 'react-icons/fa'
import { IoLogOut } from "react-icons/io5";
import { IoLogIn } from 'react-icons/io5'
import { AiOutlineProduct } from "react-icons/ai";
import { FaHome } from "react-icons/fa";
import { HiShoppingBag, HiOutlineMenu, HiOutlineX } from "react-icons/hi";
import { RiAdminLine } from "react-icons/ri";
import { selectIsAdmin } from '../store/slices/authSlice'
import LanguageSwitcher from './languageSwitcher'

function Navbar({ cartCount, currentUser, onLogout }) {
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const admin = useSelector(selectIsAdmin)
  const navigate = useNavigate()
  const location = useLocation()
  const navCenterRef = useRef(null)
  const underlineRef = useRef(null)
  const mobileTabBarRef = useRef(null)
  const mobileUnderlineRef = useRef(null)
  const handleLogout = async () => {
    await onLogout()
    navigate('/login')
  }

  const { t, i18n } = useTranslation()
  const closeMobileMenu = () => setIsMobileMenuOpen(false)

  useEffect(() => {
    const updateUnderline = () => {
      const container = navCenterRef.current
      const underline = underlineRef.current
      if (container && underline) {
        const active = container.querySelector('.nav-item.active')
        if (!active) {
          underline.style.width = '0px'
          underline.style.opacity = '0'
        } else {
          const inset = 12
          const containerRect = container.getBoundingClientRect()
          const activeRect = active.getBoundingClientRect()
          const left = activeRect.left - containerRect.left + container.scrollLeft + inset
          const width = Math.max(0, activeRect.width - inset * 2)
          underline.style.transform = `translateX(${left}px)`
          underline.style.width = `${width}px`
          underline.style.opacity = '1'
        }
      }

      const mobileBar = mobileTabBarRef.current
      const mobileUnderline = mobileUnderlineRef.current
      if (mobileBar && mobileUnderline) {
        const mobileActive = mobileBar.querySelector('.tab-link.active')
        if (!mobileActive) {
          mobileUnderline.style.width = '0px'
          mobileUnderline.style.opacity = '0'
        } else {
          const mobileInset = 8
          const barRect = mobileBar.getBoundingClientRect()
          const activeRect = mobileActive.getBoundingClientRect()
          const left = activeRect.left - barRect.left + mobileBar.scrollLeft + mobileInset
          const width = Math.max(0, activeRect.width - mobileInset * 2)
          mobileUnderline.style.transform = `translateX(${left}px)`
          mobileUnderline.style.width = `${width}px`
          mobileUnderline.style.opacity = '1'
        }
      }
    }

    updateUnderline()
    window.addEventListener('resize', updateUnderline)
    return () => window.removeEventListener('resize', updateUnderline)
  }, [location.pathname, admin, i18n.language])

  return (
    <nav className="navbar">
      <div className="nav-left">
        <Link to="/" className="brand-link" aria-label="Nord Wear">
          <img src="/logo.png" alt="Nord Wear" className="brand-logo" />
        </Link>
        <button
          type="button"
          className="burger-button"
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          aria-label="Menu"
        >
          {isMobileMenuOpen ? <HiOutlineX /> : <HiOutlineMenu />}
        </button>
      </div>

      <div className="nav-center" ref={navCenterRef}>
        <NavLink end to="/" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
          <FaHome className="icon-top" />
          <span>{t('navbar.home')}</span>
        </NavLink>
        <NavLink to="/products" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
          <AiOutlineProduct className="icon-top" />
          <span>{t('navbar.products')}</span>
        </NavLink>
        {!admin && (
          <NavLink to="/orders" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
            <HiShoppingBag className="icon-top" />
            <span>{t('navbar.orders')}</span>
          </NavLink>
        )}
        {admin && (
          <>
            <NavLink to="/admin/orders" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
              <HiShoppingBag className="icon-top" />
              <span>{t('navbar.orders')}</span>
            </NavLink>
            <NavLink to="/admin" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
              <RiAdminLine className="icon-top" />
              <span>{t('navbar.admin')}</span>
            </NavLink>
          </>
        )}
        <span ref={underlineRef} className="nav-underline" aria-hidden="true" />
      </div>

      <div className="nav-right">
        <LanguageSwitcher />

        {currentUser ? (
          <div className="profile-group">
            <button
              type="button"
              className="profile-button"
              onClick={() => setIsProfileOpen((prev) => !prev)}
              aria-label="Profile"
            >
              <FaUserCircle className="profile-icon" />
              <span className="profile-name">{currentUser.name || currentUser.email}</span>
            </button>
            {isProfileOpen && (
              <div className="profile-menu">
                <button type="button" className="logout-button" onClick={handleLogout}>
                  <IoLogOut className="icon-left" /> {t('navbar.logout')}
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link to="/login" className="nav-auth-button auth-login">
            <IoLogIn className="icon-left" /> {t('navbar.login')}
          </Link>
        )}

        {!admin && (
          <Link to="/cart" className="cart-link" aria-label={t('navbar.cart')}>
            <FaShoppingCart />
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </Link>
        )}
      </div>
      <div className={`mobile-menu ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="mobile-menu-language">
          <LanguageSwitcher />
        </div>
        {!currentUser ? (
          <Link to="/login" className="mobile-menu-link" onClick={closeMobileMenu}>
            <IoLogIn />
            <span>{t('navbar.login')}</span>
          </Link>
        ) : (
          <div className="mobile-menu-profile">
            <button
              type="button"
              className="mobile-menu-link mobile-profile-button"
              onClick={() => setIsProfileOpen((p) => !p)}
            >
              <FaUserCircle />
              <span>{currentUser.name || currentUser.email}</span>
            </button>
            {isProfileOpen && (
              <div className="mobile-profile-submenu">
                <button
                  type="button"
                  className="mobile-logout-button"
                  onClick={async () => {
                    await handleLogout()
                    closeMobileMenu()
                  }}
                >
                  <IoLogOut className="icon-left" /> {t('navbar.logout')}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Mobile menu simplified: only profile + logout shown when logged in */}
      </div>
      <div className="mobile-tab-bar" ref={mobileTabBarRef}>
        <NavLink end to="/" className={({ isActive }) => `tab-link ${isActive ? 'active' : ''}`} aria-label={t('navbar.home')}>
          <FaHome />
          <span>{t('navbar.home')}</span>
        </NavLink>
        <NavLink to="/products" className={({ isActive }) => `tab-link ${isActive ? 'active' : ''}`} aria-label={t('navbar.products')}>
          <AiOutlineProduct />
          <span>{t('navbar.products')}</span>
        </NavLink>
        {!admin && (
          <NavLink to="/orders" className={({ isActive }) => `tab-link ${isActive ? 'active' : ''}`} aria-label={t('navbar.orders')}>
            <HiShoppingBag />
            <span>{t('navbar.orders')}</span>
          </NavLink>
        )}
        {!admin && (
          <NavLink to="/cart" className={({ isActive }) => `tab-link ${isActive ? 'active' : ''}`} aria-label={t('navbar.cart')}>
            <FaShoppingCart />
            <span>{t('navbar.cart')}</span>
          </NavLink>
        )}
        {admin && (
          <>
            <NavLink to="/admin/orders" className={({ isActive }) => `tab-link ${isActive ? 'active' : ''}`} aria-label={t('navbar.orders')}>
              <HiShoppingBag />
              <span>{t('navbar.orders')}</span>
            </NavLink>
            <NavLink to="/admin" className={({ isActive }) => `tab-link ${isActive ? 'active' : ''}`} aria-label={t('navbar.admin')}>
              <RiAdminLine />
              <span>{t('navbar.admin')}</span>
            </NavLink>
          </>
        )}
        <span ref={mobileUnderlineRef} className="mobile-tab-underline" aria-hidden="true" />
      </div>
    </nav>
  )
}

export default Navbar
