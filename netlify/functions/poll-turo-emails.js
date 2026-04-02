// Netlify Scheduled Function — poll-turo-emails
// Runs every 15 min (configured in netlify.toml).
// Delegates all logic to the Next.js API route.
// Env vars required: CRON_SECRET, URL (auto-set by Netlify)

exports.handler = async () => {
  const secret = process.env.CRON_SECRET;
  const siteUrl = process.env.URL || 'http://localhost:3000';

  if (!secret) {
    console.error('[poll-turo-emails] Missing CRON_SECRET');
    return { statusCode: 500, body: 'Missing CRON_SECRET' };
  }

  const res = await fetch(`${siteUrl}/api/cron/poll-turo-emails`, {
    headers: { Authorization: `Bearer ${secret}` },
  });

  const body = await res.text();
  console.log(`[poll-turo-emails] Next.js route responded ${res.status}: ${body}`);
  return { statusCode: res.status, body };
};
