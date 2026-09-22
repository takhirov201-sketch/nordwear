import i18n from '../i18n'

export const PRODUCT_LANGS = ['uz', 'ru', 'en']

/* Legacy lookup tables: products seeded before per-product translations existed
   only carry flat `name` / `color` / `category` fields, so we still map those. */
const NAMES = {
  'cargo shim': { uz: 'Cargo shim', ru: 'Брюки Карго', en: 'Cargo Pants' },
  'polo futbolka': { uz: 'Polo futbolka', ru: 'Рубашка Поло', en: 'Polo Shirt' },
  'sport shorti': { uz: 'Sport shorti', ru: 'Спортивные Шорты', en: 'Sports Shorts' },
  'trikotaj sviter': { uz: 'Trikotaj sviter', ru: 'Трикотажный Свитер', en: 'Knit Sweater' },
  'oversize hudi': { uz: 'Oversize hudi', ru: 'Оверсайз Худи', en: 'Oversize Hoodie' },
  'rasmiy ko\'ylak': { uz: 'Rasmiy ko\'ylak', ru: 'Официальная Рубашка', en: 'Formal Shirt' },
  'klassik oq futbolka': { uz: 'Klassik oq futbolka', ru: 'Классическая Белая Футболка', en: 'Classic White T-Shirt' },
  'bomber kurtka': { uz: 'Bomber kurtka', ru: 'Куртка Бомбер', en: 'Bomber Jacket' },
}

const COLORS = {
  'qora': { uz: 'Qora', ru: 'Черный', en: 'Black' },
  'black': { uz: 'Qora', ru: 'Черный', en: 'Black' },
  'to\'q ko\'k': { uz: 'To\'q ko\'k', ru: 'Темно-синий', en: 'Navy Blue' },
  'navy': { uz: 'To\'q ko\'k', ru: 'Темно-синий', en: 'Navy Blue' },
  'xaki': { uz: 'Xaki', ru: 'Хаки', en: 'Khaki' },
  'khaki': { uz: 'Xaki', ru: 'Хаки', en: 'Khaki' },
  'bej': { uz: 'Bej', ru: 'Бежевый', en: 'Beige' },
  'beige': { uz: 'Bej', ru: 'Бежевый', en: 'Beige' },
  'kulrang': { uz: 'Kulrang', ru: 'Серый', en: 'Grey' },
  'grey': { uz: 'Kulrang', ru: 'Серый', en: 'Grey' },
  'oq': { uz: 'Oq', ru: 'Белый', en: 'White' },
  'white': { uz: 'Oq', ru: 'Белый', en: 'White' },
  'ko\'k': { uz: 'Ko\'k', ru: 'Синий', en: 'Blue' },
  'blue': { uz: 'Ko\'k', ru: 'Синий', en: 'Blue' },
  'pushti': { uz: 'Pushti', ru: 'Розовый', en: 'Pink' },
  'pink': { uz: 'Pushti', ru: 'Розовый', en: 'Pink' },
  'qizil': { uz: 'Qizil', ru: 'Красный', en: 'Red' },
  'red': { uz: 'Qizil', ru: 'Красный', en: 'Red' },
  'sariq': { uz: 'Sariq', ru: 'Желтый', en: 'Yellow' },
  'yellow': { uz: 'Sariq', ru: 'Желтый', en: 'Yellow' },
  'yashil': { uz: 'Yashil', ru: 'Зеленый', en: 'Green' },
  'green': { uz: 'Yashil', ru: 'Зеленый', en: 'Green' },
  'siren': { uz: 'Siren', ru: 'Сиреневый', en: 'Lilac' },
  'lilac': { uz: 'Siren', ru: 'Сиреневый', en: 'Lilac' },
}

