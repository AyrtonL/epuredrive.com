// Netlify Scheduled Function — poll-turo-emails
// Runs every 15 min (configured in netlify.toml).
// For each connected Gmail account, searches for new Turo emails and upserts reservations.
// Env vars required:
//   GOOGLE_CLIENT_ID
//   GOOGLE_CLIENT_SECRET
//   SUPABASE_SERVICE_ROLE_KEY

const SUPABASE_URL     = 'https://brwzjwbpguiignrxvjdc.supabase.co';
const GMAIL_BASE       = 'https://gmail.googleapis.com/gmail/v1/users/me';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

// ── Supabase REST helpers ─────────────────────────────────────────────────────

function sbHeaders(serviceKey) {
  return {
    'apikey':        serviceKey,
    'Authorization': `Bearer ${serviceKey}`,
    'Content-Type':  'application/json',
  };
}

async function sbGet(path, serviceKey) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: sbHeaders(serviceKey) });
  if (!res.ok) throw new Error(`Supabase GET ${path} → ${res.status}: ${await res.text()}`);
  return res.json();
}

async function sbPatch(path, data, serviceKey) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method:  'PATCH',
    headers: { ...sbHeaders(serviceKey), 'Prefer': 'return=minimal' },
    body:    JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Supabase PATCH ${path} → ${res.status}: ${await res.text()}`);
}

async function sbInsert(table, row, serviceKey) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method:  'POST',
    headers: { ...sbHeaders(serviceKey), 'Prefer': 'return=minimal' },
    body:    JSON.stringify(row),
  });
  if (!res.ok) throw new Error(`Supabase INSERT ${table} → ${res.status}: ${await res.text()}`);
}

// ── Gmail API helpers ─────────────────────────────────────────────────────────

async function refreshAccessToken(sync, serviceKey) {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({
      refresh_token: sync.refresh_token,
      client_id:     process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      grant_type:    'refresh_token',
    }).toString(),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(`Token refresh failed: ${JSON.stringify(data)}`);
  }
  sync.access_token = data.access_token;
  await sbPatch(`turo_email_syncs?id=eq.${sync.id}`, { access_token: data.access_token }, serviceKey);
  return data.access_token;
}

async function gmailFetch(path, sync, serviceKey, retried = false) {
  const res = await fetch(`${GMAIL_BASE}${path}`, {
    headers: { Authorization: `Bearer ${sync.access_token}` },
  });
  if (res.status === 401 && !retried) {
    await refreshAccessToken(sync, serviceKey);
    return gmailFetch(path, sync, serviceKey, true);
  }
  if (!res.ok) throw new Error(`Gmail API ${path} → ${res.status}: ${await res.text()}`);
  return res.json();
}

// ── Email parsing helpers ─────────────────────────────────────────────────────

function getMessageBody(payload) {
  if (!payload) return '';

  // First pass: prefer text/plain anywhere in the tree
  function findPlain(p) {
    if (p.mimeType === 'text/plain' && p.body?.data) {
      return Buffer.from(p.body.data, 'base64url').toString('utf-8');
    }
    if (p.parts) {
      for (const child of p.parts) {
        const found = findPlain(child);
        if (found) return found;
      }
    }
    return null;
  }

  const plain = findPlain(payload);
  if (plain) return plain;

  // Second pass: fall back to text/html anywhere in the tree
  function findHtml(p) {
    if (p.mimeType === 'text/html' && p.body?.data) {
      return Buffer.from(p.body.data, 'base64url').toString('utf-8')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ');
    }
    if (p.parts) {
      for (const child of p.parts) {
        const found = findHtml(child);
        if (found) return found;
      }
    }
    return null;
  }

  return findHtml(payload) || '';
}

// ── IMAP raw email body extractor ────────────────────────────────────────────
// Parses a raw RFC 2822 message string and returns the best plain-text body.

function getImapBody(rawEmail) {
  const raw = typeof rawEmail === 'string' ? rawEmail : rawEmail.toString('utf-8');

  // Look for a MIME boundary
  const boundaryMatch = raw.match(/Content-Type:\s*multipart\/[^;]+;\s*boundary="([^"]+)"/i)
                     || raw.match(/Content-Type:\s*multipart\/[^;]+;\s*boundary=([^\s;]+)/i);

  if (boundaryMatch) {
    const boundary = boundaryMatch[1];
    const escaped  = boundary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts    = raw.split(new RegExp(`--${escaped}`));

    let plainText = null;
    let htmlText  = null;

    for (const part of parts) {
      const headerEnd = part.indexOf('\r\n\r\n');
      if (headerEnd < 0) continue;
      const headers = part.slice(0, headerEnd);
      let   body    = part.slice(headerEnd + 4);

      // Decode transfer encoding
      if (/Content-Transfer-Encoding:\s*quoted-printable/i.test(headers)) {
        // Decode QP escapes to raw bytes (Latin-1), then re-read as UTF-8
        // so that multi-byte sequences like =E2=80=99 (U+2019 ') come out correctly.
        const qpDecoded = body
          .replace(/=\r?\n/g, '')
          .replace(/=([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
        body = Buffer.from(qpDecoded, 'latin1').toString('utf-8');
      } else if (/Content-Transfer-Encoding:\s*base64/i.test(headers)) {
        body = Buffer.from(body.replace(/\s/g, ''), 'base64').toString('utf-8');
      }

      if (/Content-Type:\s*text\/plain/i.test(headers) && !plainText) {
        plainText = body.trim();
      } else if (/Content-Type:\s*text\/html/i.test(headers) && !htmlText) {
        htmlText = body
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      }
    }

    return plainText || htmlText || '';
  }

  // Non-MIME: body is everything after the first blank line
  const bodyStart = raw.indexOf('\r\n\r\n');
  return bodyStart >= 0 ? raw.slice(bodyStart + 4).trim() : raw.trim();
}

function parseTuroDate(str) {
  const months = {
    January:'01', February:'02', March:'03',    April:'04',
    May:'05',     June:'06',     July:'07',      August:'08',
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
    // Try to extract trip details from cancellation email for reservation matching
    const cancelGuestMatch = body.match(/(.+?)'s trip with your/i)
                          || body.match(/trip (?:for|with) (.+?) has been cancel/i);
    const cancelDatesMatch = body.match(
      /(?:from|booked from) ((?:\w+ ){1,2}\w+ \d{1,2},\s*\d{4}[^t]*?) to ((?:\w+ ){1,2}\w+ \d{1,2},\s*\d{4}[^.]*?)\./i
    );
    return {
      type:          'cancel',
      messageId,
      customer_name: cancelGuestMatch?.[1]?.trim() || null,
      pickup_date:   cancelDatesMatch ? parseTuroDate(cancelDatesMatch[1]) : null,
      return_date:   cancelDatesMatch ? parseTuroDate(cancelDatesMatch[2]) : null,
    };
  }

  const guestMatch = body.match(/Cha-?ching!\s*(.+?)[\u2019']s trip with your/i)
                  || body.match(/(.+?)[\u2019']s trip with your/i);
  if (!guestMatch) return null;

  const vehicleMatch = body.match(/trip with your (.+?) is (?:booked|confirmed|modified)/i);

  const datesMatch = body.match(
    /booked from ((?:\w+ ){1,2}\w+ \d{1,2},\s*\d{4}[^t]*?) to ((?:\w+ ){1,2}\w+ \d{1,2},\s*\d{4}[^.]*?)\./i
  );
  if (!datesMatch) return null;

  const pickupDate = parseTuroDate(datesMatch[1]);
  const returnDate = parseTuroDate(datesMatch[2]);
  if (!pickupDate || !returnDate) return null;

  const amountMatch = body.match(/You[''\u2019]ll earn \$([0-9,]+(?:\.\d{2})?)/i);

  return {
    type:          isModified ? 'modify' : 'confirm',
    messageId,
    customer_name: guestMatch[1].trim(),
    vehicle_name:  vehicleMatch?.[1]?.trim() || '',
    pickup_date:   pickupDate,
    return_date:   returnDate,
    total_amount:  amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : null,
    notes:         `Turo #${messageId}`,
    source:        'turo',
    status:        'confirmed',
  };
}

