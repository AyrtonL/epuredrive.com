/* =============================================
   éPure Drive — Admin Dashboard
   ============================================= */

const SUPABASE_URL = 'https://brwzjwbpguiignrxvjdc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_krEuIpNhJVcADIUyBXYy9g_fiXrXzV9';

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

// ---- Constants ----
const CAR_COLORS = { 1: '#3B82F6', 2: '#8B5CF6', 3: '#F59E0B', 4: '#10B981' };
const CAR_NAMES  = { 1: 'Audi Q3', 2: 'Audi A3', 3: 'Porsche Cayenne', 4: 'Volkswagen Atlas' };
const DAILY_RATES = { 1: 120, 2: 100, 3: 250, 4: 130 };

let calendar        = null;
let allReservations = [];
let allBlocked      = [];
let activeCarFilter = 'all';
let turoFeeds       = {};   // { carId: { url, lastSynced } }
let allConsignments = [];
let allExpenses     = [];

// ====================================================
//  AUTH
// ====================================================
async function checkAuth() {
  const { data } = await sb.auth.getSession();
  if (!data.session) {
    window.location.href = 'index.html';
    return false;
  }
  return true;
}

// ====================================================
//  DATA
// ====================================================
async function loadReservations() {
  const { data, error } = await sb
    .from('reservations')
    .select('*')
    .order('pickup_date', { ascending: true });
  if (!error) allReservations = data || [];
  return allReservations;
}

async function loadBlockedDates() {
  const { data, error } = await sb
    .from('blocked_dates')
    .select('*')
    .order('start_date', { ascending: true });
  if (!error) allBlocked = data || [];
  return allBlocked;
}

async function loadTuroFeeds() {
  try {
    const { data } = await sb.from('turo_feeds').select('*');
    if (data) {
      data.forEach(row => {
        turoFeeds[row.car_id] = { url: row.ical_url, lastSynced: row.last_synced, id: row.id };
      });
    }
  } catch (_) {}
}

