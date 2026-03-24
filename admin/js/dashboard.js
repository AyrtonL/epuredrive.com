/* =============================================
   éPure Drive — Admin Dashboard
   ============================================= */

const SUPABASE_URL = 'https://brwzjwbpguiignrxvjdc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_krEuIpNhJVcADIUyBXYy9g_fiXrXzV9';

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

// ---- Constants ----
let CAR_COLORS  = {};   // populated from DB by loadCars()
let CAR_NAMES   = {};   // populated from DB by loadCars()
let DAILY_RATES = {};   // populated from DB by loadCars()

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

// ---- Multi-tenancy ----
let currentTenantId   = null;   // uuid — set after profile loads
let currentTenantName = null;   // display name

// ---- Role ----
let currentRole = 'admin';      // 'admin' | 'finance' | 'staff' — set after profile loads
let currentUserId = null;       // auth user uuid
let currentActiveTab = 'main';  // track current tab for role restrictions

// ---- Plan / Trial ----
let currentPlan    = 'trial';   // 'trial' | 'starter' | 'pro' | 'suspended'
let trialStartedAt = null;      // ISO timestamp
const TRIAL_DAYS             = 14;
const TRIAL_MAX_RESERVATIONS = 2;
const TRIAL_MAX_CARS         = 1;
const STARTER_MAX_CARS       = 10;
const PRO_MAX_CARS           = 30;
const STARTER_PRICE_ID       = 'price_1TDaQ3HAH4zJnnwfasGBYtYO';
const PRO_PRICE_ID           = 'price_1TDaQVHAH4zJnnwfPf1Gh6eg';
const PRO_ONLY_TABS          = ['turo', 'reports', 'consignments', 'users', 'roi'];

// ====================================================
//  AUTH + TENANT PROFILE
// ====================================================
async function checkAuth() {
  const { data } = await sb.auth.getSession();
  if (!data.session) {
    window.location.href = 'index.html';
    return false;
  }
  currentUserId = data.session.user.id;
  await loadTenantProfile(currentUserId, data.session.user.email);
  return true;
}

async function loadTenantProfile(userId, userEmail = '') {
  // 1 — Try profile lookup
  const { data: profile } = await sb
    .from('profiles')
    .select('tenant_id, full_name, role, tenants(name, plan, trial_started_at)')
    .eq('id', userId)
    .maybeSingle();

  if (profile?.tenant_id) {
    currentTenantId   = profile.tenant_id;
    currentTenantName = profile.tenants?.name || null;
    currentPlan       = profile.tenants?.plan  || 'trial';
    trialStartedAt    = profile.tenants?.trial_started_at || null;
    _setUserUI(profile.full_name, userEmail, profile.role || 'admin');
    _setTenantUI(currentTenantName);
    return;
  }

  // 2 — Profile missing or RLS blocked — try reading existing tenant directly
  const { data: tenant } = await sb
    .from('tenants')
    .select('id, name, plan, trial_started_at')
    .limit(1)
    .maybeSingle();

  if (tenant?.id) {
    currentTenantId   = tenant.id;
    currentTenantName = tenant.name || null;
    currentPlan       = tenant.plan || 'trial';
    trialStartedAt    = tenant.trial_started_at || null;
    await sb.from('profiles').upsert({ id: userId, tenant_id: tenant.id, role: 'admin' });
    _setUserUI(null, userEmail, 'admin');
    _setTenantUI(currentTenantName);
    return;
  }

  // 3 — Grant access anyway (single-admin, RLS blocks reads)
  currentTenantId   = null;
  currentTenantName = 'éPure Drive';
  _setUserUI(null, userEmail, 'admin');
  _setTenantUI(currentTenantName);
}

function _setTenantUI(name) {
  const el = document.getElementById('tenant-name');
  if (el && name) el.textContent = name;
}

function _setPlanUI() {
  const banner = document.getElementById('trial-banner');
  if (!banner) return;

  // Apply plan class to body for CSS feature gating
  document.body.classList.remove('plan-trial', 'plan-starter', 'plan-pro', 'plan-suspended');
  document.body.classList.add(`plan-${currentPlan}`);

  if (currentPlan === 'pro') { banner.style.display = 'none'; return; }

  if (currentPlan === 'suspended') {
    banner.style.display = 'flex';
    banner.style.background = 'rgba(239,68,68,0.1)';
    banner.style.borderBottomColor = 'rgba(239,68,68,0.4)';
    banner.innerHTML = `
      <span style="font-size:0.82rem;color:#EF4444;font-weight:600;">⛔ Account suspended — contact support to reactivate your plan.</span>
      <a href="mailto:info@epuredrive.com?subject=Reactivate%20Account" style="font-size:0.78rem;font-weight:700;color:#EF4444;text-decoration:none;padding:0.25rem 0.85rem;border:1px solid #EF4444;border-radius:6px;">Contact Us →</a>`;
    return;
  }

  if (currentPlan === 'starter') {
    banner.style.display = 'flex';
    banner.style.background = 'rgba(99,102,241,0.07)';
    banner.style.borderBottomColor = 'rgba(99,102,241,0.25)';
    banner.innerHTML = `
      <span style="font-size:0.8rem;color:var(--text);">
        <strong style="color:#818CF8;">⚡ Starter Plan</strong>
        &nbsp;·&nbsp; Cars: <strong>${allCars.length}/${STARTER_MAX_CARS}</strong>
        &nbsp;·&nbsp; Unlock Reports, Calendar Sync, Consignments &amp; Roles with Pro
      </span>
      <button onclick="startCheckout('${PRO_PRICE_ID}')" style="font-size:0.78rem;font-weight:700;color:#818CF8;background:none;border:1px solid #818CF8;border-radius:6px;padding:0.25rem 0.85rem;cursor:pointer;white-space:nowrap;">Upgrade to Pro $99/mo →</button>`;
    return;
  }

  // Trial
  let daysLeft = TRIAL_DAYS;
  if (trialStartedAt) {
    const used = Math.floor((Date.now() - new Date(trialStartedAt)) / 86400000);
    daysLeft   = Math.max(0, TRIAL_DAYS - used);
  }
  const resUsed  = allReservations.filter(r => r.status !== 'cancelled').length;
  const carsUsed = allCars.length;
  const expired  = daysLeft === 0;
  const atLimit  = resUsed >= TRIAL_MAX_RESERVATIONS || carsUsed >= TRIAL_MAX_CARS;
  const accent   = (expired || atLimit) ? '#EF4444' : '#F59E0B';

  banner.style.display = 'flex';
  banner.style.background = 'rgba(245,158,11,0.07)';
  banner.style.borderBottomColor = 'rgba(245,158,11,0.25)';
  banner.innerHTML = `
    <div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap;">
      <span style="font-size:0.8rem;font-weight:700;letter-spacing:.04em;color:${accent};">⚡ TRIAL</span>
      <span style="font-size:0.8rem;color:var(--text);">
        ${expired ? '<span style="color:#EF4444;font-weight:700;">Expired</span>' : `<strong>${daysLeft}</strong> day${daysLeft !== 1 ? 's' : ''} left`}
        &nbsp;·&nbsp; Reservations: <strong style="color:${resUsed >= TRIAL_MAX_RESERVATIONS ? '#EF4444' : 'inherit'}">${resUsed}/${TRIAL_MAX_RESERVATIONS}</strong>
        &nbsp;·&nbsp; Cars: <strong style="color:${carsUsed >= TRIAL_MAX_CARS ? '#EF4444' : 'inherit'}">${carsUsed}/${TRIAL_MAX_CARS}</strong>
      </span>
    </div>
    <button onclick="openModal('upgrade-modal')" style="font-size:0.78rem;font-weight:700;color:${accent};background:none;border:1px solid ${accent};border-radius:6px;padding:0.25rem 0.85rem;cursor:pointer;white-space:nowrap;">Upgrade →</button>`;
}

function checkPlanLimit(type) {
  if (currentPlan === 'suspended') {
    showToast('Account suspended. Contact support to reactivate.', 'error');
    return false;
  }
  if (currentPlan === 'pro') return true;

  if (currentPlan === 'trial') {
    const daysLeft = trialStartedAt
      ? Math.max(0, TRIAL_DAYS - Math.floor((Date.now() - new Date(trialStartedAt)) / 86400000))
      : TRIAL_DAYS;
    if (daysLeft === 0) {
      showToast('Your trial has expired. Upgrade to continue.', 'error');
      openModal('upgrade-modal');
      return false;
    }
    if (type === 'reservation') {
      const used = allReservations.filter(r => r.status !== 'cancelled').length;
      if (used >= TRIAL_MAX_RESERVATIONS) {
        showToast(`Trial limit: max ${TRIAL_MAX_RESERVATIONS} reservations. Upgrade to continue.`, 'error');
        openModal('upgrade-modal');
        return false;
      }
    }
    if (type === 'car' && allCars.length >= TRIAL_MAX_CARS) {
      showToast(`Trial limit: max ${TRIAL_MAX_CARS} car. Upgrade to continue.`, 'error');
      openModal('upgrade-modal');
      return false;
    }
  }

  if (currentPlan === 'starter' && type === 'car' && allCars.length >= STARTER_MAX_CARS) {
    showToast(`Starter limit: max ${STARTER_MAX_CARS} cars. Upgrade to Pro for more.`, 'error');
    return false;
  }

  return true;
}

async function startCheckout(priceId) {
  const { data } = await sb.auth.getSession();
  const email    = data?.session?.user?.email || '';
  const userId   = data?.session?.user?.id;
  const btn      = event?.currentTarget;
  if (btn) { btn.disabled = true; btn.textContent = 'Redirecting…'; }

  try {
    // If no tenant yet, auto-create one via server function (bypasses RLS)
    if (!currentTenantId && userId) {
      const tRes  = await fetch('/.netlify/functions/create-tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, email, company: email.split('@')[0] }),
      });
      const tJson = await tRes.json();
      if (!tRes.ok) throw new Error(tJson.error || 'Could not create account');
      currentTenantId = tJson.tenantId;
    }

    const res  = await fetch('/.netlify/functions/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceId, tenantId: currentTenantId, email }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Checkout failed');
    window.location.href = json.url;
  } catch (err) {
    showToast(err.message, 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Upgrade →'; }
  }
}

