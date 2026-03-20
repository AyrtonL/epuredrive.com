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
let allCars         = [];   // rows from cars table (with extra detail columns)
let allServices     = [];   // rows from car_services
let allCustomers    = [];   // rows from customers table

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
//  CUSTOMERS
// ====================================================
async function loadCustomers() {
  const { data, error } = await sb.from('customers').select('*').order('name');
  if (!error) allCustomers = data || [];
}

function renderCustomers() {
  const tbody  = document.getElementById('customers-tbody');
  if (!tbody) return;
  const search = (document.getElementById('customer-search')?.value || '').toLowerCase();

  const list = allCustomers.filter(c =>
    !search ||
    c.name.toLowerCase().includes(search) ||
    (c.email || '').toLowerCase().includes(search) ||
    (c.phone || '').includes(search)
  );

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:2.5rem">No customers found</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(c => {
    const bookings = allReservations.filter(r =>
      r.customer_email === c.email || r.customer_phone === c.phone || r.customer_name === c.name
    );
    const spent = bookings.reduce((s, r) => s + (parseFloat(r.total_amount) || 0), 0);
    return `
      <tr>
        <td><strong>${esc(c.name)}</strong></td>
        <td>${c.email ? `<a href="mailto:${esc(c.email)}" style="color:var(--accent)">${esc(c.email)}</a>` : '—'}</td>
        <td>${c.phone ? `<a href="tel:${esc(c.phone)}" style="color:var(--accent)">${esc(c.phone)}</a>` : '—'}</td>
        <td style="color:var(--muted-2);font-size:0.82rem;">${esc(c.address || '—')}</td>
        <td style="text-align:center;">${bookings.length}</td>
        <td style="font-weight:600;">${spent > 0 ? '$' + spent.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '—'}</td>
        <td style="color:var(--muted-2);max-width:160px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(c.notes || '—')}</td>
        <td class="actions">
          <button class="btn-icon" onclick="openEditCustomer('${c.id}')" title="Edit">✏️</button>
          <button class="btn-icon danger" onclick="deleteCustomer('${c.id}')" title="Delete">🗑️</button>
        </td>
      </tr>`;
  }).join('');
}

function openAddCustomer() {
  document.getElementById('customer-form').reset();
  delete document.getElementById('customer-form').dataset.editId;
  document.getElementById('customer-modal-title').textContent = 'New Customer';
  openModal('customer-modal');
}

function openEditCustomer(id) {
  const c = allCustomers.find(x => x.id === id);
  if (!c) return;
  const form = document.getElementById('customer-form');
  form.dataset.editId = id;
  document.getElementById('customer-modal-title').textContent = 'Edit Customer';
  document.getElementById('cust-name').value    = c.name;
  document.getElementById('cust-email').value   = c.email    || '';
  document.getElementById('cust-phone').value   = c.phone    || '';
  document.getElementById('cust-address').value = c.address  || '';
  document.getElementById('cust-notes').value   = c.notes    || '';
  openModal('customer-modal');
}

async function saveCustomer(e) {
  e.preventDefault();
  const form   = document.getElementById('customer-form');
  const editId = form.dataset.editId;
  const payload = {
    name:       document.getElementById('cust-name').value.trim(),
    email:      document.getElementById('cust-email').value.trim(),
    phone:      document.getElementById('cust-phone').value.trim(),
    address:    document.getElementById('cust-address').value.trim(),
    notes:      document.getElementById('cust-notes').value.trim(),
  };
  const btn = e.submitter;
  btn.disabled = true; btn.textContent = 'Saving…';
  const { error } = editId
    ? await sb.from('customers').update(payload).eq('id', editId)
    : await sb.from('customers').insert(payload);
  if (error) { alert('Error: ' + error.message); }
  else { closeModal('customer-modal'); await loadCustomers(); renderCustomers(); }
  btn.disabled = false; btn.textContent = 'Save Customer';
}

async function deleteCustomer(id) {
  if (!confirm('Delete this customer?')) return;
  await sb.from('customers').delete().eq('id', id);
  await loadCustomers();
  renderCustomers();
}

