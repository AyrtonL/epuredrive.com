/* =============================================
   LUXE MOTORS — fleet.js
   Car data + filter logic
   ============================================= */

const SUPABASE_URL = "https://brwzjwbpguiignrxvjdc.supabase.co";
const SUPABASE_ANON = "sb_publishable_krEuIpNhJVcADIUyBXYy9g_fiXrXzV9";
const DEFAULT_TENANT_ID = "8be5b928-ca59-4b29-a34b-75b18c9273db";

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

// ---- Render Cars (Landing Page Style for Tenants) ----
function renderCarsAsLanding(cars, containerId = 'cars-grid') {
  const grid = document.getElementById(containerId);
  if (!grid) return;

  if (cars.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:3rem 0;color:var(--text-muted);">No cars match your filter.</div>`;
    return;
  }

  // Set the container to block/flex column layout instead of a grid (overriding the `.cars-grid` default display)
  grid.style.display = 'flex';
  grid.style.flexDirection = 'column';
  grid.style.gap = '6rem'; // Large gap between cars
  
  // Carry date/location params
  const _up = new URLSearchParams(window.location.search);
  const _start = _up.get('start') || '';
  const _end = _up.get('end') || '';
  const _loc = _up.get('loc') || '';

  const timeOptions = `
    <option value="08:00">8:00 AM</option>
    <option value="08:30">8:30 AM</option>
    <option value="09:00">9:00 AM</option>
    <option value="09:30">9:30 AM</option>
    <option value="10:00" selected>10:00 AM</option>
    <option value="10:30">10:30 AM</option>
    <option value="11:00">11:00 AM</option>
    <option value="11:30">11:30 AM</option>
    <option value="12:00">12:00 PM</option>
    <option value="12:30">12:30 PM</option>
    <option value="13:00">1:00 PM</option>
    <option value="13:30">1:30 PM</option>
    <option value="14:00">2:00 PM</option>
    <option value="14:30">2:30 PM</option>
    <option value="15:00">3:00 PM</option>
    <option value="15:30">3:30 PM</option>
    <option value="16:00">4:00 PM</option>
    <option value="16:30">4:30 PM</option>
    <option value="17:00">5:00 PM</option>
    <option value="17:30">5:30 PM</option>
    <option value="18:00">6:00 PM</option>
    <option value="18:30">6:30 PM</option>
    <option value="19:00">7:00 PM</option>
    <option value="19:30">7:30 PM</option>
    <option value="20:00">8:00 PM</option>
  `;

  grid.innerHTML = cars.map((car, i) => `
    <div class="tenant-landing-car fade-in" data-id="${car.id}" style="${i > 0 ? `transition-delay:0.1s` : ''}">
      <div class="detail-gallery" style="display:flex; flex-direction:column; align-items:center;">
        <img id="detail-img-${car.id}" src="${car.image}" alt="${car.make} ${car.model}" onerror="this.src='https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1200&q=80'" style="width:100%; max-height:600px; object-fit:cover; border-radius:12px;" ${i > 1 ? 'loading="lazy"' : ''} />
        <div id="detail-thumbnails-${car.id}" class="detail-thumbnails" style="width:100%; max-width:800px; margin-top:1rem;">
          ${(car.gallery || []).map((src, j) => `
            <img src="${src}" class="thumb-img thumb-${car.id} ${j === 0 ? 'active' : ''}" loading="lazy" onclick="
              document.getElementById('detail-img-${car.id}').src='${src}';
              document.querySelectorAll('.thumb-${car.id}').forEach(el=>el.classList.remove('active'));
              this.classList.add('active');
            ">
          `).join('')}
        </div>
      </div>

      <div class="detail-content" style="margin-top:2rem;">
        <!-- Left: Car Info -->
        <div class="detail-info fade-in">
          <div class="detail-badge-row">
            <span class="detail-badge available">● Available Now</span>
            <span class="detail-badge category" id="detail-category-${car.id}">${car.category.charAt(0).toUpperCase() + car.category.slice(1)}</span>
          </div>

          <h2 class="detail-title" id="detail-title-${car.id}">${car.model}</h2>
          <p class="detail-make" id="detail-make-${car.id}">${car.make} · ${car.year}</p>

          <!-- Specs Grid -->
          <div class="detail-specs">
            <div class="detail-spec">
              <div class="detail-spec-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" stroke-width="1.8"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              </div>
              <div class="detail-spec-val" id="spec-hp-${car.id}">${car.specs.hp}</div>
              <div class="detail-spec-label">Horsepower</div>
            </div>
            <div class="detail-spec">
              <div class="detail-spec-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" stroke-width="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <div class="detail-spec-val" id="spec-seats-${car.id}">${car.specs.seats}</div>
              <div class="detail-spec-label">Passengers</div>
            </div>
            <div class="detail-spec">
              <div class="detail-spec-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" stroke-width="1.8"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              </div>
              <div class="detail-spec-val" id="spec-trans-${car.id}">${car.specs.trans}</div>
              <div class="detail-spec-label">Transmission</div>
            </div>
          </div>

          <!-- Description -->
          <p class="detail-desc" id="detail-desc-${car.id}">${(car.description || '').replace(/\s*\(VIN:[^)]*\)/g, '')}</p>

          <!-- Features -->
          <div class="detail-features">
            <h3>Included Features</h3>
            <ul id="detail-features-${car.id}">
              ${(car.features || []).map(f => `<li>${f}</li>`).join('')}
            </ul>
          </div>

          <!-- Policies Info -->
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(140px, 1fr));gap:1rem;margin-top:2rem;">
            <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:1rem;text-align:center;">
              <div style="color:var(--accent-primary);margin-bottom:0.4rem;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <div style="font-size:0.82rem;font-weight:700;color:var(--text-primary)">Fully Insured</div>
              <div style="font-size:0.72rem;color:var(--text-muted);margin-top:0.2rem;">Comprehensive coverage</div>
            </div>
            <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:1rem;text-align:center;">
              <div style="color:var(--accent-primary);margin-bottom:0.4rem;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
              </div>
              <div style="font-size:0.82rem;font-weight:700;color:var(--text-primary)">Free Delivery</div>
              <div style="font-size:0.72rem;color:var(--text-muted);margin-top:0.2rem;">To your location</div>
            </div>
            <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:1rem;text-align:center;">
              <div style="color:var(--accent-primary);margin-bottom:0.4rem;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
              </div>
              <div style="font-size:0.82rem;font-weight:700;color:var(--text-primary)">Free Cancel</div>
              <div style="font-size:0.72rem;color:var(--text-muted);margin-top:0.2rem;">48h before pickup</div>
            </div>
          </div>
        </div>

        <!-- Right: Booking Widget -->
        <aside class="booking-widget fade-in" style="height: fit-content; position: sticky; top: 120px;">
          <div class="booking-widget-price">
            <div style="display:flex;align-items:baseline;gap:0.4rem;">
              <div class="price-big" id="detail-price-${car.id}">$${car.price}</div>
              <div class="price-period">/ day</div>
            </div>
            <div class="price-week" id="detail-price-week-${car.id}">$${car.price * 6} / week</div>
          </div>

          <h3>Reserve This Vehicle</h3>

          <form id="booking-form-${car.id}" class="booking-form landing-booking-form" data-car-id="${car.id}" action="checkout.html" method="GET">
            <input type="hidden" name="id" id="car-id-input-${car.id}" value="${car.id}">
            <input type="hidden" name="protection" id="val-protection-${car.id}" value="0">
            <input type="hidden" name="toll" id="val-toll-${car.id}" value="0">
            <input type="hidden" name="fuel" id="val-fuel-${car.id}" value="0">

            <div class="form-group">
              <label>Pickup Date</label>
              <input type="text" class="form-control pickup-date-input" name="start" id="pickup-date-${car.id}" value="${_start}" data-car-id="${car.id}" placeholder="Select date…" required readonly />
            </div>
            <div class="form-group">
              <label>Pickup Time</label>
              <select class="form-control pickup-time-input" name="start_time" id="pickup-time-${car.id}">
                ${timeOptions}
              </select>
            </div>
            <div class="form-group">
              <label>Return Date</label>
              <input type="text" class="form-control return-date-input" name="end" id="return-date-${car.id}" value="${_end}" data-car-id="${car.id}" placeholder="Select date…" required readonly />
            </div>
            <div class="form-group">
              <label>Return Time</label>
              <select class="form-control return-time-input" name="end_time" id="return-time-${car.id}">
                ${timeOptions}
              </select>
            </div>
            <div class="form-group">
              <label>Pickup Location</label>
              <select class="form-control loc-input" name="loc" id="loc-${car.id}" required>
                <option value="aventura" ${_loc === 'aventura' ? 'selected' : ''}>Pick-up in Aventura (Free)</option>
                <option value="mia" ${_loc === 'mia' ? 'selected' : ''}>Delivery to MIA ($120)</option>
                <option value="fll" ${_loc === 'fll' ? 'selected' : ''}>Delivery to FLL ($120)</option>
              </select>
            </div>

            <!-- Add-ons -->
            <div class="addon-section">
              <div class="addon-section-label">Optional Add-ons</div>
              <label class="addon-item">
                <input type="checkbox" id="opt-protection-${car.id}" class="addon-opt" data-car-id="${car.id}">
                <div class="addon-item-info">
                  <div class="addon-item-name">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    Standard Protection
                  </div>
                  <div class="addon-item-desc">Collision coverage, $1,000 deductible</div>
                </div>
                <span class="addon-item-price">+$30/day</span>
              </label>
              <label class="addon-item">
                <input type="checkbox" id="opt-toll-${car.id}" class="addon-opt" data-car-id="${car.id}">
                <div class="addon-item-info">
                  <div class="addon-item-name">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                    Toll Package
                  </div>
                  <div class="addon-item-desc">All Florida tolls covered, no invoices</div>
                </div>
                <span class="addon-item-price">+$10/day</span>
              </label>
              <label class="addon-item">
                <input type="checkbox" id="opt-fuel-${car.id}" class="addon-opt" data-car-id="${car.id}">
                <div class="addon-item-info">
                  <div class="addon-item-name">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 22V6l5-4 5 4v16"/><path d="M13 22V12h4l2 3v7"/><line x1="3" y1="12" x2="13" y2="12"/></svg>
                    Prepaid Fuel
                  </div>
                  <div class="addon-item-desc">Return at any fuel level, no charge</div>
                </div>
                <span class="addon-item-price">$80 flat</span>
              </label>
            </div>

            <div class="booking-total">
              <span>Estimated Total</span>
              <strong id="booking-total-amount-${car.id}">Select dates</strong>
            </div>

            <div class="dual-booking-buttons">
              <button type="submit" id="btn-pay-online-${car.id}" class="btn btn-primary" style="width:100%;justify-content:center;padding:1rem;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                Pay & Reserve Online
              </button>
              <button type="button" id="btn-whatsapp-${car.id}" class="btn btn-outline-whatsapp landing-wa-btn" data-car-id="${car.id}" style="width:100%;justify-content:center;padding:1rem;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                Reserve via WhatsApp
              </button>
            </div>
          </form>

          <p style="font-size:0.75rem;color:var(--text-muted);text-align:center;margin-top:1rem;line-height:1.5;">
            Instant confirmation · Free cancellation · Real-time availability
          </p>
        </aside>
      </div>
    </div>
  `).join('<hr style="border:0; border-top:1px solid var(--border); margin: 3rem 0; width: 100%;">');

  // Re-observe new cars and trigger init script for forms
  setTimeout(() => {
    grid.querySelectorAll('.fade-in').forEach(el => {
      const obs = new IntersectionObserver((entries) => {
        entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
      }, { threshold: 0.05 });
      obs.observe(el);
    });

    if (typeof initMultiBookingForms === 'function') {
      initMultiBookingForms(cars);
    }
  }, 100);
}

