// Netlify Function — fetch-ical
// Server-side proxy to fetch iCal URLs, bypassing browser CORS restrictions.

exports.handler = async (event) => {
  const url = event.queryStringParameters?.url;

  if (!url) {
    return { statusCode: 400, body: JSON.stringify({ error: 'url param required' }) };
  }

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'epuredrive-ical-sync/1.0' },
      redirect: 'follow',
    });

    if (!res.ok) {
      return { statusCode: 502, body: JSON.stringify({ error: `Upstream ${res.status}` }) };
    }

    const text = await res.text();
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/calendar; charset=utf-8' },
      body: text,
    };
  } catch (err) {
    return { statusCode: 502, body: JSON.stringify({ error: err.message }) };
  }
};
