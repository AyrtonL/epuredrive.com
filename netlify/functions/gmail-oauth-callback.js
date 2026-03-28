// Netlify Function — gmail-oauth-callback
// Receives Google OAuth redirect, exchanges code for tokens, saves to turo_email_syncs.
// Env vars required:
//   GOOGLE_CLIENT_ID
//   GOOGLE_CLIENT_SECRET
//   SUPABASE_SERVICE_ROLE_KEY

const SUPABASE_URL  = 'https://brwzjwbpguiignrxvjdc.supabase.co';
const TOKEN_URL     = 'https://oauth2.googleapis.com/token';
const REDIRECT_URI  = 'https://epuredrive.com/.netlify/functions/gmail-oauth-callback';
const DASHBOARD_URL = '/admin/dashboard.html?gmail=connected#turo';
const ERROR_URL     = '/admin/dashboard.html?gmail=error#turo';

function sbHeaders(serviceKey) {
  return {
    'apikey':        serviceKey,
    'Authorization': `Bearer ${serviceKey}`,
    'Content-Type':  'application/json',
  };
}

exports.handler = async (event) => {
  const { code, state: tenantId, error } = event.queryStringParameters || {};

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (error || !code || !tenantId || !UUID_RE.test(tenantId)) {
    console.error('[gmail-oauth-callback] Missing params, Google error, or invalid tenantId:', { error, tenantId });
    return { statusCode: 302, headers: { Location: ERROR_URL }, body: '' };
  }

  const clientId     = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const serviceKey   = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!clientId || !clientSecret || !serviceKey) {
    console.error('[gmail-oauth-callback] Missing env vars');
    return { statusCode: 302, headers: { Location: ERROR_URL }, body: '' };
  }

  // 1. Exchange code for access_token + refresh_token
  const tokenRes = await fetch(TOKEN_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({
      code,
      client_id:     clientId,
      client_secret: clientSecret,
      redirect_uri:  REDIRECT_URI,
      grant_type:    'authorization_code',
    }).toString(),
  });

  const tokens = await tokenRes.json();
  if (!tokenRes.ok || !tokens.access_token || !tokens.refresh_token) {
    console.error('[gmail-oauth-callback] Token exchange failed:', tokens);
    return { statusCode: 302, headers: { Location: ERROR_URL }, body: '' };
  }

  // 2. Fetch Gmail address to display in UI
  const profileRes   = await fetch('https://www.googleapis.com/gmail/v1/users/me/profile', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const profile      = profileRes.ok ? await profileRes.json() : {};
  if (!profileRes.ok) console.warn('[gmail-oauth-callback] Could not fetch Gmail profile:', profileRes.status);
  const gmailAddress = profile.emailAddress || 'unknown@gmail.com';

  // 3. Upsert into turo_email_syncs (one row per tenant, update if exists)
  const upsertRes = await fetch(
    `${SUPABASE_URL}/rest/v1/turo_email_syncs?on_conflict=tenant_id`,
    {
      method:  'POST',
      headers: { ...sbHeaders(serviceKey), 'Prefer': 'resolution=merge-duplicates' },
      body:    JSON.stringify({
        tenant_id:     tenantId,
        gmail_address: gmailAddress,
        access_token:  tokens.access_token,
        refresh_token: tokens.refresh_token,
        active:        true,
        last_checked:  new Date().toISOString(),
      }),
    }
  );

  if (!upsertRes.ok) {
    console.error('[gmail-oauth-callback] Supabase upsert failed:', await upsertRes.text());
    return { statusCode: 302, headers: { Location: ERROR_URL }, body: '' };
  }

  console.log(`[gmail-oauth-callback] Connected Gmail ${gmailAddress} for tenant ${tenantId}`);
  return { statusCode: 302, headers: { Location: DASHBOARD_URL }, body: '' };
};