// ====================================================
//  STATS
// ====================================================
function updateStats() {
  const today = todayStr();
  const monthStart = today.slice(0, 7) + '-01';

  const active   = allReservations.filter(r =>
    r.pickup_date <= today && r.return_date >= today && r.status !== 'cancelled'
  ).length;

  const in30 = dateAdd(today, 30);
  const upcoming = allReservations.filter(r =>
    r.pickup_date > today && r.pickup_date <= in30 && r.status !== 'cancelled'
  ).length;

  const revenue = allReservations
    .filter(r => r.pickup_date >= monthStart && r.status !== 'cancelled')
    .reduce((sum, r) => sum + (parseFloat(r.total_amount) || 0), 0);

  const total = allReservations.filter(r => r.status !== 'cancelled').length;

  document.getElementById('stat-total').textContent    = total;
  document.getElementById('stat-active').textContent   = active;
  document.getElementById('stat-upcoming').textContent = upcoming;
  document.getElementById('stat-revenue').textContent  = '$' + revenue.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

// ====================================================
//  CALENDAR
// ====================================================
function buildEvents() {
  const resEvents = allReservations
    .filter(r => r.status !== 'cancelled')
    .filter(r => activeCarFilter === 'all' || String(r.car_id) === String(activeCarFilter))
    .map(r => ({
      id: r.id,
      title: `${CAR_NAMES[r.car_id] || 'Car'} · ${r.customer_name}`,
      start: r.pickup_date + 'T' + (r.pickup_time || '10:00'),
      end:   r.return_date  + 'T' + (r.return_time  || '10:00'),
      backgroundColor: CAR_COLORS[r.car_id] || '#6B7280',
      borderColor:     CAR_COLORS[r.car_id] || '#6B7280',
      textColor: '#fff',
      extendedProps: { type: 'reservation', data: r },
    }));

  const blockEvents = allBlocked
    .filter(b => activeCarFilter === 'all' || String(b.car_id) === String(activeCarFilter))
    .map(b => ({
      id: 'block_' + b.id,
      title: `${CAR_NAMES[b.car_id] || 'Car'} · ${b.reason || 'Blocked'}`,
      start: b.start_date,
      end: dateAdd(b.end_date, 1),
      backgroundColor: '#EF4444',
      borderColor:     '#EF4444',
      textColor: '#fff',
      extendedProps: { type: 'blocked', data: b },
    }));

  return [...resEvents, ...blockEvents];
}

function initCalendar() {
  const calEl = document.getElementById('calendar');
  calendar = new FullCalendar.Calendar(calEl, {
    initialView: 'dayGridMonth',
    headerToolbar: {
      left:   'prev,next today',
      center: 'title',
      right:  'dayGridMonth,listMonth',
    },
    events: buildEvents(),
    eventClick(info) {
      const { type, data } = info.event.extendedProps;
      if (type === 'reservation') showDetail(data);
      if (type === 'blocked')     confirmDeleteBlock(data);
    },
    height: 'auto',
    fixedWeekCount: false,
    dayMaxEvents: 3,
  });
  calendar.render();
}

function refreshCalendar() {
  if (!calendar) { initCalendar(); return; }
  calendar.removeAllEvents();
  calendar.addEventSource(buildEvents());
}

// ====================================================
//  RESERVATIONS TABLE
// ====================================================
function renderTable() {
  const tbody       = document.getElementById('res-tbody');
  const search      = (document.getElementById('search-input')?.value || '').toLowerCase();
  const statusF     = document.getElementById('status-filter')?.value || '';
  const carF        = document.getElementById('car-filter')?.value || '';

  let list = allReservations.filter(r => {
    const s = search ? (
      r.customer_name.toLowerCase().includes(search) ||
      (r.customer_email || '').toLowerCase().includes(search) ||
      (r.customer_phone || '').includes(search)
    ) : true;
    const st = statusF ? r.status === statusF : true;
    const c  = carF    ? String(r.car_id) === carF : true;
    return s && st && c;
  }).sort((a, b) => a.pickup_date < b.pickup_date ? 1 : -1);

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:2.5rem 1rem">No reservations found</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(r => {
    const days = dateDiff(r.pickup_date, r.return_date);
    const statusMap = {
      pending:   'badge-yellow',
      confirmed: 'badge-blue',
      active:    'badge-green',
      completed: 'badge-gray',
      cancelled: 'badge-red',
    };
    return `
      <tr>
        <td>
          <strong>${esc(r.customer_name)}</strong><br>
          <small>${esc(r.customer_email || r.customer_phone || '—')}</small>
        </td>
        <td>
          <span class="car-dot-inline" style="background:${CAR_COLORS[r.car_id] || '#666'}"></span>
          ${CAR_NAMES[r.car_id] || '—'}
        </td>
        <td>${fmtDate(r.pickup_date)} ${r.pickup_time || '10:00'} → ${fmtDate(r.return_date)} ${r.return_time || '10:00'}</td>
        <td>${days}d</td>
        <td>${r.total_amount ? '$' + Number(r.total_amount).toLocaleString() : '—'}</td>
        <td><span class="badge ${statusMap[r.status] || 'badge-gray'}">${r.status}</span></td>
        <td><span class="source-badge source-${r.source}">${r.source}</span></td>
        <td class="actions">
          <button class="btn-icon" onclick="openEdit('${r.id}')" title="Edit">✏️</button>
          <button class="btn-icon danger" onclick="deleteReservation('${r.id}')" title="Delete">🗑️</button>
        </td>
      </tr>`;
  }).join('');
}

// ====================================================
//  ADD / EDIT RESERVATION
// ====================================================
function openAdd() {
  document.getElementById('reservation-form').reset();
  delete document.getElementById('reservation-form').dataset.editId;
  document.getElementById('modal-title').textContent = 'New Reservation';
  openModal('reservation-modal');
}

function openEdit(id) {
  const r = allReservations.find(x => x.id === id);
  if (!r) return;
  const f = document.getElementById('reservation-form');
  f.dataset.editId = id;
  document.getElementById('modal-title').textContent = 'Edit Reservation';
  document.getElementById('f-car').value      = r.car_id;
  document.getElementById('f-name').value     = r.customer_name;
  document.getElementById('f-email').value    = r.customer_email || '';
  document.getElementById('f-phone').value    = r.customer_phone || '';
  document.getElementById('f-pickup').value       = r.pickup_date;
  document.getElementById('f-pickup-time').value  = r.pickup_time || '10:00';
  document.getElementById('f-return').value       = r.return_date;
  document.getElementById('f-return-time').value  = r.return_time  || '10:00';
  document.getElementById('f-location').value = r.pickup_location || 'Aventura';
  document.getElementById('f-amount').value   = r.total_amount || '';
  document.getElementById('f-status').value   = r.status;
  document.getElementById('f-notes').value    = r.notes || '';
  openModal('reservation-modal');
}

