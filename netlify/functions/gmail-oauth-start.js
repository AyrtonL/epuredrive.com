// DEPRECATED — This legacy Netlify function is disabled for security (2026-10-11).
// No authentication: put any ?tenant_id= into the OAuth state, so anyone could
// connect their own Gmail to another tenant and inject fake Turo bookings.
// Replaced by /api/integrations/turo/gmail/start.

exports.handler = async () => {
  return {
    statusCode: 410,
    body: JSON.stringify({ error: 'This endpoint has been retired.' }),
  };
};
