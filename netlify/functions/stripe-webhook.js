// Netlify Function — stripe-webhook
// Handles Stripe events to activate/suspend tenant plans.
// Env vars required:
//   STRIPE_WEBHOOK_SECRET
//   SUPABASE_SERVICE_ROLE_KEY

const crypto = require('crypto');

const SUPABASE_URL      = 'https://brwzjwbpguiignrxvjdc.supabase.co';
const STARTER_PRICE_ID  = 'price_1TDaQ3HAH4zJnnwfasGBYtYO';
const PRO_PRICE_ID      = 'price_1TF2UnHAH4zJnnwfTwU129PO';

function verifySignature(rawBody, sigHeader, secret) {
  const pairs      = sigHeader.split(',').map(p => p.split('='));
  const timestamp  = pairs.find(([k]) => k === 't')?.[1];
  const signatures = pairs.filter(([k]) => k === 'v1').map(([, v]) => v);

  if (!timestamp || !signatures.length) throw new Error('Invalid signature header');
  if (Math.abs(Date.now() / 1000 - parseInt(timestamp)) > 300) throw new Error('Timestamp too old');

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');

  if (!signatures.includes(expected)) throw new Error('Signature mismatch');
}

async function patchTenant(tenantId, data, serviceKey) {
  await fetch(`${SUPABASE_URL}/rest/v1/tenants?id=eq.${tenantId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceKey}`,
      'apikey': serviceKey,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify(data),
  });
}

exports.handler = async (event) => {
  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf8')
    : event.body;

  const sig           = event.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const serviceKey    = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!webhookSecret) return { statusCode: 500, body: 'Missing webhook secret' };
  if (!serviceKey)    return { statusCode: 500, body: 'Missing service role key' };

  let stripeEvent;
  try {
    verifySignature(rawBody, sig, webhookSecret);
    stripeEvent = JSON.parse(rawBody);
  } catch (err) {
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  const { type, data } = stripeEvent;

  // ── Plan activated ──────────────────────────────────────
  if (type === 'checkout.session.completed') {
    const session  = data.object;
    const tenantId = session.metadata?.tenantId;
    if (!tenantId) return { statusCode: 200, body: 'ok' };

    const priceId = session.metadata?.priceId;
    const plan    = priceId === PRO_PRICE_ID ? 'pro' : 'starter';

    await patchTenant(tenantId, {
      plan,
      stripe_customer_id:      session.customer,
      stripe_subscription_id:  session.subscription,
    }, serviceKey);
  }

  // ── Subscription upgraded/downgraded ────────────────────
  if (type === 'customer.subscription.updated') {
    const sub      = data.object;
    const tenantId = sub.metadata?.tenantId;
    if (!tenantId) return { statusCode: 200, body: 'ok' };

    const priceId = sub.items?.data?.[0]?.price?.id;
    const plan    = priceId === PRO_PRICE_ID ? 'pro' : 'starter';
    await patchTenant(tenantId, { plan }, serviceKey);
  }

  // ── Subscription cancelled ──────────────────────────────
  if (type === 'customer.subscription.deleted') {
    const sub      = data.object;
    const tenantId = sub.metadata?.tenantId;
    if (!tenantId) return { statusCode: 200, body: 'ok' };
    await patchTenant(tenantId, { plan: 'suspended' }, serviceKey);
  }

  return { statusCode: 200, body: 'ok' };
};
