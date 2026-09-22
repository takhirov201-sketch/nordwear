import { getCollections } from '../_lib/mongo.js'
import { verifyPassword, signToken, publicUser } from '../_lib/auth.js'
import { methodRouter, readBody, normalizeEmail } from '../_lib/http.js'

export default methodRouter({
  POST: async (req, res) => {
    const { email, password } = readBody(req)
    const normalizedEmail = normalizeEmail(email)

    if (!normalizedEmail || !password) {
      return res.status(400).json({ error: 'auth.invalidCredentials' })
    }

    const { users } = await getCollections()
    const user = await users.findOne({ email: normalizedEmail })

    // Same response whether the email is unknown or the password is wrong,
    // so the endpoint cannot be used to enumerate registered addresses.
    const ok = user && (await verifyPassword(password, user.password))
    if (!ok) {
      return res.status(401).json({ error: 'auth.invalidCredentials' })
    }

    return res.status(200).json({
      token: signToken(user),
      user: publicUser(user),
    })
  },
})
