// Temporary debug function — DELETE after troubleshooting
// GET /.netlify/functions/debug-icloud-sync?tenant_id=<uuid>
// Runs full poll pipeline and reports per-email success/error

const { ImapFlow } = require('imapflow');
const SUPABASE_URL = 'https://brwzjwbpguiignrxvjdc.supabase.co';

function sbHeaders(k) {
  return { apikey: k, Authorization: `Bearer ${k}`, 'Content-Type': 'application/json' };
}
async function sbGet(path, k) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: sbHeaders(k) });
  const t = await r.text();
  if (!r.ok) throw new Error(`GET ${path} → ${r.status}: ${t}`);
  return JSON.parse(t);
}
async function sbInsert(table, row, k) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST', headers: { ...sbHeaders(k), Prefer: 'return=minimal' }, body: JSON.stringify(row),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`INSERT ${table} → ${r.status}: ${t}`);
}
async function sbPatch(path, data, k) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'PATCH', headers: { ...sbHeaders(k), Prefer: 'return=minimal' }, body: JSON.stringify(data),
  });
  if (!r.ok) throw new Error(`PATCH ${path} → ${r.status}: ${await r.text()}`);
}

function decodeMimePart(body, headers) {
  if (/Content-Transfer-Encoding:\s*quoted-printable/i.test(headers)) {
    const qp = body.replace(/=\r?\n/g, '').replace(/=([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
    return Buffer.from(qp, 'latin1').toString('utf-8');
  }
  if (/Content-Transfer-Encoding:\s*base64/i.test(headers)) {
    return Buffer.from(body.replace(/\s/g, ''), 'base64').toString('utf-8');
  }
  return body;
}
function extractMimeParts(raw) {
  const bm = raw.match(/Content-Type:\s*multipart\/[^;]+;\s*boundary="([^"]+)"/i)
          || raw.match(/Content-Type:\s*multipart\/[^;]+;\s*boundary=([^\s;]+)/i);
  if (bm) {
    const esc = bm[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = raw.split(new RegExp(`--${esc}`));
    let plain = null, html = null;
    for (const part of parts) {
      const he = part.indexOf('\r\n\r\n');
      if (he < 0) continue;
      const headers = part.slice(0, he), body = part.slice(he + 4);
      if (/Content-Type:\s*multipart\//i.test(headers)) { const n = extractMimeParts(part.trim()); if (n && !plain) plain = n; continue; }
      const d = decodeMimePart(body, headers);
      if (/Content-Type:\s*text\/plain/i.test(headers) && !plain) plain = d.trim();
      else if (/Content-Type:\s*text\/html/i.test(headers) && !html) html = d.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    }
    return plain || html || '';
  }
  const bs = raw.indexOf('\r\n\r\n');
  return bs >= 0 ? raw.slice(bs + 4).trim() : raw.trim();
}
function getImapBody(r) { return extractMimeParts(typeof r === 'string' ? r : r.toString('utf-8')); }

function parseTuroDate(str) {
  const months = { January:'01',February:'02',March:'03',April:'04',May:'05',June:'06',July:'07',August:'08',September:'09',October:'10',November:'11',December:'12' };
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
    const cg = body.match(/(.+?)[\u2019']s trip with your/i) || body.match(/trip (?:for|with) (.+?) has been cancel/i);
    const cd = body.match(/(?:from|booked from) (.+?\d{4}).+? to (.+?\d{4})/i);
    return { type:'cancel', messageId, customer_name: cg?.[1]?.trim()||null, pickup_date: cd?parseTuroDate(cd[1]):null, return_date: cd?parseTuroDate(cd[2]):null };
  }
  const gm = body.match(/Cha-?ching!\s*(.+?)[\u2019']s trip with your/i) || body.match(/(.+?)[\u2019']s trip with your/i);
  if (!gm) return null;
  const vm = body.match(/trip with your (.+?) is (?:booked|confirmed|modified)/i);
  const dm = body.match(/booked from (.+?\d{4}).+? to (.+?\d{4})/i);
  if (!dm) return null;
  const pickupDate = parseTuroDate(dm[1]), returnDate = parseTuroDate(dm[2]);
  if (!pickupDate || !returnDate) return null;
  const am = body.match(/You[''\u2019]ll earn \$([0-9,]+(?:\.\d{2})?)/i);
  return {
    type: isModified ? 'modify' : 'confirm', messageId,
    customer_name: gm[1].trim(), vehicle_name: vm?.[1]?.trim()||'',
    pickup_date: pickupDate, return_date: returnDate,
    total_amount: am ? parseFloat(am[1].replace(/,/g,'')) : null,
    notes: `Turo #${messageId}`, source: 'turo', status: 'confirmed',
  };
}

async function findCarId(tenantId, vehicleName, serviceKey) {
  if (!vehicleName) return null;
  const yearMatch = vehicleName.match(/\b(\d{4})\b/);
  const year = yearMatch?.[1];
  const nameWithoutYear = vehicleName.replace(/\b\d{4}\b/, '').trim().toLowerCase();
  const cars = await sbGet(`cars?tenant_id=eq.${tenantId}&select=id,make,model,model_full,year`, serviceKey);
  for (const car of cars) {
    const cn = `${car.make} ${car.model_full || car.model}`.toLowerCase();
    if (cn.includes(nameWithoutYear) && (!year || String(car.year) === year)) return car.id;
  }
  const parts = nameWithoutYear.split(/\s+/).filter(Boolean);
  for (const car of cars) {
    const cn = `${car.make} ${car.model_full || car.model}`.toLowerCase();
    if (parts.every(p => cn.includes(p))) return car.id;
  }
  return null;
}

exports.handler = async (event) => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return { statusCode: 500, body: 'Missing key' };
  const tenantId = event.queryStringParameters?.tenant_id;
  const dryRun   = event.queryStringParameters?.dry !== 'false'; // default dry=true
  if (!tenantId) return { statusCode: 400, body: 'Missing tenant_id' };

  const syncRes = await fetch(`${SUPABASE_URL}/rest/v1/turo_email_syncs?tenant_id=eq.${tenantId}&provider=eq.icloud&select=*`, { headers: sbHeaders(serviceKey) });
  const syncs = await syncRes.json();
  if (!syncs.length) return { statusCode: 404, body: 'No iCloud sync' };
  const sync = syncs[0];

  const client = new ImapFlow({ host: 'imap.mail.me.com', port: 993, secure: true, auth: { user: sync.gmail_address, pass: sync.app_specific_password }, logger: false });
  const result = { dryRun, emails: [] };

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    try {
      const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const allUids = await client.search({ from: 'noreply@mail.turo.com', since: since30 }, { uid: true });

      const relevantUids = [];
      for (const uid of allUids) {
        const msg = await client.fetchOne(String(uid), { envelope: true }, { uid: true });
        const subject = msg.envelope?.subject || '';
        if (/booked|cancel|modif|updated.*trip|trip.*updated/i.test(subject)) relevantUids.push(uid);
      }
      result.totalTuro = allUids.length;
      result.relevantCount = relevantUids.length;

      for (const uid of relevantUids) {
        const entry = { uid };
        try {
          const msg     = await client.fetchOne(String(uid), { source: true }, { uid: true });
          const raw     = msg.source.toString('utf-8');
          const subject = raw.match(/^Subject:\s*(.+)$/mi)?.[1]?.trim() || '';
          const body    = getImapBody(raw);
          const parsed  = parseTuroEmail(body, subject, `icloud-${uid}`);
          entry.subject = subject.slice(0, 60);
          if (!parsed) { entry.outcome = 'skip:null-parse'; result.emails.push(entry); continue; }
          entry.parsed = { type: parsed.type, customer: parsed.customer_name, pickup: parsed.pickup_date, return: parsed.return_date, amount: parsed.total_amount };

          if (!dryRun) {
            // Check existing
            const existing = await sbGet(`reservations?tenant_id=eq.${sync.tenant_id}&notes=like.%25Turo%20%23icloud-${uid}%25&select=id`, serviceKey);
            entry.existingCount = existing.length;
            if (parsed.type === 'cancel') {
              entry.outcome = 'cancel';
            } else if (existing.length > 0) {
              entry.outcome = 'update';
            } else {
              const carId = await findCarId(sync.tenant_id, parsed.vehicle_name, serviceKey);
              entry.carId = carId;
              const row = { tenant_id: sync.tenant_id, car_id: carId, customer_name: parsed.customer_name, pickup_date: parsed.pickup_date, return_date: parsed.return_date, total_amount: parsed.total_amount, status: parsed.status, source: parsed.source, notes: carId ? parsed.notes : `${parsed.notes} [vehicle: ${parsed.vehicle_name||'unknown'}]` };
              entry.insertRow = row;
              await sbInsert('reservations', row, serviceKey);
              entry.outcome = 'inserted';
            }
          } else {
            entry.outcome = 'dry-ok';
          }
        } catch (e) {
          entry.outcome = `ERROR: ${e.message}`;
        }
        result.emails.push(entry);
      }
    } finally { lock.release(); }
    await client.logout();
  } catch (err) {
    result.error = err.message;
  }

  return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(result, null, 2) };
};