// ====================================================
//  REPORTS
// ====================================================
function renderReports() {
  const tbody = document.getElementById('revenue-tbody');
  if (!tbody) return;

  const fromVal = document.getElementById('report-from')?.value || '';
  const toVal   = document.getElementById('report-to')?.value   || '';
  const carVal  = document.getElementById('report-car')?.value  || '';

  const filtered = allReservations.filter(r => {
    if (r.status === 'cancelled') return false;
    if (fromVal && r.pickup_date < fromVal) return false;
    if (toVal   && r.pickup_date > toVal)   return false;
    if (carVal  && String(r.car_id) !== carVal) return false;
    return true;
  });

  const totalRevenue = filtered.reduce((s, r) => s + (parseFloat(r.total_amount) || 0), 0);

  const carIds = carVal ? [parseInt(carVal)] : [1, 2, 3, 4];
  const rows = carIds.map(id => {
    const bookings = filtered.filter(r => r.car_id === id);
    const revenue  = bookings.reduce((s, r) => s + (parseFloat(r.total_amount) || 0), 0);
    const avg      = bookings.length ? revenue / bookings.length : 0;
    const pct      = totalRevenue > 0 ? (revenue / totalRevenue * 100) : 0;
    return { id, bookings: bookings.length, revenue, avg, pct };
  });

  tbody.innerHTML = rows.map(r => `
    <tr>
      <td><span class="car-dot-inline" style="background:${CAR_COLORS[r.id]}"></span><strong>${CAR_NAMES[r.id]}</strong></td>
      <td style="text-align:center;">${r.bookings}</td>
      <td style="font-weight:600;">$${r.revenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
      <td style="color:var(--muted-2);">$${r.avg.toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
      <td>
        <div style="display:flex;align-items:center;gap:0.5rem;">
          <div style="flex:1;height:6px;background:var(--surface-3);border-radius:3px;overflow:hidden;">
            <div style="width:${r.pct.toFixed(1)}%;height:100%;background:${CAR_COLORS[r.id]};border-radius:3px;"></div>
          </div>
          <span style="font-size:0.75rem;color:var(--muted-2);min-width:35px;">${r.pct.toFixed(1)}%</span>
        </div>
      </td>
    </tr>`).join('');

  // Update summary label
  const summary = document.getElementById('report-summary');
  if (summary) {
    const parts = [];
    if (fromVal || toVal) parts.push((fromVal || '…') + ' → ' + (toVal || '…'));
    if (carVal) parts.push(CAR_NAMES[parseInt(carVal)]);
    summary.textContent = parts.length
      ? filtered.length + ' bookings · $' + totalRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 }) + ' · ' + parts.join(', ')
      : filtered.length + ' bookings · $' + totalRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 });
  }

  if (typeof Chart !== 'undefined') {
    refreshCharts(filtered);
  }
}

function refreshCharts(data) {
  const source = data || allReservations.filter(r => r.status !== 'cancelled');

  // Revenue by month (last 6 months)
  const months = [];
  const revenues = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const ym    = d.toISOString().slice(0, 7);
    const label = d.toLocaleDateString('en-US', { month: 'short' });
    const rev   = source
      .filter(r => r.pickup_date?.startsWith(ym))
      .reduce((s, r) => s + (parseFloat(r.total_amount) || 0), 0);
    months.push(label);
    revenues.push(rev);
  }

  if (window._trendChart) {
    window._trendChart.data.labels = months;
    window._trendChart.data.datasets[0].data = revenues;
    window._trendChart.update();
  }

  // Distribution by car bookings
  const carBookings = [1, 2, 3, 4].map(id => source.filter(r => r.car_id === id).length);
  if (window._distChart) {
    window._distChart.data.datasets[0].data = carBookings;
    window._distChart.data.labels = [1, 2, 3, 4].map(id => CAR_NAMES[id]);
    window._distChart.data.datasets[0].backgroundColor = [1, 2, 3, 4].map(id => CAR_COLORS[id]);
    window._distChart.update();
  }
}

