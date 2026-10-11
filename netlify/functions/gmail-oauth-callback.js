// DEPRECATED — This legacy Netlify function is disabled for security (2026-10-11).
// Trusted the tenant_id in `state` without checking the session (see gmail-oauth-start).
// Replaced by /api/integrations/turo/gmail/callback.

exports.handler = async () => {
  return {
    statusCode: 410,
    body: JSON.stringify({ error: 'This endpoint has been retired.' }),
  };
};
