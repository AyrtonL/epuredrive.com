// Temporary debug function — DELETE after troubleshooting
// GET /.netlify/functions/debug-icloud-sync?tenant_id=<uuid>&uid=28035
// Fetches a specific email by UID and shows the raw body + parse result

const { ImapFlow } = require('imapflow');
const SUPABASE_URL = 'https://brwzjwbpguiignrxvjdc.supabase.co';

function decodeMimePart(body, headers) {
  if (/Content-Transfer-Encoding:\s*quoted-printable/i.test(headers)) {
    const qp = body
      .replace(/=\r?\n/g, '')
      .replace(/=([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
    return Buffer.from(qp, 'latin1').toString('utf-8');
  }
  if (/Content-Transfer-Encoding:\s*base64/i.test(headers)) {
    return Buffer.from(body.replace(/\s/g, ''), 'base64').toString('utf-8');
  }
  return body;
}

function extractMimeParts(raw) {
  const boundaryMatch = raw.match(/Content-Type:\s*multipart\/[^;]+;\s*boundary="([^"]+)"/i)
                     || raw.match(/Content-Type:\s*multipart\/[^;]+;\s*boundary=([^\s;]+)/i);

  if (boundaryMatch) {
    const boundary = boundaryMatch[1];
    const escaped  = boundary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts    = raw.split(new RegExp(`--${escaped}`));
    let plainText  = null;
    let htmlText   = null;

    for (const part of parts) {
      const headerEnd = part.indexOf('\r\n\r\n');
      if (headerEnd < 0) continue;
      const headers = part.slice(0, headerEnd);
      const body    = part.slice(headerEnd + 4);

      if (/Content-Type:\s*multipart\//i.test(headers)) {
        const nested = extractMimeParts(part.trim());
        if (nested && !plainText) plainText = nested;
        continue;
      }

      const decoded = decodeMimePart(body, headers);
      if (/Content-Type:\s*text\/plain/i.test(headers) && !plainText) {
        plainText = decoded.trim();
      } else if (/Content-Type:\s*text\/html/i.test(headers) && !htmlText) {
        htmlText = decoded.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
      }
    }
    return plainText || htmlText || '';
  }

  const bodyStart = raw.indexOf('\r\n\r\n');
  return bodyStart >= 0 ? raw.slice(bodyStart + 4).trim() : raw.trim();
}

exports.handler = async (event) => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return { statusCode: 500, body: 'Missing SUPABASE_SERVICE_ROLE_KEY' };

  const tenantId = event.queryStringParameters?.tenant_id;
  const uid      = event.queryStringParameters?.uid;
  if (!tenantId) return { statusCode: 400, body: 'Missing tenant_id' };

  const syncRes = await fetch(
    `${SUPABASE_URL}/rest/v1/turo_email_syncs?tenant_id=eq.${tenantId}&provider=eq.icloud&select=*`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
  );
  const syncs = await syncRes.json();
  if (!syncs.length) return { statusCode: 404, body: 'No iCloud sync found for tenant' };
  const sync = syncs[0];

  const client = new ImapFlow({
    host: 'imap.mail.me.com', port: 993, secure: true,
    auth: { user: sync.gmail_address, pass: sync.app_specific_password },
    logger: false,
  });

  const result = {};

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    try {
      if (uid) {
        // Fetch a specific email and show its body
        const msg = await client.fetchOne(uid, { source: true }, { uid: true });
        const raw = msg.source.toString('utf-8');

        // Show MIME structure hints
        const boundaryMatch = raw.match(/Content-Type:\s*multipart\/([^;]+);\s*boundary="([^"]+)"/i)
                           || raw.match(/Content-Type:\s*multipart\/([^;]+);\s*boundary=([^\s;]+)/i);
        result.topLevelContentType = raw.match(/^Content-Type:\s*(.+)$/mi)?.[1] || 'not found';
        result.mimeType    = boundaryMatch ? `multipart/${boundaryMatch[1]}` : 'no multipart boundary found';
        result.boundary    = boundaryMatch ? boundaryMatch[2] : null;
        result.rawLength   = raw.length;
        result.rawHeaders  = raw.slice(0, raw.indexOf('\r\n\r\n')).slice(0, 500);

        const parsedBody = extractMimeParts(raw);
        result.parsedBodyLength = parsedBody.length;
        result.parsedBodyPreview = parsedBody.slice(0, 800);

        // Check parse results
        const subject = raw.match(/^Subject:\s*(.+)$/mi)?.[1]?.trim() || '';
        result.rawSubject = subject;
        result.isConfirmed = /cha.?ching|trip.*booked|booked.*trip/i.test(subject + ' ' + parsedBody);
        result.isCancelled = /cancel/i.test(subject);
        result.guestMatch  = parsedBody.match(/Cha-?ching!\s*(.+?)[\u2019']s trip with your/i)?.[1]
                          || parsedBody.match(/(.+?)[\u2019']s trip with your/i)?.[1]
                          || null;
        result.datesMatch  = !!parsedBody.match(/booked from .+? to .+?\./i);
      } else {
        // List recent Turo booking emails
        const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const uids = await client.search({ from: 'noreply@mail.turo.com', since: since30 }, { uid: true });
        result.turoUids = uids.slice(-10);
        result.totalTuroLast30Days = uids.length;
      }
    } finally {
      lock.release();
    }
    await client.logout();
  } catch (err) {
    result.error = err.message;
    result.stack = err.stack?.slice(0, 500);
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(result, null, 2),
  };
};
