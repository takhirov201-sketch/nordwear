import dns from 'node:dns'
import { MongoClient } from 'mongodb'

const dbName = process.env.MONGODB_DB || 'nordwear'

// Serverless invocations reuse the same container, so the client is cached on
// globalThis to avoid opening a new connection pool per request.
let cached = globalThis.__nordwearMongo

if (!cached) {
  cached = globalThis.__nordwearMongo = { client: null, promise: null }
}

function isDnsError(error) {
  return error?.code === 'ENOTFOUND' || /querySrv|ECONNREFUSED|EAI_AGAIN/i.test(error?.message || '')
}

async function connect(uri) {
  return new MongoClient(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 8000,
  }).connect()
}

export async function getDb() {
  // checked here rather than at import time so a missing variable surfaces as a
  // readable error in the response instead of crashing the whole function
  const uri = process.env.MONGODB_URI
  if (!uri) {
    throw new Error('MONGODB_URI is not set — add it in the Vercel project environment variables')
  }

  if (cached.client) return cached.client.db(dbName)

  if (!cached.promise) {
    cached.promise = connect(uri).catch((error) => {
      // Node's default resolver can fail the SRV lookup mongodb+srv:// needs
      // (seen on Windows dev machines behind certain routers/VPNs). A public
      // resolver almost always fixes it, so retry once before giving up.
      if (!isDnsError(error)) throw error

      console.warn('MongoDB SRV lookup failed via the system DNS resolver, retrying with 8.8.8.8/1.1.1.1:', error.message)
      dns.setServers(['8.8.8.8', '1.1.1.1'])
      return connect(uri)
    })
  }

  cached.client = await cached.promise
  return cached.client.db(dbName)
}

export async function getCollections() {
  const db = await getDb()
  return {
    db,
    products: db.collection('products'),
    users: db.collection('users'),
  }
}
