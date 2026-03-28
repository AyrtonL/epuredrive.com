/* =============================================
   LUXE MOTORS — fleet.js
   Car data + filter logic
   ============================================= */

const SUPABASE_URL = "https://brwzjwbpguiignrxvjdc.supabase.co";
const SUPABASE_ANON = "sb_publishable_krEuIpNhJVcADIUyBXYy9g_fiXrXzV9";

const CARS = [
  {
    id: 1,
    make: 'Audi',
    model: 'Q3 2.0 FWD',
    category: 'suv',
    year: 2018,
    price: 120,
    seats: 5,
    transmission: 'Auto',
    image: 'assets/images/Audi Q3/car_16.jpg',
    gallery: [
      'assets/images/Audi Q3/car_16.jpg', 'assets/images/Audi Q3/car_17.jpg', 'assets/images/Audi Q3/car_18.jpg',
      'assets/images/Audi Q3/car_19.jpg', 'assets/images/Audi Q3/car_20.jpg', 'assets/images/Audi Q3/car_21.jpg'
    ],
    featured: true,
    badge: 'Popular',
    specs: { hp: '200 HP', seats: 5, trans: 'Auto' },
    features: ['Leather Interior', 'Panoramic Sunroof', 'Audi MMI', 'Backup Camera', 'Bluetooth Audio', 'Dual-Zone Climate'],
    description: 'The 2018 Audi Q3 blends agile handling with premium comfort. Perfect for city driving and weekend getaways alike.'
  },
  {
    id: 2,
    make: 'Audi',
    model: 'A3 2.0 FWD',
    category: 'sedan',
    year: 2017,
    price: 100,
    seats: 5,
    transmission: 'Auto',
    image: 'assets/images/Audi A3/car_1.jpg',
    gallery: [
      'assets/images/Audi A3/car_1.jpg', 'assets/images/Audi A3/car_2.jpg', 'assets/images/Audi A3/car_3.jpg',
      'assets/images/Audi A3/car_4.jpg', 'assets/images/Audi A3/car_5.jpg', 'assets/images/Audi A3/car_6.jpg',
      'assets/images/Audi A3/car_7.jpg', 'assets/images/Audi A3/car_8.jpg'
    ],
    featured: false,
    badge: null,
    specs: { hp: '186 HP', seats: 5, trans: 'Auto' },
    features: ['Premium Audio', 'Heated Seats', 'Bluetooth Integration', 'Compact Luxury', 'Sport Suspension', 'Xenon Headlights'],
    description: 'Experience sharp design and engaging driving dynamics with the 2017 Audi A3 sedan, a refined choice for daily luxury.'
  },
  {
    id: 3,
    make: 'Porsche',
    model: 'Cayenne Coupe V6',
    category: 'suv',
    year: 2021,
    price: 250,
    seats: 5,
    transmission: 'Auto',
    image: 'assets/images/Porsche Cayenne/car_9.jpg',
    gallery: [
      'assets/images/Porsche Cayenne/car_9.jpg', 'assets/images/Porsche Cayenne/car_10.jpg', 'assets/images/Porsche Cayenne/car_11.jpg',
      'assets/images/Porsche Cayenne/car_12.jpg', 'assets/images/Porsche Cayenne/car_13.jpg', 'assets/images/Porsche Cayenne/car_14.jpg',
      'assets/images/Porsche Cayenne/car_15.jpg'
    ],
    featured: true,
    badge: 'Premium',
    specs: { hp: '335 HP', seats: 5, trans: 'Tiptronic' },
    features: ['Sport Chrono Package', 'Adaptive Air Suspension', 'Bose Surround Sound', 'Panoramic Roof', 'Apple CarPlay', 'Leather Seats'],
    description: 'The Porsche Cayenne Coupe combines the striking lines of a sports car with the versatility and dominant stance of an SUV.'
  },
  {
    id: 4,
    make: 'Volkswagen',
    model: 'Atlas SE V6',
    category: 'suv',
    year: 2023,
    price: 130,
    seats: 7,
    transmission: 'Auto',
    image: 'assets/images/Volkswagen Atlas/IMG_4248.jpg',
    gallery: [
      'assets/images/Volkswagen Atlas/IMG_4248.jpg', 'assets/images/Volkswagen Atlas/IMG_4249.jpg', 'assets/images/Volkswagen Atlas/IMG_4250.jpg',
      'assets/images/Volkswagen Atlas/IMG_4251.jpg', 'assets/images/Volkswagen Atlas/IMG_4252.jpg', 'assets/images/Volkswagen Atlas/IMG_4253.jpg',
      'assets/images/Volkswagen Atlas/IMG_4254.jpg', 'assets/images/Volkswagen Atlas/IMG_4255.jpg', 'assets/images/Volkswagen Atlas/IMG_4256.jpg',
      'assets/images/Volkswagen Atlas/IMG_4257.jpg', 'assets/images/Volkswagen Atlas/IMG_4258.jpg', 'assets/images/Volkswagen Atlas/IMG_4259.jpg',
      'assets/images/Volkswagen Atlas/IMG_4260.jpg', 'assets/images/Volkswagen Atlas/IMG_4261.jpg', 'assets/images/Volkswagen Atlas/IMG_4262.jpg',
      'assets/images/Volkswagen Atlas/IMG_4263.jpg', 'assets/images/Volkswagen Atlas/IMG_4264.jpg', 'assets/images/Volkswagen Atlas/IMG_4265.jpg'
    ],
    featured: false,
    badge: null,
    specs: { hp: '276 HP', seats: 7, trans: '8-Speed' },
    features: ['7-Passenger Seating', 'V6 Engine', 'Touchscreen Infotainment', 'Advanced Safety Features', 'Tri-Zone Climate', 'Wireless Charging'],
    description: 'The 2023 VW Atlas SE V6 is built for families and groups, offering spacious 7-passenger seating without compromising on comfort or power.'
  }
];

