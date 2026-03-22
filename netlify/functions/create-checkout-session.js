// Netlify Function — create-checkout-session
// Creates a Stripe Checkout session for plan upgrades.
// Env vars required:
//   STRIPE_SECRET_KEY

const STRIPE_API = 'https://api.stripe.com/v1';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const { priceId, tenantId, email } = body;

  if (!priceId || !tenantId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'priceId and tenantId are required' }) };
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Missing Stripe secret key' }) };
  }

  // Build base URL from request origin
  const origin = event.headers.origin || event.headers.referer?.replace(/\/[^/]*$/, '') || 'https://epuredrivecom.netlify.app';

  const params = new URLSearchParams({
    mode: 'subscription',
    'payment_method_types[0]': 'card',
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': '1',
    success_url: `${origin}/admin/dashboard.html?upgraded=1`,
    cancel_url:  `${origin}/admin/dashboard.html?upgrade_cancelled=1`,
    'metadata[tenantId]': tenantId,
    'metadata[priceId]':  priceId,
    'subscription_data[metadata][tenantId]': tenantId,
    'subscription_data[metadata][priceId]':  priceId,
  });

  if (email) params.set('customer_email', email);

  const res = await fetch(`${STRIPE_API}/checkout/sessions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  const session = await res.json();

  if (!res.ok) {
    return { statusCode: 400, body: JSON.stringify({ error: session.error?.message || 'Stripe error' }) };
  }

  return { statusCode: 200, body: JSON.stringify({ url: session.url }) };
};
