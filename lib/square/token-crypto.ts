/**
 * Square token encryption — delegates to shared crypto module.
 * Uses SQUARE_ENCRYPTION_KEY env var (AES-256-GCM).
 * Falls back to QB_ENCRYPTION_KEY if SQUARE_ENCRYPTION_KEY is not set,
 * so a single key can be used for all integrations.
 */
import { encryptToken as _encrypt, decryptToken as _decrypt } from '@/lib/crypto/token-crypto'

const ENV_VAR = process.env.SQUARE_ENCRYPTION_KEY ? 'SQUARE_ENCRYPTION_KEY' : 'QB_ENCRYPTION_KEY'

export function encryptSquareToken(plaintext: string): string {
  return _encrypt(plaintext, ENV_VAR)
}

export function decryptSquareToken(encryptedBase64: string): string {
  return _decrypt(encryptedBase64, ENV_VAR)
}
