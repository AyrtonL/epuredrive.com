const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { email, name, role, tenantId } = body;

  if (!email) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Email is required' }) };
  }
  if (!['admin', 'finance', 'staff'].includes(role)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid role' }) };
  }

  const supabaseUrl      = process.env.SUPABASE_URL      || 'https://brwzjwbpguiignrxvjdc.supabase.co';
  const serviceRoleKey   = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server misconfigured: missing service role key' }) };
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Send invitation email — user sets their own password via the link
  const { data: inviteData, error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { full_name: name || '', role },
  });

  if (inviteErr) {
    return { statusCode: 400, body: JSON.stringify({ error: inviteErr.message }) };
  }

  const newUserId = inviteData?.user?.id;

  // Create profile row so role + tenant are set before first login
  if (newUserId && tenantId) {
    await adminClient.from('profiles').upsert({
      id:        newUserId,
      tenant_id: tenantId,
      full_name: name || null,
      role:      role,
    });
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true, userId: newUserId }),
  };
};
