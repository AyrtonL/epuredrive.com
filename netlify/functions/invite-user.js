// Netlify Serverless Function — invite-user
// Sends a Supabase invitation email and creates the profile row.
// Env vars required:
//   SUPABASE_SERVICE_ROLE_KEY  — service_role key from Supabase → Settings → API

const SUPABASE_URL = 'https://brwzjwbpguiignrxvjdc.supabase.co';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const { email, name, role, tenantId } = body;

  if (!email) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Email is required' }) };
  }
  if (!['admin', 'finance', 'staff'].includes(role)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid role' }) };
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server misconfigured: missing service role key' }) };
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${serviceKey}`,
    'apikey': serviceKey,
  };

  // 1 — Send invitation email via Supabase Auth Admin API
  const inviteRes = await fetch(`${SUPABASE_URL}/auth/v1/invite`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      email,
      data: { full_name: name || '', role },
    }),
  });

  const inviteJson = await inviteRes.json();

  if (!inviteRes.ok) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: inviteJson.msg || inviteJson.error_description || 'Invite failed' }),
    };
  }

  const newUserId = inviteJson.id;

  // 2 — Create profile row with tenant + role set before first login
  if (newUserId && tenantId) {
    await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
      method: 'POST',
      headers: {
        ...headers,
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        id:        newUserId,
        tenant_id: tenantId,
        full_name: name || null,
        role:      role,
      }),
    });
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true, userId: newUserId }),
  };
};
