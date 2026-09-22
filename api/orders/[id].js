import { getCollections } from '../_lib/mongo.js'
import { requireAdmin } from '../_lib/auth.js'
import { methodRouter, readBody } from '../_lib/http.js'

const STATUS_KEYS = ['pending', 'accepted', 'inTransit', 'delivered']

export default methodRouter({
  /* Changing a status or removing an order is admin-only, enforced here rather
     than by hiding the buttons in the UI. */
  PATCH: async (req, res) => {
    const admin = await requireAdmin(req, res)
    if (!admin) return undefined

    const orderId = String(req.query.id || '')
    const status = String(readBody(req).status || '')
    if (!STATUS_KEYS.includes(status)) {
      return res.status(400).json({ error: 'orders.invalidStatus' })
    }

    const { users } = await getCollections()
    const result = await users.updateOne(
      { 'orders.id': orderId },
      { $set: { 'orders.$.status': status } },
    )
    if (!result.matchedCount) return res.status(404).json({ error: 'Not Found' })

    return res.status(200).json({ id: orderId, status })
  },

  DELETE: async (req, res) => {
    const admin = await requireAdmin(req, res)
    if (!admin) return undefined

    const orderId = String(req.query.id || '')
    const { users } = await getCollections()
    const result = await users.updateOne(
      { 'orders.id': orderId },
      { $pull: { orders: { id: orderId } } },
    )
    if (!result.matchedCount) return res.status(404).json({ error: 'Not Found' })

    return res.status(200).json({ id: orderId })
  },
})