// ====================================================
//  DASHBOARD RECENT BOOKINGS
// ====================================================
function renderRecentBookings() {
  const el = document.getElementById('recent-bookings-list');
  if (!el) return;
  const recent = [...allReservations]
    .filter(r => r.status !== 'cancelled')
    .sort((a, b) => b.pickup_date < a.pickup_date ? -1 : 1)
    .slice(0, 6);
  if (!recent.length) {
    el.innerHTML = `<div style="text-align:center;color:var(--muted);padding:2rem;font-size:0.85rem;">No bookings yet.</div>`;
    return;
  }
  const statusMap = { pending: 'badge-yellow', confirmed: 'badge-blue', active: 'badge-green', completed: 'badge-gray', cancelled: 'badge-red' };
  el.innerHTML = recent.map(r => `
    <div class="booking-row">
      <div>
        <div class="b-customer">${esc(r.customer_name)}</div>
        <div class="b-car">
          <span class="car-dot-inline" style="background:${CAR_COLORS[r.car_id]}"></span>
          ${CAR_NAMES[r.car_id]} · ${fmtDate(r.pickup_date)} → ${fmtDate(r.return_date)}
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:1rem;">
        <span class="badge ${statusMap[r.status] || 'badge-gray'}">${r.status}</span>
        <span class="b-price">${r.total_amount ? '$' + Number(r.total_amount).toLocaleString() : '—'}</span>
      </div>
    </div>`).join('');
}

// ====================================================
//  MAINTENANCE ALERTS
// ====================================================
function renderMaintenanceAlerts() {
  const el = document.getElementById('maintenance-alerts');
  if (!el) return;
  const upcoming = allServices.filter(s => {
    if (!s.next_service_date) return false;
    return expiryClass(s.next_service_date) !== 'expiry-ok';
  });
  if (!upcoming.length) { el.innerHTML = ''; return; }
  el.innerHTML = upcoming.map(s => {
    const cls = expiryClass(s.next_service_date);
    const color = cls === 'expiry-danger' ? 'var(--red)' : '#FCD34D';
    return `<div style="background:rgba(255,255,255,0.04);border:1px solid ${color};border-radius:10px;padding:0.75rem 1rem;margin-bottom:0.5rem;font-size:0.82rem;display:flex;align-items:center;gap:0.75rem;">
      <span style="color:${color};font-size:1rem;">⚠</span>
      <span><strong>${CAR_NAMES[s.car_id]}</strong> — ${esc(s.service_type)} due <strong style="color:${color};">${fmtDate(s.next_service_date)}</strong>${s.provider ? ' at ' + esc(s.provider) : ''}</span>
    </div>`;
  }).join('');
}

// ====================================================
//  CARS & MAINTENANCE
// ====================================================
async function loadCars() {
  const { data, error } = await sb.from('cars').select('*').order('id');
  if (!error) allCars = data || [];
}

async function loadServices() {
  const { data, error } = await sb.from('car_services').select('*').order('service_date', { ascending: false });
  if (!error) allServices = data || [];
}

function expiryClass(dateStr) {
  if (!dateStr) return '';
  const today = new Date(todayStr());
  const d     = new Date(dateStr + 'T12:00:00');
  const days  = Math.round((d - today) / 86400000);
  if (days < 0)  return 'expiry-danger';
  if (days < 30) return 'expiry-warn';
  return 'expiry-ok';
}

function expiryLabel(dateStr) {
  if (!dateStr) return '—';
  const today = new Date(todayStr());
  const d     = new Date(dateStr + 'T12:00:00');
  const days  = Math.round((d - today) / 86400000);
  const base  = fmtDate(dateStr);
  if (days < 0)  return `${base} ⚠ Expired`;
  if (days < 30) return `${base} (${days}d left)`;
  return base;
}

const SVC_BADGE = {
  'Oil Change':    'svc-oil',
  'Tire Rotation': 'svc-tire',
  'Brake Service': 'svc-brake',
  'Detailing':     'svc-detail',
  'Inspection':    'svc-inspection',
  'Repair':        'svc-repair',
  'Other':         'svc-other',
};

