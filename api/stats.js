import { getCollections } from './_lib/mongo.js'
import { requireAdmin } from './_lib/auth.js'
import { methodRouter } from './_lib/http.js'

/* Replaces the old habit of fetching the whole /users list just to count them,
   which is what exposed every account to the browser. */
export default methodRouter({
  GET: async (req, res) => {
    const admin = await requireAdmin(req, res)
    if (!admin) return undefined

    const { users, products } = await getCollections()
    const [usersCount, productsCount] = await Promise.all([
      users.countDocuments({}),
      products.countDocuments({}),
    ])

    return res.status(200).json({ usersCount, productsCount })
  },
})
