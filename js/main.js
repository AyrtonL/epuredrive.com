/* =============================================
   LUXE MOTORS — main.js
   ============================================= */

// ---- Navbar Scroll Behavior ----
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  if (window.scrollY > 30) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
}, { passive: true });

// ---- Mobile Menu ----
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobile-menu');

if (hamburger && mobileMenu) {
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    mobileMenu.classList.toggle('open');
  });

  // Close on link click
  mobileMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('open');
      mobileMenu.classList.remove('open');
    });
  });
}

// ---- Scroll Fade-In Animations ----
const observerOptions = {
  threshold: 0.12,
  rootMargin: '0px 0px -40px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, observerOptions);

document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

// ---- Staggered Card Animations ----
document.querySelectorAll('.stagger-fade').forEach((container) => {
  const children = container.querySelectorAll('.fade-in');
  children.forEach((child, i) => {
    child.style.transitionDelay = `${i * 0.07}s`;
  });
});

// ---- Smooth Anchor Scroll ----
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', (e) => {
    const target = document.querySelector(link.getAttribute('href'));
    if (target) {
      e.preventDefault();
      const offset = 80;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  });
});

// ---- Active nav link on scroll ----
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');

if (sections.length && navLinks.length) {
  window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(section => {
      if (window.scrollY >= section.offsetTop - 120) {
        current = section.getAttribute('id');
      }
    });
    navLinks.forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === `#${current}`);
    });
  }, { passive: true });
}

// ---- Newsletter Form ----
const newsletterForm = document.getElementById('newsletter-form');
if (newsletterForm) {
  newsletterForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = newsletterForm.querySelector('input[type="email"]');
    const btn = newsletterForm.querySelector('button');
    if (input && input.value) {
      btn.textContent = '✓ Subscribed!';
      btn.style.background = '#22c55e';
      btn.style.borderColor = '#22c55e';
      btn.style.color = '#fff';
      input.value = '';
      setTimeout(() => {
        btn.textContent = 'Subscribe';
        btn.style.cssText = '';
      }, 3000);
    }
  });
}


// ---- Hero Video Background Slider ----
function initHeroVideoSlider() {
  const hero = document.querySelector('.hero');
  if (!hero) return;

  const VIDEOS = [
    'assets/images/Videos/15863841-uhd_3840_2160_60fps.mp4',
    'assets/images/Videos/20412312-uhd_3840_2160_25fps.mp4',
    'assets/images/Videos/15280626_3840_2160_24fps.mp4',
    'assets/images/Videos/16000240-uhd_2160_3840_60fps.mp4',
    'assets/images/Videos/13843782_2160_3840_30fps.mp4',
  ];

  const container = document.createElement('div');
  container.className = 'hero-video-container';

  const vid1 = document.createElement('video');
  const vid2 = document.createElement('video');

  [vid1, vid2].forEach(v => {
    v.className = 'hero-bg-video';
    v.muted = true;
    v.playsInline = true;
    v.preload = 'none';
    container.appendChild(v);
  });

  // Insert after the static-bg fallback, before the overlays
  const overlay = hero.querySelector('.hero-overlay');
  hero.insertBefore(container, overlay);

  let idx = 0;
  let activeVid = vid1;
  let standbyVid = vid2;

  function crossfadeTo(vid, src) {
    vid.src = src;
    vid.preload = 'auto';
    vid.load();
    vid.play().catch(() => {});
    vid.style.opacity = '1';
    activeVid.style.opacity = '0';
    [activeVid, standbyVid] = [standbyVid, activeVid];
    activeVid.addEventListener('ended', onEnded, { once: true });
  }

  function onEnded() {
    idx = (idx + 1) % VIDEOS.length;
    crossfadeTo(standbyVid, VIDEOS[idx]);
  }

  // Start first video
  vid1.src = VIDEOS[0];
  vid1.preload = 'auto';
  vid1.load();
  vid1.play().catch(() => {});
  vid1.style.opacity = '1';
  vid1.addEventListener('ended', onEnded, { once: true });

  // Preload second video silently
  vid2.src = VIDEOS[1];
  vid2.load();
}

if (document.body.dataset.page === 'home') {
  initHeroVideoSlider();
}

// ---- Animate number counters on hero ----
function animateCount(el, target, duration = 2000) {
  const start = 0;
  const step = target / (duration / 16);
  let current = start;
  const timer = setInterval(() => {
    current += step;
    if (current >= target) { current = target; clearInterval(timer); }
    el.textContent = Math.round(current) + (el.dataset.suffix || '');
  }, 16);
}

const counters = document.querySelectorAll('[data-count]');
if (counters.length) {
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        animateCount(el, parseInt(el.dataset.count));
        counterObserver.unobserve(el);
      }
    });
  }, { threshold: 0.5 });
  counters.forEach(el => counterObserver.observe(el));
}
