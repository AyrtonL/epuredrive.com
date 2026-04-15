// Netlify Scheduled Function — maintenance-alerts-cron
// Runs daily (configured in netlify.toml).
// Delegates all logic to the Next.js API route at /api/cron/maintenance-alerts.
// Env vars required: CRON_SECRET, URL (auto-set by Netlify)

exports.handler = async () => {
  const secret = process.env.CRON_SECRET;
  const siteUrl = process.env.URL || 'http://localhost:3000';

  if (!secret) {
    console.error('[maintenance-alerts-cron] Missing CRON_SECRET');
    return { statusCode: 500, body: 'Missing CRON_SECRET' };
  }

  const res = await fetch(`${siteUrl}/api/cron/maintenance-alerts`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}` },
  });

  const body = await res.text();
  console.log(`[maintenance-alerts-cron] Next.js route responded ${res.status}: ${body}`);
  return { statusCode: res.status, body };
};