async function saveReservation(e) {
  e.preventDefault();
  const form    = document.getElementById('reservation-form');
  const editId  = form.dataset.editId;
  const payload = {
    car_id:          parseInt(document.getElementById('f-car').value),
    customer_name:   document.getElementById('f-name').value.trim(),
    customer_email:  document.getElementById('f-email').value.trim(),
    customer_phone:  document.getElementById('f-phone').value.trim(),
    pickup_date:     document.getElementById('f-pickup').value,
    pickup_time:     document.getElementById('f-pickup-time').value || '10:00',
    return_date:     document.getElementById('f-return').value,
    return_time:     document.getElementById('f-return-time').value  || '10:00',
    pickup_location: document.getElementById('f-location').value,
    total_amount:    parseFloat(document.getElementById('f-amount').value) || null,
    status:          document.getElementById('f-status').value,
    notes:           document.getElementById('f-notes').value.trim(),
    source:          'manual',
  };

  const btn = e.submitter;
  btn.disabled = true;
  btn.textContent = 'Saving…';

  const { error } = editId
    ? await sb.from('reservations').update(payload).eq('id', editId)
    : await sb.from('reservations').insert(payload);

  if (error) { alert('Error: ' + error.message); }
  else        { closeModal('reservation-modal'); await refresh(); }

  btn.disabled = false;
  btn.textContent = 'Save Reservation';
}

async function deleteReservation(id) {
  if (!confirm('Delete this reservation? This cannot be undone.')) return;
  await sb.from('reservations').delete().eq('id', id);
  await refresh();
}

// ====================================================
//  BLOCK DATES
// ====================================================
async function saveBlockedDates(e) {
  e.preventDefault();
  const carId  = document.getElementById('b-car').value;
  const start  = document.getElementById('b-start').value;
  const end    = document.getElementById('b-end').value;
  const reason = document.getElementById('b-reason').value;

  if (end < start) { alert('End date must be after start date.'); return; }

  const rows = carId === 'all'
    ? [1, 2, 3, 4].map(id => ({ car_id: id, start_date: start, end_date: end, reason }))
    : [{ car_id: parseInt(carId), start_date: start, end_date: end, reason }];

  const btn = e.submitter;
  btn.disabled = true;
  await sb.from('blocked_dates').insert(rows);
  closeModal('block-modal');
  await refresh();
  btn.disabled = false;
}

async function confirmDeleteBlock(block) {
  if (!confirm(`Remove block "${block.reason || 'Blocked'}" for ${CAR_NAMES[block.car_id]}?`)) return;
  await sb.from('blocked_dates').delete().eq('id', block.id);
  await refresh();
}

// ====================================================
//  DETAIL MODAL
// ====================================================
function showDetail(r) {
  const days = dateDiff(r.pickup_date, r.return_date);
  const statusMap = { pending: 'badge-yellow', confirmed: 'badge-blue', active: 'badge-green', completed: 'badge-gray', cancelled: 'badge-red' };
  document.getElementById('detail-content').innerHTML = `
    <div class="detail-row"><span>Customer</span><strong>${esc(r.customer_name)}</strong></div>
    <div class="detail-row"><span>Email</span>${r.customer_email ? `<a href="mailto:${esc(r.customer_email)}">${esc(r.customer_email)}</a>` : '—'}</div>
    <div class="detail-row"><span>Phone</span>${r.customer_phone ? `<a href="tel:${esc(r.customer_phone)}">${esc(r.customer_phone)}</a>` : '—'}</div>
    <div class="detail-row"><span>Vehicle</span><strong><span class="car-dot-inline" style="background:${CAR_COLORS[r.car_id]}"></span>${CAR_NAMES[r.car_id]}</strong></div>
    <div class="detail-row"><span>Pickup</span>${fmtDateLong(r.pickup_date)} at ${r.pickup_time || '10:00'}</div>
    <div class="detail-row"><span>Return</span>${fmtDateLong(r.return_date)} at ${r.return_time || '10:00'}</div>
    <div class="detail-row"><span>Duration</span>${days} day${days !== 1 ? 's' : ''}</div>
    <div class="detail-row"><span>Location</span>${esc(r.pickup_location || 'Aventura')}</div>
    <div class="detail-row"><span>Total</span><strong>${r.total_amount ? '$' + Number(r.total_amount).toLocaleString() : '—'}</strong></div>
    <div class="detail-row"><span>Status</span><span class="badge ${statusMap[r.status] || 'badge-gray'}">${r.status}</span></div>
    <div class="detail-row"><span>Source</span><span class="source-badge source-${r.source}">${r.source}</span></div>
    ${r.notes ? `<div class="detail-row"><span>Notes</span><em style="color:var(--muted-2)">${esc(r.notes)}</em></div>` : ''}
  `;
  document.getElementById('detail-actions').innerHTML = `
    <button class="btn btn-outline" onclick="closeModal('detail-modal')">Close</button>
    <button class="btn btn-primary" onclick="closeModal('detail-modal');openEdit('${r.id}')">Edit</button>
  `;
  openModal('detail-modal');
}

