// Netlify Function — icloud-connect
// Validates iCloud IMAP credentials and saves connection to turo_email_syncs.
// POST body: { tenant_id, email, password }
// Env vars required:
//   SUPABASE_SERVICE_ROLE_KEY

const { ImapFlow } = require('imapflow');

const SUPABASE_URL = 'https://brwzjwbpguiignrxvjdc.supabase.co';

function sbHeaders(serviceKey) {
  return {
    'apikey':        serviceKey,
    'Authorization': `Bearer ${serviceKey}`,
    'Content-Type':  'application/json',
  };
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { tenant_id, email, password } = body;

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!tenant_id || !UUID_RE.test(tenant_id) || !email || !password) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing or invalid parameters' }) };
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server misconfigured' }) };
  }

  // 1. Validate credentials via IMAP test-login
  const client = new ImapFlow({
    host:   'imap.mail.me.com',
    port:   993,
    secure: true,
    auth:   { user: email, pass: password },
    logger: false,
  });

  try {
    await client.connect();
    await client.logout();
  } catch (err) {
    console.warn('[icloud-connect] IMAP auth failed:', err.message);
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid credentials. Check your iCloud email and app-specific password.' }),
    };
  }

  // 2. Upsert into turo_email_syncs
  const lastChecked = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const upsertRes = await fetch(
    `${SUPABASE_URL}/rest/v1/turo_email_syncs?on_conflict=tenant_id`,
    {
      method:  'POST',
      headers: { ...sbHeaders(serviceKey), 'Prefer': 'resolution=merge-duplicates' },
      body:    JSON.stringify({
        tenant_id,
        provider:              'icloud',
        gmail_address:         email,
        app_specific_password: password,
        access_token:          '',
        refresh_token:         '',
        active:                true,
        last_checked:          lastChecked,
      }),
    }
  );

  if (!upsertRes.ok) {
    console.error('[icloud-connect] Supabase upsert failed:', await upsertRes.text());
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to save connection' }) };
  }

  console.log(`[icloud-connect] Connected iCloud ${email} for tenant ${tenant_id}`);
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true, email }),
  };
};
