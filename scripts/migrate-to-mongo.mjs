/* Одноразовая миграция: переносит товары из src/data/db.json в MongoDB
   и создаёт администратора с захешированным паролем.

   Запуск:
     node scripts/migrate-to-mongo.mjs

   Нужны переменные окружения (можно положить в .env.local):
     MONGODB_URI, MONGODB_DB, ADMIN_EMAIL, ADMIN_PASSWORD
*/
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MongoClient } from 'mongodb'
import bcrypt from 'bcryptjs'

const __dirname = dirname(fileURLToPath(import.meta.url))

const uri = process.env.MONGODB_URI
const dbName = process.env.MONGODB_DB || 'nordwear'
const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase()
const adminPassword = process.env.ADMIN_PASSWORD || ''

function fail(message) {
  console.error('✗ ' + message)
  process.exit(1)
}

if (!uri) fail('MONGODB_URI не задан')
if (!adminEmail) fail('ADMIN_EMAIL не задан')
if (adminPassword.length < 10) {
  fail('ADMIN_PASSWORD не задан или короче 10 символов — для публичного сайта нужен длинный пароль')
}

const raw = JSON.parse(await readFile(join(__dirname, '..', 'src', 'data', 'db.json'), 'utf8'))
const client = new MongoClient(uri)

try {
  await client.connect()
  const db = client.db(dbName)
  const products = db.collection('products')
  const users = db.collection('users')

  await users.createIndex({ email: 1 }, { unique: true })

  const existingProducts = await products.countDocuments({})
  if (existingProducts > 0) {
    console.log(`• в базе уже ${existingProducts} товаров — импорт пропущен`)
  } else {
    // отбрасываем старый строковый id: Mongo выдаст собственный _id
    const docs = (raw.products || []).map(({ id, ...rest }) => {
      void id
      return { ...rest, createdAt: new Date().toISOString() }
    })
    if (docs.length) {
      await products.insertMany(docs)
      console.log(`✓ импортировано товаров: ${docs.length}`)
    }
  }

  const existingAdmin = await users.findOne({ email: adminEmail })
  if (existingAdmin) {
    await users.updateOne(
      { _id: existingAdmin._id },
      { $set: { role: 'admin', password: await bcrypt.hash(adminPassword, 10) } },
    )
    console.log(`✓ пароль администратора обновлён: ${adminEmail}`)
  } else {
    await users.insertOne({
      name: 'Admin',
      email: adminEmail,
      password: await bcrypt.hash(adminPassword, 10),
      role: 'admin',
      cart: [],
      orders: [],
      createdAt: new Date().toISOString(),
    })
    console.log(`✓ создан администратор: ${adminEmail}`)
  }

  console.log('\nГотово. Пароль администратора нигде не сохранён в открытом виде.')
} finally {
  await client.close()
}