// ====================================================
//  TURO SYNC
// ====================================================
function renderTuroGrid() {
  const grid = document.getElementById('turo-grid');
  grid.innerHTML = [1, 2, 3, 4].map(carId => {
    const feed = turoFeeds[carId] || {};
    const lastSync = feed.lastSynced
      ? 'Last synced: ' + new Date(feed.lastSynced).toLocaleString()
      : 'Never synced';
    return `
      <div class="turo-card">
        <div class="car-name">
          <span class="car-dot-inline" style="background:${CAR_COLORS[carId]};width:10px;height:10px;border-radius:50%;display:inline-block"></span>
          ${CAR_NAMES[carId]}
        </div>
        <div class="form-group">
          <input type="url" id="turo-url-${carId}" placeholder="https://turo.com/…/calendar.ics" value="${esc(feed.url || '')}" />
        </div>
        <div class="last-sync">${lastSync}</div>
      </div>`;
  }).join('');
}

async function syncTuro() {
  const btn = document.getElementById('sync-turo-btn');
  const status = document.getElementById('sync-status');
  btn.disabled = true;
  btn.textContent = 'Syncing…';
  status.textContent = '';

  // Save URLs to Supabase
  for (const carId of [1, 2, 3, 4]) {
    const url = document.getElementById(`turo-url-${carId}`)?.value.trim();
    if (!url) continue;

    const existing = turoFeeds[carId];
    if (existing?.id) {
      await sb.from('turo_feeds').update({ ical_url: url }).eq('id', existing.id);
    } else {
      await sb.from('turo_feeds').insert({ car_id: carId, ical_url: url });
    }

    // Fetch iCal via CORS proxy and parse
    try {
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
      const res = await fetch(proxyUrl);
      const json = await res.json();
      if (!json.contents) continue;

      const events = parseIcal(json.contents, carId);
      if (events.length) {
        // Remove old Turo entries for this car, insert fresh
        await sb.from('reservations').delete()
          .eq('car_id', carId)
          .eq('source', 'turo');
        if (events.length) await sb.from('reservations').insert(events);
      }

      await sb.from('turo_feeds')
        .update({ last_synced: new Date().toISOString() })
        .eq('car_id', carId);

      status.textContent += `✓ ${CAR_NAMES[carId]} — ${events.length} event(s) imported. `;
    } catch (err) {
      status.textContent += `✗ ${CAR_NAMES[carId]} — could not fetch. `;
    }
  }

  await loadTuroFeeds();
  renderTuroGrid();
  await refresh();
  btn.disabled = false;
  btn.textContent = 'Sync All Turo Calendars';
}

// ====================================================
//  GOOGLE CALENDAR SYNC
// ====================================================
async function syncGoogleCalendar() {
  const btn    = document.getElementById('sync-gcal-btn');
  const status = document.getElementById('gcal-status');
  const url    = document.getElementById('gcal-url')?.value.trim();
  const carId  = document.getElementById('gcal-car')?.value;

  if (!url) { status.textContent = '⚠ Paste a Google Calendar iCal URL first.'; return; }

  btn.disabled = true;
  btn.textContent = 'Syncing…';
  status.textContent = '';

  try {
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    const res  = await fetch(proxyUrl);
    const json = await res.json();
    if (!json.contents) throw new Error('Empty response from calendar URL');

    // Parse iCal — if carId is 'all', try to match car names in event titles
    const events = parseGcalIcal(json.contents, carId);

    if (!events.length) {
      status.textContent = 'No upcoming events found in this calendar.';
    } else {
      // Remove existing gcal-sourced reservations for affected cars and re-insert
      const affectedCars = [...new Set(events.map(e => e.car_id))];
      for (const cid of affectedCars) {
        await sb.from('reservations').delete().eq('car_id', cid).eq('source', 'turo');
      }
      await sb.from('reservations').insert(events);
      status.textContent = `✓ ${events.length} event(s) imported from Google Calendar.`;
    }

    await refresh();
  } catch (err) {
    status.textContent = '✗ Could not fetch calendar — check the URL and try again.';
    console.error(err);
  }

  btn.disabled = false;
  btn.textContent = 'Sync Google Calendar';
}

