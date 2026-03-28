// Netlify Function — gmail-oauth-start
// Redirects the browser to Google OAuth consent screen.
// Called by the dashboard "Connect Gmail" button.
// Env vars required:
//   GOOGLE_CLIENT_ID — from Google Cloud Console → OAuth 2.0 credentials

const REDIRECT_URI = 'https://epuredrive.com/.netlify/functions/gmail-oauth-callback';
const SCOPE        = 'https://www.googleapis.com/auth/gmail.readonly';

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const tenantId = event.queryStringParameters?.tenant_id;
  if (!tenantId) {
    return { statusCode: 400, body: 'tenant_id is required' };
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return { statusCode: 500, body: 'Server misconfigured: missing GOOGLE_CLIENT_ID' };
  }

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id',     clientId);
  url.searchParams.set('redirect_uri',  REDIRECT_URI);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope',         SCOPE);
  url.searchParams.set('access_type',   'offline');
  url.searchParams.set('prompt',        'consent');
  url.searchParams.set('state',         tenantId);

  return {
    statusCode: 302,
    headers: { Location: url.toString() },
    body: '',
  };
};
