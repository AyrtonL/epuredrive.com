// Netlify Function — stripe-webhook (DEPRECATED)
// All Stripe webhook handling is now done by the Next.js API routes:
//   - Platform subscriptions: /api/stripe/webhook
//   - Connect payments:       /api/stripe/connect-webhook
//
// This stub remains so that any legacy Stripe webhook endpoint configured
// at /.netlify/functions/stripe-webhook returns a clear message instead of 404.
// Remove this file once the Stripe Dashboard endpoint has been updated.

exports.handler = async () => {
  console.warn('[stripe-webhook] DEPRECATED — migrate endpoint to /api/stripe/webhook')
  return {
    statusCode: 410,
    body: JSON.stringify({
      error: 'This webhook endpoint is deprecated. Use /api/stripe/webhook instead.',
    }),
    headers: { 'Content-Type': 'application/json' },
  }
}
