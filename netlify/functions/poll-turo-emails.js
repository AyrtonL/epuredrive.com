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

  const guestMatch = body.match(/Cha-?ching!\s*(.+?)'s trip with your/i)
                  || body.match(/(.+?)'s trip with your/i);
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

// ── Main handler ──────────────────────────────────────────────────────────────

exports.handler = async () => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey || !process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.error('[poll-turo-emails] Missing required env vars');
    return { statusCode: 500, body: 'Missing env vars' };
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
      const checkedAt      = sync.last_checked
        ? new Date(sync.last_checked)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const afterTimestamp = Math.floor(checkedAt.getTime() / 1000);
      const query          = `from:noreply@mail.turo.com after:${afterTimestamp}`;

      // Fetch all pages of matching emails
      const messages = [];
      let pageToken  = undefined;
      do {
        const qs         = `/messages?q=${encodeURIComponent(query)}&maxResults=50${pageToken ? `&pageToken=${pageToken}` : ''}`;
        const pageResult = await gmailFetch(qs, sync, serviceKey);
        if (pageResult.messages) messages.push(...pageResult.messages);
        pageToken = pageResult.nextPageToken;
      } while (pageToken);

      if (!messages.length) {
        await sbPatch(`turo_email_syncs?id=eq.${sync.id}`, { last_checked: new Date().toISOString() }, serviceKey);
        continue;
      }

      for (const msg of messages) {
        try {
          const full    = await gmailFetch(`/messages/${msg.id}?format=full`, sync, serviceKey);
          const subject = full.payload?.headers?.find(h => h.name.toLowerCase() === 'subject')?.value || '';
          const body    = getMessageBody(full.payload);

          const parsed = parseTuroEmail(body, subject, msg.id);
          if (!parsed) continue;

          if (parsed.type === 'cancel') {
            // Match by customer_name + pickup_date when available (cancel email has different messageId than booking)
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
              console.warn(`[poll-turo-emails] Cancel email ${msg.id}: no matching reservation found`);
            }
            totalSynced++;
            continue;
          }

          const existing = await sbGet(
            `reservations?tenant_id=eq.${sync.tenant_id}&notes=like.Turo %23${msg.id}%&select=id`,
            serviceKey
          );

          const carId = await findCarId(sync.tenant_id, parsed.vehicle_name, serviceKey);

          const notesWithVehicle = carId
            ? parsed.notes
            : `${parsed.notes} [vehicle: ${parsed.vehicle_name || 'unknown'}]`;

          const reservationData = {
            tenant_id:      sync.tenant_id,
            car_id:         carId,
            customer_name:  parsed.customer_name,
            pickup_date:    parsed.pickup_date,
            return_date:    parsed.return_date,
            total_amount:   parsed.total_amount,
            status:         parsed.status,
            source:         parsed.source,
            notes:          notesWithVehicle,
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

          totalSynced++;
        } catch (msgErr) {
          console.error(`[poll-turo-emails] Message ${msg.id} failed:`, msgErr.message);
        }
      }

      await sbPatch(
        `turo_email_syncs?id=eq.${sync.id}`,
        { last_checked: new Date().toISOString() },
        serviceKey
      );

      console.log(`[poll-turo-emails] Tenant ${sync.tenant_id} (${sync.gmail_address}): ${messages.length} emails processed`);
    } catch (err) {
      console.error(`[poll-turo-emails] Sync ${sync.id} failed: ${err.message}`);
      if (/token refresh failed|403|access.?denied|insufficient.?permission/i.test(err.message)) {
        await sbPatch(`turo_email_syncs?id=eq.${sync.id}`, { active: false }, serviceKey).catch(() => {});
      }
      errors++;
    }
  }

  console.log(`[poll-turo-emails] Done: ${totalSynced} synced, ${errors} error(s)`);
  return { statusCode: 200, body: JSON.stringify({ totalSynced, errors }) };
};