async function findCarId(tenantId, vehicleName, serviceKey) {
  if (!vehicleName) return null;
  const yearMatch       = vehicleName.match(/\b(\d{4})\b/);
  const year            = yearMatch?.[1];
  const nameWithoutYear = vehicleName.replace(/\b\d{4}\b/, '').trim().toLowerCase();

  const cars = await sbGet(
    `cars?tenant_id=eq.${tenantId}&select=id,make,model,model_full,year`,
    serviceKey
  );

  for (const car of cars) {
    const carName = `${car.make} ${car.model_full || car.model}`.toLowerCase();
    if (carName.includes(nameWithoutYear) && (!year || String(car.year) === year)) {
      return car.id;
    }
  }

  const parts = nameWithoutYear.split(/\s+/).filter(Boolean);
  for (const car of cars) {
    const carName = `${car.make} ${car.model_full || car.model}`.toLowerCase();
    if (parts.every(p => carName.includes(p))) return car.id;
  }

  return null;
}

// ── Shared email processing (cancel / upsert / dedup) ────────────────────────
// Used by both pollGmail and pollIcloud. Returns true if a reservation was touched.

async function processEmail(parsed, sync, serviceKey) {
  if (parsed.type === 'cancel') {
    let cancelMatches = [];
    if (parsed.customer_name && parsed.pickup_date) {
      cancelMatches = await sbGet(
        `reservations?tenant_id=eq.${sync.tenant_id}&customer_name=eq.${encodeURIComponent(parsed.customer_name)}&pickup_date=eq.${parsed.pickup_date}&source=eq.turo&select=id`,
        serviceKey
      );
    }
    for (const r of cancelMatches) {
      await sbPatch(`reservations?id=eq.${r.id}`, { status: 'cancelled' }, serviceKey);
    }
    if (!cancelMatches.length) {
      console.warn(`[poll-turo-emails] Cancel ${parsed.messageId}: no matching reservation found`);
    }
    return true;
  }

  const existing = await sbGet(
    `reservations?tenant_id=eq.${sync.tenant_id}&notes=like.%25Turo %23${parsed.messageId}%&select=id`,
    serviceKey
  );

  const carId            = await findCarId(sync.tenant_id, parsed.vehicle_name, serviceKey);
  const notesWithVehicle = carId
    ? parsed.notes
    : `${parsed.notes} [vehicle: ${parsed.vehicle_name || 'unknown'}]`;

  const reservationData = {
    tenant_id:     sync.tenant_id,
    car_id:        carId,
    customer_name: parsed.customer_name,
    pickup_date:   parsed.pickup_date,
    return_date:   parsed.return_date,
    total_amount:  parsed.total_amount,
    status:        parsed.status,
    source:        parsed.source,
    notes:         notesWithVehicle,
  };

  if (existing.length > 0) {
    await sbPatch(
      `reservations?id=eq.${existing[0].id}`,
      { pickup_date: parsed.pickup_date, return_date: parsed.return_date,
        total_amount: parsed.total_amount, status: parsed.status },
      serviceKey
    );
  } else {
    await sbInsert('reservations', reservationData, serviceKey);
  }

  return true;
}