// ---- Render Cars ----
function renderCars(cars, containerId = 'cars-grid') {
  const grid = document.getElementById(containerId);
  if (!grid) return;

  if (cars.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:3rem 0;color:var(--text-muted);">No cars match your filter.</div>`;
    return;
  }

  // Carry date/location params through to car-detail links
  const _up = new URLSearchParams(window.location.search);
  const _dateStr = ['start','end','loc'].reduce((s, k) => {
    const v = _up.get(k);
    return v ? s + `&${k}=${encodeURIComponent(v)}` : s;
  }, '');

  grid.innerHTML = cars.map((car, i) => `
    <article class="car-card ${i > 3 ? 'fade-in' : ''}" data-id="${car.id}" data-make="${car.make.toLowerCase()}" data-category="${car.category}" style="${i > 3 ? `transition-delay:${(i - 4) * 0.06}s` : ''}">
      <div class="car-card-img">
        <img src="${car.gallery && car.gallery.length ? car.gallery[0] : car.image}" alt="${car.make} ${car.model}" ${i > 3 ? 'loading="lazy"' : ''}>
        ${car.badge ? `<span class="car-badge ${car.featured ? 'featured' : ''}">${car.badge}</span>` : ''}
      </div>
      <div class="car-card-body">
        <div class="car-make">${car.make}</div>
        <div class="car-name">${car.model}</div>
        <div class="car-specs">
          <span class="car-spec">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            ${car.specs.trans}
          </span>
          <span class="car-spec">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            ${car.specs.seats} Seats
          </span>
          <span class="car-spec">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            ${car.specs.hp}
          </span>
        </div>
        <div class="car-card-footer">
          <div class="car-price">
            <span class="car-price-num">$${car.price}</span>
            <span class="car-price-period">/ day</span>
          </div>
          <a href="car-detail.html?id=${car.id}${_dateStr}" class="car-reserve-btn">Reserve</a>
        </div>
      </div>
    </article>
  `).join('');

  // Re-observe new cards
  grid.querySelectorAll('.fade-in').forEach(el => {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
    }, { threshold: 0.1 });
    obs.observe(el);
  });
}

// ---- Filter Logic ----
let activeFilters = { brand: 'all', category: 'all' };

function applyFilters() {
  return CARS.filter(car => {
    const brandMatch = activeFilters.brand === 'all' || car.make.toLowerCase().replace(/[- ]/g,'') === activeFilters.brand;
    const catMatch = activeFilters.category === 'all' || car.category === activeFilters.category;
    return brandMatch && catMatch;
  });
}

