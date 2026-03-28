// Netlify Scheduled Function — sync-ical-cron
// Runs every 30 min (configured in netlify.toml).
// Reads all turo_feeds rows, fetches each iCal URL, and upserts into reservations.
// Env vars required:
//   SUPABASE_SERVICE_ROLE_KEY — service_role key from Supabase → Settings → API

const SUPABASE_URL = 'https://brwzjwbpguiignrxvjdc.supabase.co';

// ── Supabase REST helpers ─────────────────────────────────────────────────────

function sbHeaders(serviceKey) {
  return {
    'apikey':        serviceKey,
    'Authorization': `Bearer ${serviceKey}`,
    'Content-Type':  'application/json',
  };
}

async function sbGet(path, serviceKey) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: sbHeaders(serviceKey),
  });
  if (!res.ok) throw new Error(`Supabase GET ${path} → ${res.status}: ${await res.text()}`);
  return res.json();
}

async function sbDelete(path, serviceKey) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method:  'DELETE',
    headers: sbHeaders(serviceKey),
  });
  if (!res.ok) throw new Error(`Supabase DELETE ${path} → ${res.status}: ${await res.text()}`);
}

async function sbInsert(table, rows, serviceKey) {
  if (!rows.length) return;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method:  'POST',
    headers: { ...sbHeaders(serviceKey), 'Prefer': 'return=minimal' },
    body:    JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`Supabase INSERT ${table} → ${res.status}: ${await res.text()}`);
}

async function sbPatch(path, data, serviceKey) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method:  'PATCH',
    headers: { ...sbHeaders(serviceKey), 'Prefer': 'return=minimal' },
    body:    JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Supabase PATCH ${path} → ${res.status}: ${await res.text()}`);
}

// ── iCal parser ───────────────────────────────────────────────────────────────
// Ported from admin/js/dashboard.js:parseIcal()
// Key difference from browser version: accepts tenantId so rows are tenant-scoped.

function parseIcal(icsText, tenantId, carId, sourceName = 'Calendar') {
  const events = [];
  const today  = new Date().toISOString().slice(0, 10);

  // RFC 5545: unfold continuation lines (CRLF/LF + whitespace)
  const unfolded = icsText.replace(/\r?\n[ \t]/g, '');
  const vevents  = unfolded.split(/BEGIN:VEVENT/i).slice(1);

  // Map sourceName to DB source values
  const src = /turo/i.test(sourceName)   ? 'turo'
            : /airbnb/i.test(sourceName) ? 'ical'
            : 'ical';

  // Convert iCal date string (with or without time) → YYYY-MM-DD
  // Handles basic format (20260322), datetime (20260322T140000Z), and offset (20260322T140000-05:00)
  const toDate = (s) => {
    const raw = s.replace(/[-:]/g, '').slice(0, 15).replace(/[TZ].*$/, '');
    return `${raw.slice(0,4)}-${raw.slice(4,6)}-${raw.slice(6,8)}`;
  };

  // Subtract one day from a YYYY-MM-DD string
  const prevDay = (d) => {
    const dt = new Date(d + 'T12:00:00');
    dt.setDate(dt.getDate() - 1);
    return dt.toISOString().slice(0, 10);
  };

  vevents.forEach(block => {
    // Get property value, ignoring TYPE/TZID params (e.g. DTSTART;VALUE=DATE:...)
    const get = (key) => {
      const m = block.match(new RegExp(`^${key}(?:;[^:]*)?:(.+)`, 'im'));
      return m ? m[1].trim() : null;
    };

    const dtstart = get('DTSTART');
    const dtend   = get('DTEND');
    if (!dtstart) return;

    const start    = toDate(dtstart);
    const isAllDay = !dtstart.includes('T');
    let   end      = dtend ? toDate(dtend) : start;

    // iCal all-day DTEND is exclusive — Turo: DTEND=20260323 means returned on 3/22
    if (isAllDay && end > start) end = prevDay(end);

    if (end < today) return; // skip past events

    const rawDesc = (get('DESCRIPTION') || '')
      .replace(/\\n/g, '\n').replace(/\\N/g, '\n')
      .replace(/\\,/g, ',').replace(/\\;/g, ';');

    const fromDesc = (...keys) => {
      for (const k of keys) {
        const m = rawDesc.match(new RegExp(k + '\\s*:?\\s*([^\\n]+)', 'i'));
        if (m) return m[1].trim();
      }
      return null;
    };

    const phone = fromDesc('Pickup Phone', 'Dropoff Phone', 'Telephone', 'Phone', 'Tel');
    const email = fromDesc('Email');
    const resId = fromDesc('Reservation Number', 'Reservation #', 'Reservation ID', 'Trip ID', 'Confirmation');

    let guestName = fromDesc('Guest', 'Guests', 'Renter', 'Traveler', 'Visitor');
    if (!guestName) {
      const raw = (get('SUMMARY') || '').trim();
      guestName = raw
        .replace(/\s*[-–]\s*(Turo|Airbnb|VRBO|Booking\.com)\b.*/i, '')
        .replace(/\b(Turo|Airbnb|VRBO)\b\s*(Reservation|Booking|Trip|Guest)?\s*/gi, '')
        .replace(/^(Reserved|Reservation|Booking|Blocked|Busy)$/i, '')
        .trim();
    }
    if (!guestName) guestName = `${sourceName} Guest`;

    const notes = resId
      ? `${sourceName} #${resId}`
      : `Imported from [${sourceName}]`;

    events.push({
      tenant_id:      tenantId,
      car_id:         carId,
      customer_name:  guestName,
      customer_email: email || '',
      customer_phone: phone || '',
      pickup_date:    start,
      return_date:    end,
      status:         'confirmed',
      source:         src,
      notes:          notes,
    });
  });

  return events;
}

