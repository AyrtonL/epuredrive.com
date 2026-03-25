// Netlify Function — create-tenant
// Creates a tenant + profile row using service role key (bypasses RLS).
// Env vars required:
//   SUPABASE_SERVICE_ROLE_KEY

const SUPABASE_URL = 'https://brwzjwbpguiignrxvjdc.supabase.co';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const { userId, email, company } = body;
  if (!userId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'userId is required' }) };
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server misconfigured' }) };
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${serviceKey}`,
    'apikey': serviceKey,
    'Prefer': 'return=representation',
  };

  // 1 — Check if user already has a profile with a tenant
  const profileRes = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=tenant_id&limit=1`,
    { headers }
  );
  const profiles = await profileRes.json();
  if (profiles[0]?.tenant_id) {
    return { statusCode: 200, body: JSON.stringify({ tenantId: profiles[0].tenant_id }) };
  }

  // 2 — Create tenant
  const name = company || email?.split('@')[0] || 'My Fleet';
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
  const tenantRes = await fetch(`${SUPABASE_URL}/rest/v1/tenants`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name,
      slug,
      plan: 'free',
    }),
  });
  const tenants = await tenantRes.json();
  if (!tenantRes.ok) {
    return { statusCode: 400, body: JSON.stringify({ error: tenants.message || 'Failed to create tenant' }) };
  }
  const tenantId = tenants[0]?.id;
  if (!tenantId) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Tenant created but no ID returned' }) };
  }

  // 3 — Create profile
  await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'resolution=merge-duplicates' },
    body: JSON.stringify({ id: userId, tenant_id: tenantId, role: 'admin' }),
  });

  return { statusCode: 200, body: JSON.stringify({ tenantId }) };
};