// ── Provider-specific pollers ─────────────────────────────────────────────────

async function pollGmail(sync, serviceKey) {
  const checkedAt      = sync.last_checked
    ? new Date(sync.last_checked)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const afterTimestamp = Math.floor(checkedAt.getTime() / 1000);
  const query          = `from:noreply@mail.turo.com after:${afterTimestamp}`;

  const messages = [];
  let pageToken  = undefined;
  do {
    const qs         = `/messages?q=${encodeURIComponent(query)}&maxResults=50${pageToken ? `&pageToken=${pageToken}` : ''}`;
    const pageResult = await gmailFetch(qs, sync, serviceKey);
    if (pageResult.messages) messages.push(...pageResult.messages);
    pageToken = pageResult.nextPageToken;
  } while (pageToken);

  if (!messages.length) return 0;

  let synced = 0;
  for (const msg of messages) {
    try {
      const full    = await gmailFetch(`/messages/${msg.id}?format=full`, sync, serviceKey);
      const subject = full.payload?.headers?.find(h => h.name.toLowerCase() === 'subject')?.value || '';
      const body    = getMessageBody(full.payload);
      const parsed  = parseTuroEmail(body, subject, msg.id);
      if (!parsed) continue;
      await processEmail(parsed, sync, serviceKey);
      synced++;
    } catch (msgErr) {
      console.error(`[poll-turo-emails] Gmail message ${msg.id} failed:`, msgErr.message);
    }
  }
  return synced;
}