const CATEGORIES = {
  sweater: { uz: 'Sviter', ru: 'Свитер', en: 'Sweater' },
  trousers: { uz: 'Shalvar', ru: 'Брюки', en: 'Trousers' },
  polo: { uz: 'Polo', ru: 'Поло', en: 'Polo' },
  jacket: { uz: 'Kurtka', ru: 'Куртка', en: 'Jacket' },
  hoodie: { uz: 'Hudi', ru: 'Худи', en: 'Hoodie' },
  shorts: { uz: 'Shorti', ru: 'Шорты', en: 'Shorts' },
  shirt: { uz: 'Ko\'ylak', ru: 'Рубашка', en: 'Shirt' },
  tshirt: { uz: 'Futbolka', ru: 'Футболка', en: 'T-Shirt' },
  futbolka: { uz: 'Futbolka', ru: 'Футболка', en: 'T-Shirt' },
  dress: { uz: 'Ko\'ylak', ru: 'Платье', en: 'Dress' },
  skirt: { uz: 'Yubka', ru: 'Юбка', en: 'Skirt' },
  tracksuit: { uz: 'Sport kostyum', ru: 'Спортивный костюм', en: 'Tracksuit' },
  poyabzal: { uz: 'Poyabzal', ru: 'Обувь', en: 'Footwear' },
  aksessuar: { uz: 'Aksessuar', ru: 'Аксессуары', en: 'Accessories' },
}

export function getCurrentLang() {
  const lang = (i18n.language || 'uz').slice(0, 2)
  return PRODUCT_LANGS.includes(lang) ? lang : 'uz'
}

/* Reads a field from the product's own translations, falling back across
   languages so a half-filled product never renders as blank. */
function fromProductI18n(product, field, lang) {
  const table = product?.i18n
  if (!table || typeof table !== 'object') return ''

  const preferred = table[lang]?.[field]
  if (typeof preferred === 'string' && preferred.trim()) return preferred.trim()

  for (const fallbackLang of PRODUCT_LANGS) {
    const value = table[fallbackLang]?.[field]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

function fromLegacyTable(table, value, lang) {
  if (!value) return ''
  const entry = table[String(value).trim().toLowerCase()]
  return entry?.[lang] || String(value)
}

/* Each helper accepts either a product/cart-item object (preferred — it can
   carry per-language text) or a bare string (legacy call sites). */
export function translateProductName(productOrName) {
  const lang = getCurrentLang()
  if (productOrName && typeof productOrName === 'object') {
    return fromProductI18n(productOrName, 'name', lang) ||
      fromLegacyTable(NAMES, productOrName.name, lang)
  }
  return fromLegacyTable(NAMES, productOrName, lang)
}

export function translateProductColor(productOrColor) {
  const lang = getCurrentLang()
  if (productOrColor && typeof productOrColor === 'object') {
    return fromProductI18n(productOrColor, 'color', lang) ||
      fromLegacyTable(COLORS, productOrColor.color, lang)
  }
  return fromLegacyTable(COLORS, productOrColor, lang)
}

export function translateProductCategory(productOrCategory) {
  const lang = getCurrentLang()
  if (productOrCategory && typeof productOrCategory === 'object') {
    return fromProductI18n(productOrCategory, 'category', lang) ||
      fromLegacyTable(CATEGORIES, productOrCategory.category, lang)
  }
  return fromLegacyTable(CATEGORIES, productOrCategory, lang)
}

export function translateProductDescription(product) {
  if (!product || typeof product !== 'object') return ''
  return fromProductI18n(product, 'description', getCurrentLang()) || product.description || ''
}

/* Category filters work on the raw slug, but need a label in the active
   language. Products carry their own label, so derive the map from them. */
export function buildCategoryLabels(products = []) {
  const lang = getCurrentLang()
  const labels = {}

  for (const product of products) {
    const slug = product?.category
    if (!slug || labels[slug]) continue
    labels[slug] = fromProductI18n(product, 'category', lang) ||
      fromLegacyTable(CATEGORIES, slug, lang)
  }
  return labels
}

export function translateCategorySlug(slug, labels = {}) {
  if (!slug) return ''
  return labels[slug] || fromLegacyTable(CATEGORIES, slug, getCurrentLang())
}

export function translateAudience(forWho) {
  const lang = getCurrentLang()
  const val = (forWho || '').toLowerCase()
  if (val.includes('men') || val.includes('муж') || val.includes('erkak')) {
    return lang === 'ru' ? 'Мужской' : lang === 'en' ? 'Men' : 'Erkaklar'
  }
  if (val.includes('women') || val.includes('жен') || val.includes('ayol')) {
    return lang === 'ru' ? 'Женский' : lang === 'en' ? 'Women' : 'Ayollar'
  }
  if (val.includes('kid') || val.includes('дет') || val.includes('bola')) {
    return lang === 'ru' ? 'Детям' : lang === 'en' ? 'Kids' : 'Bolalar'
  }
  return lang === 'ru' ? 'Для всех' : lang === 'en' ? 'For All' : 'Barchaga'
}
