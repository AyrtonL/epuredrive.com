// Netlify Function — create-tenant
// Creates a tenant + profile row using service role key (bypasses RLS).
// Auth: requires a valid Supabase access token in the Authorization header.
// The userId is taken from the verified token — never trust the body.
// Env vars required:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   NETLIFY_SITE_ID       — auto-registers {slug}.epuredrive.com as a domain alias
//   NETLIFY_AUTH_TOKEN    — personal access token with site:write scope

const SUPABASE_URL = process.env.SUPABASE_URL;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !serviceKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server misconfigured' }) };
  }

  // 0 — Verify caller's Supabase JWT
  const authHeader = event.headers.authorization || event.headers.Authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Missing Authorization header' }) };
  }

  const verifyRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'apikey': serviceKey,
    },
  });
  if (!verifyRes.ok) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Invalid or expired session' }) };
  }
  const verifiedUser = await verifyRes.json();
  const userId = verifiedUser?.id;
  const email = verifiedUser?.email;
  if (!userId) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Could not verify user' }) };
  }

  let body = {};
  try { body = event.body ? JSON.parse(event.body) : {}; }
  catch { return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const company = body.company;

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
  const rawSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 32) + '-' + Date.now();
  const slug = rawSlug.slice(0, 63);
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
  const profileWriteRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'resolution=merge-duplicates' },
    body: JSON.stringify({ id: userId, tenant_id: tenantId, role: 'admin' }),
  });
  if (!profileWriteRes.ok) {
    const profileErr = await profileWriteRes.json().catch(() => ({}));
    return { statusCode: 500, body: JSON.stringify({ error: profileErr.message || 'Tenant created but profile write failed' }) };
  }

  // 4 — Register tenant subdomain as Netlify domain alias
  const netlifyToken = process.env.NETLIFY_AUTH_TOKEN;
  const netlifySiteId = process.env.NETLIFY_SITE_ID;
  if (netlifyToken && netlifySiteId) {
    try {
      const netlifyHeaders = {
        'Authorization': `Bearer ${netlifyToken}`,
        'Content-Type': 'application/json',
      };
      const siteRes = await fetch(`https://api.netlify.com/api/v1/sites/${netlifySiteId}`, { headers: netlifyHeaders });
      const site = await siteRes.json();
      const currentAliases = site.domain_aliases || [];
      const newAlias = `${slug}.epuredrive.com`;
      if (!currentAliases.includes(newAlias)) {
        await fetch(`https://api.netlify.com/api/v1/sites/${netlifySiteId}`, {
          method: 'PATCH',
          headers: netlifyHeaders,
          body: JSON.stringify({ domain_aliases: [...currentAliases, newAlias] }),
        });
      }
    } catch (err) {
      console.error('[create-tenant] Netlify domain alias registration failed:', err?.message || err);
    }
  }

  return { statusCode: 200, body: JSON.stringify({ tenantId, slug }) };
};
