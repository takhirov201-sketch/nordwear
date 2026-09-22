import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { getCollections } from './mongo.js'

const TOKEN_TTL = '7d'
const SALT_ROUNDS = 10

// read lazily so a missing variable is reported per request, not at import time
function secret() {
  const value = process.env.JWT_SECRET
  if (!value) {
    throw new Error('JWT_SECRET is not set — add it in the Vercel project environment variables')
  }
  return value
}

export function hashPassword(plain) {
  return bcrypt.hash(String(plain), SALT_ROUNDS)
}

export function verifyPassword(plain, hashed) {
  if (!hashed) return Promise.resolve(false)
  return bcrypt.compare(String(plain), String(hashed))
}

export function signToken(user) {
  return jwt.sign(
    { sub: String(user._id || user.id), role: user.role || 'user' },
    secret(),
    { expiresIn: TOKEN_TTL },
  )
}

/* Never let a password hash leave the server, not even hashed. */
export function publicUser(user) {
  if (!user) return null
  const { password, _id, ...rest } = user
  void password
  return { id: String(_id || user.id), ...rest }
}

function readToken(req) {
  const header = req.headers?.authorization || req.headers?.Authorization || ''
  if (typeof header === 'string' && header.startsWith('Bearer ')) {
    return header.slice(7).trim()
  }
  return ''
}

/* Resolves the caller from the Authorization header. Returns null when the
   token is missing, malformed, expired, or points at a deleted user. */
export async function getAuthUser(req) {
  const token = readToken(req)
  if (!token) return null

  let payload
  try {
    payload = jwt.verify(token, secret())
  } catch {
    return null
  }

  const { users } = await getCollections()
  const { ObjectId } = await import('mongodb')

  let query
  try {
    query = { _id: new ObjectId(String(payload.sub)) }
  } catch {
    return null
  }

  const user = await users.findOne(query)
  return user || null
}

export async function requireAuth(req, res) {
  const user = await getAuthUser(req)
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' })
    return null
  }
  return user
}

/* The admin check lives here on the server — the client-side role flag is only
   for hiding UI and must never be the thing that guards a write. */
export async function requireAdmin(req, res) {
  const user = await getAuthUser(req)
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' })
    return null
  }
  if (user.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden' })
    return null
  }
  return user
}
