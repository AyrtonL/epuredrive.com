// Netlify Function — superadmin-stats
// Returns all tenants with aggregated metrics for the super admin panel.
// Requires: SUPABASE_SERVICE_ROLE_KEY env var
// Auth: caller must pass a valid Supabase JWT in Authorization header
//       AND their profile must have is_super_admin = true

const SUPABASE_URL = 'https://brwzjwbpguiignrxvjdc.supabase.co';

function sbHeaders(key) {
  return {
    'Authorization': `Bearer ${key}`,
    'apikey': key,
    'Content-Type': 'application/json',
  };
}

async function sbGet(path, key) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: sbHeaders(key) });
  if (!res.ok) throw new Error(`Supabase GET ${path} failed: ${res.status}`);
  return res.json();
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const authHeader = event.headers['authorization'] || '';
  const token      = authHeader.replace(/^Bearer\s+/i, '').trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!token)      return { statusCode: 401, body: JSON.stringify({ error: 'Missing token' }) };
  if (!serviceKey) return { statusCode: 500, body: JSON.stringify({ error: 'Server config error' }) };

  // 1 — Verify JWT and get user id
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { 'Authorization': `Bearer ${token}`, 'apikey': serviceKey },
  });
  if (!userRes.ok) return { statusCode: 401, body: JSON.stringify({ error: 'Invalid token' }) };
  const user = await userRes.json();

  // 2 — Check is_super_admin
  const profiles = await sbGet(`profiles?id=eq.${user.id}&select=is_super_admin`, serviceKey);
  if (!profiles?.[0]?.is_super_admin) {
    return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden — super admin only' }) };
  }

  // 3 — Fetch all data
  const [tenants, cars, reservations, allProfiles] = await Promise.all([
    sbGet('tenants?select=*&order=created_at.desc', serviceKey),
    sbGet('cars?select=id,tenant_id', serviceKey),
    sbGet('reservations?select=tenant_id,total_amount,pickup_date,status,created_at', serviceKey),
    sbGet('profiles?select=id,tenant_id,full_name,role,created_at&order=created_at.desc', serviceKey),
  ]);

  // 4 — Aggregate cars per tenant
  const carsByTenant = {};
  (cars || []).forEach(c => {
    if (c.tenant_id) carsByTenant[c.tenant_id] = (carsByTenant[c.tenant_id] || 0) + 1;
  });

  // 5 — Aggregate reservations per tenant
  const today      = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 7) + '-01';
  const stats      = {};
  (reservations || []).forEach(r => {
    if (!r.tenant_id || r.status === 'cancelled') return;
    if (!stats[r.tenant_id]) stats[r.tenant_id] = { bookings: 0, totalRevenue: 0, monthlyRevenue: 0, lastBooking: null };
    stats[r.tenant_id].bookings++;
    stats[r.tenant_id].totalRevenue   += parseFloat(r.total_amount) || 0;
    if (r.pickup_date >= monthStart)
      stats[r.tenant_id].monthlyRevenue += parseFloat(r.total_amount) || 0;
    if (!stats[r.tenant_id].lastBooking || r.created_at > stats[r.tenant_id].lastBooking)
      stats[r.tenant_id].lastBooking = r.created_at;
  });

  // 6 — Get owner email from profiles (first admin per tenant)
  const ownerByTenant = {};
  (allProfiles || []).forEach(p => {
    if (p.tenant_id && p.role === 'admin' && !ownerByTenant[p.tenant_id]) {
      ownerByTenant[p.tenant_id] = { name: p.full_name, profileId: p.id };
    }
  });

  // 7 — Enrich tenants
  const TRIAL_DAYS = 14;
  const enriched = (tenants || []).map(t => {
    const trialMs = t.trial_started_at ? Date.now() - new Date(t.trial_started_at) : 0;
    const trialDaysLeft = t.plan === 'trial'
      ? Math.max(0, TRIAL_DAYS - Math.floor(trialMs / 86400000))
      : null;
    return {
      ...t,
      cars:           carsByTenant[t.id] || 0,
      bookings:       stats[t.id]?.bookings        || 0,
      totalRevenue:   stats[t.id]?.totalRevenue     || 0,
      monthlyRevenue: stats[t.id]?.monthlyRevenue   || 0,
      lastBooking:    stats[t.id]?.lastBooking       || null,
      trialDaysLeft,
      ownerName:      ownerByTenant[t.id]?.name || t.owner_name || null,
    };
  });

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ tenants: enriched }),
  };
};
