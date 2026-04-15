// Netlify Scheduled Function — review-requests-cron
// Runs daily (configured in netlify.toml).
// Delegates all logic to the Next.js API route at /api/cron/review-requests.
// Env vars required: CRON_SECRET, URL (auto-set by Netlify)

exports.handler = async () => {
  const secret = process.env.CRON_SECRET;
  const siteUrl = process.env.URL || 'http://localhost:3000';

  if (!secret) {
    console.error('[review-requests-cron] Missing CRON_SECRET');
    return { statusCode: 500, body: 'Missing CRON_SECRET' };
  }

  const res = await fetch(`${siteUrl}/api/cron/review-requests`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}` },
  });

  const body = await res.text();
  console.log(`[review-requests-cron] Next.js route responded ${res.status}: ${body}`);
  return { statusCode: res.status, body };
};
