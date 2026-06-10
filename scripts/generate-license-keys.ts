import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

// Generate RSA-2048 key pair for license signing
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem',
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem',
  },
})

// Save keys
const keysDir = path.join(process.cwd(), 'license-keys')
if (!fs.existsSync(keysDir)) {
  fs.mkdirSync(keysDir, { recursive: true })
}

fs.writeFileSync(path.join(keysDir, 'private.pem'), privateKey)
fs.writeFileSync(path.join(keysDir, 'public.pem'), publicKey)

// Also output the public key for embedding in .env
console.log('=== Keys Generated ===')
console.log('')
console.log('Private key saved to: license-keys/private.pem')
console.log('Public key saved to: license-keys/public.pem')
console.log('')
console.log('Add this to your .env:')
console.log(`LICENSE_PUBLIC_KEY="${publicKey.replace(/\n/g, '\\n')}"`)
console.log('')
console.log('And add the private key (for admin server only):')
console.log(`LICENSE_PRIVATE_KEY="${privateKey.replace(/\n/g, '\\n')}"`)
console.log('')
console.log('⚠️  IMPORTANT: Keep private.pem SECRET! Never embed it in the client app.')
console.log('⚠️  Add license-keys/ to .gitignore!')
