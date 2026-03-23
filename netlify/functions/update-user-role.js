// Netlify Function — update-user-role
// Allows an admin to change another user's role within the same tenant.
// Uses service role key to bypass RLS.
// Requires: SUPABASE_SERVICE_ROLE_KEY env var

const SUPABASE_URL = 'https://brwzjwbpguiignrxvjdc.supabase.co';
const ALLOWED_ROLES = ['admin', 'finance', 'staff'];

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // Verify caller is authenticated
  const authHeader = event.headers['authorization'] || '';
  const callerToken = authHeader.replace('Bearer ', '').trim();
  if (!callerToken) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const { targetUserId, newRole } = body;
  if (!targetUserId || !newRole) {
    return { statusCode: 400, body: JSON.stringify({ error: 'targetUserId and newRole are required' }) };
  }
  if (!ALLOWED_ROLES.includes(newRole)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid role' }) };
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server misconfigured' }) };
  }

  const serviceHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${serviceKey}`,
    'apikey': serviceKey,
  };

  // Verify the caller is an admin in the same tenant as the target user
  const callerRes = await fetch(
    `${SUPABASE_URL}/auth/v1/user`,
    { headers: { 'Authorization': `Bearer ${callerToken}`, 'apikey': serviceKey } }
  );
  const callerAuth = await callerRes.json();
  const callerId = callerAuth?.id;
  if (!callerId) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Could not verify caller identity' }) };
  }

  // Get caller profile
  const callerProfileRes = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${callerId}&select=tenant_id,role&limit=1`,
    { headers: serviceHeaders }
  );
  const callerProfiles = await callerProfileRes.json();
  const callerProfile = callerProfiles[0];
  if (!callerProfile || callerProfile.role !== 'admin') {
    return { statusCode: 403, body: JSON.stringify({ error: 'Only admins can change roles' }) };
  }

  // Prevent self-role changes via this endpoint
  if (callerId === targetUserId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Cannot change your own role' }) };
  }

  // Verify target is in the same tenant
  const targetRes = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${targetUserId}&select=tenant_id&limit=1`,
    { headers: serviceHeaders }
  );
  const targetProfiles = await targetRes.json();
  const targetProfile = targetProfiles[0];
  if (!targetProfile || targetProfile.tenant_id !== callerProfile.tenant_id) {
    return { statusCode: 403, body: JSON.stringify({ error: 'Cannot modify users from another tenant' }) };
  }

  // Update the role
  const updateRes = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${targetUserId}`,
    {
      method: 'PATCH',
      headers: serviceHeaders,
      body: JSON.stringify({ role: newRole }),
    }
  );

  if (!updateRes.ok) {
    const err = await updateRes.json();
    return { statusCode: 400, body: JSON.stringify({ error: err.message || 'Update failed' }) };
  }

  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};
