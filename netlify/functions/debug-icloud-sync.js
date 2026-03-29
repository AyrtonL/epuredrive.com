// Temporary debug function — DELETE after troubleshooting
// GET /.netlify/functions/debug-icloud-sync?tenant_id=<uuid>&uid=28035
// Uses the exact same code as poll-turo-emails to test parsing

const { ImapFlow } = require('imapflow');
const SUPABASE_URL = 'https://brwzjwbpguiignrxvjdc.supabase.co';

// ── Exact copy of production parsing code ────────────────────────────────────

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

function getImapBody(rawEmail) {
  const raw = typeof rawEmail === 'string' ? rawEmail : rawEmail.toString('utf-8');
  return extractMimeParts(raw);
}

function parseTuroDate(str) {
  const months = {
    January:'01', February:'02', March:'03', April:'04',
    May:'05', June:'06', July:'07', August:'08',
    September:'09', October:'10', November:'11', December:'12',
  };
  const m = str.match(/(\w+)\s+(\d{1,2}),\s+(\d{4})/);
  if (!m || !months[m[1]]) return null;
  return `${m[3]}-${months[m[1]]}-${String(m[2]).padStart(2, '0')}`;
}

function parseTuroEmail(body, subject, messageId) {
  const fullText = subject + ' ' + body;
  const isCancelled = /cancel/i.test(subject);
  const isModified  = /modif|updated.*trip|trip.*updated/i.test(subject);
  const isConfirmed = /cha.?ching|trip.*booked|booked.*trip/i.test(fullText);
  if (!isConfirmed && !isCancelled && !isModified) return null;
  if (isCancelled) {
    const cancelGuestMatch = body.match(/(.+?)[\u2019']s trip with your/i)
                          || body.match(/trip (?:for|with) (.+?) has been cancel/i);
    const cancelDatesMatch = body.match(/(?:from|booked from) (.+?\d{4}).+? to (.+?\d{4})/i);
    return {
      type: 'cancel', messageId,
      customer_name: cancelGuestMatch?.[1]?.trim() || null,
      pickup_date:   cancelDatesMatch ? parseTuroDate(cancelDatesMatch[1]) : null,
      return_date:   cancelDatesMatch ? parseTuroDate(cancelDatesMatch[2]) : null,
    };
  }
  const guestMatch = body.match(/Cha-?ching!\s*(.+?)[\u2019']s trip with your/i)
                  || body.match(/(.+?)[\u2019']s trip with your/i);
  if (!guestMatch) return { _fail: 'guestMatch', bodySnippet: body.slice(0, 200) };
  const vehicleMatch = body.match(/trip with your (.+?) is (?:booked|confirmed|modified)/i);
  const datesMatch   = body.match(/booked from (.+?\d{4}).+? to (.+?\d{4})/i);
  if (!datesMatch)  return { _fail: 'datesMatch', bodySnippet: body.slice(0, 200) };
  const pickupDate = parseTuroDate(datesMatch[1]);
  const returnDate = parseTuroDate(datesMatch[2]);
  if (!pickupDate) return { _fail: 'pickupDate', raw: datesMatch[1] };
  if (!returnDate) return { _fail: 'returnDate', raw: datesMatch[2] };
  const amountMatch = body.match(/You[''\u2019]ll earn \$([0-9,]+(?:\.\d{2})?)/i);
  return {
    type: isModified ? 'modify' : 'confirm', messageId,
    customer_name: guestMatch[1].trim(),
    vehicle_name:  vehicleMatch?.[1]?.trim() || '',
    pickup_date: pickupDate, return_date: returnDate,
    total_amount: amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : null,
  };
}

// ── Handler ───────────────────────────────────────────────────────────────────

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
  if (!syncs.length) return { statusCode: 404, body: 'No iCloud sync found' };
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
        // Parse a single email with the full production pipeline
        const msg     = await client.fetchOne(String(uid), { source: true }, { uid: true });
        const raw     = msg.source.toString('utf-8');
        const subject = raw.match(/^Subject:\s*(.+)$/mi)?.[1]?.trim() || '';
        const body    = getImapBody(raw);
        const parsed  = parseTuroEmail(body, subject, `icloud-${uid}`);

        result.subject     = subject;
        result.bodyLen     = body.length;
        result.bodyPreview = body.slice(0, 300);
        result.parsed      = parsed;
        // Show char codes around apostrophe area for diagnosis
        const idx = body.indexOf("'s trip");
        if (idx < 0) {
          const idx2 = body.indexOf('\u2019s trip');
          result.apostropheChar = idx2 >= 0 ? `U+2019 at ${idx2}` : 'neither found';
        } else {
          result.apostropheChar = `ASCII 0x27 at ${idx}`;
        }
      } else {
        // Bulk test: run parseTuroEmail on all Turo emails from last 30 days
        const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const uids = await client.search({ from: 'noreply@mail.turo.com', since: since30 }, { uid: true });
        result.total = uids.length;
        result.results = [];
        for (const u of uids) {
          try {
            const msg     = await client.fetchOne(String(u), { source: true }, { uid: true });
            const raw     = msg.source.toString('utf-8');
            const subject = raw.match(/^Subject:\s*(.+)$/mi)?.[1]?.trim() || '';
            const body    = getImapBody(raw);
            const parsed  = parseTuroEmail(body, subject, `icloud-${u}`);
            result.results.push({ uid: u, subject: subject.slice(0, 60), outcome: parsed ? (parsed._fail ? `FAIL:${parsed._fail}` : parsed.type) : 'null' });
          } catch (e) {
            result.results.push({ uid: u, error: e.message });
          }
        }
      }
    } finally { lock.release(); }
    await client.logout();
  } catch (err) {
    result.error = err.message;
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(result, null, 2),
  };
};