async function pollIcloud(sync, serviceKey) {
  const { ImapFlow } = require('imapflow');

  const client = new ImapFlow({
    host:   'imap.mail.me.com',
    port:   993,
    secure: true,
    auth:   { user: sync.gmail_address, pass: sync.app_specific_password },
    logger: false,
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    try {
      const checkedAt = sync.last_checked
        ? new Date(sync.last_checked)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const uids = await client.search(
        { from: 'noreply@mail.turo.com', since: checkedAt },
        { uid: true }
      );

      let synced = 0;
      for (const uid of uids) {
        try {
          const msg     = await client.fetchOne(String(uid), { source: true }, { uid: true });
          const raw     = msg.source.toString('utf-8');
          const subject = raw.match(/^Subject:\s*(.+)$/mi)?.[1]?.trim() || '';
          const body    = getImapBody(raw);
          const parsed  = parseTuroEmail(body, subject, `icloud-${uid}`);
          if (!parsed) continue;
          await processEmail(parsed, sync, serviceKey);
          synced++;
        } catch (msgErr) {
          console.error(`[poll-turo-emails] iCloud UID ${uid} failed:`, msgErr.message);
        }
      }
      return synced;
    } finally {
      lock.release();
    }
  } catch (err) {
    // Rethrow auth errors with a recognisable prefix so the handler can set active=false
    if (/authenticationfailed|invalid credentials|auth/i.test(err.message)) {
      throw new Error(`403: iCloud auth failed — ${err.message}`);
    }
    throw err;
  } finally {
    await client.logout().catch(() => {});
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

exports.handler = async () => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    console.error('[poll-turo-emails] Missing SUPABASE_SERVICE_ROLE_KEY');
    return { statusCode: 500, body: 'Missing SUPABASE_SERVICE_ROLE_KEY' };
  }

  let syncs;
  try {
    syncs = await sbGet('turo_email_syncs?active=eq.true&select=*', serviceKey);
  } catch (err) {
    console.error('[poll-turo-emails] Failed to load syncs:', err.message);
    return { statusCode: 500, body: err.message };
  }

  if (!syncs.length) {
    console.log('[poll-turo-emails] No active Gmail connections');
    return { statusCode: 200, body: JSON.stringify({ synced: 0, errors: 0 }) };
  }

  let totalSynced = 0;
  let errors      = 0;

  for (const sync of syncs) {
    try {
      const synced = sync.provider === 'icloud'
        ? await pollIcloud(sync, serviceKey)
        : await pollGmail(sync, serviceKey);

      await sbPatch(
        `turo_email_syncs?id=eq.${sync.id}`,
        { last_checked: new Date().toISOString() },
        serviceKey
      );

      totalSynced += synced;
      console.log(`[poll-turo-emails] Tenant ${sync.tenant_id} (${sync.gmail_address}) [${sync.provider || 'gmail'}]: ${synced} emails processed`);
    } catch (err) {
      console.error(`[poll-turo-emails] Sync ${sync.id} failed: ${err.message}`);
      if (/token refresh failed|403|access.?denied|insufficient.?permission|authenticationfailed/i.test(err.message)) {
        await sbPatch(`turo_email_syncs?id=eq.${sync.id}`, { active: false }, serviceKey).catch(() => {});
      }
      errors++;
    }
  }

  console.log(`[poll-turo-emails] Done: ${totalSynced} synced, ${errors} error(s)`);
  return { statusCode: 200, body: JSON.stringify({ totalSynced, errors }) };
};
