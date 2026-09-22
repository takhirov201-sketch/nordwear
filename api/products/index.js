import { getCollections } from '../_lib/mongo.js'
import { requireAdmin } from '../_lib/auth.js'
import { methodRouter, readBody, toPublicDocs, toPublicDoc } from '../_lib/http.js'
import { sanitizeProduct } from '../_lib/product.js'

export default methodRouter({
  GET: async (req, res) => {
    const { products } = await getCollections()
    const list = await products.find({}).toArray()
    return res.status(200).json(toPublicDocs(list))
  },

  POST: async (req, res) => {
    const admin = await requireAdmin(req, res)
    if (!admin) return undefined

    const { value, errors } = sanitizeProduct(readBody(req))
    if (errors.length) {
      return res.status(400).json({ error: 'admin.validation.invalidPayload', fields: errors })
    }

    const { products } = await getCollections()
    const doc = { ...value, createdAt: new Date().toISOString() }
    const result = await products.insertOne(doc)

    return res.status(201).json(toPublicDoc({ ...doc, _id: result.insertedId }))
  },
})