function _setUserUI(fullName, email, role) {
  currentRole = role || 'admin';
  const displayName = fullName || email || 'Admin';
  const initials    = displayName.split(/[\s@]+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const avatarEl   = document.getElementById('user-avatar');
  const nameEl     = document.getElementById('user-display-name');
  const roleEl     = document.getElementById('user-display-role');
  if (avatarEl) avatarEl.textContent = initials;
  if (nameEl)   nameEl.textContent   = displayName;
  if (roleEl) {
    roleEl.innerHTML = `<span class="role-badge ${currentRole}">${currentRole}</span>`;
  }
  // Apply role class to body for CSS-based visibility rules
  document.body.classList.remove('role-admin', 'role-finance', 'role-staff');
  document.body.classList.add(`role-${currentRole}`);
}

// Redirect to safe tab if current active tab is restricted for this role
function applyRoleRestrictions() {
  const restricted = {
    finance: ['maintenance', 'turo', 'users'],
    staff:   ['reports', 'consignments', 'users'],
  };
  const blocked = restricted[currentRole] || [];
  if (blocked.includes(currentActiveTab)) {
    switchTab('main');
  }
}

// ====================================================
//  ONBOARDING (first login — no tenant yet)
// ====================================================
function showOnboarding(userId) {
  return new Promise((resolve) => {
    const overlay = document.getElementById('onboarding-overlay');
    if (!overlay) { resolve(); return; }
    overlay.style.display = 'flex';

    document.getElementById('onboard-btn').onclick = async () => {
      const company = document.getElementById('onboard-company').value.trim();
      const name    = document.getElementById('onboard-name').value.trim();
      const errEl   = document.getElementById('onboard-error');
      const btn     = document.getElementById('onboard-btn');

      if (!company) {
        errEl.textContent = 'Please enter your fleet name.';
        errEl.style.display = 'block';
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Setting up…';
      errEl.style.display = 'none';

      try {
        // Create tenant
        const slug = company.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const { data: tenant, error: tErr } = await sb
          .from('tenants')
          .insert({ name: company, slug: slug + '-' + Date.now() })
          .select('id')
          .single();
        if (tErr) throw tErr;

        // Create profile
        const { error: pErr } = await sb.from('profiles').upsert({
          id: userId,
          tenant_id: tenant.id,
          full_name: name || null,
          role: 'admin',
        });
        if (pErr) throw pErr;

        currentTenantId   = tenant.id;
        currentTenantName = company;
        const el = document.getElementById('tenant-name');
        if (el) el.textContent = company;

        overlay.style.display = 'none';
        resolve();
      } catch (err) {
        errEl.textContent = 'Setup failed: ' + (err.message || 'Unknown error');
        errEl.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Get Started';
      }
    };
  });
}

// ====================================================
//  TENANT HELPERS
// ====================================================
// Apply tenant filter to a Supabase query builder (only when multi-tenant)
function withTenant(query) {
  return currentTenantId ? query.eq('tenant_id', currentTenantId) : query;
}
// Build tenant payload for insert/update
function tenantPayload() {
  return currentTenantId ? { tenant_id: currentTenantId } : {};
}

// ====================================================
//  DATA
// ====================================================
async function loadReservations() {
  const { data, error } = await withTenant(
    sb.from('reservations').select('*').order('pickup_date', { ascending: true })
  );
  if (!error) allReservations = data || [];
  return allReservations;
}

async function loadBlockedDates() {
  const { data, error } = await withTenant(
    sb.from('blocked_dates').select('*').order('start_date', { ascending: true })
  );
  if (!error) allBlocked = data || [];
  return allBlocked;
}

async function loadTuroFeeds() {
  try {
    const { data } = await withTenant(sb.from('turo_feeds').select('*').order('created_at', { ascending: true }));
    turoFeeds = {};
    if (data) {
      // Keep backward-compat object keyed by id for sync logic
      data.forEach(row => {
        turoFeeds[row.id] = {
          id:         row.id,
          carId:      row.car_id,
          url:        row.ical_url,
          sourceName: row.source_name || 'Calendar',
          lastSynced: row.last_synced,
        };
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
//  RESERVATIONS TABLE  (with pagination)
// ====================================================
const PAGE_SIZE = 25;
let currentPage = 1;

function renderTable(resetPage = false) {
  if (resetPage) currentPage = 1;
  const tbody   = document.getElementById('res-tbody');
  const search  = (document.getElementById('search-input')?.value || '').toLowerCase();
  const statusF = document.getElementById('status-filter')?.value || '';
  const carF    = document.getElementById('car-filter')?.value || '';

  const list = allReservations.filter(r => {
    const s = search ? (
      (r.customer_name || '').toLowerCase().includes(search) ||
      (r.customer_email || '').toLowerCase().includes(search) ||
      (r.customer_phone || '').includes(search)
    ) : true;
    const st = statusF ? r.status === statusF : true;
    const c  = carF    ? String(r.car_id) === carF : true;
    return s && st && c;
  }).sort((a, b) => a.pickup_date < b.pickup_date ? 1 : -1);

  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  currentPage = Math.min(currentPage, totalPages);
  const page = list.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (!page.length) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:var(--muted);padding:2.5rem 1rem">No reservations found</td></tr>`;
    renderPagination(0, 1, 1);
    return;
  }

  const statusMap = { pending:'badge-yellow', confirmed:'badge-blue', active:'badge-green', completed:'badge-gray', cancelled:'badge-red' };
  tbody.innerHTML = page.map(r => {
    const days = dateDiff(r.pickup_date, r.return_date);
    return `
      <tr>
        <td style="width:36px;"><input type="checkbox" class="bulk-cb" data-id="${r.id}" style="cursor:pointer;" onchange="updateBulkBar()" /></td>
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
        <td><span class="source-badge source-${r.source || 'admin'}">${r.source || 'admin'}</span></td>
        <td class="actions">
          <button class="btn-icon write-action" onclick="openEdit('${r.id}')" title="Edit" aria-label="Edit reservation">✏️</button>
          <button class="btn-icon danger write-action" onclick="deleteReservation('${r.id}', this)" title="Delete" aria-label="Delete reservation">🗑️</button>
        </td>
      </tr>`;
  }).join('');

  renderPagination(list.length, currentPage, totalPages);
}

function updateBulkBar() {
  const checked = document.querySelectorAll('.bulk-cb:checked');
  const bar = document.getElementById('bulk-action-bar');
  const countEl = document.getElementById('bulk-count');
  if (!bar) return;
  if (checked.length > 0) {
    bar.style.display = 'flex';
    countEl.textContent = `${checked.length} selected`;
  } else {
    bar.style.display = 'none';
  }
}

function clearBulkSelection() {
  document.querySelectorAll('.bulk-cb').forEach(cb => cb.checked = false);
  const all = document.getElementById('bulk-select-all');
  if (all) all.checked = false;
  updateBulkBar();
}

async function bulkMarkCompleted() {
  const ids = [...document.querySelectorAll('.bulk-cb:checked')].map(cb => cb.dataset.id);
  if (!ids.length) return;
  if (!confirm(`Mark ${ids.length} booking${ids.length !== 1 ? 's' : ''} as Completed?`)) return;
  for (const id of ids) {
    await sb.from('reservations').update({ status: 'completed' }).eq('id', id);
  }
  await loadReservations();
  renderTable();
  updateStats();
  clearBulkSelection();
  showToast(`${ids.length} booking${ids.length !== 1 ? 's' : ''} marked as completed.`);
}

function bulkExportSelected() {
  const ids = new Set([...document.querySelectorAll('.bulk-cb:checked')].map(cb => cb.dataset.id));
  if (!ids.size) return;
  const rows = allReservations.filter(r => ids.has(String(r.id)));
  const header = ['ID','Customer','Email','Phone','Vehicle','Pickup Date','Return Date','Days','Total','Status','Source'];
  const csv = [header, ...rows.map(r => [
    r.id, r.customer_name, r.customer_email || '', r.customer_phone || '',
    CAR_NAMES[r.car_id] || '', r.pickup_date, r.return_date,
    dateDiff(r.pickup_date, r.return_date),
    r.total_amount || '', r.status, r.source || ''
  ])].map(row => row.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `bookings-selected-${todayStr()}.csv`; a.click();
  clearBulkSelection();
}

function renderPagination(total, current, totalPages) {
  let el = document.getElementById('bookings-pagination');
  if (!el) {
    const section = document.querySelector('#tab-bookings .table-section');
    if (!section) return;
    el = document.createElement('div');
    el.id = 'bookings-pagination';
    el.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:0.75rem 1rem;border-top:1px solid var(--border);font-size:0.82rem;color:var(--muted);';
    section.appendChild(el);
  }
  if (totalPages <= 1) { el.innerHTML = `<span>${total} reservation${total !== 1 ? 's' : ''}</span>`; return; }
  const start = (current - 1) * PAGE_SIZE + 1;
  const end   = Math.min(current * PAGE_SIZE, total);
  el.innerHTML = `
    <span>${start}–${end} of ${total}</span>
    <div style="display:flex;gap:0.4rem;">
      <button class="btn btn-outline" style="padding:0.3rem 0.65rem;" onclick="changePage(${current - 1})" ${current <= 1 ? 'disabled' : ''}>‹ Prev</button>
      <span style="padding:0.3rem 0.65rem;background:var(--surface-2);border-radius:6px;color:var(--text);">${current} / ${totalPages}</span>
      <button class="btn btn-outline" style="padding:0.3rem 0.65rem;" onclick="changePage(${current + 1})" ${current >= totalPages ? 'disabled' : ''}>Next ›</button>
    </div>`;
}

function changePage(page) {
  currentPage = page;
  renderTable();
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

async function upsertCustomerFromReservation(res) {
  const name  = res.customer_name?.trim();
  const email = res.customer_email?.trim();
  const phone = res.customer_phone?.trim();
  if (!name) return; // nothing to save

  // Find existing customer by email, or by name+phone as fallback
  let existing = null;
  if (email) {
    existing = allCustomers.find(c => c.email && c.email.toLowerCase() === email.toLowerCase());
  }
  if (!existing && phone) {
    existing = allCustomers.find(c => c.phone && c.phone === phone);
  }
  if (!existing) {
    existing = allCustomers.find(c => c.name.toLowerCase() === name.toLowerCase());
  }

  const customerPayload = {
    name,
    ...(email ? { email } : {}),
    ...(phone ? { phone } : {}),
    ...tenantPayload(),
  };

  if (existing) {
    // Update only fields that were blank before
    const updates = {};
    if (email && !existing.email) updates.email = email;
    if (phone && !existing.phone) updates.phone = phone;
    if (Object.keys(updates).length) {
      await sb.from('customers').update(updates).eq('id', existing.id);
    }
  } else {
    await sb.from('customers').insert(customerPayload);
  }

  // Refresh local list so Customers tab stays in sync
  await loadCustomers();
}

// Runs silently in background; pass showResult=true for manual button trigger
async function syncCustomersFromReservations(btnOrEvent, showResult = false) {
  const btn = btnOrEvent instanceof HTMLElement ? btnOrEvent : null;
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:15px;vertical-align:-3px;">sync</span> Syncing…'; }

  // Work from latest customer list
  const localList = [...allCustomers];
  let created = 0;

  for (const r of allReservations) {
    const name  = r.customer_name?.trim();
    const email = r.customer_email?.trim();
    const phone = r.customer_phone?.trim();
    if (!name) continue;

    let exists = false;
    if (email) exists = localList.some(c => c.email?.toLowerCase() === email.toLowerCase());
    if (!exists && phone) exists = localList.some(c => c.phone === phone);
    if (!exists) exists = localList.some(c => c.name.toLowerCase() === name.toLowerCase());
    if (exists) continue;

    const { data: inserted } = await sb.from('customers').insert({
      name,
      ...(email ? { email } : {}),
      ...(phone ? { phone } : {}),
      ...tenantPayload(),
    }).select().single();

    if (inserted) {
      localList.push(inserted); // prevent duplicates within this loop
      created++;
    }
  }

  if (created > 0 || showResult) {
    await loadCustomers();
    renderCustomers();
    if (showResult) showToast(`Done — ${created} customer${created !== 1 ? 's' : ''} added.`);
  }

  if (btn) { btn.disabled = false; btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:15px;vertical-align:-3px;">sync</span> Sync from Bookings'; }
}

async function saveReservation(e) {
  e.preventDefault();
  const form    = document.getElementById('reservation-form');
  const editId  = form.dataset.editId;
  if (!editId && !checkPlanLimit('reservation')) return;
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
    source:          'admin',
    ...tenantPayload(),
  };

  const btn = e.submitter;
  btn.disabled = true;
  btn.textContent = 'Saving…';

  const { error } = editId
    ? await sb.from('reservations').update(payload).eq('id', editId)
    : await sb.from('reservations').insert(payload);

  if (error) { showToast('Error: ' + error.message, 'error'); }
  else {
    closeModal('reservation-modal');
    // Auto-create or update customer from booking info
    await upsertCustomerFromReservation(payload);
    await refresh();
  }

  btn.disabled = false;
  btn.textContent = 'Save Reservation';
}

async function deleteReservation(id, btn) {
  if (!confirm('Delete this reservation? This cannot be undone.')) return;
  if (btn) { btn.disabled = true; btn.textContent = '…'; }
  await sb.from('reservations').delete().eq('id', id);
  await refresh();
  if (btn) { btn.disabled = false; btn.textContent = '🗑️'; }
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

  if (end < start) { showToast('End date must be after start date.', 'error'); return; }

  const rows = carId === 'all'
    ? allCars.map(c => ({ car_id: c.id, start_date: start, end_date: end, reason, ...tenantPayload() }))
    : [{ car_id: parseInt(carId), start_date: start, end_date: end, reason, ...tenantPayload() }];

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

  // Late fee calculation
  let lateFeeHtml = '';
  if (r.status !== 'completed' && r.status !== 'cancelled') {
    const today = new Date(todayStr());
    const returnDate = new Date(r.return_date + 'T12:00:00');
    const overdueDays = Math.floor((today - returnDate) / 86400000);
    if (overdueDays > 0) {
      const dailyRate = DAILY_RATES[r.car_id] || 0;
      const lateFee = overdueDays * dailyRate;
      lateFeeHtml = `<div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.3);border-radius:8px;padding:0.65rem 1rem;margin:0.75rem 0;font-size:0.83rem;display:flex;align-items:center;gap:0.6rem;">
        <span style="color:#ef4444;font-size:1rem;">⚠</span>
        <span><strong style="color:#ef4444;">Overdue ${overdueDays} day${overdueDays !== 1 ? 's' : ''}</strong>${dailyRate ? ` · Estimated late fee: <strong>$${lateFee.toLocaleString()}</strong>` : ''}</span>
      </div>`;
    }
  }

  document.getElementById('detail-content').innerHTML = `
    ${lateFeeHtml}
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
    <button class="btn btn-outline" style="font-size:0.8rem;" onclick="copyPortalLink('${r.id}')">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-1px;margin-right:3px;"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
      Portal Link
    </button>
    <button class="btn write-action" style="background:none;border:1px solid var(--red,#ef4444);color:var(--red,#ef4444);border-radius:8px;padding:0.5rem 1rem;font-size:0.85rem;font-weight:600;cursor:pointer;" onclick="closeModal('detail-modal');deleteReservation('${r.id}')">Delete</button>
    <button class="btn btn-primary write-action" onclick="closeModal('detail-modal');openEdit('${r.id}')">Edit</button>
  `;
  openModal('detail-modal');
}

function copyPortalLink(bookingId) {
  const token = btoa(bookingId + ':' + (currentTenantId || '')).replace(/=/g, '');
  const url = window.location.origin + '/booking-status.html?id=' + bookingId + '&token=' + token;
  navigator.clipboard.writeText(url).then(() => {
    showToast('Portal link copied to clipboard!');
  }).catch(() => {
    prompt('Copy this link:', url);
  });
}

// ====================================================
//  CALENDAR SYNC (unified — any iCal source)
// ====================================================
function renderCalendarFeeds() {
  const list = document.getElementById('feeds-list');
  if (!list) return;
  const feeds = Object.values(turoFeeds);
  if (!feeds.length) {
    list.innerHTML = `<p style="color:var(--muted);font-size:0.85rem;padding:0.5rem 0;">No calendar feeds added yet. Add one above.</p>`;
    return;
  }
  list.innerHTML = `
    <table class="res-table" style="width:100%;">
      <thead><tr>
        <th>Platform</th><th>Vehicle</th><th>Last Synced</th><th>URL</th><th></th>
      </tr></thead>
      <tbody>
        ${feeds.map(f => `
          <tr>
            <td><span class="source-badge source-turo">${esc(f.sourceName)}</span></td>
            <td>
              <span class="car-dot-inline" style="background:${CAR_COLORS[f.carId]};width:8px;height:8px;border-radius:50%;display:inline-block;margin-right:5px;"></span>
              ${CAR_NAMES[f.carId] || 'Unknown'}
            </td>
            <td style="color:var(--muted);font-size:0.8rem;">${f.lastSynced ? new Date(f.lastSynced).toLocaleString() : 'Never'}</td>
            <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:0.78rem;color:var(--muted);" title="${esc(f.url)}">${esc(f.url)}</td>
            <td><button class="btn btn-outline" style="padding:0.3rem 0.6rem;font-size:0.75rem;color:#f87171;border-color:#f87171;" onclick="deleteFeed('${f.id}', this)">Remove</button></td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

async function importTuroCsv() {
  const fileInput = document.getElementById('turo-csv-file');
  const resultEl  = document.getElementById('turo-csv-result');
  const btn       = document.getElementById('turo-csv-btn');
  const file      = fileInput.files?.[0];
  if (!file) { resultEl.innerHTML = '<span style="color:var(--red)">Please select a CSV file.</span>'; return; }

  btn.disabled = true; btn.textContent = 'Processing…';
  resultEl.innerHTML = '';

  const text = await file.text();
  const rows = text.split(/\r?\n/).map(line => {
    // Simple CSV parse handling quoted fields with embedded newlines
    const fields = []; let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { inQ = !inQ; }
      else if (c === ',' && !inQ) { fields.push(cur); cur = ''; }
      else cur += c;
    }
    fields.push(cur);
    return fields;
  });

  // Build Turo vehicle ID → car_id map from allCars
  const turoVehicleMap = {};
  allCars.forEach(c => { if (c.turo_vehicle_id) turoVehicleMap[c.turo_vehicle_id] = c.id; });

  // Parse rows: group by reservation #, sum earnings
  const reservations = {};
  for (const r of rows) {
    if (!r[0] || !r[0].includes('Viaje')) continue;
    const tipo     = r[0].replace(/^"+|"+$/g, '');
    const url      = (r[1] || '').replace(/^"+|"+$/g, '');
    const vid      = (r[3] || '').trim();
    const earnings = (r[5] || '').replace(/[$,"]/g, '').trim();
    const guestM   = tipo.match(/Viaje de (.+?)(?:\n|Con )/);
    const resM     = url.match(/\/reservation\/(\d+)/);
    if (!guestM || !resM) continue;
    const resId  = resM[1];
    const amount = parseFloat(earnings) || 0;
    if (!reservations[resId]) reservations[resId] = { guest: guestM[1].trim(), vid, total: 0, car_id: turoVehicleMap[vid] || null };
    reservations[resId].total += amount;
  }

  const resIds = Object.keys(reservations);
  if (!resIds.length) {
    resultEl.innerHTML = '<span style="color:var(--red)">No trip rows found. Make sure this is a Turo earnings CSV.</span>';
    btn.disabled = false; btn.textContent = 'Import CSV';
    return;
  }

  // Fetch existing reservations with Turo # in notes
  const { data: existing } = await sb.from('reservations').select('id,notes,customer_name,total_amount,car_id').like('notes', 'Turo #%');
  let updated = 0, skipped = 0;

  for (const [resId, data] of Object.entries(reservations)) {
    const match = (existing || []).find(r => (r.notes || '').includes(`Turo #${resId}`));
    if (match) {
      await sb.from('reservations').update({
        customer_name: data.guest,
        total_amount:  Math.round(data.total * 100) / 100,
        ...(data.car_id ? { car_id: data.car_id } : {}),
      }).eq('id', match.id);
      updated++;
    } else {
      skipped++;
    }
  }

  await refresh();
  resultEl.innerHTML = `
    <span style="color:#10B981;font-weight:600;">✓ Done.</span>
    &nbsp; <strong>${updated}</strong> reservation(s) updated
    ${skipped ? ` · <strong>${skipped}</strong> not matched (need calendar import for pickup/return dates)` : ''}.
  `;
  fileInput.value = '';
  btn.disabled = false; btn.textContent = 'Import CSV';
}

function switchFeedInputMode(mode) {
  const isUrl = mode === 'url';
  document.getElementById('feed-input-url').style.display  = isUrl ? '' : 'none';
  document.getElementById('feed-input-file').style.display = isUrl ? 'none' : '';
  document.getElementById('feed-tab-url').style.background  = isUrl ? 'var(--accent)' : 'transparent';
  document.getElementById('feed-tab-url').style.color       = isUrl ? '#fff' : 'var(--muted)';
  document.getElementById('feed-tab-file').style.background = isUrl ? 'transparent' : 'var(--accent)';
  document.getElementById('feed-tab-file').style.color      = isUrl ? 'var(--muted)' : '#fff';
}

function populateFeedCarDropdown() {
  const sel = document.getElementById('feed-car');
  if (!sel) return;
  sel.innerHTML = allCars.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}

function setCarFilter(val) {
  activeCarFilter = String(val);
  document.querySelectorAll('[data-car-filter]').forEach(b => b.classList.remove('active'));
  document.querySelector(`[data-car-filter="${val}"]`)?.classList.add('active');
  refreshCalendar();
}

function populateCarFilterDropdowns() {
  // Dynamic car filter buttons (inside #car-filter-bar, after the static "All Cars" btn)
  const filterBar = document.getElementById('car-filter-bar');
  if (filterBar) {
    // Remove previously injected dynamic buttons
    filterBar.querySelectorAll('[data-car-filter]:not([data-car-filter="all"])').forEach(b => b.remove());
    allCars.forEach(c => {
      const btn = document.createElement('button');
      btn.className = 'car-btn';
      btn.dataset.carFilter = c.id;
      btn.innerHTML = `<span class="dot" style="background:${c.color}"></span>${c.name}`;
      btn.onclick = () => setCarFilter(c.id);
      filterBar.appendChild(btn);
    });
  }

  // Dynamic legend items
  const legendCars = document.getElementById('legend-cars');
  if (legendCars) {
    legendCars.innerHTML = allCars.map(c =>
      `<div class="legend-item"><div class="legend-dot" style="background:${c.color}"></div>${c.name}</div>`
    ).join('');
  }

  // Filter selects — keep the first "All" option, append cars
  const filterSelects = ['car-filter', 'expense-car-filter', 'service-car-filter', 'report-car', 'exp-car'];
  filterSelects.forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const firstOpt = sel.options[0]; // preserve "All Cars / All Vehicles"
    sel.innerHTML = '';
    sel.appendChild(firstOpt);
    allCars.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.name;
      sel.appendChild(opt);
    });
  });

  // Reservation modal vehicle select — includes rate
  const fCar = document.getElementById('f-car');
  if (fCar) {
    const firstOpt = fCar.options[0];
    fCar.innerHTML = '';
    fCar.appendChild(firstOpt);
    allCars.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.daily_rate ? `${c.name} — $${c.daily_rate}/day` : c.name;
      fCar.appendChild(opt);
    });
  }

  // Block-dates, Service, Consignment modal dropdowns
  const bCar = document.getElementById('b-car');
  if (bCar) {
    bCar.innerHTML = '<option value="all">All Vehicles</option>' +
      allCars.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  }
  const svcCar = document.getElementById('svc-car');
  if (svcCar) {
    svcCar.innerHTML = '<option value="">Select vehicle…</option>' +
      allCars.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  }
  const conCar = document.getElementById('con-car');
  if (conCar) {
    conCar.innerHTML = '<option value="">Select vehicle…</option>' +
      allCars.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  }
}

async function addCalendarFeed() {
  const sourceEl = document.getElementById('feed-source');
  const carEl    = document.getElementById('feed-car');
  const source   = sourceEl.value.trim();
  const carId    = parseInt(carEl.value);
  const isFile   = document.getElementById('feed-input-file').style.display !== 'none';

  if (!source) { showToast('Please enter a platform name (e.g. Turo, Airbnb).', 'error'); return; }
  if (!carId)  { showToast('Please select a vehicle.', 'error'); return; }

  const btn = document.getElementById('add-feed-btn');
  btn.disabled = true;
  btn.textContent = 'Importing…';

  if (isFile) {
    // ── File upload mode ──────────────────────────────
    const fileInput = document.getElementById('feed-file');
    const file      = fileInput.files?.[0];
    if (!file) { showToast('Please select an .ics file.', 'error'); btn.disabled = false; btn.textContent = 'Add Feed'; return; }

    const text   = await file.text();
    const events = parseIcal(text, carId, source);
    if (!events.length) {
      showToast('No future events found in the .ics file.', 'error');
      btn.disabled = false; btn.textContent = 'Add Feed';
      return;
    }
    const { error } = await sb.from('reservations').insert(events.map(e => ({ ...e, ...tenantPayload() })));
    if (error) { showToast('Import error: ' + error.message, 'error'); }
    else {
      showToast(`Imported ${events.length} event(s) from "${file.name}".`);
      fileInput.value = '';
      sourceEl.value  = '';
      await refresh();
    }
  } else {
    // ── URL mode ──────────────────────────────────────
    const urlEl = document.getElementById('feed-url');
    const url   = urlEl.value.trim();
    if (!url) { showToast('Please enter an iCal URL.', 'error'); btn.disabled = false; btn.textContent = 'Add Feed'; return; }

    const { error } = await sb.from('turo_feeds').insert({
      car_id:      carId,
      ical_url:    url,
      source_name: source,
      ...tenantPayload(),
    });
    if (error) { showToast('Could not save feed: ' + error.message, 'error'); }
    else {
      sourceEl.value = '';
      urlEl.value    = '';
      await loadTuroFeeds();
      renderCalendarFeeds();
    }
  }

  btn.disabled = false;
  btn.textContent = 'Add Feed';
}

async function deleteFeed(feedId, btn) {
  if (!confirm('Remove this calendar feed?')) return;
  if (btn) { btn.disabled = true; btn.textContent = '…'; }
  await sb.from('turo_feeds').delete().eq('id', feedId);
  await loadTuroFeeds();
  renderCalendarFeeds();
}

async function syncTuro() {
  const btn    = document.getElementById('sync-turo-btn');
  const status = document.getElementById('sync-status');
  btn.disabled = true;
  btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:spin 1s linear infinite"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg> Syncing…';
  status.textContent = '';

  const feeds = Object.values(turoFeeds);
  if (!feeds.length) {
    status.textContent = 'No feeds to sync. Add a calendar feed first.';
    btn.disabled = false;
    btn.textContent = 'Sync All';
    return;
  }

  let totalImported = 0;
  let errors = 0;

  for (const feed of feeds) {
    try {
      const proxyUrl = `/.netlify/functions/fetch-ical?url=${encodeURIComponent(feed.url)}`;
      const res  = await fetch(proxyUrl);
      if (!res.ok) throw new Error(`Fetch failed (${res.status})`);
      const icsText = await res.text();

      const events = parseIcal(icsText, feed.carId, feed.sourceName);
      // Remove old entries from this same feed source + car, then re-insert
      await sb.from('reservations').delete()
        .eq('car_id', feed.carId)
        .eq('source', 'ical')
        .ilike('notes', `%[${feed.sourceName}]%`);

      if (events.length) await sb.from('reservations').insert(events.map(e => ({ ...e, ...tenantPayload() })));

      await sb.from('turo_feeds').update({ last_synced: new Date().toISOString() }).eq('id', feed.id);
      totalImported += events.length;
    } catch (err) {
      console.error('Sync error for feed', feed.id, err);
      errors++;
    }
  }

  status.textContent = `✓ ${totalImported} event(s) imported` + (errors ? ` — ${errors} feed(s) failed` : '');
  await loadTuroFeeds();
  renderCalendarFeeds();
  await refresh();
  btn.disabled = false;
  btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg> Sync All';
}

// Stub kept for backward compat (no longer wired to a button)
function syncGoogleCalendar() {}

function parseIcal(icsText, carId, sourceName = 'Calendar') {
  const events = [];
  const today  = todayStr();

  // RFC 5545: unfold continuation lines (CRLF/LF + whitespace)
  const unfolded = icsText.replace(/\r?\n[ \t]/g, '');
  const vevents  = unfolded.split(/BEGIN:VEVENT/i).slice(1);

  // Map sourceName to allowed source values
  const src = /turo/i.test(sourceName)   ? 'turo'
            : /airbnb/i.test(sourceName) ? 'ical'
            : 'ical';

  // Convert iCal date string (with or without time) → YYYY-MM-DD
  const toDate = (s) => {
    const raw = s.replace(/[TZ\-]/g, '').slice(0, 8);
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
    const isAllDay = !dtstart.includes('T');  // DATE-only = all-day
    let   end      = dtend ? toDate(dtend) : start;

    // iCal all-day DTEND is exclusive (next day after last night)
    // Turo: DTEND=20260323 means the car is returned on 3/22
    if (isAllDay && end > start) end = prevDay(end);

    if (end < today) return; // skip past events

    // Unescape DESCRIPTION and extract guest details
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

    // Guest name: description first, then clean SUMMARY
    let guestName = fromDesc('Guest', 'Guests', 'Renter', 'Traveler', 'Visitor');
    if (!guestName) {
      const raw = (get('SUMMARY') || '').trim();
      guestName = raw
        // Remove "- Turo", "- Airbnb" suffixes
        .replace(/\s*[-–]\s*(Turo|Airbnb|VRBO|Booking\.com)\b.*/i, '')
        // Remove "Turo Reservation", "Airbnb Booking" etc.
        .replace(/\b(Turo|Airbnb|VRBO)\b\s*(Reservation|Booking|Trip|Guest)?\s*/gi, '')
        // Remove generic single words
        .replace(/^(Reserved|Reservation|Booking|Blocked|Busy)$/i, '')
        .trim();
    }
    if (!guestName) guestName = `${sourceName} Guest`;

    const notes = resId
      ? `${sourceName} #${resId}`
      : `Imported from [${sourceName}]`;

    events.push({
      car_id:         carId,
      customer_name:  guestName,
      customer_email: email  || '',
      customer_phone: phone  || '',
      pickup_date:    start,
      return_date:    end,
      status:         'confirmed',
      source:         src,
      notes:          notes,
    });
  });

  return events;
}

// ====================================================
//  CONSIGNMENTS
// ====================================================
async function loadConsignments() {
  const { data, error } = await withTenant(sb.from('consignments').select('*').order('car_id'));
  if (!error) allConsignments = data || [];
}

async function loadExpenses() {
  const { data, error } = await withTenant(sb.from('consignment_expenses').select('*').order('expense_date', { ascending: false }));
  if (!error) allExpenses = data || [];
}

function renderConsignments() {
  const grid = document.getElementById('consignment-grid');
  if (!grid) return;

  const fromVal = document.getElementById('con-from')?.value || '';
  const toVal   = document.getElementById('con-to')?.value   || '';

  const label = document.getElementById('con-period-label');
  if (label) {
    if (fromVal || toVal) {
      label.textContent = 'Revenue period: ' + (fromVal || '…') + ' → ' + (toVal || '…');
    } else {
      label.textContent = 'Showing all-time revenue';
    }
  }

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
      .filter(r => {
        if (r.car_id !== con.car_id || r.status === 'cancelled') return false;
        if (fromVal && r.pickup_date < fromVal) return false;
        if (toVal   && r.pickup_date > toVal)   return false;
        return true;
      })
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
            <button class="btn-icon write-action" onclick="openEditConsignment('${con.id}')" title="Edit" aria-label="Edit consignment">✏️</button>
            <button class="btn-icon danger write-action" onclick="deleteConsignment('${con.id}', this)" title="Delete" aria-label="Delete consignment">🗑️</button>
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
    let carMatch = true;
    if (carF === 'company') carMatch = !e.car_id;
    else if (carF) carMatch = String(e.car_id) === carF;
    const catMatch = catF ? e.category === catF : true;
    return carMatch && catMatch;
  });

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:2.5rem">No expenses found</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(e => {
    const isCompany = !e.car_id;
    const vehicleCell = isCompany
      ? `<span style="font-size:0.78rem;background:var(--surface-3);color:var(--muted-2);padding:2px 8px;border-radius:20px;">Company</span>`
      : `<span class="car-dot-inline" style="background:${CAR_COLORS[e.car_id] || '#666'}"></span>${CAR_NAMES[e.car_id] || '—'}`;
    return `
    <tr>
      <td>${fmtDate(e.expense_date)}</td>
      <td>${vehicleCell}</td>
      <td><span class="badge badge-gray">${esc(e.category)}</span></td>
      <td style="color:var(--muted-2);">${esc(e.description || '—')}</td>
      <td style="color:var(--red);font-weight:600;">$${Number(e.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td class="actions">
        <button class="btn-icon danger write-action" onclick="deleteExpense('${e.id}', this)" title="Delete" aria-label="Delete expense">🗑️</button>
      </td>
    </tr>`;
  }).join('');
}

