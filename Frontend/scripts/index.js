/* ============================================================
   ACHIEVELY — index.js
   Landing page: particles, entrance animations, trending fetch
   ============================================================ */

'use strict';

/* ── Init on DOM ready ── */
document.addEventListener('DOMContentLoaded', () => {
  renderNavbar('home');
  renderFooter();
  initParticles();
  scheduleAnimations();
  initFeatureCards();
});

/* ============================================================
   PARTICLE CANVAS
   ============================================================ */
function initParticles() {
  const canvas = document.getElementById('particle-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let W, H, particles;
  const PARTICLE_COUNT_BASE = 80;
  const MAX_DIST = 130;
  const PARTICLE_RADIUS = 1.5;
  const SPEED = 0.35;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function makeParticle() {
    return {
      x:  Math.random() * W,
      y:  Math.random() * H,
      vx: (Math.random() - 0.5) * SPEED * 2,
      vy: (Math.random() - 0.5) * SPEED * 2,
      r:  Math.random() * PARTICLE_RADIUS + 0.5,
      a:  Math.random() * 0.6 + 0.2,
    };
  }

  function initParticleList() {
    const count = Math.min(PARTICLE_COUNT_BASE, Math.floor((W * H) / 12000));
    particles = Array.from({ length: count }, makeParticle);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Move
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < -10) p.x = W + 10;
      if (p.x > W + 10) p.x = -10;
      if (p.y < -10) p.y = H + 10;
      if (p.y > H + 10) p.y = -10;
    });

    // Lines
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MAX_DIST) {
          const alpha = (1 - dist / MAX_DIST) * 0.18;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(0,212,255,${alpha})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }

    // Dots
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0,212,255,${p.a})`;
      ctx.fill();
    });

    requestAnimationFrame(draw);
  }

  resize();
  initParticleList();
  draw();

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resize();
      initParticleList();
    }, 200);
  });
}

/* ============================================================
   ENTRANCE ANIMATIONS
   ============================================================ */
function scheduleAnimations() {
  const els = [
    '.hero__trophy',
    '.hero__logo',
    '.hero__rule',
    '.hero__tagline',
    '.hero__cta',
    '.hero__stats',
    '.hero__scroll',
  ];

  // Trigger all with a brief RAF to ensure paint
  requestAnimationFrame(() => {
    els.forEach(sel => {
      const el = document.querySelector(sel);
      if (el) el.classList.add('visible');
    });
  });

  // Animated counter for stats
  animateCounters();
}

function animateCounters() {
  const counters = document.querySelectorAll('[data-count]');
  counters.forEach(counter => {
    const target = parseFloat(counter.dataset.count);
    const suffix = counter.dataset.suffix || '';
    const isDecimal = target % 1 !== 0;
    const duration = 1800;
    const startTime = performance.now() + 1600; // delay until visible

    function update(now) {
      if (now < startTime) { requestAnimationFrame(update); return; }
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = target * ease;
      counter.textContent = (isDecimal ? current.toFixed(1) : Math.floor(current).toLocaleString()) + suffix;
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  });
}

/* ============================================================
   FEATURE CARDS
   ============================================================ */
function initFeatureCards() {
  const grid = document.querySelector('.features__grid');
  if (!grid) return;

  const features = [
    {
      icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
      title: 'HUNT ANY GAME',
      desc: 'Search across thousands of titles. Powered by RAWG — every achievement, every platform.',
    },
    {
      icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="8 21 12 17 16 21"/><path d="M5 3H19"/><path d="M5 3C5 3 5 10 12 10 19 10 19 3 19 3"/><path d="M5 3H3a2 2 0 0 0-2 2v1a4 4 0 0 0 4 4h1"/><path d="M19 3h2a2 2 0 0 1 2 2v1a4 4 0 0 1-4 4h-1"/><line x1="12" y1="17" x2="12" y2="10"/></svg>`,
      title: 'TRACK PROGRESS',
      desc: 'Connect your Steam ID to see personal completion rates, unlocked vs locked — at a glance.',
    },
    {
      icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
      title: 'REVEAL HIDDEN',
      desc: 'Unmask secret achievements. Know exactly what you\'re hunting before you grind.',
    },
    {
      icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><circle cx="15.5" cy="11.5" r="0.5" fill="currentColor"/><circle cx="17.5" cy="13.5" r="0.5" fill="currentColor"/><path d="M21 6H3a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2z"/></svg>`,
      title: 'LIBRARY VIEW',
      desc: 'Your entire Steam library sorted by completion, playtime, or recency. Nothing slips through.',
    },
  ];

  features.forEach((f, i) => {
    const card = document.createElement('div');
    card.className = 'feature-card';
    card.style.transitionDelay = `${i * 80}ms`;
    card.style.opacity = '0';
    card.style.transform = 'translateY(24px)';
    card.style.transition = `opacity 0.6s ease ${1.8 + i * 0.1}s, transform 0.6s ease ${1.8 + i * 0.1}s, box-shadow 0.25s ease, border-color 0.25s ease`;

    const iconWrap = document.createElement('div');
    iconWrap.className = 'feature-card__icon';
    iconWrap.innerHTML = f.icon;

    const title = document.createElement('h3');
    title.className = 'feature-card__title';
    title.textContent = f.title;

    const desc = document.createElement('p');
    desc.className = 'feature-card__desc';
    desc.textContent = f.desc;

    card.appendChild(iconWrap);
    card.appendChild(title);
    card.appendChild(desc);
    grid.appendChild(card);

    // Animate in
    requestAnimationFrame(() => {
      setTimeout(() => {
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      }, 1800 + i * 100);
    });
  });
}
