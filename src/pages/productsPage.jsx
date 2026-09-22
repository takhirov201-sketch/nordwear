import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { getProducts } from '../store/thunks/getProductsThunk'
import {
  selectProductsError,
  selectProductsLoading,
  selectSortedProducts,
} from '../store/slices/productSlice'
import SearchBar from '../components/SearchBar'
import LoadingSkeleton from '../components/LoadingSkeleton'
import { FiChevronDown, FiMinusCircle, FiChevronLeft, FiChevronRight, FiX } from 'react-icons/fi'
import {
  translateProductName,
  translateProductColor,
  translateProductCategory,
  translateProductDescription,
  translateAudience,
  buildCategoryLabels,
  translateCategorySlug,
} from '../utils/productTranslator'

function ProductsPage({ cartItems = [], currentUser, onAddToCart, onUpdateQuantity }) {
  const { t, i18n } = useTranslation()
  const dispatch = useDispatch()
const products = useSelector(selectSortedProducts)
const loading = useSelector(selectProductsLoading)
const error = useSelector(selectProductsError)
const [selectedSizes, setSelectedSizes] = useState({})
const [expandedProductSizes, setExpandedProductSizes] = useState({})
const [cardImageIndices, setCardImageIndices] = useState({})
const [selectedGalleryModal, setSelectedGalleryModal] = useState(null)
const [galleryActiveIndex, setGalleryActiveIndex] = useState(0)
const [category, setCategory] = useState('all')
const [audienceFilter, setAudienceFilter] = useState('all')
const [search, setSearch] = useState('')

const categoryOptions = useMemo(() => {
  let customCats = []
  let deletedCats = []
  try {
    const saved = localStorage.getItem('nordwear_custom_categories')
    if (saved) customCats = JSON.parse(saved)
  } catch {
    customCats = []
  }
  try {
    const savedDel = localStorage.getItem('nordwear_deleted_categories')
    if (savedDel) deletedCats = JSON.parse(savedDel)
  } catch {
    deletedCats = []
  }
  const labels = buildCategoryLabels(products)
  const categories = Array.from(new Set([...products.map((product) => product.category), ...customCats]))
    .filter((c) => Boolean(c) && !deletedCats.includes(c))
    .sort()
  return [
    { value: 'all', label: t('products.all') },
    ...categories.map((value) => ({ value, label: translateCategorySlug(value, labels) })),
  ]
}, [products, t])

const audienceOptions = useMemo(
  () => [
    { value: 'all', label: t('admin.form.forAll') },
    { value: 'Erkaklar', label: t('admin.form.forMen') },
    { value: 'Ayollar', label: t('admin.form.forWomen') },
    { value: 'Bolalar', label: t('admin.form.forKids') },
  ],
  [t],
)

const visibleProducts = useMemo(
  () => {
    const query = search.trim().toLowerCase()
    return products.filter((product) => {
      // search the translated name too, so typing in the active language works
      const matchesSearch =
        !query ||
        (product.name || '').toLowerCase().includes(query) ||
        translateProductName(product).toLowerCase().includes(query)

      return (
        (category === 'all' || product.category === category) &&
        (audienceFilter === 'all' || (product.forWho || product.gender || 'Barchaga') === audienceFilter) &&
        matchesSearch
      )
    })
  },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [products, category, audienceFilter, search, i18n.language],
)

useEffect(() => {
  if (!products.length) {
    dispatch(getProducts())
  }
}, [dispatch, products.length])

useEffect(() => {
  if (products.length > 0) {
    setSelectedSizes((currentSizes) => {
      return products.reduce((acc, product) => {
        const availableSize = product.size?.find((s) => typeof s === 'string' && !s.startsWith('!'))
        const firstCleanSize = availableSize
          ? availableSize.replace(/^!/, '')
          : product.size?.[0]
            ? product.size[0].replace(/^!/, '')
            : ''
        acc[product.id] = currentSizes[product.id] || firstCleanSize
        return acc
      }, {})
    })
  }
}, [products])

const getProductQuantity = (productId, size) => {
  const item = cartItems.find(
    (cartItem) => cartItem.id === productId && cartItem.selectedSize === size,
  )
  return item?.quantity ?? 0
}

const handleCategoryChange = (value) => {
  setCategory(value)
}

const handleImageError = (event) => {
  const target = event.target
  target.onerror = null
  if (!target.src.includes('logo.png')) {
    console.warn(`Image failed to load: ${target.src}`)
    target.src = '/logo.png?t=' + Date.now()
  }
}

const isAdmin = currentUser?.role === 'admin'

return (
  <div className="page">
    <div className="products-toolbar">
      <div className="products-heading">
        <h2>{t('products.title')}</h2>
        <p>{t('products.subtitle')}</p>
      </div>
    </div>

    {/* Desktop & Tablet Filter Bar (>= 768px) - Matching Screenshot */}
    <div className="products-controls-desktop">
      {/* Top: Search Bar */}
      <div className="desktop-search-row">
        <SearchBar onSearch={(val) => setSearch(val)} />
      </div>

      {/* Bottom: Filters Row */}
      <div className="desktop-filters-row">
        {/* Category Filter Group (Left) */}
        <div className="desktop-filter-col">
          <label className="desktop-filter-label">{t('products.categoryLabel')}</label>
          <div className="desktop-category-controls">
            <div className="desktop-select-wrapper">
              <select
                className="desktop-category-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="all">{t('products.selectCategory')}</option>
                {categoryOptions.filter((o) => o.value !== 'all').map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <FiChevronDown className="select-arrow-icon" />
            </div>

            <button
              type="button"
              className="btn-reset-filters"
              onClick={() => {
                setCategory('all')
                setAudienceFilter('all')
                setSearch('')
              }}
            >
              {t('products.resetFilters')} <FiMinusCircle className="reset-icon" />
            </button>
          </div>
        </div>

        {/* Gender Filter Group (Right) */}
        <div className="desktop-filter-col">
          <label className="desktop-filter-label">{t('admin.table.gender')}</label>
          <div className="desktop-gender-pills">
            {[
              { value: 'all', label: t('products.audience.all') },
              { value: 'Erkaklar', label: t('products.audience.men') },
              { value: 'Ayollar', label: t('products.audience.women') },
              { value: 'Bolalar', label: t('products.audience.kids') },
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                className={`desktop-gender-pill ${audienceFilter === item.value ? 'active' : ''}`}
                onClick={() => setAudienceFilter(item.value)}
              >
                <span className="pill-main-label">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>

    {/* Mobile Controls (< 768px) - Retaining previous mobile layout */}
    <div className="products-controls-mobile">
      <SearchBar onSearch={(val) => setSearch(val)} />

      <div className="category-buttons">
        {categoryOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`category-button ${option.value === category ? 'active' : ''}`}
            onClick={() => handleCategoryChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="audience-filter-buttons">
        {audienceOptions.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`audience-filter-btn ${opt.value === audienceFilter ? 'active' : ''}`}
            onClick={() => setAudienceFilter(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>

    {loading && (
      <LoadingSkeleton variant="cards" count={6} />
    )}

    {error && (
      <div className="empty-state">
        <strong>{t('products.error')}</strong>
        <div>{error}</div>
      </div>
    )}

    {!loading && !error && visibleProducts.length === 0 && (
      <div className="empty-state">
        <strong>{t('products.notFound')}</strong>
      </div>
    )}

    <div className="products-grid">
      {visibleProducts.map((product) => {
        const availableSize = product.size?.find((s) => typeof s === 'string' && !s.startsWith('!'))
        const defaultCleanSize = availableSize
          ? availableSize.replace(/^!/, '')
          : product.size?.[0]
            ? product.size[0].replace(/^!/, '')
            : ''
        const selectedSize = selectedSizes[product.id] || defaultCleanSize
        const selectedQuantity = getProductQuantity(product.id, selectedSize)
        const isInSelectedSize = selectedQuantity > 0

        const currentSizeStockQty = product.sizesStock
          ? (product.sizesStock[selectedSize] ?? 0)
          : product.stock ?? 0
        const isSizeSoldOut = currentSizeStockQty === 0
        const isOverallSoldOut = product.stock === 0
        const isSoldOut = isSizeSoldOut || isOverallSoldOut

        const sizesList = product.size || []
        const isExpanded = expandedProductSizes[product.id]
        const maxVisible = 4
        const shouldCollapse = sizesList.length > 5 && !isExpanded
        const visibleSizes = shouldCollapse ? sizesList.slice(0, maxVisible) : sizesList

        const imgList = Array.isArray(product.images) && product.images.length > 0
          ? product.images
          : product.image ? [product.image] : ['/logo.png']
        const activeImgIdx = cardImageIndices[product.id] || 0
        const activeImgUrl = imgList[activeImgIdx] || imgList[0] || '/logo.png'

        return (
          <article
            key={product.id}
            className={`card ${isInSelectedSize ? 'card--added' : ''}`}
          >
            {/* Product Card Image with Carousel Bars (Screenshot 1 matching!) */}
            <div className="card-image-container">
              <img
                src={activeImgUrl}
                alt={product.name}
                onError={handleImageError}
                onClick={() => {
                  setSelectedGalleryModal(product)
                  setGalleryActiveIndex(activeImgIdx)
                }}
                className="card-main-image"
              />

              {imgList.length > 1 && (
                <div className="card-slider-indicators">
                  {imgList.map((_, idx) => (
                    <span
                      key={idx}
                      className={`slider-bar ${idx === activeImgIdx ? 'active' : ''}`}
                      onMouseEnter={() => setCardImageIndices((prev) => ({ ...prev, [product.id]: idx }))}
                      onClick={(e) => {
                        e.stopPropagation()
                        setCardImageIndices((prev) => ({ ...prev, [product.id]: idx }))
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="card-body">
              <h3>{translateProductName(product)}</h3>
              <p className="price">{product.price.toLocaleString()} UZS</p>
              <p>
                <small>{t('products.color')} {translateProductColor(product)}</small>
              </p>
              <div className="badge-group">
                <span className="badge">{translateProductCategory(product)}</span>
                <span className="badge badge--forwho">{translateAudience(product.forWho || product.gender)}</span>
                <span className="badge">{t('products.totalStock', { count: product.stock })}</span>
                {isOverallSoldOut && <span className="badge badge--soldout">{t('products.outOfStock')}</span>}
              </div>

              {/* Uzum-Style Size Selector & Per-Size Stock Indicator */}
              {sizesList.length > 0 && (
                <div className="size-picker-uzum">
                  <div className="size-picker-header">
                    <span className="size-header-title">{t('products.sizeLabel')}</span>
                    <strong className="size-header-value">{selectedSize || '—'}</strong>
                  </div>

                  <div className="size-pills-row">
                    {visibleSizes.map((rawSize) => {
                      const cleanSize = typeof rawSize === 'string' ? rawSize.replace(/^!/, '') : rawSize
                      const szQty = product.sizesStock ? (product.sizesStock[cleanSize] ?? 0) : product.stock
                      const isSzDisabled = szQty === 0 || (typeof rawSize === 'string' && rawSize.startsWith('!'))
                      const isActive = selectedSize === cleanSize

                      return (
                        <button
                          key={rawSize}
                          type="button"
                          className={`uzum-size-pill ${isActive ? 'active' : ''} ${isSzDisabled ? 'disabled' : ''}`}
                          onClick={() =>
                            setSelectedSizes((prev) => ({ ...prev, [product.id]: cleanSize }))
                          }
                        >
                          {cleanSize}
                        </button>
                      )
                    })}

                    {sizesList.length > 5 && (
                      <button
                        type="button"
                        className="uzum-size-more-btn"
                        onClick={() =>
                          setExpandedProductSizes((prev) => ({
                            ...prev,
                            [product.id]: !prev[product.id],
                          }))
                        }
                      >
                        {isExpanded ? t('products.lessSizes') : t('products.moreSizes')}
                      </button>
                    )}
                  </div>

                  {/* Stock status badge for selected size */}
                  <div className="uzum-stock-badge-wrapper">
                    {!isSizeSoldOut ? (
                      <div className="uzum-stock-badge available">
                        <span className="check-icon">✓</span>
                        <span>{t('products.sizeAvailable', { count: currentSizeStockQty })}</span>
                      </div>
                    ) : (
                      <div className="uzum-stock-badge out-of-stock">
                        <span className="cross-icon">✕</span>
                        <span>{t('products.sizeOutOfStock')}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedQuantity > 0 ? (
                <div className="quantity-toggle">
                  <button
                    type="button"
                    className="quantity-action decrement"
                    onClick={() =>
                      onUpdateQuantity(product.id, selectedSize, selectedQuantity - 1)
                    }
                    disabled={selectedQuantity <= 0}
                  >
                    -
                  </button>
                  <span className="item-count">{selectedQuantity}</span>
                  <button
                    type="button"
                    className="quantity-action increment"
                    onClick={() =>
                      onUpdateQuantity(product.id, selectedSize, selectedQuantity + 1)
                    }
                    disabled={isSizeSoldOut || selectedQuantity >= currentSizeStockQty}
                  >
                    +
                  </button>
                  {currentUser && (
                    <span className="added-note">{t('products.inCart')}</span>
                  )}
                  {!currentUser && (
                    <span className="added-note">{t('products.loginToAdd')}</span>
                  )}
                </div>
              ) : (
                  <>
                  {currentUser ? (
                    <button
                      type="button"
                      className={`add-button ${isSoldOut ? 'add-button--soldout' : ''}`}
                      onClick={() => onAddToCart(product, selectedSize)}
                      disabled={isSoldOut || isAdmin}
                    >
                      {isSoldOut
                        ? t('products.outOfStock')
                        : isAdmin
                        ? t('products.adminBlocked')
                        : t('products.addToCart')}
                    </button>
                  ) : (
                    <Link to="/login" className="login-prompt-button">
                      {t('products.loginToAdd')}
                    </Link>
                  )}
                </>
              )}
            </div>
          </article>
        )
      })}
    </div>

    {/* Uzum Lightbox Gallery Modal (Rendered via React Portal directly into document.body!) */}
    {selectedGalleryModal && createPortal(
      (() => {
        const modalImgList = Array.isArray(selectedGalleryModal.images) && selectedGalleryModal.images.length > 0
          ? selectedGalleryModal.images
          : selectedGalleryModal.image ? [selectedGalleryModal.image] : ['/logo.png']
        const currentImg = modalImgList[galleryActiveIndex] || modalImgList[0]

        const handlePrev = () => {
          setGalleryActiveIndex((prev) => (prev > 0 ? prev - 1 : modalImgList.length - 1))
        }

        const handleNext = () => {
          setGalleryActiveIndex((prev) => (prev < modalImgList.length - 1 ? prev + 1 : 0))
        }

        return (
          <div className="uzum-lightbox-overlay" onClick={() => setSelectedGalleryModal(null)}>
            <div className="uzum-lightbox-content" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="uzum-lightbox-close"
                onClick={() => setSelectedGalleryModal(null)}
              >
                <FiX />
              </button>

              <div className="uzum-lightbox-info-header">
                <h3>{translateProductName(selectedGalleryModal)}</h3>
                <div className="lightbox-product-price">{selectedGalleryModal.price?.toLocaleString()} UZS</div>
              </div>

              <div className="uzum-lightbox-body">
                {/* Left Column: Vertical Thumbnails Sidebar */}
                <div className="uzum-lightbox-thumbs-sidebar">
                  {modalImgList.map((img, idx) => (
                    <div
                      key={idx}
                      className={`uzum-thumb-item ${idx === galleryActiveIndex ? 'active' : ''}`}
                      onClick={() => setGalleryActiveIndex(idx)}
                    >
                      <img src={img} alt={`Thumb ${idx + 1}`} onError={handleImageError} />
                    </div>
                  ))}
                </div>

                {/* Center Main Image View with Circle Arrow Buttons */}
                <div className="uzum-lightbox-hero-container">
                  {modalImgList.length > 1 && (
                    <button type="button" className="lightbox-nav-btn prev" onClick={handlePrev}>
                      <FiChevronLeft />
                    </button>
                  )}

                  <img
                    src={currentImg}
                    alt={selectedGalleryModal.name}
                    className="lightbox-hero-img"
                    onError={handleImageError}
                  />

                  {modalImgList.length > 1 && (
                    <button type="button" className="lightbox-nav-btn next" onClick={handleNext}>
                      <FiChevronRight />
                    </button>
                  )}
                </div>
              </div>

              {/* Product Description added from Admin Panel */}
              <div className="uzum-lightbox-description-box">
                <h4>{t('products.descriptionTitle')}</h4>
                <p>{translateProductDescription(selectedGalleryModal) || t('products.noDescription')}</p>
              </div>
            </div>
          </div>
        )
      })(),
      document.body
    )}
  </div>
  )
}

export default ProductsPage
