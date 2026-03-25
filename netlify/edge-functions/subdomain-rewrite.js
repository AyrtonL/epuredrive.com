// Netlify Edge Function — subdomain-rewrite
// Rewrites {slug}.epuredrive.com → /fleet.html?t={slug}
// so each tenant gets their own branded URL without separate deployments.

export default async (request, context) => {
  const url = new URL(request.url);
  const host = url.hostname;

  // Match {slug}.epuredrive.com but not reserved subdomains
  const match = host.match(/^([a-z0-9][a-z0-9-]*[a-z0-9])\.epuredrive\.com$/);
  if (match && !['www', 'admin', 'app', 'api'].includes(match[1])) {
    const slug = match[1];
    // Only rewrite root or /fleet paths — let other paths (assets, functions) pass through
    if (url.pathname === '/' || url.pathname === '/fleet.html') {
      url.pathname = '/fleet.html';
      url.searchParams.set('t', slug);
      return context.rewrite(url);
    }
  }

  return context.next();
};