function initFilters() {
  document.querySelectorAll('[data-filter-brand]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-filter-brand]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilters.brand = btn.dataset.filterBrand;
      renderCars(applyFilters());
    });
  });

  document.querySelectorAll('[data-filter-category]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-filter-category]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilters.category = btn.dataset.filterCategory;
      renderCars(applyFilters());
    });
  });
}

// ---- Car Detail Page ----
function loadCarDetail() {
  const params = new URLSearchParams(window.location.search);
  const idParam = params.get('id');
  const car = CARS.find(c => c.id == idParam) || CARS[0];

  document.title = `${car.make} ${car.model} — éPure Drive - Rental`;

  const imgEl = document.getElementById('detail-img');
  if (imgEl) imgEl.src = car.image;

  // Render Thumbnails
  const thumbContainer = document.getElementById('detail-thumbnails');
  if (thumbContainer && car.gallery) {
    thumbContainer.innerHTML = car.gallery.map((src, i) => `
      <img src="${src}" class="thumb-img ${i === 0 ? 'active' : ''}" loading="lazy" onclick="document.getElementById('detail-img').src='${src}'; document.querySelectorAll('.thumb-img').forEach(el=>el.classList.remove('active')); this.classList.add('active');">
    `).join('');
  }

  const titleEl = document.getElementById('detail-title');
  if (titleEl) titleEl.textContent = car.model;

  const makeEl = document.getElementById('detail-make');
  if (makeEl) makeEl.textContent = `${car.make} · ${car.year}`;

  const descEl = document.getElementById('detail-desc');
  if (descEl) descEl.textContent = (car.description || '').replace(/\s*\(VIN:[^)]*\)/g, '');

  const priceEl = document.getElementById('detail-price');
  if (priceEl) priceEl.textContent = `$${car.price}`;

  const priceWeekEl = document.getElementById('detail-price-week');
  if (priceWeekEl) priceWeekEl.textContent = `$${car.price * 6} / week`;

  // Update mobile sticky bar price
  const mobileBarPrice = document.getElementById('mobile-bar-price');
  if (mobileBarPrice) mobileBarPrice.innerHTML = `$${car.price}<span>/day</span>`;

  const featuresEl = document.getElementById('detail-features');
  if (featuresEl) {
    featuresEl.innerHTML = car.features.map(f => `<li>${f}</li>`).join('');
  }

  // Specs
  ['hp', 'seats', 'trans'].forEach(key => {
    const el = document.getElementById(`spec-${key}`);
    if (el) el.textContent = car.specs[key] ?? '—';
  });

  const catBadge = document.getElementById('detail-category');
  if (catBadge) catBadge.textContent = car.category.charAt(0).toUpperCase() + car.category.slice(1);

  // Booking form total price calculator
  const pickupInput = document.getElementById('pickup-date');
  const returnInput = document.getElementById('return-date');
  const totalEl = document.getElementById('booking-total-amount');
  const idInput = document.getElementById('car-id-input');

  if (idInput) idInput.value = car.id;

  function calcTotal() {
    if (pickupInput && returnInput && pickupInput.value && returnInput.value) {
      const days = Math.max(1, Math.round((new Date(returnInput.value) - new Date(pickupInput.value)) / 86400000));
      if (totalEl) totalEl.textContent = `$${days * car.price}`;
    }
  }

  if (pickupInput) pickupInput.addEventListener('change', calcTotal);
  if (returnInput) returnInput.addEventListener('change', calcTotal);

  // Set min dates
  const today = new Date().toISOString().split('T')[0];
  if (pickupInput) pickupInput.min = today;
  if (returnInput) returnInput.min = today;
}

