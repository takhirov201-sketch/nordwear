/* Small helpers shared by the route handlers. */

export function methodRouter(handlers) {
  return async (req, res) => {
    const handler = handlers[req.method]
    if (!handler) {
      res.setHeader('Allow', Object.keys(handlers).join(', '))
      return res.status(405).json({ error: 'Method Not Allowed' })
    }
    try {
      return await handler(req, res)
    } catch (error) {
      console.error(`${req.method} ${req.url} failed:`, error)
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal Server Error' })
      }
    }
  }
}

export function readBody(req) {
  const body = req.body
  if (!body) return {}
  if (typeof body === 'string') {
    try {
      return JSON.parse(body)
    } catch {
      return {}
    }
  }
  return body
}

export function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase()
}

/* Strips Mongo's _id in favour of the string `id` the frontend already uses. */
export function toPublicDoc(doc) {
  if (!doc) return doc
  const { _id, ...rest } = doc
  return { id: String(_id), ...rest }
}

export function toPublicDocs(docs) {
  return docs.map(toPublicDoc)
}
