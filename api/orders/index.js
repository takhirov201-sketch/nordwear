import { ObjectId } from 'mongodb'
import { getCollections } from '../_lib/mongo.js'
import { requireAuth } from '../_lib/auth.js'
import { methodRouter, readBody } from '../_lib/http.js'

const STATUS_KEYS = ['pending', 'accepted', 'inTransit', 'delivered']

function sanitizeShipping(info = {}) {
  return {
    fullName: String(info.fullName || '').trim().slice(0, 120),
    phone: String(info.phone || '').trim().slice(0, 32),
    city: String(info.city || '').trim().slice(0, 80),
    address: String(info.address || '').trim().slice(0, 240),
    paymentMethod: info.paymentMethod === 'card' ? 'card' : 'cash',
  }
}

export default methodRouter({
  /* Admins get every order (with the buyer attached); everyone else gets only
     their own. The role comes from the token, never from a query parameter. */
  GET: async (req, res) => {
    const user = await requireAuth(req, res)
    if (!user) return undefined

    if (user.role !== 'admin') {
      const own = (user.orders || []).slice().sort((a, b) => ts(b) - ts(a))
      return res.status(200).json(own)
    }

    const { users } = await getCollections()
    const everyone = await users.find({}, { projection: { name: 1, email: 1, orders: 1 } }).toArray()

    const aggregated = []
    for (const owner of everyone) {
      for (const order of owner.orders || []) {
        aggregated.push({
          ...order,
          userId: String(owner._id),
          userName: owner.name,
          userEmail: owner.email,
        })
      }
    }
    aggregated.sort((a, b) => ts(b) - ts(a))

    return res.status(200).json(aggregated)
  },

  /* Creating an order re-reads prices and stock from the database: the client
     is not trusted to say what anything costs or whether it is available. */
  POST: async (req, res) => {
    const user = await requireAuth(req, res)
    if (!user) return undefined

    const body = readBody(req)
    const shippingInfo = sanitizeShipping(body.shippingInfo)
    const cart = Array.isArray(user.cart) ? user.cart : []

    if (!cart.length) {
      return res.status(400).json({ error: 'checkout.orderEmpty' })
    }
    if (!shippingInfo.fullName || !shippingInfo.phone || !shippingInfo.city || !shippingInfo.address) {
      return res.status(400).json({ error: 'checkout.missingShipping' })
    }

    const { products, users } = await getCollections()
    const items = []
    let subtotal = 0

    for (const line of cart) {
      let _id
      try {
        _id = new ObjectId(String(line.id))
      } catch {
        return res.status(400).json({ error: 'checkout.insufficientStock' })
      }

      const product = await products.findOne({ _id })
      if (!product) return res.status(400).json({ error: 'checkout.insufficientStock' })

      const size = String(line.selectedSize || '')
      const quantity = Math.max(1, Math.floor(Number(line.quantity) || 1))
      const available = size && product.sizesStock
        ? Number(product.sizesStock[size] || 0)
        : Number(product.stock || 0)

      if (available < quantity) {
        return res.status(409).json({ error: 'checkout.insufficientStock' })
      }

      subtotal += product.price * quantity
      items.push({
        id: String(product._id),
        name: product.name,
        i18n: product.i18n,
        price: product.price,
        image: product.image,
        forWho: product.forWho,
        selectedSize: size,
        quantity,
      })
    }

    // decrement stock only after every line has been validated
    for (const item of items) {
      const _id = new ObjectId(item.id)
      const product = await products.findOne({ _id })
      const sizesStock = { ...(product.sizesStock || {}) }
      if (item.selectedSize && sizesStock[item.selectedSize] !== undefined) {
        sizesStock[item.selectedSize] = Math.max(0, sizesStock[item.selectedSize] - item.quantity)
      }
      const stock = Object.keys(sizesStock).length
        ? Object.values(sizesStock).reduce((sum, v) => sum + Number(v || 0), 0)
        : Math.max(0, Number(product.stock || 0) - item.quantity)

      await products.updateOne({ _id }, { $set: { sizesStock, stock } })
    }

    const deliveryFee = 30000
    const order = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0],
      status: 'pending',
      shippingInfo,
      paymentMethod: shippingInfo.paymentMethod,
      items,
      total: subtotal + deliveryFee,
    }

    await users.updateOne(
      { _id: user._id },
      { $set: { cart: [] }, $push: { orders: { $each: [order], $position: 0 } } },
    )

    return res.status(201).json(order)
  },
})

function ts(order) {
  const value = order?.createdAt || order?.date
  const parsed = value ? new Date(value).getTime() : NaN
  return Number.isNaN(parsed) ? 0 : parsed
}

export { STATUS_KEYS }