function renderCarCards() {
  const tbody = document.getElementById('cars-tbody');
  if (!tbody) return;

  const rows = [1, 2, 3, 4].map(id => {
    const db  = allCars.find(c => c.id === id) || {};
    const car = { id, name: CAR_NAMES[id], color: CAR_COLORS[id], ...db };
    const insClass = expiryClass(car.insurance_expiry);
    const regClass = expiryClass(car.registration_expiry);
    return `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:0.5rem;">
            <span style="width:10px;height:10px;border-radius:50%;background:${car.color};flex-shrink:0;display:inline-block"></span>
            <strong>${esc(car.name)}</strong>
          </div>
        </td>
        <td>${car.year || '—'}</td>
        <td>${esc(car.car_color || '—')}</td>
        <td>${esc(car.plate || '—')}</td>
        <td style="font-size:0.75rem;color:var(--muted-2);">${esc(car.vin || '—')}</td>
        <td>${car.mileage ? Number(car.mileage).toLocaleString() + ' mi' : '—'}</td>
        <td><span class="${insClass}">${expiryLabel(car.insurance_expiry)}</span></td>
        <td><span class="${regClass}">${expiryLabel(car.registration_expiry)}</span></td>
        <td>$${car.daily_rate || DAILY_RATES[id] || '—'}/day</td>
        <td class="actions">
          <button class="btn-icon" onclick="openEditCar(${car.id})" title="Edit">✏️</button>
          <button class="btn-icon" onclick="openAddService(${car.id})" title="Add Service">🔧</button>
        </td>
      </tr>`;
  });

  tbody.innerHTML = rows.join('');
}

function renderFleetStatus() {
  const tbody = document.getElementById('fleet-status-tbody');
  if (!tbody) return;

  tbody.innerHTML = [1, 2, 3, 4].map(id => {
    const db       = allCars.find(c => c.id === id) || {};
    const car      = { id, name: CAR_NAMES[id], color: CAR_COLORS[id], ...db };
    const lastSvc  = allServices.find(s => s.car_id === id);
    const nextSvc  = allServices
      .filter(s => s.car_id === id && s.next_service_date)
      .sort((a, b) => a.next_service_date.localeCompare(b.next_service_date))[0];
    const nextCls  = nextSvc ? expiryClass(nextSvc.next_service_date) : '';
    return `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:0.5rem;">
            <span style="width:10px;height:10px;border-radius:50%;background:${car.color};flex-shrink:0;display:inline-block"></span>
            <strong>${esc(car.name)}</strong>
          </div>
        </td>
        <td>${lastSvc ? fmtDate(lastSvc.service_date) + ' · <span style="color:var(--muted-2);">' + esc(lastSvc.service_type) + '</span>' : '<span style="color:var(--muted);">None</span>'}</td>
        <td>${car.mileage ? Number(car.mileage).toLocaleString() + ' mi' : '—'}</td>
        <td>${nextSvc ? '<span class="' + nextCls + '">' + fmtDate(nextSvc.next_service_date) + ' · ' + esc(nextSvc.service_type) + '</span>' : '<span style="color:var(--muted);">—</span>'}</td>
        <td class="actions">
          <button class="btn btn-outline" style="font-size:0.75rem;padding:0.4rem 0.75rem;" onclick="openAddService(${id})">+ Add Service</button>
        </td>
      </tr>`;
  }).join('');
}