function parseGcalIcal(icsText, selectedCarId) {
  const events  = [];
  const today   = todayStr();
  const vevents = icsText.split('BEGIN:VEVENT').slice(1);

  // Keywords to auto-detect which car an event belongs to
  const CAR_KEYWORDS = {
    1: ['q3', 'audi q3'],
    2: ['a3', 'audi a3'],
    3: ['cayenne', 'porsche'],
    4: ['atlas', 'volkswagen', 'vw'],
  };

  vevents.forEach(block => {
    const get = (key) => {
      const m = block.match(new RegExp(key + '[^:]*:([^\\r\\n]+)'));
      return m ? m[1].trim() : null;
    };

    const dtstart  = get('DTSTART');
    const dtend    = get('DTEND');
    const summary  = get('SUMMARY') || 'Turo Reservation';
    const desc     = (get('DESCRIPTION') || '').toLowerCase();

    if (!dtstart || !dtend) return;

    const toDate = (s) => {
      const raw = s.replace(/[TZ]/g, '').slice(0, 8);
      return `${raw.slice(0,4)}-${raw.slice(4,6)}-${raw.slice(6,8)}`;
    };

    const start = toDate(dtstart);
    const end   = toDate(dtend);
    if (end < today) return;  // skip past events

    // Determine car_id
    let resolvedCar = selectedCarId !== 'all' ? parseInt(selectedCarId) : null;
    if (!resolvedCar) {
      const searchText = (summary + ' ' + desc).toLowerCase();
      for (const [cid, keywords] of Object.entries(CAR_KEYWORDS)) {
        if (keywords.some(kw => searchText.includes(kw))) {
          resolvedCar = parseInt(cid);
          break;
        }
      }
    }
    if (!resolvedCar) resolvedCar = 1; // fallback

    events.push({
      car_id:         resolvedCar,
      customer_name:  summary,
      customer_email: '',
      customer_phone: '',
      pickup_date:    start,
      return_date:    end,
      status:         'confirmed',
      source:         'turo',
      notes:          'Imported from Google Calendar',
    });
  });

  return events;
}

function parseIcal(icsText, carId) {
  const events = [];
  const vevents = icsText.split('BEGIN:VEVENT').slice(1);

  vevents.forEach(block => {
    const get = (key) => {
      const match = block.match(new RegExp(`${key}[^:]*:([^\r\n]+)`));
      return match ? match[1].trim() : null;
    };
    const dtstart = get('DTSTART');
    const dtend   = get('DTEND');
    const summary = get('SUMMARY') || 'Turo Reservation';

    if (!dtstart || !dtend) return;

    const toDate = (s) => {
      if (s.length === 8) return `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`;
      return s.slice(0, 10).replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
    };

    events.push({
      car_id:         carId,
      customer_name:  summary,
      customer_email: '',
      customer_phone: '',
      pickup_date:    toDate(dtstart),
      return_date:    toDate(dtend),
      status:         'confirmed',
      source:         'turo',
      notes:          'Imported from Turo calendar',
    });
  });

  return events;
}

// ====================================================
//  CONSIGNMENTS
// ====================================================
async function loadConsignments() {
  const { data, error } = await sb.from('consignments').select('*').order('car_id');
  if (!error) allConsignments = data || [];
}

async function loadExpenses() {
  const { data, error } = await sb.from('consignment_expenses').select('*').order('expense_date', { ascending: false });
  if (!error) allExpenses = data || [];
}