async function importExpensesCSV() {
  const fileInput = document.getElementById('expenses-csv-file');
  const file = fileInput.files?.[0];
  if (!file) return;

  const text = await file.text();
  const lines = text.split(/\r?\n/);
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z_]/g, ''));

  let imported = 0, skipped = 0;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const fields = [];
    let cur = '', inQ = false;
    for (let j = 0; j < line.length; j++) {
      const c = line[j];
      if (c === '"') { inQ = !inQ; }
      else if (c === ',' && !inQ) { fields.push(cur.trim()); cur = ''; }
      else cur += c;
    }
    fields.push(cur.trim());

    const row = {};
    headers.forEach((h, idx) => { row[h] = fields[idx] || ''; });

    const amount = parseFloat(row.amount || row.cost || row.total);
    const date   = row.date || row.expense_date || todayStr();
    const cat    = row.category || row.type || 'Other';
    if (!amount || isNaN(amount)) { skipped++; continue; }

    const payload = {
      expense_date: date,
      category:     cat,
      amount:       amount,
      description:  row.description || row.notes || '',
      car_id:       null,
      consignment_id: null,
      ...tenantPayload(),
    };
    const { error } = await sb.from('consignment_expenses').insert(payload);
    if (error) skipped++;
    else imported++;
  }

  fileInput.value = '';
  await loadExpenses();
  renderExpensesTable();
  showToast(`Imported ${imported} expense${imported !== 1 ? 's' : ''}${skipped ? ` (${skipped} skipped)` : ''}.`);
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
    ...tenantPayload(),
  };
  const btn = e.submitter;
  btn.disabled = true; btn.textContent = 'Saving…';
  const { error } = editId
    ? await sb.from('consignments').update(payload).eq('id', editId)
    : await sb.from('consignments').insert(payload);
  if (error) { showToast('Error: ' + error.message, 'error'); }
  else { closeModal('consignment-modal'); await loadConsignments(); renderConsignments(); }
  btn.disabled = false; btn.textContent = 'Save Consignment';
}

