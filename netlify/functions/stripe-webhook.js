// Netlify Function — stripe-webhook
// Handles Stripe events to activate/suspend tenant plans and confirm Connect accounts.
// Env vars required:
//   STRIPE_WEBHOOK_SECRET
//   SUPABASE_SERVICE_ROLE_KEY

const crypto = require('crypto');

const SUPABASE_URL = 'https://brwzjwbpguiignrxvjdc.supabase.co';

// Map Stripe price IDs to plan names
const PRICE_TO_PLAN = {
  [process.env.STRIPE_PRICE_PRO]: 'pro',
  [process.env.STRIPE_PRICE_MAX]: 'max',
};

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
  const res = await fetch(`${SUPABASE_URL}/rest/v1/tenants?id=eq.${tenantId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceKey}`,
      'apikey': serviceKey,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    console.error(`[stripe-webhook] patchTenant failed: ${res.status} ${await res.text()}`);
  }
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
    console.error('[stripe-webhook] Verification error:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  const { type, data } = stripeEvent;
  console.log(`[stripe-webhook] Received event: ${type}`);

  // ── Plan checkout completed ─────────────────────────────
  if (type === 'checkout.session.completed') {
    const session  = data.object;
    const tenantId = session.metadata?.tenant_id;
    const plan     = session.metadata?.plan;

    if (!tenantId) {
      console.log('[stripe-webhook] No tenant_id in session metadata, skipping');
      return { statusCode: 200, body: 'ok' };
    }

    // Use metadata plan name if available, otherwise derive from price
    const resolvedPlan = plan || 'pro';

    await patchTenant(tenantId, {
      plan: resolvedPlan,
      stripe_customer_id:     session.customer,
      stripe_subscription_id: session.subscription,
    }, serviceKey);

    console.log(`[stripe-webhook] Tenant ${tenantId} upgraded to ${resolvedPlan}`);
  }

  // ── Subscription upgraded/downgraded ────────────────────
  if (type === 'customer.subscription.updated') {
    const sub      = data.object;
    const tenantId = sub.metadata?.tenant_id;
    if (!tenantId) return { statusCode: 200, body: 'ok' };

    const priceId = sub.items?.data?.[0]?.price?.id;
    const plan    = PRICE_TO_PLAN[priceId] || 'pro';
    await patchTenant(tenantId, { plan }, serviceKey);

    console.log(`[stripe-webhook] Tenant ${tenantId} subscription changed to ${plan}`);
  }

  // ── Subscription cancelled ──────────────────────────────
  if (type === 'customer.subscription.deleted') {
    const sub      = data.object;
    const tenantId = sub.metadata?.tenant_id;
    if (!tenantId) return { statusCode: 200, body: 'ok' };

    await patchTenant(tenantId, { plan: 'free' }, serviceKey);
    console.log(`[stripe-webhook] Tenant ${tenantId} downgraded to free (subscription cancelled)`);
  }

  // ── Stripe Connect account updated ─────────────────────
  if (type === 'account.updated') {
    const account  = data.object;
    const tenantId = account.metadata?.tenant_id;
    if (!tenantId) return { statusCode: 200, body: 'ok' };

    // When charges become enabled, confirm the connection
    if (account.charges_enabled) {
      await patchTenant(tenantId, {
        stripe_account_id: account.id,
      }, serviceKey);
      console.log(`[stripe-webhook] Connect account ${account.id} confirmed for tenant ${tenantId}`);
    }
  }

  return { statusCode: 200, body: 'ok' };
};
