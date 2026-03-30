// Netlify Function — create-tenant
// Creates a tenant + profile row using service role key (bypasses RLS).
// Env vars required:
//   SUPABASE_SERVICE_ROLE_KEY
//   NETLIFY_SITE_ID       — auto-registers {slug}.epuredrive.com as a domain alias
//   NETLIFY_AUTH_TOKEN    — personal access token with site:write scope

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
  await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'resolution=merge-duplicates' },
    body: JSON.stringify({ id: userId, tenant_id: tenantId, role: 'admin' }),
  });

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