async function deleteConsignment(id, btn) {
  if (!confirm('Delete this consignment? This cannot be undone.')) return;
  if (btn) { btn.disabled = true; btn.textContent = '…'; }
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
  const carIdRaw = document.getElementById('exp-car').value;
  const carId    = carIdRaw ? parseInt(carIdRaw) : null;
  const consignment = carId ? allConsignments.find(c => c.car_id === carId) : null;
  const payload = {
    consignment_id: consignment?.id || null,
    car_id:         carId,
    expense_date:   document.getElementById('exp-date').value,
    category:       document.getElementById('exp-cat').value,
    amount:         parseFloat(document.getElementById('exp-amount').value),
    description:    document.getElementById('exp-desc').value.trim(),
    ...tenantPayload(),
  };
  const btn = e.submitter;
  btn.disabled = true; btn.textContent = 'Saving…';
  const { error } = editId
    ? await sb.from('consignment_expenses').update(payload).eq('id', editId)
    : await sb.from('consignment_expenses').insert(payload);
  if (error) { showToast('Error: ' + error.message, 'error'); }
  else { closeModal('expense-modal'); await loadExpenses(); renderExpensesTable(); renderConsignments(); }
  btn.disabled = false; btn.textContent = 'Save Expense';
}

async function deleteExpense(id, btn) {
  if (!confirm('Delete this expense?')) return;
  if (btn) { btn.disabled = true; btn.textContent = '…'; }
  await sb.from('consignment_expenses').delete().eq('id', id);
  await loadExpenses();
  renderExpensesTable();
  renderConsignments();
}

// ====================================================
//  CUSTOMERS
// ====================================================
async function loadCustomers() {
  const { data, error } = await withTenant(sb.from('customers').select('*').order('name'));
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
      (c.email && r.customer_email && r.customer_email.toLowerCase() === c.email.toLowerCase()) ||
      (c.phone && r.customer_phone && r.customer_phone === c.phone) ||
      (!c.email && !c.phone && r.customer_name === c.name)
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
          <button class="btn-icon write-action" onclick="openEditCustomer('${c.id}')" title="Edit" aria-label="Edit customer">✏️</button>
          <button class="btn-icon danger write-action" onclick="deleteCustomer('${c.id}', this)" title="Delete" aria-label="Delete customer">🗑️</button>
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
    ...tenantPayload(),
  };
  const btn = e.submitter;
  btn.disabled = true; btn.textContent = 'Saving…';
  const { error } = editId
    ? await sb.from('customers').update(payload).eq('id', editId)
    : await sb.from('customers').insert(payload);
  if (error) { showToast('Error: ' + error.message, 'error'); }
  else { closeModal('customer-modal'); await loadCustomers(); renderCustomers(); }
  btn.disabled = false; btn.textContent = 'Save Customer';
}

