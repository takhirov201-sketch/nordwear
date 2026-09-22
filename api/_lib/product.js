const LANGS = ['uz', 'ru', 'en']
const AUDIENCES = ['Barchaga', 'Erkaklar', 'Ayollar', 'Bolalar']

function str(value) {
  return typeof value === 'string' ? value.trim() : ''
}

/* Whitelists and coerces the fields a product may carry. Anything the client
   sends outside this shape (ids, roles, prices as strings, …) is dropped, so a
   crafted request cannot smuggle extra fields into the document. */
export function sanitizeProduct(input = {}) {
  const errors = []

  const i18n = {}
  for (const lang of LANGS) {
    const entry = input.i18n?.[lang] || {}
    i18n[lang] = {
      name: str(entry.name),
      color: str(entry.color),
      category: str(entry.category),
      description: str(entry.description),
    }
    if (!i18n[lang].name) errors.push(`i18n.${lang}.name`)
  }

  const price = Number(input.price)
  if (!Number.isFinite(price) || price <= 0) errors.push('price')

  const category = str(input.category)
  if (!category) errors.push('category')

  const sizesStock = {}
  const rawSizes = input.sizesStock && typeof input.sizesStock === 'object' ? input.sizesStock : {}
  for (const [size, qty] of Object.entries(rawSizes)) {
    const key = str(size)
    const amount = Math.max(0, Math.floor(Number(qty)))
    if (key && Number.isFinite(amount)) sizesStock[key] = amount
  }
  if (Object.keys(sizesStock).length === 0) errors.push('sizesStock')

  const images = Array.isArray(input.images)
    ? input.images.map(str).filter(Boolean).slice(0, 5)
    : []
  const image = str(input.image) || images[0] || '/logo.png'

  const forWho = AUDIENCES.includes(input.forWho) ? input.forWho : 'Barchaga'

  // stock is always derived from the per-size numbers so the two cannot drift
  const stock = Object.values(sizesStock).reduce((sum, v) => sum + v, 0)

  return {
    errors,
    value: {
      name: i18n.uz.name,
      color: i18n.uz.color,
      description: i18n.uz.description,
      i18n,
      price,
      category,
      size: Object.keys(sizesStock),
      sizesStock,
      stock,
      image,
      images: images.length ? images : [image],
      forWho,
      gender: forWho,
    },
  }
}
