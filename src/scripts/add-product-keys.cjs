const fs = require('fs')
const path = require('path')
const file = path.resolve(__dirname, '../data/db.json')
const data = JSON.parse(fs.readFileSync(file, 'utf8'))
const nameKeyMap = {
  'Klassik oq futbolka': 'classicWhiteTee',
  "Rasmiy ko'ylak": 'formalShirt',
  'Denim jinsi shim': 'denimJeans',
  'Sport shorti': 'sportShorts',
  'Oversize hudi': 'oversizedHoodie',
  'Bomber kurtka': 'bomberJacket',
  'Polo futbolka': 'poloShirt',
  'Cargo shim': 'cargoPants',
  'Trikotaj sviter': 'knitSweater',
  'Sport kostyum': 'sportTracksuit',
}
const colorKeyMap = {
  'oq': 'white',
  "ko'k": 'blue',
  'qora': 'black',
  'kulrang': 'gray',
  "to'q ko'k": 'navy',
  'xaki': 'khaki',
  'bej': 'beige',
}
const categoryKeyMap = {
  tshirt: 'tshirt',
  shirt: 'shirt',
  trousers: 'trousers',
  shorts: 'shorts',
  hoodie: 'hoodie',
  jacket: 'jacket',
  polo: 'polo',
  sweater: 'sweater',
  tracksuit: 'tracksuit',
}

data.products = (data.products || []).map((product) => ({
  ...product,
  nameKey: product.nameKey || nameKeyMap[product.name] || product.id,
  colorKey: product.colorKey || colorKeyMap[product.color] || (product.color || '')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .toLowerCase(),
  categoryKey: product.categoryKey || categoryKeyMap[product.category] || product.category,
}))

fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8')
console.log(`Updated ${data.products.length} products`)
