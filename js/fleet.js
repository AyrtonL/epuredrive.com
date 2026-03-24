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
    specs: { hp: '200 HP', topSpeed: '130 mph', seats: 5, trans: 'Auto' },
    features: ['Leather Interior', 'Panoramic Sunroof', 'Audi MMI', 'Backup Camera', 'Bluetooth Audio', 'Dual-Zone Climate'],
    description: 'The 2018 Audi Q3 blends agile handling with premium comfort. Perfect for city driving and weekend getaways alike. (VIN: WA1BCCFS6JR034820)'
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
    specs: { hp: '186 HP', topSpeed: '130 mph', seats: 5, trans: 'Auto' },
    features: ['Premium Audio', 'Heated Seats', 'Bluetooth Integration', 'Compact Luxury', 'Sport Suspension', 'Xenon Headlights'],
    description: 'Experience sharp design and engaging driving dynamics with the 2017 Audi A3 sedan, a refined choice for daily luxury. (VIN: WAUAUGFF3H1028844)'
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
    specs: { hp: '335 HP', topSpeed: '150 mph', seats: 5, trans: 'Tiptronic' },
    features: ['Sport Chrono Package', 'Adaptive Air Suspension', 'Bose Surround Sound', 'Panoramic Roof', 'Apple CarPlay', 'Leather Seats'],
    description: 'The Porsche Cayenne Coupe combines the striking lines of a sports car with the versatility and dominant stance of an SUV. (VIN: WP1BA2AY7MDA42894)'
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
    specs: { hp: '276 HP', topSpeed: '120 mph', seats: 7, trans: '8-Speed' },
    features: ['7-Passenger Seating', 'V6 Engine', 'Touchscreen Infotainment', 'Advanced Safety Features', 'Tri-Zone Climate', 'Wireless Charging'],
    description: 'The 2023 VW Atlas SE V6 is built for families and groups, offering spacious 7-passenger seating without compromising on comfort or power. (VIN: 1V2JR2CA3PC527256)'
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
    <article class="car-card fade-in" data-id="${car.id}" data-make="${car.make.toLowerCase()}" data-category="${car.category}" style="transition-delay:${i * 0.06}s">
      <div class="car-card-img">
        <img src="${car.image}" alt="${car.make} ${car.model}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&q=80'">
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
  if (descEl) descEl.textContent = car.description;

  const priceEl = document.getElementById('detail-price');
  if (priceEl) priceEl.textContent = `$${car.price}`;

  const priceWeekEl = document.getElementById('detail-price-week');
  if (priceWeekEl) priceWeekEl.textContent = `$${car.price * 6} / week`;

  const featuresEl = document.getElementById('detail-features');
  if (featuresEl) {
    featuresEl.innerHTML = car.features.map(f => `<li>${f}</li>`).join('');
  }

  // Specs
  ['hp', 'topSpeed', 'seats', 'trans'].forEach(key => {
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

// ---- Booking Form Validation ----
function initBookingForm() {
  const form = document.getElementById('booking-form');
  if (!form) return;

  // The form now uses native action="checkout.html" method="GET"
  // So we only validate dates client-side
  form.addEventListener('submit', (e) => {
    let valid = true;

    form.querySelectorAll('[required]').forEach(field => {
      if (!field.value.trim()) {
        field.style.borderColor = '#ef4444';
        valid = false;
        e.preventDefault();
        field.addEventListener('input', () => { field.style.borderColor = ''; }, { once: true });
      }
    });
    
    // Stop traditional HTTP submission
    if (valid) {
      e.preventDefault();
      
      const pDate = document.getElementById('pickup-date').value;
      const rDate = document.getElementById('return-date').value;
      const carId = document.getElementById('car-id-input').value;
      const car = CARS.find(c => c.id == carId) || CARS[0];
      
      // WhatsApp Routing Pipeline
      const phone = "17862096770";
      const totalCost = Math.max(1, Math.round((new Date(rDate) - new Date(pDate)) / 86400000)) * car.price;
      const textMessage = `Hello! I would like to safely reserve the *${car.make} ${car.model}*.\n\nDates: ${pDate} to ${rDate}\nTotal Anticipated: $${totalCost}`;
      
      // Attempt Stripe Checkout if URL provided, otherwise WhatsApp
      if (car.link && car.link.includes('stripe.com')) {
        window.location.href = car.link;
      } else {
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(textMessage)}`;
        window.open(url, "_blank");
      }
    }
  });
}

// ---- Supabase Initializer ----
async function syncDatabase() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/cars?select=id,make,model,year,daily_rate`, {
      headers: { 'apikey': SUPABASE_ANON, 'Authorization': `Bearer ${SUPABASE_ANON}` }
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0) {
        // Build a lookup from the static array for images, specs, gallery, etc.
        const staticSnapshot = CARS.map(c => ({ ...c }));
        const findStatic = (make, model) =>
          staticSnapshot.find(c =>
            c.make.toLowerCase() === (make || '').toLowerCase() &&
            c.model.toLowerCase() === (model || '').toLowerCase()
          );

        CARS.length = 0;
        data.forEach(v => {
          const s = findStatic(v.make, v.model);
          CARS.push({
            id: v.id,
            make: v.make,
            model: v.model,
            category: s?.category || 'suv',
            year: v.year,
            price: v.daily_rate ?? s?.price ?? 0,
            seats: s?.seats || 5,
            transmission: s?.transmission || 'Auto',
            image: s?.image || 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&q=80',
            gallery: s?.gallery || [s?.image],
            featured: s?.featured ?? true,
            badge: s?.badge || null,
            specs: s?.specs || { hp: '-- HP', topSpeed: '-- mph', seats: 5, trans: 'Auto' },
            features: s?.features || ['Absolute Transparency', 'Impeccable Condition', 'Flexible Delivery'],
            description: s?.description || `Experience the ${v.year} ${v.make} ${v.model}. Premium engineering meets pure luxury.`
          });
        });
      }
    }
  } catch (err) { console.error("Database connection fallback to static payload."); }
}

// ---- Init ----
document.addEventListener('DOMContentLoaded', async () => {
  await syncDatabase();
  
  const page = document.body.dataset.page;
  if (page === 'home') {
    renderCars(CARS.slice(0, 8));
    initFilters();
  } else if (page === 'fleet') {
    renderCars(CARS);
    initFilters();
  } else if (page === 'detail') {
    loadCarDetail();
    initBookingForm();
  }
});
