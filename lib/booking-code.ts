const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O/1/I to avoid confusion

/** Generate a booking code like E-7X3K9M */
export function generateBookingCode(length = 6): string {
  const chars: string[] = []
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  for (let i = 0; i < bytes.length; i++) {
    chars.push(CHARS[bytes[i] % CHARS.length])
  }
  return `E-${chars.join('')}`
}