// ── Main handler ──────────────────────────────────────────────────────────────

exports.handler = async () => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    console.error('[sync-ical-cron] SUPABASE_SERVICE_ROLE_KEY not set');
    return { statusCode: 500, body: 'Missing SUPABASE_SERVICE_ROLE_KEY' };
  }

  // Load all feeds across all tenants (service role bypasses RLS)
  let feeds;
  try {
    feeds = await sbGet(
      'turo_feeds?select=id,tenant_id,car_id,ical_url,source_name',
      serviceKey
    );
  } catch (err) {
    console.error('[sync-ical-cron] Failed to load feeds:', err.message);
    return { statusCode: 500, body: err.message };
  }

  if (!feeds.length) {
    console.log('[sync-ical-cron] No feeds configured — nothing to sync');
    return { statusCode: 200, body: JSON.stringify({ totalImported: 0, errors: 0 }) };
  }

  let totalImported = 0;
  let errors = 0;

  for (const feed of feeds) {
    try {
      // 1. Fetch the iCal file directly (no CORS proxy needed server-side)
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      let icsText;
      try {
        const icalRes = await fetch(feed.ical_url, {
          headers: { 'User-Agent': 'epuredrive-ical-sync/1.0' },
          redirect: 'follow',
          signal: controller.signal,
        });
        if (!icalRes.ok) throw new Error(`iCal fetch returned ${icalRes.status}`);
        icsText = await icalRes.text();
      } finally {
        clearTimeout(timeout);
      }

      const sourceName = feed.source_name || 'Calendar';

      // 2. Parse events from iCal
      const events = parseIcal(icsText, feed.tenant_id, feed.car_id, sourceName);

      // 3. Delete old ical reservations for this feed.
      //    Turo events use source='turo'; others use source='ical'.
      const isTuro = /turo/i.test(sourceName);
      if (isTuro) {
        // Delete all turo-sourced reservations for this car + tenant
        await sbDelete(
          `reservations?car_id=eq.${feed.car_id}&tenant_id=eq.${feed.tenant_id}&source=eq.turo`,
          serviceKey
        );
      } else {
        // Delete ical reservations whose notes reference this source by name (bracket pattern)
        // Sanitise sourceName: strip chars that could break the PostgREST query string
        const safeName = (sourceName).replace(/[[\]*&?%]/g, '');
        const encodedSource = encodeURIComponent(`*[${safeName}]*`);
        await sbDelete(
          `reservations?car_id=eq.${feed.car_id}&tenant_id=eq.${feed.tenant_id}&source=eq.ical&notes=ilike.${encodedSource}`,
          serviceKey
        );
      }

      // 4. Insert fresh events
      if (events.length) {
        await sbInsert('reservations', events, serviceKey);
        totalImported += events.length;
      }

      // 5. Update last_synced timestamp
      await sbPatch(
        `turo_feeds?id=eq.${feed.id}`,
        { last_synced: new Date().toISOString() },
        serviceKey
      );

      console.log(`[sync-ical-cron] Feed ${feed.id} (${sourceName}): imported ${events.length} events`);
    } catch (err) {
      // Per-feed error — log and continue with remaining feeds
      console.error(`[sync-ical-cron] Feed ${feed.id} failed: ${err.message}`);
      errors++;
    }
  }

  console.log(`[sync-ical-cron] Finished: ${totalImported} imported, ${errors} error(s)`);
  return {
    statusCode: 200,
    body: JSON.stringify({ totalImported, errors }),
  };
};
