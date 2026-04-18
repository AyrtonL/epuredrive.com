import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16

function getEncryptionKey(envVar: string): Buffer {
  const key = process.env[envVar]
  if (!key) {
    throw new Error(`${envVar} environment variable is not configured`)
  }
  // Key must be 32 bytes (256 bits) for AES-256
  // Accept hex-encoded (64 chars) or base64-encoded key
  if (key.length === 64) {
    return Buffer.from(key, 'hex')
  }
  const decoded = Buffer.from(key, 'base64')
  if (decoded.length === 32) {
    return decoded
  }
  throw new Error(`${envVar} must be 32 bytes (64 hex chars or 44 base64 chars)`)
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a base64 string: iv + authTag + ciphertext
 */
export function encryptToken(plaintext: string, envVar = 'QB_ENCRYPTION_KEY'): string {
  const key = getEncryptionKey(envVar)
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()

  // Format: iv (16) + authTag (16) + ciphertext
  const combined = Buffer.concat([iv, authTag, encrypted])
  return combined.toString('base64')
}

/**
 * Decrypt an AES-256-GCM encrypted token.
 * Expects the base64 format produced by encryptToken.
 */
export function decryptToken(encryptedBase64: string, envVar = 'QB_ENCRYPTION_KEY'): string {
  const key = getEncryptionKey(envVar)
  const combined = Buffer.from(encryptedBase64, 'base64')

  const iv = combined.subarray(0, IV_LENGTH)
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
  const ciphertext = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH)

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ])

  return decrypted.toString('utf8')
}