function renderConsignments() {
  const grid = document.getElementById('consignment-grid');
  if (!grid) return;

  if (!allConsignments.length) {
    grid.innerHTML = `<div class="empty-state">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
      <p>No consignments yet. Click "New Consignment" to add one.</p></div>`;
    return;
  }

  grid.innerHTML = allConsignments.map(con => {
    const ownerPct   = parseFloat(con.owner_percentage) || 70;
    const epurePct   = 100 - ownerPct;
    const color      = CAR_COLORS[con.car_id] || '#666';
    const carName    = CAR_NAMES[con.car_id]  || 'Vehicle';

    const carRevenue = allReservations
      .filter(r => r.car_id === con.car_id && r.status !== 'cancelled')
      .reduce((s, r) => s + (parseFloat(r.total_amount) || 0), 0);

    const ownerRevenue  = carRevenue * ownerPct / 100;
    const epureRevenue  = carRevenue * epurePct / 100;
    const totalExpenses = allExpenses
      .filter(e => e.car_id === con.car_id)
      .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    const netToOwner = ownerRevenue - totalExpenses;

    const contractDates = (con.contract_start && con.contract_end)
      ? `${fmtDate(con.contract_start)} — ${fmtDate(con.contract_end)}`
      : con.contract_start ? `From ${fmtDate(con.contract_start)}` : 'No contract dates set';

    return `
      <div class="consignment-card">
        <div class="consignment-header">
          <div class="consignment-car">
            <span style="width:12px;height:12px;border-radius:50%;background:${color};display:inline-block;flex-shrink:0"></span>
            ${esc(carName)}
          </div>
          <div class="actions">
            <button class="btn-icon" onclick="openEditConsignment('${con.id}')" title="Edit">✏️</button>
            <button class="btn-icon danger" onclick="deleteConsignment('${con.id}')" title="Delete">🗑️</button>
          </div>
        </div>

        <div style="margin-bottom:0.75rem;">
          <div style="font-weight:600;font-size:0.92rem;">${esc(con.owner_name)}</div>
          <div style="font-size:0.78rem;color:var(--muted);margin-top:0.2rem;">
            ${con.owner_email ? esc(con.owner_email) : ''}${con.owner_phone ? ' · ' + esc(con.owner_phone) : ''}
          </div>
        </div>

        <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:0.6rem;">
          <span class="split-pill split-owner">Owner ${ownerPct}%</span>
          <span class="split-pill split-epure">éPure ${epurePct}%</span>
        </div>

        <div style="font-size:0.75rem;color:var(--muted);">📅 ${contractDates}</div>

        <div class="consignment-stats">
          <div>
            <div class="c-stat-label">Total Revenue</div>
            <div class="c-stat-value">$${carRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
          </div>
          <div>
            <div class="c-stat-label">Owner's Share</div>
            <div class="c-stat-value" style="color:#34D399;">$${ownerRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
          </div>
          <div>
            <div class="c-stat-label">éPure's Share</div>
            <div class="c-stat-value" style="color:var(--accent);">$${epureRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
          </div>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:0.75rem;padding-top:0.75rem;border-top:1px solid var(--border);font-size:0.82rem;">
          <span style="color:var(--muted);">Expenses: <strong style="color:var(--red);">$${totalExpenses.toLocaleString('en-US', { maximumFractionDigits: 0 })}</strong></span>
          <span>Net to owner: <strong style="color:${netToOwner >= 0 ? '#34D399' : 'var(--red)'};">$${netToOwner.toLocaleString('en-US', { maximumFractionDigits: 0 })}</strong></span>
        </div>

        ${con.notes ? `<div style="margin-top:0.75rem;padding:0.6rem;background:var(--surface-2);border-radius:8px;font-size:0.75rem;color:var(--muted-2);">${esc(con.notes)}</div>` : ''}
      </div>`;
  }).join('');
}