// ---- Booking Form — Dual Submission (Online / WhatsApp) ----
function initBookingForm() {
  const form = document.getElementById('booking-form');
  if (!form) return;

  function validateForm() {
    let valid = true;
    form.querySelectorAll('[required]').forEach(field => {
      if (!field.value.trim()) {
        field.style.borderColor = '#ef4444';
        valid = false;
        field.addEventListener('input', () => { field.style.borderColor = ''; }, { once: true });
      }
    });
    return valid;
  }

  function getBookingData() {
    const carId = document.getElementById('car-id-input').value;
    const car = CARS.find(c => c.id == carId) || CARS[0];
    const pDate = document.getElementById('pickup-date').value;
    const rDate = document.getElementById('return-date').value;
    const pTime = document.getElementById('pickup-time').value;
    const rTime = document.getElementById('return-time').value;
    const loc = form.querySelector('[name="loc"]').value;
    const protection = document.getElementById('opt-protection').checked ? '1' : '0';
    const toll = document.getElementById('opt-toll').checked ? '1' : '0';
    const fuel = document.getElementById('opt-fuel').checked ? '1' : '0';
    const days = Math.max(1, Math.round((new Date(rDate) - new Date(pDate)) / 86400000));
    let totalCost = days * car.price;
    const locFee = (loc === 'mia' || loc === 'fll') ? 120 : 0;
    totalCost += locFee;
    if (protection === '1') totalCost += days * 30;
    if (toll === '1') totalCost += days * 10;
    if (fuel === '1') totalCost += 80;
    return { car, carId, pDate, rDate, pTime, rTime, loc, protection, toll, fuel, days, totalCost };
  }

  function formatTime12(t) {
    const [h, m] = t.split(':');
    const hr = parseInt(h);
    const ampm = hr >= 12 ? 'PM' : 'AM';
    return `${hr > 12 ? hr - 12 : hr}:${m} ${ampm}`;
  }

  // Pay & Reserve Online — submit to checkout.html
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    const d = getBookingData();
    const params = new URLSearchParams({
      id: d.carId, start: d.pDate, end: d.rDate,
      start_time: d.pTime, end_time: d.rTime,
      loc: d.loc, protection: d.protection, toll: d.toll, fuel: d.fuel
    });
    window.location.href = `checkout.html?${params.toString()}`;
  });

  // Reserve via WhatsApp
  const waBtn = document.getElementById('btn-whatsapp');
  if (waBtn) {
    waBtn.addEventListener('click', () => {
      if (!validateForm()) return;
      const d = getBookingData();
      const phone = '17862096770';
      const locLabels = { aventura: 'Aventura (Free)', mia: 'MIA Airport ($120)', fll: 'FLL Airport ($120)' };
      const addons = [];
      if (d.protection === '1') addons.push('Standard Protection');
      if (d.toll === '1') addons.push('Toll Package');
      if (d.fuel === '1') addons.push('Prepaid Fuel');
      const msg = `Hello! I'd like to reserve the *${d.car.make} ${d.car.model}*.\n\n`
        + `Pickup: ${d.pDate} at ${formatTime12(d.pTime)}\n`
        + `Return: ${d.rDate} at ${formatTime12(d.rTime)}\n`
        + `Location: ${locLabels[d.loc] || d.loc}\n`
        + (addons.length ? `Add-ons: ${addons.join(', ')}\n` : '')
        + `Estimated Total: $${d.totalCost}`;
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    });
  }
}