// ---- Multi Booking Forms Initialization (For Landing) ----
function initMultiBookingForms(cars) {
  const today = new Date().toISOString().split('T')[0];

  function validateForm(form) {
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

  function getBookingData(carId, car) {
    const pDate = document.getElementById(`pickup-date-${carId}`).value;
    const rDate = document.getElementById(`return-date-${carId}`).value;
    const pTime = document.getElementById(`pickup-time-${carId}`).value;
    const rTime = document.getElementById(`return-time-${carId}`).value;
    const loc = document.getElementById(`loc-${carId}`).value;
    const protection = document.getElementById(`opt-protection-${carId}`).checked ? '1' : '0';
    const toll = document.getElementById(`opt-toll-${carId}`).checked ? '1' : '0';
    const fuel = document.getElementById(`opt-fuel-${carId}`).checked ? '1' : '0';
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

  cars.forEach(car => {
    // 1. Calculate price
    const calcBookingTotal = () => {
      const pickup = document.getElementById(`pickup-date-${car.id}`).value;
      const ret    = document.getElementById(`return-date-${car.id}`).value;
      const totalEl = document.getElementById(`booking-total-amount-${car.id}`);
      if (!pickup || !ret) { totalEl.textContent = 'Select dates'; return; }

      const days = Math.max(1, Math.round((new Date(ret) - new Date(pickup)) / 86400000));
      const protection = document.getElementById(`opt-protection-${car.id}`).checked ? days * 30 : 0;
      const toll       = document.getElementById(`opt-toll-${car.id}`).checked       ? days * 10 : 0;
      const fuel       = document.getElementById(`opt-fuel-${car.id}`).checked       ? 80         : 0;
      const total      = (days * car.price) + protection + toll + fuel;

      totalEl.textContent = `\$${total.toLocaleString()} · ${days} day${days !== 1 ? 's' : ''}`;
    };

    // 2. Add event listeners
    ['protection', 'toll', 'fuel'].forEach(addon => {
      const el = document.getElementById(`opt-${addon}-${car.id}`);
      if(el) {
        el.addEventListener('change', () => {
          document.getElementById(`val-${addon}-${car.id}`).value = el.checked ? '1' : '0';
          calcBookingTotal();
        });
      }
    });

    const pickupInput = document.getElementById(`pickup-date-${car.id}`);
    const returnInput = document.getElementById(`return-date-${car.id}`);

    if (typeof flatpickr !== 'undefined') {
      const fpReturn = flatpickr(returnInput, {
        minDate: 'today',
        dateFormat: 'Y-m-d',
        disableMobile: true,
        onChange: () => calcBookingTotal()
      });
      const fpPickup = flatpickr(pickupInput, {
        minDate: 'today',
        dateFormat: 'Y-m-d',
        disableMobile: true,
        onChange: ([date]) => {
          fpReturn.set('minDate', date);
          calcBookingTotal();
        }
      });
      
      // Calculate initial if values exist
      if(pickupInput.value && returnInput.value) {
         calcBookingTotal();
      }
    }

    if(pickupInput) pickupInput.addEventListener('change', calcBookingTotal);
    if(returnInput) returnInput.addEventListener('change', calcBookingTotal);

    // Form submission
    const form = document.getElementById(`booking-form-${car.id}`);
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!validateForm(form)) return;
        const d = getBookingData(car.id, car);
        const params = new URLSearchParams({
          id: d.carId, start: d.pDate, end: d.rDate,
          start_time: d.pTime, end_time: d.rTime,
          loc: d.loc, protection: d.protection, toll: d.toll, fuel: d.fuel
        });
        window.location.href = `checkout.html?${params.toString()}`;
      });
    }

    // Reserve via WhatsApp
    const waBtn = document.getElementById(`btn-whatsapp-${car.id}`);
    if (waBtn) {
      waBtn.addEventListener('click', () => {
        if (!validateForm(form)) return;
        const d = getBookingData(car.id, car);
        const phone = '17862096770';
        const locLabels = { aventura: 'Aventura (Free)', mia: 'MIA Airport (\$120)', fll: 'FLL Airport (\$120)' };
        const addons = [];
        if (d.protection === '1') addons.push('Standard Protection');
        if (d.toll === '1') addons.push('Toll Package');
        if (d.fuel === '1') addons.push('Prepaid Fuel');
        const msg = `Hello! I'd like to reserve the *${d.car.make} ${d.car.model}*.\n\n`
          + `Pickup: ${d.pDate} at ${formatTime12(d.pTime)}\n`
          + `Return: ${d.rDate} at ${formatTime12(d.rTime)}\n`
          + `Location: ${locLabels[d.loc] || d.loc}\n`
          + (addons.length ? `Add-ons: ${addons.join(', ')}\n` : '')
          + `Estimated Total: \$${d.totalCost}`;
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
      });
    }
  });
}

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
      if (!!window._tenantPlan && document.body.dataset.page === 'fleet') {
         renderCarsAsLanding(applyFilters());
      } else {
         renderCars(applyFilters());
      }
    });
  });

  document.querySelectorAll('[data-filter-category]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-filter-category]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilters.category = btn.dataset.filterCategory;
      if (!!window._tenantPlan && document.body.dataset.page === 'fleet') {
         renderCarsAsLanding(applyFilters());
      } else {
         renderCars(applyFilters());
      }
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

    if (!tenantSlug) {
      // No subdomain/slug — default to the main tenant so we never show cross-tenant cars
      carsEndpoint += `&tenant_id=eq.${DEFAULT_TENANT_ID}`;
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

  // Determine standard vs landing grid (for tenants)
  const isTenantLanding = !!window._tenantPlan;

  if (page === 'home') {
    renderCars(hasSearch ? CARS : CARS.slice(0, 5));
    initFilters();
  } else if (page === 'fleet') {
    if (isTenantLanding) {
      renderCarsAsLanding(CARS);
    } else {
      renderCars(CARS);
    }
    initFilters();
  }
 else if (page === 'detail') {
    loadCarDetail(); // Re-render with DB prices, specs, features
  }
});
