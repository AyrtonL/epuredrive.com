// Netlify Edge Function — playwright-bypass
// Allows Playwright E2E tests to bypass bot protection challenges.
//
// How it works:
// 1. Playwright sends an 'x-bypass-token' header with every request
// 2. This edge function validates the token against the PLAYWRIGHT_BYPASS_TOKEN env var
// 3. If valid, the request proceeds normally without bot challenge interference
//
// The token is stored as a secret env var on Netlify and in local .env.local

export default async (request, context) => {
  const bypassToken = Deno.env.get('PLAYWRIGHT_BYPASS_TOKEN');
  const requestToken = request.headers.get('x-bypass-token');

  // If the request carries a valid bypass token, proceed without bot detection
  if (bypassToken && requestToken && requestToken === bypassToken) {
    // Return early with the upstream response, marking it as verified traffic
    const response = await context.next();
    // Add a response header so tests can confirm bypass is active
    response.headers.set('x-e2e-bypass', 'active');
    return response;
  }

  // All other requests proceed normally (bot protection still applies)
  return context.next();
};

export const config = {
  path: '/*',
};
