import { getCollections } from './_lib/mongo.js'
import { requireAuth } from './_lib/auth.js'
import { methodRouter, readBody } from './_lib/http.js'

/* The cart always belongs to the caller resolved from the token — the client
   cannot pass a user id and write into somebody else's cart. */
function sanitizeCart(items) {
  if (!Array.isArray(items)) return []
  return items.slice(0, 100).map((item) => ({
    id: String(item?.id ?? ''),
    name: String(item?.name ?? ''),
    price: Number(item?.price) || 0,
    quantity: Math.max(1, Math.min(99, Math.floor(Number(item?.quantity)) || 1)),
    selectedSize: String(item?.selectedSize ?? ''),
    image: String(item?.image ?? ''),
    i18n: item?.i18n && typeof item.i18n === 'object' ? item.i18n : undefined,
    forWho: String(item?.forWho ?? ''),
    stock: Number(item?.stock) || 0,
    color: String(item?.color ?? ''),
  }))
}

export default methodRouter({
  GET: async (req, res) => {
    const user = await requireAuth(req, res)
    if (!user) return undefined
    return res.status(200).json({ cart: user.cart || [] })
  },

  PUT: async (req, res) => {
    const user = await requireAuth(req, res)
    if (!user) return undefined

    const cart = sanitizeCart(readBody(req).cart)
    const { users } = await getCollections()
    await users.updateOne({ _id: user._id }, { $set: { cart } })

    return res.status(200).json({ cart })
  },
})
