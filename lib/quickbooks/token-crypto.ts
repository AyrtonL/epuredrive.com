/**
 * QuickBooks token encryption — delegates to shared crypto module.
 * Uses QB_ENCRYPTION_KEY env var (AES-256-GCM).
 */
import { encryptToken as _encrypt, decryptToken as _decrypt } from '@/lib/crypto/token-crypto'

export function encryptToken(plaintext: string): string {
  return _encrypt(plaintext, 'QB_ENCRYPTION_KEY')
}

export function decryptToken(encryptedBase64: string): string {
  return _decrypt(encryptedBase64, 'QB_ENCRYPTION_KEY')
}