async function deleteCustomer(id, btn) {
  if (!confirm('Delete this customer?')) return;
  if (btn) { btn.disabled = true; btn.textContent = '…'; }
  await sb.from('customers').delete().eq('id', id);
  await loadCustomers();
  renderCustomers();
}

// ====================================================
//  ROI CALCULATOR
// ====================================================
function renderROIFleetCards() {
  const container = document.getElementById('roi-fleet-cards');
  if (!container) return;
  if (!allCars.length) { container.innerHTML = '<p style="color:var(--muted);font-size:0.85rem;">No vehicles in fleet.</p>'; return; }

  const today = new Date();

  container.innerHTML = allCars.map(car => {
    const revs = allReservations.filter(r => r.car_id === car.id && ['completed','confirmed','active'].includes(r.status));
    const totalRevenue = revs.reduce((s, r) => s + (parseFloat(r.total_amount) || 0), 0);

    // Booked days
    const bookedDays = revs.reduce((s, r) => {
      if (!r.start_date || !r.end_date) return s;
      const d = Math.round((new Date(r.end_date) - new Date(r.start_date)) / 86400000) + 1;
      return s + Math.max(1, d);
    }, 0);

    // Date range for utilization
    const startDates = revs.map(r => new Date(r.start_date)).filter(Boolean);
    const firstDate  = startDates.length ? new Date(Math.min(...startDates)) : null;
    const daySpan    = firstDate ? Math.max(1, Math.round((today - firstDate) / 86400000)) : 365;
    const utilPct    = Math.min(100, Math.round(bookedDays / Math.min(daySpan, 365) * 100));

    // Expenses attributed to this car
    const carExpenses = allExpenses.filter(e => e.car_id === car.id).reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    const netProfit = totalRevenue - carExpenses;

    // Avg daily rate (actual)
    const avgRate = bookedDays > 0 ? (totalRevenue / bookedDays) : (car.daily_rate || 0);

    // Annualised revenue
    const annualRev = daySpan > 30 ? Math.round(totalRevenue / daySpan * 365) : Math.round(avgRate * (utilPct / 100) * 365);

    const fmt = (n) => '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    const profitClass = netProfit >= 0 ? 'pos' : 'neg';

    return `
    <div class="roi-fleet-card">
      <div class="rfc-header">
        <span class="rfc-dot" style="background:${car.color}"></span>
        <span class="rfc-name">${esc(car.name)}</span>
      </div>
      <div class="rfc-grid">
        <div class="rfc-stat">
          <div class="rfc-stat-label">Total Revenue</div>
          <div class="rfc-stat-val pos">${fmt(totalRevenue)}</div>
        </div>
        <div class="rfc-stat">
          <div class="rfc-stat-label">Total Expenses</div>
          <div class="rfc-stat-val${carExpenses > 0 ? ' neg' : ''}">${fmt(carExpenses)}</div>
        </div>
        <div class="rfc-stat">
          <div class="rfc-stat-label">Net Profit</div>
          <div class="rfc-stat-val ${profitClass}">${netProfit < 0 ? '-' : ''}${fmt(netProfit)}</div>
        </div>
        <div class="rfc-stat">
          <div class="rfc-stat-label">Utilization</div>
          <div class="rfc-stat-val">${utilPct}%</div>
        </div>
        <div class="rfc-stat">
          <div class="rfc-stat-label">Avg Daily Rate</div>
          <div class="rfc-stat-val">$${Math.round(avgRate)}</div>
        </div>
        <div class="rfc-stat">
          <div class="rfc-stat-label">Annual Projection</div>
          <div class="rfc-stat-val pos">${fmt(annualRev)}</div>
        </div>
      </div>
    </div>`;
  }).join('');
}

function _loanPayment(price, down, aprPct, months) {
  const principal = Math.max(0, price - down);
  if (principal === 0 || months === 0) return 0;
  if (aprPct === 0) return principal / months;
  const r = aprPct / 100 / 12;
  return principal * (r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

let _roiChart = null;

function recalcROI() {
  const price      = parseFloat(document.getElementById('roi-price')?.value)  || 0;
  const down       = parseFloat(document.getElementById('roi-down')?.value)   || 0;
  const apr        = parseFloat(document.getElementById('roi-apr')?.value)    || 0;
  const term       = parseInt(document.getElementById('roi-term')?.value)     || 60;
  const rate       = parseFloat(document.getElementById('roi-rate')?.value)   || 0;
  const util       = parseInt(document.getElementById('roi-util')?.value)     || 60;
  const commission = parseInt(document.getElementById('roi-commission')?.value) || 25;
  const maint      = parseFloat(document.getElementById('roi-maint')?.value)  || 0;
  const insur      = parseFloat(document.getElementById('roi-insur')?.value)  || 0;
  const other      = parseFloat(document.getElementById('roi-other')?.value)  || 0;

  const loanPmt      = _loanPayment(price, down, apr, term);
  const daysPerMonth = 30.44;
  const grossRevenue = rate * (util / 100) * daysPerMonth;
  const turoFee      = grossRevenue * (commission / 100);
  const netRevenue   = grossRevenue - turoFee;
  const totalExpenses = loanPmt + maint + insur + other;
  const monthlyProfit = netRevenue - totalExpenses;
  const annualROI     = price > 0 ? (monthlyProfit * 12) / price * 100 : 0;
  const breakeven     = monthlyProfit > 0 ? Math.ceil((down + (price - down) * 0.1) / monthlyProfit) : null;

  const fmt = (n, digits = 0) => '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  const set = (id, val, cls) => {
    const el = document.getElementById(id);
    if (!el) return;
    const span = el.querySelector('.rrc-val');
    if (span) { span.textContent = val; span.className = 'rrc-val' + (cls ? ' ' + cls : ''); }
  };

  set('rrc-loan',       loanPmt > 0 ? fmt(loanPmt) : '—');
  set('rrc-gross',      grossRevenue > 0 ? fmt(grossRevenue) : '—');
  set('rrc-commission', turoFee > 0 ? '-' + fmt(turoFee) : '—', 'rrc-neg');
  set('rrc-expenses',   totalExpenses > 0 ? '-' + fmt(totalExpenses) : '—', 'rrc-neg');

  const profitEl = document.getElementById('rrc-profit-val');
  if (profitEl) {
    profitEl.textContent = grossRevenue > 0 ? (monthlyProfit < 0 ? '-' : '') + fmt(monthlyProfit) : '—';
    profitEl.className   = 'rrc-val' + (monthlyProfit >= 0 ? ' rrc-pos' : ' rrc-neg');
  }

  set('rrc-breakeven', breakeven ? breakeven + ' months' : monthlyProfit <= 0 ? 'Never' : '—');
  set('rrc-roi',       grossRevenue > 0 ? annualROI.toFixed(1) + '%' : '—', annualROI >= 0 ? 'rrc-pos' : 'rrc-neg');

  // Build 24-month projection chart
  const months24 = Array.from({ length: 24 }, (_, i) => i + 1);
  const cumRevenue = months24.map(m => Math.round(netRevenue * m));
  const cumCosts   = months24.map(m => Math.round(down + totalExpenses * m));

  const ctx = document.getElementById('roi-chart');
  if (!ctx) return;

  if (_roiChart) { _roiChart.destroy(); _roiChart = null; }
  _roiChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: months24.map(m => 'M' + m),
      datasets: [
        {
          label: 'Cumulative Revenue',
          data: cumRevenue,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16,185,129,0.08)',
          fill: true,
          tension: 0.3,
          pointRadius: 0,
        },
        {
          label: 'Cumulative Costs',
          data: cumCosts,
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239,68,68,0.06)',
          fill: true,
          tension: 0.3,
          pointRadius: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } },
        tooltip: { callbacks: { label: ctx => ctx.dataset.label + ': $' + ctx.parsed.y.toLocaleString() } },
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10 } } },
        y: { ticks: { font: { size: 10 }, callback: v => '$' + (v / 1000).toFixed(0) + 'k' } },
      },
    },
  });
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

  const carIds = carVal ? [parseInt(carVal)] : allCars.map(c => c.id);
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

