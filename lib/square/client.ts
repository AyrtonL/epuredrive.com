import { SquareClient } from 'square'

export function getSquareClient(accessToken?: string): SquareClient {
  return new SquareClient({
    token: accessToken,
    environment: process.env.SQUARE_ENVIRONMENT === 'production' ? 'production' : 'sandbox',
  })
}