// ---- Supabase Initializer ----
async function syncDatabase() {
  try {
    const _p = new URLSearchParams(window.location.search);
    let carsEndpoint = `${SUPABASE_URL}/rest/v1/cars?select=*&status=neq.unavailable&order=id`;

    // Subdomain detection: {slug}.epuredrive.com
    let tenantSlug = _p.get('t');
    if (!tenantSlug) {
      const _host = window.location.hostname;
      const _match = _host.match(/^([a-z0-9][a-z0-9-]*[a-z0-9])\.epuredrive\.com$/);
      if (_match && !['www', 'admin', 'app', 'api'].includes(_match[1])) tenantSlug = _match[1];
    }

    if (tenantSlug) {
      // Resolve slug → tenant id + branding
      const tRes = await fetch(
        `${SUPABASE_URL}/rest/v1/tenants?slug=eq.${encodeURIComponent(tenantSlug)}&select=id,name,logo_url,primary_color,accent_color,brand_name,plan&limit=1`,
        { headers: { 'apikey': SUPABASE_ANON, 'Authorization': `Bearer ${SUPABASE_ANON}` } }
      );
      if (tRes.ok) {
        const tenants = await tRes.json();
        const t = tenants[0];
        if (t?.id) {
          carsEndpoint += `&tenant_id=eq.${t.id}`;
          window._tenantPlan = t.plan || 'free';
          // Apply tenant branding
          const displayName = t.brand_name || t.name;
          if (displayName) {
            const titleEl = document.querySelector('h1.hero-title, .fleet-page-title');
            document.title = `${displayName} — Fleet`;
            if (titleEl) titleEl.textContent = `${displayName} Fleet`;
          }
          if (t.logo_url) {
            const navLogo = document.querySelector('.navbar-img-logo, .navbar img, nav img');
            if (navLogo) navLogo.src = t.logo_url;
          }
          if (t.primary_color) {
            document.documentElement.style.setProperty('--accent-primary', t.primary_color);
            document.documentElement.style.setProperty('--black', t.primary_color);
          }
          if (t.accent_color) {
            document.documentElement.style.setProperty('--accent-secondary', t.accent_color);
          }
        }
      }
    }

    const res = await fetch(
      carsEndpoint,
      { headers: { 'apikey': SUPABASE_ANON, 'Authorization': `Bearer ${SUPABASE_ANON}` } }
    );
    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0) {
        const staticSnapshot = CARS.map(c => ({ ...c }));
        const findStatic = (make, model) => staticSnapshot.find(c =>
          c.make.toLowerCase() === (make || '').toLowerCase() &&
          (c.model.toLowerCase().startsWith((model || '').toLowerCase()) ||
           (model || '').toLowerCase().startsWith(c.model.toLowerCase()))
        );

        CARS.length = 0;
        data.forEach(v => {
          const s        = findStatic(v.make, v.model);
          const gallery  = Array.isArray(v.gallery) && v.gallery.length > 0 ? v.gallery : (s?.gallery || []);
          const image    = v.image_url || (gallery.length > 0 ? gallery[0] : null) || s?.image
                           || 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&q=80';
          const features = Array.isArray(v.features) && v.features.length > 0 ? v.features : (s?.features || []);
          CARS.push({
            id:           v.id,
            make:         s?.make || v.make.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '),
            model:        v.model_full  || v.model,
            category:     v.category    || s?.category    || 'suv',
            year:         v.year,
            price:        parseFloat(v.daily_rate)        || s?.price || 0,
            seats:        v.seats       || s?.seats       || 5,
            transmission: v.transmission || s?.transmission || 'Auto',
            image,
            gallery:      gallery.length > 0 ? gallery : [image],
            featured:     !!(v.badge),
            badge:        v.badge       || null,
            specs: {
              hp:    v.hp           || s?.specs?.hp    || '-- HP',
              seats: v.seats        || s?.seats        || 5,
              trans: v.transmission || s?.specs?.trans || 'Auto',
            },
            features,
            description: v.description || s?.description
              || `Experience the ${v.year} ${v.make} ${v.model}. Premium engineering meets pure luxury.`,
          });
        });
      }
    }
  } catch (err) { console.error("Database connection fallback to static payload."); }
}

// ---- "Powered by" Footer ----
function _addPoweredByFooter() {
  const plan = window._tenantPlan;
  // Pro and Enterprise get white-label (no footer)
  if (['pro', 'enterprise'].includes(plan)) return;
  // Only show on tenant pages
  if (!plan) return;

  const footer = document.createElement('div');
  footer.style.cssText = 'text-align:center;padding:1.5rem 1rem;font-size:0.72rem;color:#9CA3AF;border-top:1px solid rgba(0,0,0,0.06);margin-top:2rem;';
  footer.innerHTML = '<a href="https://epuredrive.com" target="_blank" rel="noopener" style="color:#9CA3AF;text-decoration:none;font-weight:500;">Powered by <strong style="color:#6B7280;">éPure Drive</strong></a>';
  document.body.appendChild(footer);
}

// ---- Init ----
document.addEventListener('DOMContentLoaded', async () => {
  const page   = document.body.dataset.page;
  const params = new URLSearchParams(window.location.search);
  const hasSearch = params.get('start') || params.get('end') || params.get('loc');

  // Detail page: show static data immediately for fast first paint
  if (page === 'detail') {
    loadCarDetail();
    initBookingForm();
  }

  // Sync with DB to get correct prices, descriptions, HP, features
  await syncDatabase();
  _addPoweredByFooter();

  // Grid pages render once with DB data (avoids wrong-price flash from static)
  if (page === 'home') {
    renderCars(hasSearch ? CARS : CARS.slice(0, 5));
    initFilters();
  } else if (page === 'fleet') {
    renderCars(CARS);
    initFilters();
  } else if (page === 'detail') {
    loadCarDetail(); // Re-render with DB prices, specs, features
  }
});