// ====================================================
//  CSV EXPORT
// ====================================================
function exportReservationsCSV() {
  const fromVal = document.getElementById('report-from')?.value || '';
  const toVal   = document.getElementById('report-to')?.value   || '';
  const carVal  = document.getElementById('report-car')?.value  || '';

  const rows = allReservations.filter(r => {
    if (r.status === 'cancelled') return false;
    if (fromVal && r.pickup_date < fromVal) return false;
    if (toVal   && r.pickup_date > toVal)   return false;
    if (carVal  && String(r.car_id) !== carVal) return false;
    return true;
  });

  const headers = ['ID', 'Customer', 'Email', 'Phone', 'Vehicle', 'Pickup Date', 'Return Date', 'Days', 'Location', 'Total', 'Status', 'Source'];
  const lines = [headers.join(',')];
  rows.forEach(r => {
    const days = dateDiff(r.pickup_date, r.return_date);
    lines.push([
      r.id,
      '"' + (r.customer_name  || '').replace(/"/g,'""') + '"',
      '"' + (r.customer_email || '').replace(/"/g,'""') + '"',
      '"' + (r.customer_phone || '').replace(/"/g,'""') + '"',
      '"' + (CAR_NAMES[r.car_id] || '').replace(/"/g,'""') + '"',
      r.pickup_date,
      r.return_date,
      days,
      '"' + (r.pickup_location || '').replace(/"/g,'""') + '"',
      r.total_amount || 0,
      r.status,
      r.source || '',
    ].join(','));
  });

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'reservations_' + (fromVal || 'all') + '_to_' + (toVal || 'all') + '.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ====================================================
//  NOTIFICATIONS — new bookings since last visit
// ====================================================
function checkNewBookings() {
  const lastSeen = localStorage.getItem('admin_last_seen') || '1970-01-01T00:00:00Z';
  const newCount = allReservations.filter(r =>
    r.created_at && r.created_at > lastSeen && r.source !== 'admin'
  ).length;

  const badge = document.getElementById('new-booking-badge');
  if (badge) {
    if (newCount > 0) {
      badge.textContent = newCount > 9 ? '9+' : String(newCount);
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  }
}

function markBookingsSeen() {
  localStorage.setItem('admin_last_seen', new Date().toISOString());
  const badge = document.getElementById('new-booking-badge');
  if (badge) badge.style.display = 'none';
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
  } else {
    const ctx = document.getElementById('revenueChart');
    if (ctx) {
      window._trendChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: months,
          datasets: [{
            label: 'Revenue ($)',
            data: revenues,
            borderColor: '#111c2d',
            backgroundColor: 'rgba(17, 28, 45, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#111c2d',
            pointRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
            x: { grid: { display: false } }
          }
        }
      });
    }
  }
  // Distribution by car bookings
  const carIds = allCars.map(c => c.id);
  const carBookings = carIds.map(id => source.filter(r => r.car_id === id).length);
  if (window._distChart) {
    window._distChart.data.datasets[0].data = carBookings;
    window._distChart.data.labels = carIds.map(id => CAR_NAMES[id]);
    window._distChart.data.datasets[0].backgroundColor = carIds.map(id => CAR_COLORS[id]);
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

  const alerts = [];

  // Date-based alerts
  allServices.forEach(s => {
    if (!s.next_service_date) return;
    const cls = expiryClass(s.next_service_date);
    if (cls === 'expiry-ok') return;
    const color = cls === 'expiry-danger' ? 'var(--red)' : '#FCD34D';
    alerts.push(`<div style="background:rgba(255,255,255,0.04);border:1px solid ${color};border-radius:10px;padding:0.75rem 1rem;margin-bottom:0.5rem;font-size:0.82rem;display:flex;align-items:center;gap:0.75rem;">
      <span style="color:${color};font-size:1rem;">⚠</span>
      <span><strong>${CAR_NAMES[s.car_id]}</strong> — ${esc(s.service_type)} due <strong style="color:${color};">${fmtDate(s.next_service_date)}</strong>${s.provider ? ' at ' + esc(s.provider) : ''}</span>
    </div>`);
  });

  // Mileage-based alerts — check latest record with next_service_mileage per car
  allCars.forEach(car => {
    const carId = car.id;
    if (!car.mileage) return;
    const lastMileSvc = allServices
      .filter(s => s.car_id === carId && s.next_service_mileage)
      .sort((a, b) => (b.mileage || 0) - (a.mileage || 0))[0];
    if (!lastMileSvc) return;
    const cls = mileageAlertClass(car.mileage, lastMileSvc.next_service_mileage);
    if (cls === 'expiry-ok' || cls === '') return;
    const remaining = lastMileSvc.next_service_mileage - car.mileage;
    const color     = cls === 'expiry-danger' ? 'var(--red)' : '#FCD34D';
    const msg       = remaining <= 0
      ? `overdue by <strong style="color:${color};">${Math.abs(remaining).toLocaleString()} mi</strong>`
      : `due in <strong style="color:${color};">${remaining.toLocaleString()} mi</strong> (@ ${Number(lastMileSvc.next_service_mileage).toLocaleString()} mi)`;
    alerts.push(`<div style="background:rgba(255,255,255,0.04);border:1px solid ${color};border-radius:10px;padding:0.75rem 1rem;margin-bottom:0.5rem;font-size:0.82rem;display:flex;align-items:center;gap:0.75rem;">
      <span style="color:${color};font-size:1rem;">🔧</span>
      <span><strong>${CAR_NAMES[carId]}</strong> — ${esc(lastMileSvc.service_type)} ${msg} · current: ${Number(car.mileage).toLocaleString()} mi</span>
    </div>`);
  });

  el.innerHTML = alerts.join('');
}

function updateMaintenanceBadge() {
  const badge = document.getElementById('maintenance-badge');
  if (!badge) return;
  let count = 0;
  allServices.forEach(s => {
    if (s.next_service_date && expiryClass(s.next_service_date) !== 'expiry-ok') count++;
  });
  allCars.forEach(car => {
    const lastMileSvc = allServices
      .filter(s => s.car_id === car.id && s.next_service_mileage)
      .sort((a, b) => (b.mileage || 0) - (a.mileage || 0))[0];
    if (lastMileSvc && car.mileage && mileageAlertClass(car.mileage, lastMileSvc.next_service_mileage) !== 'expiry-ok' && mileageAlertClass(car.mileage, lastMileSvc.next_service_mileage) !== '') count++;
  });
  if (count > 0) {
    badge.textContent = count;
    badge.style.display = '';
  } else {
    badge.style.display = 'none';
  }
}

// ====================================================
//  CARS & MAINTENANCE
// ====================================================
async function loadCars() {
  const { data, error } = await withTenant(sb.from('cars').select('*').order('id'));
  if (!error && data && data.length > 0) {
    CAR_COLORS = {}; CAR_NAMES = {}; DAILY_RATES = {};
    allCars = data.map((v, i) => {
      CAR_NAMES[v.id]   = `${v.make} ${v.model_full || v.model}`;
      DAILY_RATES[v.id] = v.daily_rate;
      CAR_COLORS[v.id]  = v.color || ['#3B82F6', '#8B5CF6', '#F59E0B', '#10B981', '#ef4444'][i % 5];
      return {
        id: v.id, make: v.make, model: v.model,
        name: CAR_NAMES[v.id], color: CAR_COLORS[v.id],
        year: v.year, car_color: v.car_color, plate: v.plate, vin: v.vin,
        mileage: v.mileage,
        insurance_expiry: v.insurance_expiry,
        registration_expiry: v.registration_expiry,
        daily_rate: v.daily_rate,
        notes: v.notes,
        turo_vehicle_id: v.turo_vehicle_id || null,
        // Public display fields
        model_full:   v.model_full   || null,
        image_url:    v.image_url    || null,
        gallery:      v.gallery      || [],
        category:     v.category     || 'suv',
        badge:        v.badge        || null,
        seats:        v.seats        || 5,
        transmission: v.transmission || 'Auto',
        hp:           v.hp           || null,
        top_speed:    v.top_speed    || null,
        features:     v.features     || [],
        description:  v.description  || null,
        status:       v.status       || 'available',
      };
    });
  } else {
    allCars = [];
  }
}

async function loadServices() {
  const { data, error } = await withTenant(sb.from('car_services').select('*').order('service_date', { ascending: false }));
  if (!error) { allServices = data || []; updateMaintenanceBadge(); }
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

  const rows = allCars.map(car => {
    const insClass  = expiryClass(car.insurance_expiry);
    const regClass  = expiryClass(car.registration_expiry);
    const thumbHtml = car.image_url
      ? `<img src="${esc(car.image_url)}" style="width:40px;height:30px;object-fit:cover;border-radius:4px;flex-shrink:0;" onerror="this.style.display='none'" />`
      : `<span style="width:40px;height:30px;border-radius:4px;background:var(--bg-tertiary);display:inline-flex;align-items:center;justify-content:center;font-size:0.65rem;color:var(--muted);flex-shrink:0;">No img</span>`;
    const statusDot = car.status === 'unavailable'
      ? `<span style="font-size:0.65rem;background:#fef2f2;color:#ef4444;border-radius:4px;padding:1px 5px;margin-left:4px;">Hidden</span>`
      : '';
    return `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:0.6rem;">
            ${thumbHtml}
            <div>
              <strong>${esc(car.name)}</strong>${statusDot}
              ${car.badge ? `<div style="font-size:0.7rem;color:var(--muted);">${esc(car.badge)}</div>` : ''}
            </div>
          </div>
        </td>
        <td>${car.year || '—'}</td>
        <td>${esc(car.car_color || '—')}</td>
        <td>${esc(car.plate || '—')}</td>
        <td style="font-size:0.75rem;color:var(--muted-2);">${esc(car.vin || '—')}</td>
        <td>${car.mileage ? Number(car.mileage).toLocaleString() + ' mi' : '—'}</td>
        <td><span class="${insClass}">${expiryLabel(car.insurance_expiry)}</span></td>
        <td><span class="${regClass}">${expiryLabel(car.registration_expiry)}</span></td>
        <td>$${car.daily_rate || DAILY_RATES[car.id] || '—'}/day</td>
        <td class="actions">
          <button class="btn-icon write-action" onclick="openEditCar(${car.id})" title="Edit" aria-label="Edit vehicle">✏️</button>
          <button class="btn-icon write-action" onclick="openAddService(${car.id})" title="Add Service" aria-label="Add service record">🔧</button>
        </td>
      </tr>`;
  });

  tbody.innerHTML = rows.join('');
}

function renderFleetStatus() {
  const tbody = document.getElementById('fleet-status-tbody');
  if (!tbody) return;

  tbody.innerHTML = allCars.map(car => {
    const id = car.id;
    const lastSvc = allServices.find(s => s.car_id === id);
    const nextSvc = allServices
      .filter(s => s.car_id === id && s.next_service_date)
      .sort((a, b) => a.next_service_date.localeCompare(b.next_service_date))[0];
    const nextCls = nextSvc ? expiryClass(nextSvc.next_service_date) : '';

    // Latest service record that has mileage-based next target
    const lastMileSvc = allServices
      .filter(s => s.car_id === id && s.next_service_mileage)
      .sort((a, b) => (b.mileage || 0) - (a.mileage || 0))[0];

    let oilCell = '<span style="color:var(--muted);">—</span>';
    if (lastMileSvc?.next_service_mileage) {
      const current   = car.mileage || 0;
      const nextMi    = lastMileSvc.next_service_mileage;
      const interval  = lastMileSvc.mileage_interval || (nextMi - (lastMileSvc.mileage || 0));
      const remaining = nextMi - current;
      const pct       = interval > 0 ? Math.min(100, Math.max(0, ((current - (lastMileSvc.mileage || 0)) / interval) * 100)) : 0;
      const color     = remaining <= 0 ? 'var(--red)' : remaining <= 500 ? '#FCD34D' : '#10B981';
      const label     = remaining <= 0
        ? `⚠ Overdue by ${Math.abs(remaining).toLocaleString()} mi`
        : `${remaining.toLocaleString()} mi left`;
      oilCell = `
        <div style="font-size:0.78rem;color:${color};font-weight:600;">${label}</div>
        <div style="font-size:0.7rem;color:var(--muted-2);">@ ${Number(nextMi).toLocaleString()} mi · ${esc(lastMileSvc.service_type)}</div>
        <div class="mileage-bar"><div class="mileage-bar-fill" style="width:${pct}%;background:${color};"></div></div>`;
    }

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
        <td>${oilCell}</td>
        <td>${nextSvc ? '<span class="' + nextCls + '">' + fmtDate(nextSvc.next_service_date) + ' · ' + esc(nextSvc.service_type) + '</span>' : '<span style="color:var(--muted);">—</span>'}</td>
        <td class="actions">
          <button class="btn btn-outline write-action" style="font-size:0.75rem;padding:0.4rem 0.75rem;" onclick="openAddService(${id})">+ Add</button>
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
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;color:var(--muted);padding:2.5rem">No service records found</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(s => {
    let nextMiCell = '—';
    if (s.next_service_mileage) {
      const car     = allCars.find(c => c.id === s.car_id) || {};
      const current = car.mileage || 0;
      const cls     = mileageAlertClass(current, s.next_service_mileage);
      const label   = Number(s.next_service_mileage).toLocaleString() + ' mi';
      nextMiCell    = `<strong class="${cls}">${label}</strong>`;
      if (s.mileage_interval) nextMiCell += `<br><span style="font-size:0.7rem;color:var(--muted);">+${Number(s.mileage_interval).toLocaleString()} mi interval</span>`;
    }
    return `
    <tr>
      <td>${fmtDate(s.service_date)}</td>
      <td><span class="car-dot-inline" style="background:${CAR_COLORS[s.car_id] || '#666'}"></span>${CAR_NAMES[s.car_id] || '—'}</td>
      <td><span class="service-type-badge ${SVC_BADGE[s.service_type] || 'svc-other'}">${esc(s.service_type)}</span></td>
      <td>${s.mileage ? Number(s.mileage).toLocaleString() + ' mi' : '—'}</td>
      <td style="color:var(--muted-2);">${esc(s.provider || '—')}</td>
      <td style="color:var(--red);font-weight:600;">${s.cost ? '$' + Number(s.cost).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '—'}</td>
      <td>${s.next_service_date ? `<strong class="${expiryClass(s.next_service_date)}">${fmtDate(s.next_service_date)}</strong>` : '—'}</td>
      <td>${nextMiCell}</td>
      <td style="color:var(--muted-2);max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(s.notes || '—')}</td>
      <td class="actions">
        <button class="btn-icon write-action" onclick="openEditService('${s.id}')" title="Edit" aria-label="Edit service record">✏️</button>
        <button class="btn-icon danger write-action" onclick="deleteService('${s.id}', this)" title="Delete" aria-label="Delete service record">🗑️</button>
      </td>
    </tr>`;
  }).join('');
}

function openAddCar() {
  const form = document.getElementById('car-form');
  form.reset();
  delete form.dataset.carId;
  document.getElementById('car-modal-title').textContent = 'Add New Vehicle';
  document.getElementById('car-img-preview').innerHTML = '';
  document.getElementById('car-gallery-preview').innerHTML = '';
  document.getElementById('gallery-upload-status').textContent = '';
  document.getElementById('car-status').value = 'available';
  document.getElementById('car-category').value = 'suv';
  openModal('car-modal');
}

function openEditCar(id) {
  const car = allCars.find(c => c.id === id);
  if (!car) { showToast('Vehicle not found.', 'error'); return; }
  const form = document.getElementById('car-form');
  form.dataset.carId = id;
  document.getElementById('car-modal-title').textContent = `Edit — ${CAR_NAMES[id] || 'Vehicle'}`;
  // Internal
  document.getElementById('car-make').value          = car.make             || '';
  document.getElementById('car-model').value         = car.model            || '';
  document.getElementById('car-year').value          = car.year             || '';
  document.getElementById('car-color').value         = car.car_color        || '';
  document.getElementById('car-plate').value         = car.plate            || '';
  document.getElementById('car-vin').value           = car.vin              || '';
  document.getElementById('car-mileage').value       = car.mileage          || '';
  document.getElementById('car-rate').value          = car.daily_rate       || '';
  document.getElementById('car-insurance').value     = car.insurance_expiry || '';
  document.getElementById('car-registration').value  = car.registration_expiry || '';
  document.getElementById('car-notes').value         = car.notes            || '';
  // Public display
  document.getElementById('car-model-full').value   = car.model_full    || '';
  document.getElementById('car-category').value     = car.category      || 'suv';
  document.getElementById('car-badge').value        = car.badge         || '';
  document.getElementById('car-status').value       = car.status        || 'available';
  document.getElementById('car-seats').value        = car.seats         || '';
  document.getElementById('car-transmission').value = car.transmission  || '';
  document.getElementById('car-hp').value           = car.hp            || '';
  document.getElementById('car-description').value  = car.description   || '';
  document.getElementById('car-features').value     = Array.isArray(car.features) ? car.features.join('\n') : '';
  document.getElementById('car-image-url').value    = car.image_url     || '';
  const galleryUrls = Array.isArray(car.gallery) ? car.gallery : [];
  document.getElementById('car-gallery').value      = galleryUrls.join('\n');
  // Previews
  previewMainImage(car.image_url || '');
  renderGalleryPreview(galleryUrls);
  document.getElementById('gallery-upload-status').textContent = '';
  openModal('car-modal');
}

async function saveCar(e) {
  e.preventDefault();
  const carId       = parseInt(document.getElementById('car-form').dataset.carId);
  const existingCar = allCars.find(c => c.id === carId);
  if (!existingCar && !checkPlanLimit('car')) return;

  const galleryRaw  = document.getElementById('car-gallery').value.trim();
  const featuresRaw = document.getElementById('car-features').value.trim();

  const payload = {
    // Internal
    make:                  document.getElementById('car-make').value.trim()        || null,
    model:                 document.getElementById('car-model').value.trim()       || null,
    year:                  parseInt(document.getElementById('car-year').value)     || null,
    car_color:             document.getElementById('car-color').value.trim(),
    plate:                 document.getElementById('car-plate').value.trim(),
    vin:                   document.getElementById('car-vin').value.trim(),
    mileage:               parseInt(document.getElementById('car-mileage').value)  || null,
    daily_rate:            parseFloat(document.getElementById('car-rate').value)   || null,
    insurance_expiry:      document.getElementById('car-insurance').value          || null,
    registration_expiry:   document.getElementById('car-registration').value       || null,
    notes:                 document.getElementById('car-notes').value.trim(),
    // Public display
    model_full:    document.getElementById('car-model-full').value.trim()   || null,
    category:      document.getElementById('car-category').value            || 'suv',
    badge:         document.getElementById('car-badge').value.trim()        || null,
    status:        document.getElementById('car-status').value              || 'available',
    seats:         parseInt(document.getElementById('car-seats').value)     || null,
    transmission:  document.getElementById('car-transmission').value.trim() || null,
    hp:            document.getElementById('car-hp').value.trim()           || null,
    description:   document.getElementById('car-description').value.trim()  || null,
    image_url:     document.getElementById('car-image-url').value.trim()    || null,
    features:      featuresRaw ? featuresRaw.split('\n').map(s => s.trim()).filter(Boolean) : [],
    gallery:       galleryRaw  ? galleryRaw.split('\n').map(s => s.trim()).filter(Boolean)  : [],
  };

  const btn = e.submitter;
  btn.disabled = true; btn.textContent = 'Saving…';

  const { error } = existingCar
    ? await sb.from('cars').update(payload).eq('id', carId)
    : await sb.from('cars').insert({ ...payload, ...tenantPayload() });

  if (error) { showToast('Error: ' + error.message, 'error'); }
  else { closeModal('car-modal'); await loadCars(); renderCarCards(); populateCarFilterDropdowns(); populateFeedCarDropdown(); }
  btn.disabled = false; btn.textContent = 'Save Vehicle';
}

// ---- VIN Decoder ----
async function decodeVin() {
  const vin = document.getElementById('car-vin').value.trim();
  if (!vin || vin.length < 11) { showToast('Enter a valid VIN (min 11 characters).', 'error'); return; }

  const btn = document.getElementById('decode-vin-btn');
  btn.disabled = true; btn.textContent = 'Decoding…';

  try {
    // Step 1: NHTSA — make, model, year, transmission, seats
    const nhtsaRes = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${encodeURIComponent(vin)}?format=json`);
    const nhtsaJson = await nhtsaRes.json();
    const r = nhtsaJson.Results?.[0] || {};

    const make  = (r.Make  || '').trim();
    const model = (r.Model || '').trim();
    const year  = (r.ModelYear || '').trim();

    if (make)  document.getElementById('car-make').value  = make;
    if (model) document.getElementById('car-model').value = model;
    if (year)  document.getElementById('car-year').value  = year;

    // Seats
    const seats = r.Seats || r.NumberOfSeats || '';
    if (seats && seats !== '0') document.getElementById('car-seats').value = seats;

    // Transmission — simplify NHTSA verbose strings
    const transStyle  = (r.TransmissionStyle || '').toLowerCase();
    const transSpeeds = (r.TransmissionSpeeds || '').trim();
    let transLabel = '';
    if (transStyle.includes('manual'))                      transLabel = 'Manual';
    else if (transStyle.includes('continuously variable'))  transLabel = 'CVT';
    else if (transStyle.includes('automatic') && transSpeeds && transSpeeds !== '0')
                                                            transLabel = `${transSpeeds}-Speed`;
    else if (transStyle.includes('automatic'))              transLabel = 'Auto';
    if (transLabel) document.getElementById('car-transmission').value = transLabel;

    // Step 2: CarQuery — HP (JSONP)
    if (make && model && year) {
      try {
        const cqMake  = make.toLowerCase().replace(/\s+/g, '%20');
        const cqModel = model.toLowerCase().replace(/\s+/g, '%20');
        const cqData  = await new Promise((resolve, reject) => {
          const cb = '_cq' + Date.now();
          window[cb] = (d) => { delete window[cb]; sc.remove(); resolve(d); };
          const sc = document.createElement('script');
          sc.src = `https://www.carqueryapi.com/api/0.3/?cmd=getTrims&make=${cqMake}&model=${cqModel}&year=${year}&callback=${cb}`;
          sc.onerror = () => { delete window[cb]; reject(new Error('CarQuery error')); };
          document.head.appendChild(sc);
          setTimeout(() => { try { delete window[cb]; sc.remove(); } catch(e){} reject(new Error('timeout')); }, 6000);
        });

        const trims = cqData?.Trims || [];
        if (trims.length > 0) {
          const ps = parseFloat(trims[0].power_ps);
          if (ps > 0) document.getElementById('car-hp').value = `${Math.round(ps * 0.9863)} HP`;
          if (!document.getElementById('car-seats').value) {
            const cqSeats = trims[0].seats;
            if (cqSeats && cqSeats !== '0') document.getElementById('car-seats').value = cqSeats;
          }
        }
      } catch (_) { /* CarQuery failed silently — HP needs manual entry */ }
    }

    showToast('VIN decoded! Review and adjust if needed.', 'success');
  } catch (err) {
    showToast('Decode failed. Check your connection.', 'error');
  }

  btn.disabled = false; btn.textContent = '🔍 Decode VIN';
}

// ---- Image upload helpers ----
function previewMainImage(url) {
  const el = document.getElementById('car-img-preview');
  if (!el) return;
  el.innerHTML = url
    ? `<img src="${url}" style="max-height:110px;max-width:100%;border-radius:8px;object-fit:cover;border:1px solid var(--border);" onerror="this.style.display='none'" />`
    : '';
}

function renderGalleryPreview(urls) {
  const el = document.getElementById('car-gallery-preview');
  if (!el) return;
  el.innerHTML = urls.map(url =>
    `<img src="${url}" style="width:72px;height:54px;object-fit:cover;border-radius:6px;border:1px solid var(--border);" onerror="this.style.display='none'" />`
  ).join('');
}

async function uploadCarMainImage(input) {
  if (!input.files?.[0]) return;
  const file  = input.files[0];
  const carId = document.getElementById('car-form').dataset.carId || 'new';
  const path  = `cars/${carId}/main_${Date.now()}.${file.name.split('.').pop()}`;
  const btn   = input.previousElementSibling || input;

  const { error } = await sb.storage.from('car-images').upload(path, file, { upsert: true });
  if (error) { showToast('Upload failed: ' + error.message, 'error'); return; }
  const { data: { publicUrl } } = sb.storage.from('car-images').getPublicUrl(path);
  document.getElementById('car-image-url').value = publicUrl;
  previewMainImage(publicUrl);
}

async function uploadCarGalleryImages(input) {
  if (!input.files?.length) return;
  const carId    = document.getElementById('car-form').dataset.carId || 'new';
  const statusEl = document.getElementById('gallery-upload-status');
  const existing = document.getElementById('car-gallery').value.trim();
  const urls     = existing ? existing.split('\n').filter(Boolean) : [];

  statusEl.textContent = 'Uploading…';
  for (const file of input.files) {
    const path = `cars/${carId}/gallery_${Date.now()}_${Math.random().toString(36).slice(2)}.${file.name.split('.').pop()}`;
    const { error } = await sb.storage.from('car-images').upload(path, file, { upsert: true });
    if (!error) {
      const { data: { publicUrl } } = sb.storage.from('car-images').getPublicUrl(path);
      urls.push(publicUrl);
    }
  }
  document.getElementById('car-gallery').value = urls.join('\n');
  renderGalleryPreview(urls);
  statusEl.textContent = `${input.files.length} photo(s) uploaded.`;
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
  document.getElementById('svc-mileage').value       = s.mileage              || '';
  document.getElementById('svc-cost').value          = s.cost                || '';
  document.getElementById('svc-interval').value      = s.mileage_interval    || '';
  document.getElementById('svc-next-mileage').value  = s.next_service_mileage || '';
  document.getElementById('svc-provider').value      = s.provider            || '';
  document.getElementById('svc-next').value          = s.next_service_date   || '';
  document.getElementById('svc-notes').value         = s.notes               || '';
  openModal('service-modal');
}

async function saveService(e) {
  e.preventDefault();
  const form   = document.getElementById('service-form');
  const editId = form.dataset.editId;
  const svcMileage     = parseInt(document.getElementById('svc-mileage').value)      || null;
  const svcCarId       = parseInt(document.getElementById('svc-car').value);
  const payload = {
    car_id:               svcCarId,
    service_date:         document.getElementById('svc-date').value,
    service_type:         document.getElementById('svc-type').value,
    mileage:              svcMileage,
    cost:                 parseFloat(document.getElementById('svc-cost').value)        || null,
    mileage_interval:     parseInt(document.getElementById('svc-interval').value)      || null,
    next_service_mileage: parseInt(document.getElementById('svc-next-mileage').value)  || null,
    provider:             document.getElementById('svc-provider').value.trim(),
    next_service_date:    document.getElementById('svc-next').value                    || null,
    notes:                document.getElementById('svc-notes').value.trim(),
    ...tenantPayload(),
  };
  const btn = e.submitter;
  btn.disabled = true; btn.textContent = 'Saving…';
  const { error } = editId
    ? await sb.from('car_services').update(payload).eq('id', editId)
    : await sb.from('car_services').insert(payload);
  if (error) { showToast('Error: ' + error.message, 'error'); }
  else {
    // Auto-update car's odometer if service mileage is higher than recorded
    if (svcMileage) {
      const car = allCars.find(c => c.id === svcCarId);
      if (!car?.mileage || svcMileage > car.mileage) {
        await sb.from('cars').update({ mileage: svcMileage }).eq('id', svcCarId);
        // Keep allCars in sync so fleet status re-renders correctly
        const localCar = allCars.find(c => c.id === svcCarId);
        if (localCar) localCar.mileage = svcMileage;
      }
    }
    closeModal('service-modal');
    await Promise.all([loadServices(), loadCars()]);
    renderFleetStatus(); renderServicesTable(); renderCarCards(); renderMaintenanceAlerts();
  }
  btn.disabled = false; btn.textContent = 'Save Record';
}

async function deleteService(id, btn) {
  if (!confirm('Delete this service record?')) return;
  if (btn) { btn.disabled = true; btn.textContent = '…'; }
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
  expenses:     'Expenses',
  reports:      'Reports &amp; Analytics',
  turo:         'Calendar Sync',
  users:        'Team &amp; Access',
  roi:          'ROI Calculator',
};

function switchTab(tab) {
  // Block Pro-only tabs for non-pro users
  if (currentPlan !== 'pro' && PRO_ONLY_TABS.includes(tab)) {
    openModal('upgrade-modal');
    return;
  }
  currentActiveTab = tab;
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.remove('active', 'bg-white/10', 'text-white');
    el.classList.add('bg-transparent', 'text-slate-400');
  });
  const t = document.getElementById('tab-' + tab);
  if (t) t.classList.add('active');
  const navItem = document.querySelector(`.nav-item[data-tab="${tab}"]`);
  if (navItem) {
    navItem.classList.remove('bg-transparent', 'text-slate-400');
    navItem.classList.add('active', 'bg-white/10', 'text-white');
  }
  const titleEl = document.getElementById('topbar-title');
  if (titleEl && TAB_TITLES[tab]) { titleEl.innerHTML = TAB_TITLES[tab]; }
  
  if (tab === 'bookings') { if (calendar) calendar.updateSize(); markBookingsSeen(); }
  if (tab === 'turo') renderCalendarFeeds();
  if (tab === 'consignments') renderConsignments();
  if (tab === 'expenses') renderExpensesTable();
  if (tab === 'cars') renderCarCards();
  if (tab === 'maintenance') { renderFleetStatus(); renderServicesTable(); renderMaintenanceAlerts(); }
  if (tab === 'customers') renderCustomers();
  if (tab === 'reports') renderReports();
  if (tab === 'users') loadUsers();
  if (tab === 'roi')   renderROIFleetCards();
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
function debounce(fn, ms = 250) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

function esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function openModal(id)  { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

// Auto-calculate next service mileage from mileage + interval
function calcNextMileage() {
  const mileage  = parseInt(document.getElementById('svc-mileage')?.value)  || 0;
  const interval = parseInt(document.getElementById('svc-interval')?.value) || 0;
  if (mileage && interval) {
    document.getElementById('svc-next-mileage').value = mileage + interval;
  }
}

// Mileage-based alert class
function mileageAlertClass(current, next) {
  if (!current || !next) return '';
  const diff = next - current;
  if (diff <= 0)   return 'expiry-danger';
  if (diff <= 500) return 'expiry-warn';
  return 'expiry-ok';
}

function showToast(msg, type = 'success') {
  const t = document.createElement('div');
  t.className = 'dash-toast' + (type === 'error' ? ' dash-toast-error' : '');
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('dash-toast-show'), 10);
  setTimeout(() => { t.classList.remove('dash-toast-show'); setTimeout(() => t.remove(), 300); }, 3000);
}

function toggleSidebar() {
  const aside = document.getElementById('main-sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (!aside) return;
  aside.classList.toggle('sidebar-open');
  overlay?.classList.toggle('active');
}

function initMobileNav() {
  const aside = document.getElementById('main-sidebar');
  const btn = document.getElementById('mobile-menu-btn');
  if (aside) aside.classList.remove('sidebar-open');
  if (btn && window.innerWidth <= 1024) btn.style.display = 'flex';
}

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
//  USER MANAGEMENT (Admin only)
// ====================================================
let allUsers = [];

async function loadUsers() {
  const usersGrid = document.getElementById('users-list');
  if (!usersGrid) return;
  usersGrid.innerHTML = '<p style="color:var(--muted);padding:1rem">Loading…</p>';

  const { data, error } = await withTenant(
    sb.from('profiles').select('id, full_name, role, created_at, auth_users:id(email)')
  );

  if (error) {
    // Fallback: profiles without joining auth.users (RLS may block the join)
    const { data: fallback } = await withTenant(
      sb.from('profiles').select('id, full_name, role, created_at')
    );
    allUsers = fallback || [];
  } else {
    allUsers = data || [];
  }

  renderUsers(allUsers);
}

function renderUsers(users) {
  const grid = document.getElementById('users-list');
  if (!grid) return;

  if (!users.length) {
    grid.innerHTML = '<p style="color:var(--muted);padding:1rem">No team members yet. Invite someone below.</p>';
    return;
  }

  const roleColors = { admin: '#6366F1', finance: '#10B981', staff: '#F59E0B' };

  grid.innerHTML = users.map(u => {
    const email      = u.auth_users?.email || '';
    const display    = u.full_name || email || 'Unknown';
    const initials   = display.split(/[\s@]+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
    const role       = u.role || 'staff';
    const color      = roleColors[role] || '#6B7280';
    const isSelf     = u.id === currentUserId;

    return `
      <div class="user-card">
        <div class="user-card-avatar" style="background:${color}">${esc(initials)}</div>
        <div class="user-card-info">
          <div class="user-card-name">${esc(display)}</div>
          <div class="user-card-email">${esc(email)}</div>
        </div>
        <div class="user-card-actions">
          <select class="user-role-select write-action" data-uid="${u.id}" onchange="updateUserRole('${u.id}', this.value)" ${isSelf ? 'disabled title="Cannot change your own role"' : ''}>
            <option value="admin"   ${role === 'admin'   ? 'selected' : ''}>Admin</option>
            <option value="finance" ${role === 'finance' ? 'selected' : ''}>Finance</option>
            <option value="staff"   ${role === 'staff'   ? 'selected' : ''}>Staff</option>
          </select>
          ${!isSelf ? `<button class="btn-icon danger write-action" onclick="removeUser('${u.id}')" title="Remove">🗑️</button>` : ''}
        </div>
      </div>`;
  }).join('');
}

function openInviteModal() {
  document.getElementById('invite-form')?.reset();
  const errEl = document.getElementById('invite-error');
  if (errEl) { errEl.textContent = ''; errEl.style.display = 'none'; }
  openModal('invite-modal');
}

async function inviteUser(e) {
  e.preventDefault();
  const name  = document.getElementById('inv-name').value.trim();
  const email = document.getElementById('inv-email').value.trim();
  const role  = document.getElementById('inv-role').value;
  const btn   = document.getElementById('invite-submit-btn');
  const errEl = document.getElementById('invite-error');

  errEl.style.display = 'none';
  btn.disabled = true;
  btn.textContent = 'Sending…';

  try {
    const res = await fetch('/.netlify/functions/invite-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, role, tenantId: currentTenantId }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Invite failed');

    closeModal('invite-modal');
    showToast(`Invite sent to ${email}`);
    await loadUsers();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Send Invite';
  }
}

async function updateUserRole(userId, newRole) {
  try {
    const { data: { session } } = await sb.auth.getSession();
    const res = await fetch('/.netlify/functions/update-user-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
      body: JSON.stringify({ targetUserId: userId, newRole }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to update role');
    showToast('Role updated');
  } catch (err) {
    showToast('Failed to update role: ' + err.message, 'error');
    await loadUsers(); // revert UI to DB state
  }
}

async function removeUser(userId) {
  if (!window.confirm('Remove this team member? They will lose dashboard access.')) return;
  const { error } = await sb.from('profiles').delete().eq('id', userId);
  if (error) {
    showToast('Failed to remove user: ' + error.message, 'error');
  } else {
    showToast('User removed');
    await loadUsers();
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
  initMobileNav();
  window.addEventListener('resize', initMobileNav);

  if (!(await checkAuth())) return;
  applyRoleRestrictions();

  await Promise.all([loadReservations(), loadBlockedDates(), loadTuroFeeds(), loadConsignments(), loadExpenses(), loadCars(), loadServices(), loadCustomers()]);

  populateFeedCarDropdown();
  populateCarFilterDropdowns();
  _setPlanUI();

  // Silently backfill any missing customers from existing reservations
  syncCustomersFromReservations(null, false);

  // Handle post-checkout redirect
  const _urlP = new URLSearchParams(window.location.search);
  if (_urlP.get('upgraded') === '1') {
    showToast('🎉 Plan activated! Welcome aboard.');
    window.history.replaceState({}, '', window.location.pathname);
  }
  if (_urlP.get('upgrade_cancelled') === '1') {
    window.history.replaceState({}, '', window.location.pathname);
  }

  updateStats();
  initCalendar();
  renderTable(true);
  renderRecentBookings();
  if (typeof Chart !== 'undefined') refreshCharts();
  checkNewBookings();

  // Sidebar tabs
  document.querySelectorAll('.nav-item[data-tab]').forEach(btn =>
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.tab);
      if (window.innerWidth <= 1024) {
        const aside = document.getElementById('main-sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        if (aside) aside.classList.remove('sidebar-open');
        if (overlay) overlay.classList.remove('active');
      }
    })
  );

  // Car filter buttons — "All Cars" static btn; dynamic ones use setCarFilter()
  document.querySelector('[data-car-filter="all"]')?.addEventListener('click', () => setCarFilter('all'));
  document.getElementById('bulk-select-all')?.addEventListener('change', function() {
    document.querySelectorAll('.bulk-cb').forEach(cb => cb.checked = this.checked);
    updateBulkBar();
  });

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

  // Table filters — reset page on filter change
  document.getElementById('search-input')?.addEventListener('input',  debounce(() => renderTable(true)));
  document.getElementById('status-filter')?.addEventListener('change', () => renderTable(true));
  document.getElementById('car-filter')?.addEventListener('change',    () => renderTable(true));

  // Calendar sync buttons
  document.getElementById('sync-turo-btn').addEventListener('click', syncTuro);
  document.getElementById('add-feed-btn')?.addEventListener('click', addCalendarFeed);

  // Consignments
  document.getElementById('add-consignment-btn')?.addEventListener('click', openAddConsignment);
  document.getElementById('add-expense-btn')?.addEventListener('click', () => openAddExpense());
  document.getElementById('import-expenses-btn')?.addEventListener('click', () => document.getElementById('expenses-csv-file').click());
  document.getElementById('expenses-csv-file')?.addEventListener('change', importExpensesCSV);
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
  document.getElementById('customer-search')?.addEventListener('input', debounce(renderCustomers));

  // Users & invite
  document.getElementById('invite-user-btn')?.addEventListener('click', openInviteModal);
  document.getElementById('invite-form')?.addEventListener('submit', inviteUser);
  document.getElementById('invite-cancel-btn')?.addEventListener('click', () => closeModal('invite-modal'));

  // Consignments date filter
  document.getElementById('apply-con-btn')?.addEventListener('click', renderConsignments);
  document.getElementById('clear-con-btn')?.addEventListener('click', () => {
    document.getElementById('con-from').value = '';
    document.getElementById('con-to').value   = '';
    renderConsignments();
  });

  // CSV export
  document.getElementById('export-csv-btn')?.addEventListener('click', exportReservationsCSV);

  // Close modals on backdrop click
  document.querySelectorAll('.modal').forEach(modal =>
    modal.addEventListener('click', e => { if (e.target === modal) closeModal(modal.id); })
  );

  // Real-time new booking subscription
  sb.channel('reservations-live')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reservations' }, () => {
      loadReservations().then(() => {
        updateStats();
        renderTable();
        renderRecentBookings();
        checkNewBookings();
      });
    })
    .subscribe();
});
