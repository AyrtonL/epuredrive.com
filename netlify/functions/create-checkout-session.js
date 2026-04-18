// Netlify Function — create-checkout-session
// Creates a Stripe Checkout session for plan upgrades (legacy admin dashboard).
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

  const origin = event.headers.origin || event.headers.referer?.replace(/\/[^/]*$/, '') || 'https://epuredrive.com';

  const params = new URLSearchParams({
    mode: 'subscription',
    'payment_method_types[0]': 'card',
    'payment_method_types[1]': 'paypal',
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': '1',
    success_url: `${origin}/dashboard/settings/billing?success=1`,
    cancel_url: `${origin}/dashboard/settings/billing?cancelled=1`,
    'metadata[tenant_id]': tenantId,
    'metadata[priceId]': priceId,
    'subscription_data[metadata][tenant_id]': tenantId,
    'subscription_data[metadata][priceId]': priceId,
    'automatic_tax[enabled]': 'true',
    'tax_id_collection[enabled]': 'true',
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
