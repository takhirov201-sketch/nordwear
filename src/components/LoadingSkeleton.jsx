function LoadingSkeleton({ variant = 'cards', count = 4 }) {
  const items = Array.from({ length: count })

  const renderFormSkeleton = () => (
    <div className="loading-skeleton-item loading-skeleton-item--form">
      <div className="skeleton-block skeleton-block--title" />
      <div className="skeleton-block skeleton-block--field" />
      <div className="skeleton-block skeleton-block--field" />
      <div className="skeleton-block skeleton-block--field" />
      <div className="skeleton-block skeleton-block--button" />
    </div>
  )

  const renderCardSkeleton = () => (
    <div className="loading-skeleton-item loading-skeleton-item--card">
      <div className="skeleton-block skeleton-block--image" />
      <div className="skeleton-block skeleton-block--title" />
      <div className="skeleton-block skeleton-block--text" />
      <div className="skeleton-block skeleton-block--text skeleton-block--short" />
      <div className="skeleton-block skeleton-block--button" />
    </div>
  )

  const renderCartSkeleton = () => (
    <div className="loading-skeleton-item loading-skeleton-item--cart-page">
      <div className="skeleton-block skeleton-block--title" />
      <div className="loading-skeleton-cart-grid">
        <div className="skeleton-block skeleton-block--cart-list" />
        <div className="skeleton-block skeleton-block--cart-summary" />
      </div>
    </div>
  )

  const renderOrdersSkeleton = () => (
    <div className="loading-skeleton-item loading-skeleton-item--orders-page">
      <div className="skeleton-block skeleton-block--title" />
      <div className="loading-skeleton-orders">
        {[1, 2, 3].map((item) => (
          <div key={item} className="loading-skeleton-order-card">
            <div className="skeleton-block skeleton-block--order-row" />
            <div className="skeleton-block skeleton-block--order-row skeleton-block--short" />
            <div className="skeleton-block skeleton-block--order-summary" />
          </div>
        ))}
      </div>
    </div>
  )

  const renderProductSkeleton = () => (
    <div className="loading-skeleton-item loading-skeleton-item--product-page">
      <div className="skeleton-block skeleton-block--image-large" />
      <div className="skeleton-block skeleton-block--title" />
      <div className="skeleton-block skeleton-block--text" />
      <div className="skeleton-block skeleton-block--button" />
    </div>
  )

  const renderHomeSkeleton = () => (
    <div className="loading-skeleton-item loading-skeleton-item--home-page">
      <div className="skeleton-block skeleton-block--hero" />
      <div className="loading-skeleton-home-features">
        {[1, 2, 3].map((item) => (
          <div key={item} className="skeleton-block skeleton-block--feature" />
        ))}
      </div>
    </div>
  )

  const renderVariant = () => {
    switch (variant) {
      case 'form':
        return renderFormSkeleton()
      case 'cart':
        return renderCartSkeleton()
      case 'orders':
        return renderOrdersSkeleton()
      case 'product':
        return renderProductSkeleton()
      case 'home':
        return renderHomeSkeleton()
      default:
        return renderCardSkeleton()
    }
  }

  return (
    <div className={`loading-skeleton loading-skeleton--${variant}`}>
      {variant === 'cards'
        ? items.map((_, index) => <div key={index}>{renderCardSkeleton()}</div>)
        : renderVariant()}
    </div>
  )
}

export default LoadingSkeleton
