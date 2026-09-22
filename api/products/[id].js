import { ObjectId } from 'mongodb'
import { getCollections } from '../_lib/mongo.js'
import { requireAdmin } from '../_lib/auth.js'
import { methodRouter, readBody, toPublicDoc } from '../_lib/http.js'
import { sanitizeProduct } from '../_lib/product.js'

function toObjectId(id) {
  try {
    return new ObjectId(String(id))
  } catch {
    return null
  }
}

export default methodRouter({
  GET: async (req, res) => {
    const _id = toObjectId(req.query.id)
    if (!_id) return res.status(404).json({ error: 'Not Found' })

    const { products } = await getCollections()
    const product = await products.findOne({ _id })
    if (!product) return res.status(404).json({ error: 'Not Found' })

    return res.status(200).json(toPublicDoc(product))
  },

  PUT: async (req, res) => {
    const admin = await requireAdmin(req, res)
    if (!admin) return undefined

    const _id = toObjectId(req.query.id)
    if (!_id) return res.status(404).json({ error: 'Not Found' })

    const { value, errors } = sanitizeProduct(readBody(req))
    if (errors.length) {
      return res.status(400).json({ error: 'admin.validation.invalidPayload', fields: errors })
    }

    const { products } = await getCollections()
    const result = await products.findOneAndUpdate(
      { _id },
      { $set: { ...value, updatedAt: new Date().toISOString() } },
      { returnDocument: 'after' },
    )
    if (!result) return res.status(404).json({ error: 'Not Found' })

    return res.status(200).json(toPublicDoc(result))
  },

  DELETE: async (req, res) => {
    const admin = await requireAdmin(req, res)
    if (!admin) return undefined

    const _id = toObjectId(req.query.id)
    if (!_id) return res.status(404).json({ error: 'Not Found' })

    const { products } = await getCollections()
    const result = await products.deleteOne({ _id })
    if (!result.deletedCount) return res.status(404).json({ error: 'Not Found' })

    return res.status(200).json({ id: String(_id) })
  },
})
