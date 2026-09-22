import { requireAuth, publicUser } from '../_lib/auth.js'
import { methodRouter } from '../_lib/http.js'

/* Lets the app restore a session on reload and verify the stored token is
   still valid, without ever trusting values kept in localStorage. */
export default methodRouter({
  GET: async (req, res) => {
    const user = await requireAuth(req, res)
    if (!user) return undefined

    return res.status(200).json({ user: publicUser(user) })
  },
})
