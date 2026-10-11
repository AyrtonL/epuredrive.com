// DEPRECATED — This legacy Netlify function is disabled for security (2026-10-11).
// Open proxy: fetched any URL for anyone (no auth, no host allowlist).
// Replaced by /api/fetch-ical.

exports.handler = async () => {
  return {
    statusCode: 410,
    body: JSON.stringify({ error: 'This endpoint has been retired.' }),
  };
};
