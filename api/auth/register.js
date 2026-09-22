import { getCollections } from '../_lib/mongo.js'
import { hashPassword, signToken, publicUser } from '../_lib/auth.js'
import { methodRouter, readBody, normalizeEmail } from '../_lib/http.js'

export default methodRouter({
  POST: async (req, res) => {
    const { name, email, password } = readBody(req)
    const normalizedEmail = normalizeEmail(email)

    if (!String(name || '').trim()) {
      return res.status(400).json({ error: 'auth.enterName' })
    }
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      return res.status(400).json({ error: 'auth.enterEmail' })
    }
    if (String(password || '').length < 6) {
      return res.status(400).json({ error: 'auth.passwordTooShort' })
    }

    const { users } = await getCollections()

    if (await users.findOne({ email: normalizedEmail })) {
      return res.status(409).json({ error: 'auth.emailTaken' })
    }

    const doc = {
      name: String(name).trim(),
      email: normalizedEmail,
      password: await hashPassword(password),
      // the role is fixed here: a client must never be able to register as admin
      role: 'user',
      cart: [],
      orders: [],
      createdAt: new Date().toISOString(),
    }

    const result = await users.insertOne(doc)
    const created = { ...doc, _id: result.insertedId }

    return res.status(201).json({
      token: signToken(created),
      user: publicUser(created),
    })
  },
})
