// DEPRECATED — This legacy Netlify function is disabled for security (2026-10-11).
// No authentication: took tenant_id from the request body, so anyone could
// connect their own iCloud mailbox to another tenant and inject fake bookings.
// Replaced by /api/integrations/turo/icloud/connect.

exports.handler = async () => {
  return {
    statusCode: 410,
    body: JSON.stringify({ error: 'This endpoint has been retired.' }),
  };
};
