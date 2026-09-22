import { dirname, join, parse as parsePath } from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs/promises'
import { JSONFile } from 'lowdb/node'
import { Low } from 'lowdb'
import { App } from '@tinyhttp/app'
import { cors } from '@tinyhttp/cors'
import { json } from 'milliparsec'
import { NormalizedAdapter } from 'json-server/lib/adapters/normalized-adapter.js'
import { Observer } from 'json-server/lib/adapters/observer.js'
import { Service, isItem } from 'json-server/lib/service.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const PUBLIC_DIR = join(__dirname, 'public')
const UPLOADS_DIR = join(PUBLIC_DIR, 'uploads')

await fs.mkdir(UPLOADS_DIR, { recursive: true })

// 50 MB — достаточно для base64 изображений
const PAYLOAD_LIMIT = 50 * 1024 * 1024
const API_BASE_URL = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 4000}`

function isDataUri(value) {
  return typeof value === 'string' && /^data:image\//i.test(value)
}

function toUploadUrl(fileName) {
  return `${API_BASE_URL}/uploads/${fileName}`
}

async function saveDataUriToUpload(dataUri, fileNamePrefix = 'product') {
  if (!isDataUri(dataUri)) return dataUri

  const match = dataUri.match(/^data:image\/([a-zA-Z0-9.+-]+);base64,(.+)$/)
  if (!match) return dataUri

  const mime = match[1].toLowerCase()
  const suffix = mime === 'jpeg' ? 'jpg' : mime === 'png' ? 'png' : mime === 'webp' ? 'webp' : 'jpg'
  const buffer = Buffer.from(match[2], 'base64')
  const safeName = `${fileNamePrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${suffix}`
  const filePath = join(UPLOADS_DIR, safeName)

  await fs.writeFile(filePath, buffer)

  return toUploadUrl(safeName)
}

async function normalizeImageValue(value, fileNamePrefix = 'product') {
  if (typeof value !== 'string') return value
  if (isDataUri(value)) return saveDataUriToUpload(value, fileNamePrefix)
  return value
}

async function normalizeProductImages(productLike) {
  if (!productLike || typeof productLike !== 'object') return productLike

  const normalized = { ...productLike }

  if (typeof normalized.image === 'string') {
    normalized.image = await normalizeImageValue(normalized.image, 'product-image')
  }

  if (Array.isArray(normalized.images)) {
    normalized.images = await Promise.all(
      normalized.images.map((item, index) => normalizeImageValue(item, `product-gallery-${index}`))
    )
  }

  return normalized
}

function resolveUploadPath(url) {
  if (typeof url !== 'string') return null

  try {
    const parsed = new URL(url)
    const pathname = parsed.pathname
    if (!pathname.startsWith('/uploads/')) return null
    return join(PUBLIC_DIR, pathname.replace(/^\/+/, ''))
  } catch {
    if (!url.startsWith('/uploads/')) return null
    return join(PUBLIC_DIR, url.replace(/^\/+/, ''))
  }
}

async function deleteUploadedFileIfExists(url) {
  const filePath = resolveUploadPath(url)
  if (!filePath) return

  try {
    await fs.unlink(filePath)
  } catch {
    // ignore missing files
  }
}

function collectImageUrls(productLike) {
  const urls = []
  if (!productLike || typeof productLike !== 'object') return urls
  if (typeof productLike.image === 'string') urls.push(productLike.image)
  if (Array.isArray(productLike.images)) {
    urls.push(...productLike.images.filter((item) => typeof item === 'string'))
  }
  return urls
}

// Only drop uploaded files the updated product no longer references — otherwise
// editing an unrelated field (e.g. price) would delete images that are still in use.
async function deleteUnusedUploadedImages(existingProduct, nextProduct) {
  if (!existingProduct) return

  const stillUsed = new Set(collectImageUrls(nextProduct))

  for (const url of collectImageUrls(existingProduct)) {
    if (stillUsed.has(url)) continue
    await deleteUploadedFileIfExists(url)
  }
}

async function prepareProductPayload(payload) {
  if (!payload || typeof payload !== 'object') return payload

  const normalized = await normalizeProductImages(payload)

  if (Array.isArray(normalized.images) && normalized.images.length > 0 && !normalized.image) {
    normalized.image = normalized.images[0]
  }

  return normalized
}

// Set up database
const dbFile = join(__dirname, 'src/data/db.json')
const adapter = new JSONFile(dbFile)
const observer = new Observer(new NormalizedAdapter(adapter))
const db = new Low(observer, {})
await db.read()

if (!db.data || typeof db.data !== 'object') {
  db.data = {}
}

if (!Array.isArray(db.data.products)) {
  db.data.products = []
}

if (!Array.isArray(db.data.users)) {
  db.data.users = []
}

const adminEmails = ['admin@nordwear.uz', 'admin@nordwear.com']
const adminUser = db.data.users.find((user) => user?.role === 'admin')
if (!adminUser) {
  db.data.users.push({
    id: 'admin-1',
    name: 'Admin',
    email: adminEmails[0],
    password: 'admin123',
    role: 'admin',
    cart: [],
    orders: [],
  })
} else if (!adminEmails.includes(adminUser.email?.toLowerCase())) {
  adminUser.email = adminEmails[0]
  adminUser.password = 'admin123'
}

await db.write()

const service = new Service(db)

function safeFind(name, opts = {}) {
  const nextOpts = { ...opts, where: opts.where ?? {} }
  return service.find(name, nextOpts)
}

// Фильтрация по query-параметрам (например ?email=xxx для логина)
function filterByQuery(items, query) {
  if (!Array.isArray(items)) return items
  const reserved = new Set(['_sort', '_page', '_per_page', '_embed', '_where'])
  const entries = Object.entries(query || {}).filter(([k]) => !reserved.has(k))
  if (entries.length === 0) return items
  return items.filter((item) =>
    entries.every(([key, val]) => {
      const itemVal = item[key]
      if (itemVal === undefined) return false
      return String(itemVal).toLowerCase() === String(val).toLowerCase()
    })
  )
}

// Create app
const app = new App()

// CORS
app
  .use((req, res, next) => {
    return cors({
      allowedHeaders: req.headers['access-control-request-headers']
        ?.split(',')
        .map((h) => h.trim()),
    })(req, res, next)
  })
  .options('*', cors())

// Body parser с лимитом 50 MB
app.use(json({ payloadLimit: PAYLOAD_LIMIT }))

// Helpers
const notFound = (res) => res.status(404).json({ error: 'Not Found' })
const badRequest = (res) => res.status(400).json({ error: 'Body must be a JSON object' })

// ────── PRODUCTS ──────
app.get('/products', (req, res) => {
  const all = safeFind('products', { where: {} })
  res.json(filterByQuery(Array.isArray(all) ? all : [], req.query))
})

app.get('/products/:id', (req, res) => {
  const data = service.findById('products', req.params.id, req.query)
  data === undefined ? notFound(res) : res.json(data)
})

app.post('/products', async (req, res) => {
  if (!isItem(req.body)) return badRequest(res)

  const prepared = await prepareProductPayload(req.body)
  const data = await service.create('products', prepared)
  res.status(201).json(data)
})

app.put('/products/:id', async (req, res) => {
  if (!isItem(req.body)) return badRequest(res)

  const existing = await service.findById('products', req.params.id, {})
  const prepared = await prepareProductPayload(req.body)
  await deleteUnusedUploadedImages(existing, prepared)

  const data = await service.updateById('products', req.params.id, prepared)
  data === undefined ? notFound(res) : res.json(data)
})

app.patch('/products/:id', async (req, res) => {
  if (!isItem(req.body)) return badRequest(res)

  const existing = await service.findById('products', req.params.id, {})
  const prepared = await prepareProductPayload(req.body)
  // a PATCH may omit images entirely, in which case the existing ones stay in use
  const merged = { ...existing, ...prepared }
  await deleteUnusedUploadedImages(existing, merged)

  const data = await service.patchById('products', req.params.id, prepared)
  data === undefined ? notFound(res) : res.json(data)
})

app.delete('/products/:id', async (req, res) => {
  const existing = await service.findById('products', req.params.id, {})
  if (existing) {
    // the product is going away, so none of its uploads are still referenced
    await deleteUnusedUploadedImages(existing, null)
  }

  const data = await service.destroyById('products', req.params.id)
  data === undefined ? notFound(res) : res.json(data)
})

// ────── USERS ──────
app.get('/users', (req, res) => {
  const all = safeFind('users', { where: {} })
  res.json(filterByQuery(Array.isArray(all) ? all : [], req.query))
})

app.get('/users/:id', (req, res) => {
  const data = service.findById('users', req.params.id, req.query)
  data === undefined ? notFound(res) : res.json(data)
})

app.post('/users', async (req, res) => {
  if (!isItem(req.body)) return badRequest(res)
  const data = await service.create('users', req.body)
  res.status(201).json(data)
})

app.put('/users/:id', async (req, res) => {
  if (!isItem(req.body)) return badRequest(res)
  const data = await service.updateById('users', req.params.id, req.body)
  data === undefined ? notFound(res) : res.json(data)
})

app.patch('/users/:id', async (req, res) => {
  if (!isItem(req.body)) return badRequest(res)
  const data = await service.patchById('users', req.params.id, req.body)
  data === undefined ? notFound(res) : res.json(data)
})

app.delete('/users/:id', async (req, res) => {
  const data = await service.destroyById('users', req.params.id)
  data === undefined ? notFound(res) : res.json(data)
})

// ────── ORDERS ──────
app.get('/orders', (req, res) => {
  const all = safeFind('orders', { where: {} })
  res.json(filterByQuery(Array.isArray(all) ? all : [], req.query))
})

app.post('/orders', async (req, res) => {
  if (!isItem(req.body)) return badRequest(res)
  const data = await service.create('orders', req.body)
  res.status(201).json(data)
})

app.put('/orders/:id', async (req, res) => {
  if (!isItem(req.body)) return badRequest(res)
  const data = await service.updateById('orders', req.params.id, req.body)
  data === undefined ? notFound(res) : res.json(data)
})

app.patch('/orders/:id', async (req, res) => {
  if (!isItem(req.body)) return badRequest(res)
  const data = await service.patchById('orders', req.params.id, req.body)
  data === undefined ? notFound(res) : res.json(data)
})

app.get('/uploads/:name', async (req, res) => {
  const fileName = req.params.name
  const filePath = join(UPLOADS_DIR, fileName)

  try {
    const data = await fs.readFile(filePath)
    const ext = parsePath(fileName).ext.toLowerCase()
    const mimeMap = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
    }
    res.writeHead(200, { 'Content-Type': mimeMap[ext] || 'application/octet-stream' })
    res.end(data)
  } catch {
    notFound(res)
  }
})

// ────── START ──────
const PORT = Number(process.env.PORT || 4000)
app.listen(PORT, () => {
  console.log(`JSON Server running on http://localhost:${PORT} (50MB payload limit)`)
})
