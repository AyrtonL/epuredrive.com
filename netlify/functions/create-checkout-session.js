// DEPRECATED — This legacy Netlify function is disabled for security (2026-10-11).
// Unauthenticated, used only by the removed legacy static dashboard.
// Replaced by the billing page in /dashboard/settings/billing.

exports.handler = async () => {
  return {
    statusCode: 410,
    body: JSON.stringify({ error: 'This endpoint has been retired.' }),
  };
};
