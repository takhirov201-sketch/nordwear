import dbData from '../data/db.json'

const products = dbData.products || []

export const getProductById = (id) => products.find((product) => `${product.id}` === `${id}`) || null

export const getProductName = (id, t, defaultName = '') => {
  const product = getProductById(id)
  if (!product) return defaultName
  const nameKey = product.nameKey || product.id
  return t(`products.names.${nameKey}`, { defaultValue: defaultName || product.name })
}

export const getProductColor = (id, t, defaultColor = '') => {
  const product = getProductById(id)
  if (!product) return defaultColor
  const colorKey = product.colorKey || (product.color || '').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase()
  return t(`products.colors.${colorKey}`, { defaultValue: defaultColor || product.color })
}

export const getProductCategory = (id, t, defaultCategory = '') => {
  const product = getProductById(id)
  if (!product) return defaultCategory
  const categoryKey = product.categoryKey || product.category
  return t(`products.categories.${categoryKey}`, { defaultValue: defaultCategory || product.category })
}
