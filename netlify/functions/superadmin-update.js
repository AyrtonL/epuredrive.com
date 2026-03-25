// Netlify Function — superadmin-update
// Updates a tenant's plan, notes, or owner contact info.
// Requires: SUPABASE_SERVICE_ROLE_KEY env var
// Auth: same as superadmin-stats (valid JWT + is_super_admin = true)

const SUPABASE_URL = 'https://brwzjwbpguiignrxvjdc.supabase.co';

function sbHeaders(key) {
  return {
    'Authorization': `Bearer ${key}`,
    'apikey': key,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal',
  };
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const authHeader = event.headers['authorization'] || '';
  const token      = authHeader.replace(/^Bearer\s+/i, '').trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!token)      return { statusCode: 401, body: JSON.stringify({ error: 'Missing token' }) };
  if (!serviceKey) return { statusCode: 500, body: JSON.stringify({ error: 'Server config error' }) };

  // Verify JWT
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { 'Authorization': `Bearer ${token}`, 'apikey': serviceKey },
  });
  if (!userRes.ok) return { statusCode: 401, body: JSON.stringify({ error: 'Invalid token' }) };
  const user = await userRes.json();

  // Check is_super_admin
  const profRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&select=is_super_admin`, {
    headers: { 'Authorization': `Bearer ${serviceKey}`, 'apikey': serviceKey },
  });
  const profiles = await profRes.json();
  if (!profiles?.[0]?.is_super_admin) {
    return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden' }) };
  }

  // Parse body
  let body;
  try { body = JSON.parse(event.body); } catch { return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const { tenantId, updates } = body;
  if (!tenantId || !updates) {
    return { statusCode: 400, body: JSON.stringify({ error: 'tenantId and updates required' }) };
  }

  // Whitelist allowed fields
  const allowed = ['plan', 'notes', 'owner_name', 'owner_email', 'owner_phone'];
  const safe = {};
  allowed.forEach(k => { if (updates[k] !== undefined) safe[k] = updates[k]; });

  if (!Object.keys(safe).length) {
    return { statusCode: 400, body: JSON.stringify({ error: 'No valid fields to update' }) };
  }

  // Validate plan value if present
  const validPlans = ['trial', 'starter', 'pro', 'suspended'];
  if (safe.plan && !validPlans.includes(safe.plan)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid plan value' }) };
  }

  const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/tenants?id=eq.${tenantId}`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${serviceKey}`, 'apikey': serviceKey, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
    body: JSON.stringify(safe),
  });

  if (!patchRes.ok) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Update failed' }) };
  }

  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};
