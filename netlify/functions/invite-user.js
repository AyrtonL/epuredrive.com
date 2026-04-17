// DEPRECATED — This legacy Netlify function is disabled for security.
// Use the authenticated Next.js route POST /api/team/invite instead.
// This function had no authentication, allowing anyone to invite users
// to any tenant with any role (including admin).

exports.handler = async () => {
  return {
    statusCode: 410,
    body: JSON.stringify({ error: 'This endpoint has been retired. Use /api/team/invite instead.' }),
  };
};