function renderServicesTable() {
  const tbody = document.getElementById('services-tbody');
  if (!tbody) return;

  const carF  = document.getElementById('service-car-filter')?.value  || '';
  const typeF = document.getElementById('service-type-filter')?.value || '';

  const list = allServices.filter(s => {
    const c = carF  ? String(s.car_id) === carF : true;
    const t = typeF ? s.service_type === typeF  : true;
    return c && t;
  });

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:var(--muted);padding:2.5rem">No service records found</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(s => `
    <tr>
      <td>${fmtDate(s.service_date)}</td>
      <td><span class="car-dot-inline" style="background:${CAR_COLORS[s.car_id] || '#666'}"></span>${CAR_NAMES[s.car_id] || '—'}</td>
      <td><span class="service-type-badge ${SVC_BADGE[s.service_type] || 'svc-other'}">${esc(s.service_type)}</span></td>
      <td>${s.mileage ? Number(s.mileage).toLocaleString() + ' mi' : '—'}</td>
      <td style="color:var(--muted-2);">${esc(s.provider || '—')}</td>
      <td style="color:var(--red);font-weight:600;">${s.cost ? '$' + Number(s.cost).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '—'}</td>
      <td>${s.next_service_date ? `<strong class="${expiryClass(s.next_service_date)}">${fmtDate(s.next_service_date)}</strong>` : '—'}</td>
      <td style="color:var(--muted-2);max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(s.notes || '—')}</td>
      <td class="actions">
        <button class="btn-icon" onclick="openEditService('${s.id}')" title="Edit">✏️</button>
        <button class="btn-icon danger" onclick="deleteService('${s.id}')" title="Delete">🗑️</button>
      </td>
    </tr>`).join('');
}

function openEditCar(id) {
  const car = allCars.find(c => c.id === id) || { id };
  const form = document.getElementById('car-form');
  form.dataset.carId = id;
  document.getElementById('car-modal-title').textContent = `Edit — ${CAR_NAMES[id]}`;
  document.getElementById('car-year').value         = car.year              || '';
  document.getElementById('car-color').value        = car.car_color         || '';
  document.getElementById('car-plate').value        = car.plate             || '';
  document.getElementById('car-vin').value          = car.vin               || '';
  document.getElementById('car-mileage').value      = car.mileage           || '';
  document.getElementById('car-rate').value         = car.daily_rate        || DAILY_RATES[id] || '';
  document.getElementById('car-insurance').value    = car.insurance_expiry  || '';
  document.getElementById('car-registration').value = car.registration_expiry || '';
  document.getElementById('car-notes').value        = car.notes             || '';
  openModal('car-modal');
}

async function saveCar(e) {
  e.preventDefault();
  const carId = parseInt(document.getElementById('car-form').dataset.carId);
  const payload = {
    year:                  parseInt(document.getElementById('car-year').value)     || null,
    car_color:             document.getElementById('car-color').value.trim(),
    plate:                 document.getElementById('car-plate').value.trim(),
    vin:                   document.getElementById('car-vin').value.trim(),
    mileage:               parseInt(document.getElementById('car-mileage').value)  || null,
    daily_rate:            parseFloat(document.getElementById('car-rate').value)   || null,
    insurance_expiry:      document.getElementById('car-insurance').value          || null,
    registration_expiry:   document.getElementById('car-registration').value       || null,
    notes:                 document.getElementById('car-notes').value.trim(),
  };
  const btn = e.submitter;
  btn.disabled = true; btn.textContent = 'Saving…';

  // Upsert: update if row exists, insert if not
  const existing = allCars.find(c => c.id === carId);
  const { error } = existing
    ? await sb.from('cars').update(payload).eq('id', carId)
    : await sb.from('cars').insert({ id: carId, ...payload });

  if (error) { alert('Error: ' + error.message); }
  else { closeModal('car-modal'); await loadCars(); renderCarCards(); }
  btn.disabled = false; btn.textContent = 'Save Details';
}

function openAddService(carId) {
  document.getElementById('service-form').reset();
  delete document.getElementById('service-form').dataset.editId;
  document.getElementById('service-modal-title').textContent = 'Add Service Record';
  document.getElementById('svc-date').value = todayStr();
  if (carId) document.getElementById('svc-car').value = carId;
  openModal('service-modal');
}

function openEditService(id) {
  const s = allServices.find(x => x.id === id);
  if (!s) return;
  const form = document.getElementById('service-form');
  form.dataset.editId = id;
  document.getElementById('service-modal-title').textContent = 'Edit Service Record';
  document.getElementById('svc-car').value      = s.car_id;
  document.getElementById('svc-date').value     = s.service_date;
  document.getElementById('svc-type').value     = s.service_type;
  document.getElementById('svc-mileage').value  = s.mileage  || '';
  document.getElementById('svc-cost').value     = s.cost     || '';
  document.getElementById('svc-provider').value = s.provider || '';
  document.getElementById('svc-next').value     = s.next_service_date || '';
  document.getElementById('svc-notes').value    = s.notes   || '';
  openModal('service-modal');
}

async function saveService(e) {
  e.preventDefault();
  const form   = document.getElementById('service-form');
  const editId = form.dataset.editId;
  const payload = {
    car_id:            parseInt(document.getElementById('svc-car').value),
    service_date:      document.getElementById('svc-date').value,
    service_type:      document.getElementById('svc-type').value,
    mileage:           parseInt(document.getElementById('svc-mileage').value)  || null,
    cost:              parseFloat(document.getElementById('svc-cost').value)   || null,
    provider:          document.getElementById('svc-provider').value.trim(),
    next_service_date: document.getElementById('svc-next').value               || null,
    notes:             document.getElementById('svc-notes').value.trim(),
  };
  const btn = e.submitter;
  btn.disabled = true; btn.textContent = 'Saving…';
  const { error } = editId
    ? await sb.from('car_services').update(payload).eq('id', editId)
    : await sb.from('car_services').insert(payload);
  if (error) { alert('Error: ' + error.message); }
  else { closeModal('service-modal'); await loadServices(); renderFleetStatus(); renderServicesTable(); renderCarCards(); }
  btn.disabled = false; btn.textContent = 'Save Record';
}

async function deleteService(id) {
  if (!confirm('Delete this service record?')) return;
  await sb.from('car_services').delete().eq('id', id);
  await loadServices();
  renderFleetStatus();
  renderServicesTable();
  renderCarCards();
}

// ====================================================
//  TABS
// ====================================================
const TAB_TITLES = {
  main:         'Dashboard Overview',
  bookings:     'Bookings',
  cars:         'Fleet Vehicles',
  maintenance:  'Maintenance &amp; Service',
  customers:    'Customers',
  consignments: 'Consignments',
  reports:      'Reports &amp; Analytics',
  turo:         'Calendar Sync',
};

function switchTab(tab) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  document.querySelector(`.nav-item[data-tab="${tab}"]`).classList.add('active');
  document.getElementById('topbar-title').innerHTML = TAB_TITLES[tab];
  if (tab === 'bookings' && calendar) calendar.updateSize();
  if (tab === 'turo') renderTuroGrid();
  if (tab === 'consignments') { renderConsignments(); renderExpensesTable(); }
  if (tab === 'cars') renderCarCards();
  if (tab === 'maintenance') { renderFleetStatus(); renderServicesTable(); renderMaintenanceAlerts(); }
  if (tab === 'customers') renderCustomers();
  if (tab === 'reports') renderReports();
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
  renderRecentBookings();
  renderConsignments(); // re-render cards with updated revenue totals
}

// ====================================================
//  INIT
// ====================================================
window.addEventListener('DOMContentLoaded', async () => {
  if (!(await checkAuth())) return;

  await Promise.all([loadReservations(), loadBlockedDates(), loadTuroFeeds(), loadConsignments(), loadExpenses(), loadCars(), loadServices(), loadCustomers()]);

  updateStats();
  initCalendar();
  renderTable();
  renderRecentBookings();

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

  // Cars & maintenance
  document.getElementById('add-service-btn-top')?.addEventListener('click', () => openAddService());
  document.getElementById('car-form')?.addEventListener('submit', saveCar);
  document.getElementById('service-form')?.addEventListener('submit', saveService);
  document.getElementById('service-car-filter')?.addEventListener('change', renderServicesTable);
  document.getElementById('service-type-filter')?.addEventListener('change', renderServicesTable);

  // Reports filters
  document.getElementById('apply-report-btn')?.addEventListener('click', renderReports);
  document.getElementById('clear-report-btn')?.addEventListener('click', () => {
    document.getElementById('report-from').value = '';
    document.getElementById('report-to').value   = '';
    document.getElementById('report-car').value  = '';
    renderReports();
  });

  // Customers
  document.getElementById('add-customer-btn')?.addEventListener('click', openAddCustomer);
  document.getElementById('customer-form')?.addEventListener('submit', saveCustomer);
  document.getElementById('customer-search')?.addEventListener('input', renderCustomers);

  // Close modals on backdrop click
  document.querySelectorAll('.modal').forEach(modal =>
    modal.addEventListener('click', e => { if (e.target === modal) closeModal(modal.id); })
  );
});