function renderExpensesTable() {
  const tbody = document.getElementById('expenses-tbody');
  if (!tbody) return;

  const carF = document.getElementById('expense-car-filter')?.value || '';
  const catF = document.getElementById('expense-cat-filter')?.value || '';

  const list = allExpenses.filter(e => {
    const c   = carF ? String(e.car_id) === carF : true;
    const cat = catF ? e.category === catF : true;
    return c && cat;
  });

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:2.5rem">No expenses found</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(e => `
    <tr>
      <td>${fmtDate(e.expense_date)}</td>
      <td><span class="car-dot-inline" style="background:${CAR_COLORS[e.car_id] || '#666'}"></span>${CAR_NAMES[e.car_id] || '—'}</td>
      <td><span class="badge badge-gray">${esc(e.category)}</span></td>
      <td style="color:var(--muted-2);">${esc(e.description || '—')}</td>
      <td style="color:var(--red);font-weight:600;">$${Number(e.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td class="actions">
        <button class="btn-icon danger" onclick="deleteExpense('${e.id}')" title="Delete">🗑️</button>
      </td>
    </tr>`).join('');
}

function openAddConsignment() {
  document.getElementById('consignment-form').reset();
  delete document.getElementById('consignment-form').dataset.editId;
  document.getElementById('consignment-modal-title').textContent = 'New Consignment';
  document.getElementById('con-epure-pct').textContent = '30%';
  openModal('consignment-modal');
}

function openEditConsignment(id) {
  const c = allConsignments.find(x => x.id === id);
  if (!c) return;
  const f = document.getElementById('consignment-form');
  f.dataset.editId = id;
  document.getElementById('consignment-modal-title').textContent = 'Edit Consignment';
  document.getElementById('con-car').value   = c.car_id;
  document.getElementById('con-owner').value = c.owner_name;
  document.getElementById('con-email').value = c.owner_email || '';
  document.getElementById('con-phone').value = c.owner_phone || '';
  document.getElementById('con-pct').value   = c.owner_percentage;
  document.getElementById('con-epure-pct').textContent =
    (100 - parseFloat(c.owner_percentage)).toFixed(1).replace(/\.0$/, '') + '%';
  document.getElementById('con-start').value = c.contract_start || '';
  document.getElementById('con-end').value   = c.contract_end   || '';
  document.getElementById('con-notes').value = c.notes          || '';
  openModal('consignment-modal');
}

async function saveConsignment(e) {
  e.preventDefault();
  const form   = document.getElementById('consignment-form');
  const editId = form.dataset.editId;
  const payload = {
    car_id:           parseInt(document.getElementById('con-car').value),
    owner_name:       document.getElementById('con-owner').value.trim(),
    owner_email:      document.getElementById('con-email').value.trim(),
    owner_phone:      document.getElementById('con-phone').value.trim(),
    owner_percentage: parseFloat(document.getElementById('con-pct').value),
    contract_start:   document.getElementById('con-start').value || null,
    contract_end:     document.getElementById('con-end').value   || null,
    notes:            document.getElementById('con-notes').value.trim(),
  };
  const btn = e.submitter;
  btn.disabled = true; btn.textContent = 'Saving…';
  const { error } = editId
    ? await sb.from('consignments').update(payload).eq('id', editId)
    : await sb.from('consignments').insert(payload);
  if (error) { alert('Error: ' + error.message); }
  else { closeModal('consignment-modal'); await loadConsignments(); renderConsignments(); }
  btn.disabled = false; btn.textContent = 'Save Consignment';
}

async function deleteConsignment(id) {
  if (!confirm('Delete this consignment? This cannot be undone.')) return;
  await sb.from('consignments').delete().eq('id', id);
  await loadConsignments();
  renderConsignments();
}

function openAddExpense(carId) {
  document.getElementById('expense-form').reset();
  delete document.getElementById('expense-form').dataset.editId;
  document.getElementById('expense-modal-title').textContent = 'Add Expense';
  document.getElementById('exp-date').value = todayStr();
  if (carId) document.getElementById('exp-car').value = carId;
  openModal('expense-modal');
}

async function saveExpense(e) {
  e.preventDefault();
  const form    = document.getElementById('expense-form');
  const editId  = form.dataset.editId;
  const carId   = parseInt(document.getElementById('exp-car').value);
  const consignment = allConsignments.find(c => c.car_id === carId);
  const payload = {
    consignment_id: consignment?.id || null,
    car_id:         carId,
    expense_date:   document.getElementById('exp-date').value,
    category:       document.getElementById('exp-cat').value,
    amount:         parseFloat(document.getElementById('exp-amount').value),
    description:    document.getElementById('exp-desc').value.trim(),
  };
  const btn = e.submitter;
  btn.disabled = true; btn.textContent = 'Saving…';
  const { error } = editId
    ? await sb.from('consignment_expenses').update(payload).eq('id', editId)
    : await sb.from('consignment_expenses').insert(payload);
  if (error) { alert('Error: ' + error.message); }
  else { closeModal('expense-modal'); await loadExpenses(); renderExpensesTable(); renderConsignments(); }
  btn.disabled = false; btn.textContent = 'Save Expense';
}

async function deleteExpense(id) {
  if (!confirm('Delete this expense?')) return;
  await sb.from('consignment_expenses').delete().eq('id', id);
  await loadExpenses();
  renderExpensesTable();
  renderConsignments();
}

// ====================================================
//  TABS
// ====================================================
const TAB_TITLES = {
  main:         'Dashboard Overview',
  calendar:     'Calendar &amp; Availability',
  reservations: 'All Reservations',
  turo:         'Calendar Sync',
  consignments: 'Consignment Contracts',
};

function switchTab(tab) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  document.querySelector(`.nav-item[data-tab="${tab}"]`).classList.add('active');
  document.getElementById('topbar-title').innerHTML = TAB_TITLES[tab];
  if (tab === 'calendar' && calendar) calendar.updateSize();
  if (tab === 'turo') renderTuroGrid();
  if (tab === 'consignments') { renderConsignments(); renderExpensesTable(); }
}

// ====================================================
//  HELPERS
// ====================================================
function todayStr() {
  return new Date().toISOString().split('T')[0];
}
function dateAdd(dateStr, days = 1) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}
function dateDiff(start, end) {
  return Math.round((new Date(end) - new Date(start)) / 86400000);
}
function fmtDate(d) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function fmtDateLong(d) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });
}
function esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function openModal(id)  { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

// ====================================================
//  AUTO-CALCULATE AMOUNT
// ====================================================
function autoCalc() {
  const pickup = document.getElementById('f-pickup').value;
  const ret    = document.getElementById('f-return').value;
  const carId  = parseInt(document.getElementById('f-car').value);
  if (pickup && ret && carId) {
    const days = dateDiff(pickup, ret);
    if (days > 0) document.getElementById('f-amount').value = days * (DAILY_RATES[carId] || 0);
  }
}

// ====================================================
//  REFRESH (reload all data + redraw)
// ====================================================
async function refresh() {
  await Promise.all([loadReservations(), loadBlockedDates()]);
  updateStats();
  renderTable();
  refreshCalendar();
  renderConsignments(); // re-render cards with updated revenue totals
}

// ====================================================
//  INIT
// ====================================================
window.addEventListener('DOMContentLoaded', async () => {
  if (!(await checkAuth())) return;

  await Promise.all([loadReservations(), loadBlockedDates(), loadTuroFeeds(), loadConsignments(), loadExpenses()]);

  updateStats();
  initCalendar();
  renderTable();

  // Sidebar tabs
  document.querySelectorAll('.nav-item[data-tab]').forEach(btn =>
    btn.addEventListener('click', () => switchTab(btn.dataset.tab))
  );

  // Car filter buttons
  document.querySelectorAll('[data-car-filter]').forEach(btn =>
    btn.addEventListener('click', () => {
      activeCarFilter = btn.dataset.carFilter;
      document.querySelectorAll('[data-car-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      refreshCalendar();
    })
  );

  // Topbar buttons
  document.getElementById('add-res-btn').addEventListener('click', openAdd);
  document.getElementById('block-btn').addEventListener('click', () => openModal('block-modal'));
  document.getElementById('logout-btn').addEventListener('click', async () => {
    await sb.auth.signOut();
    window.location.href = 'index.html';
  });

  // Forms
  document.getElementById('reservation-form').addEventListener('submit', saveReservation);
  document.getElementById('block-form').addEventListener('submit', saveBlockedDates);

  // Auto-calc on date/car change
  ['f-pickup', 'f-pickup-time', 'f-return', 'f-return-time', 'f-car'].forEach(id =>
    document.getElementById(id)?.addEventListener('change', autoCalc)
  );

  // Table filters
  document.getElementById('search-input')?.addEventListener('input', renderTable);
  document.getElementById('status-filter')?.addEventListener('change', renderTable);
  document.getElementById('car-filter')?.addEventListener('change', renderTable);

  // Calendar sync buttons
  document.getElementById('sync-turo-btn').addEventListener('click', syncTuro);
  document.getElementById('sync-gcal-btn').addEventListener('click', syncGoogleCalendar);

  // Consignments
  document.getElementById('add-consignment-btn')?.addEventListener('click', openAddConsignment);
  document.getElementById('add-expense-btn')?.addEventListener('click', () => openAddExpense());
  document.getElementById('consignment-form')?.addEventListener('submit', saveConsignment);
  document.getElementById('expense-form')?.addEventListener('submit', saveExpense);
  document.getElementById('expense-car-filter')?.addEventListener('change', renderExpensesTable);
  document.getElementById('expense-cat-filter')?.addEventListener('change', renderExpensesTable);
  document.getElementById('con-pct')?.addEventListener('input', () => {
    const pct = parseFloat(document.getElementById('con-pct').value) || 0;
    document.getElementById('con-epure-pct').textContent =
      (100 - pct).toFixed(1).replace(/\.0$/, '') + '%';
  });

  // Close modals on backdrop click
  document.querySelectorAll('.modal').forEach(modal =>
    modal.addEventListener('click', e => { if (e.target === modal) closeModal(modal.id); })
  );
});
