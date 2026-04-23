'use strict';

/* ── SVG Icon Library ── */
const Icons = {
  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  close:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  menu:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`,
  chevronLeft:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`,
  chevronRight: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`,
  lock:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
  check:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  eye:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
  share:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>`,
  star:    `<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  trophy:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="8 21 12 17 16 21"/><path d="M5 3H19"/><path d="M5 3C5 3 5 10 12 10 19 10 19 3 19 3"/><path d="M5 3H3a2 2 0 0 0-2 2v1a4 4 0 0 0 4 4h1"/><path d="M19 3h2a2 2 0 0 1 2 2v1a4 4 0 0 1-4 4h-1"/><line x1="12" y1="17" x2="12" y2="10"/></svg>`,
  clock:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  gamepad: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><circle cx="15.5" cy="11.5" r="0.5" fill="currentColor"/><circle cx="17.5" cy="13.5" r="0.5" fill="currentColor"/><path d="M21 6H3a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2z"/></svg>`,
  warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,

  /* Platform */
  steam: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V9c0-2.485 2.01-4.5 4.5-4.5 2.485 0 4.5 2.015 4.5 4.5s-2.015 4.5-4.5 4.5h-.105l-4.083 2.919c0 .052.004.103.004.156 0 1.86-1.516 3.375-3.375 3.375-1.66 0-3.04-1.195-3.32-2.77l-4.6-1.901C3.647 20.245 7.514 24 11.979 24 18.626 24 24 18.627 24 12c0-6.626-5.374-12-12.021-12z"/></svg>`,
  epic:   `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 2h18v20H3zm2 2v16h14V4zm2 2h10v2H7zm0 4h10v2H7zm0 4h6v2H7z"/></svg>`,
  gog:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M7 12h10"/></svg>`,
  playstation: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8.984 2.596v17.548l3.915 1.856V6.688c0-.69.304-1.151.794-.991.636.18.763.802.763 1.49v5.515c1.875.884 3.292-.12 3.292-2.604 0-2.553-.876-3.712-3.838-4.79A47.233 47.233 0 0 0 8.984 2.596zM5 19.036l3.148 2.141c-.006-5.67-.006-9.776-.006-13.917L5 8.854v10.182zm14.918-5.32c-.445-.494-1.379-.687-2.927-.446l-4.27.703v2.128l3.152-.512c.546-.09.735.078.735.418 0 .367-.217.573-.735.662l-3.152.516v2.259l4.27-.703c1.548-.256 2.93-1.083 2.927-5.025z"/></svg>`,
  xbox:   `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4.102 7.542c-.875 1.125-1.4 2.528-1.4 4.059 0 1.88.782 3.57 2.034 4.784C4.49 9.44 7.205 6.49 7.205 6.49S5.448 6.46 4.102 7.542zm12.896.948c-1.347-.082-3.104.034-5.003 1.014-1.898-.98-3.656-1.096-5.003-1.014C5.85 8.514 5 9.44 5 11.6c0 2.16 1.85 5.09 2.992 5.818l2.01 1.174C10.002 18.592 10 12 10 12c0-.553.448-1 1-1s1 .447 1 1c0 0-.002 6.592 0 6.592l2.01-1.174C15.15 16.69 17 13.76 17 11.6c0-2.16-.85-3.086-2-3.11zm-6.998-2c1.2 0 2.4.38 3 1 .6-.62 1.8-1 3-1 1.2 0 1.975.38 2.575 1C17.078 5.59 14.74 4.4 12 4.4S6.922 5.59 5.425 7.49c.6-.62 1.375-1 2.575-1z"/></svg>`,
  nintendo: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 3H7C4.8 3 3 4.8 3 7v10c0 2.2 1.8 4 4 4h2V3zm-2 7.5c-.8 0-1.5-.7-1.5-1.5S6.2 7.5 7 7.5 8.5 8.2 8.5 9 7.8 10.5 7 10.5zm9.5 9.5H15V3h1.5C18.9 3 21 5.1 21 7.5v9C21 18.9 18.9 21 16.5 21zm0-10c-.8 0-1.5.7-1.5 1.5s.7 1.5 1.5 1.5 1.5-.7 1.5-1.5S17.3 11 16.5 11zM10 3h4v18h-4z"/></svg>`,

  /* Social */
  github: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>`,
  twitter: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
  paypal: `<svg viewBox="0 0 17 17" fill="currentColor"><path d="M14.06 3.713c.12-1.071-.093-1.832-.702-2.526C12.628.356 11.312 0 9.626 0H4.734a.7.7 0 0 0-.691.59L2.005 13.509a.42.42 0 0 0 .415.486h2.756l-.202 1.28a.628.628 0 0 0 .62.726H8.14c.429 0 .793-.31.862-.731l.025-.13.48-3.043.03-.164.001-.007a.35.35 0 0 1 .348-.297h.38c1.266 0 2.425-.256 3.345-.91q.57-.403.993-1.005a4.94 4.94 0 0 0 .88-2.195c.242-1.246.13-2.356-.57-3.154a2.7 2.7 0 0 0-.76-.59l-.094-.061ZM6.543 8.82a.7.7 0 0 1 .321-.079H8.3c2.82 0 5.027-1.144 5.672-4.456l.003-.016q.326.186.548.438c.546.623.679 1.535.45 2.71-.272 1.397-.866 2.307-1.663 2.874-.802.57-1.842.815-3.043.815h-.38a.87.87 0 0 0-.863.734l-.03.164-.48 3.043-.024.13-.001.004a.35.35 0 0 1-.348.296H5.595a.106.106 0 0 1-.105-.123l.208-1.32z"/></svg>`,
  linktree: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.35 11.9l4.54-4.6-2.13-2.13-4.54 4.6V2.5H8.78v7.27L4.24 5.17 2.11 7.3l4.54 4.6H2.5v2.9h4.15l-4.54 4.6 2.13 2.13 4.54-4.6v7.07h2.44v-7.07l4.54 4.6 2.13-2.13-4.54-4.6h4.15v-2.9h-4.15z"/></svg>`,
};
window.Icons = Icons;

/* ── Fetch Helper ── */
// API base: reads from window.ACHIEVELY_API if set (for deployment), else same-origin /api/v1
const API_BASE = (typeof window !== 'undefined' && window.ACHIEVELY_API)
  ? window.ACHIEVELY_API
  : '/api/v1';

async function apiFetch(path, params = {}, options = {}) {
  // Build absolute URL — relative API_BASE needs location.origin as base
  const rawUrl  = path.startsWith('http') ? path : API_BASE + path;
  const base    = rawUrl.startsWith('/') ? location.origin : undefined;
  const urlObj  = base ? new URL(rawUrl, base) : new URL(rawUrl);
  Object.entries(params).forEach(([k, v]) => urlObj.searchParams.set(k, v));

  // Default 15 s globally; pass options.timeout to override (e.g. 30000 for game page)
  const timeout = options.timeout || 15000;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(urlObj.toString(), { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || `HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') throw new Error('Request timed out. Check your connection.');
    throw err;
  }
}
window.apiFetch = apiFetch;

/* ── Steam ID Helpers ── */
const STEAM_KEY = 'achievely_steamid';

function getSteamId() {
  return localStorage.getItem(STEAM_KEY) || null;
}

function setSteamId(id) {
  const clean = (id || '').trim();
  if (!/^\d{17}$/.test(clean)) return false;
  localStorage.setItem(STEAM_KEY, clean);
  return true;
}

function clearSteamId() {
  localStorage.removeItem(STEAM_KEY);
}

function validateSteamId(id) {
  return /^\d{17}$/.test((id || '').trim());
}

window.SteamID = { get: getSteamId, set: setSteamId, clear: clearSteamId, validate: validateSteamId };

/* Save / clear the display username shown in navbar */
function setUsername(name) {
  if (name) {
    localStorage.setItem('achievely_username', String(name));
    window.dispatchEvent(new CustomEvent('achievely:username'));
  }
}
function setAvatar(url) {
  if (url) {
    localStorage.setItem('achievely_avatar', String(url));
    window.dispatchEvent(new CustomEvent('achievely:avatar'));
  }
}
function clearUsername() {
  localStorage.removeItem('achievely_username');
  localStorage.removeItem('achievely_avatar');
}
window.SteamUser = { setUsername, setAvatar, clearUsername };

/* ── Sanitize HTML (for game descriptions) ── */
function sanitizeHTML(str) {
  const div = document.createElement('div');
  div.textContent = String(str || '');
  return div.innerHTML;
}
window.sanitizeHTML = sanitizeHTML;

/* ── Create Element Helper ── */
function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === 'className') node.className = v;
    else if (k === 'textContent') node.textContent = v;
    else if (k === 'style') Object.assign(node.style, v);
    else node.setAttribute(k, v);
  });
  children.forEach(c => {
    if (typeof c === 'string') node.appendChild(document.createTextNode(c));
    else if (c instanceof Node) node.appendChild(c);
  });
  return node;
}
window.el = el;

/* ── Toast System ── */
(function() {
  let container;
  const toasts = [];
  const MAX_TOASTS = 3;

  function getContainer() {
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }
    return container;
  }

  function dismiss(toastEl) {
    toastEl.classList.add('toast--out');
    toastEl.addEventListener('animationend', () => {
      toastEl.remove();
      const idx = toasts.indexOf(toastEl);
      if (idx > -1) toasts.splice(idx, 1);
    }, { once: true });
  }

  function show(message, type = 'error') {
    const c = getContainer();

    // Enforce max stack
    if (toasts.length >= MAX_TOASTS) {
      dismiss(toasts[0]);
    }

    const toast = document.createElement('div');
    toast.className = 'toast' + (type === 'success' ? ' toast--success' : '');
    toast.setAttribute('role', 'alert');

    // Icon
    const iconWrap = document.createElement('div');
    iconWrap.className = 'toast__icon';
    if (type === 'success') {
      iconWrap.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
    } else {
      iconWrap.innerHTML = Icons.warning;
    }

    // Body
    const body = document.createElement('div');
    body.className = 'toast__body';
    const msg = document.createElement('div');
    msg.className = 'toast__message';
    msg.textContent = String(message);
    body.appendChild(msg);

    // Close
    const closeBtn = document.createElement('button');
    closeBtn.className = 'toast__close';
    closeBtn.setAttribute('aria-label', 'Dismiss');
    closeBtn.innerHTML = Icons.close;
    closeBtn.addEventListener('click', () => dismiss(toast));

    toast.appendChild(iconWrap);
    toast.appendChild(body);
    toast.appendChild(closeBtn);

    c.appendChild(toast);
    toasts.push(toast);

    setTimeout(() => dismiss(toast), 4000);
  }

  window.Toast = {
    error:   (msg) => show(msg, 'error'),
    success: (msg) => show(msg, 'success'),
  };
})();

/* ── Navbar Renderer ── */
function renderNavbar(activePage) {
  const nav = document.querySelector('.navbar');
  if (!nav) return;

  const links = [
    { href: 'index.html',        label: 'Home' },
    { href: 'library.html',      label: 'Library' },
    { href: 'achievements.html', label: 'Achievements' },
    { href: 'profile.html',      label: 'Profile' },
    { href: 'faq.html',          label: 'About' },
  ];

  // Logo
  const logo = document.createElement('a');
  logo.href = 'index.html';
  logo.className = 'navbar__logo';
  const logoText = document.createElement('span');
  logoText.className = 'navbar__logo-text';
  logoText.textContent = 'ACHIEVELY';
  logo.appendChild(logoText);

  // Nav links
  const navEl = document.createElement('nav');
  navEl.className = 'navbar__nav';
  navEl.setAttribute('aria-label', 'Main navigation');

  links.forEach(({ href, label }) => {
    const a = document.createElement('a');
    a.href = href;
    a.className = 'navbar__link' + (activePage === label.toLowerCase() ? ' active' : '');
    a.textContent = label;
    navEl.appendChild(a);
  });

  // Spacer
  const spacer = document.createElement('div');
  spacer.className = 'navbar__spacer';

  // Steam user pill — avatar + username, links to profile page
  const sid = getSteamId();
  const storedUsername = sid ? (localStorage.getItem('achievely_username') || '') : '';
  const storedAvatar   = sid ? (localStorage.getItem('achievely_avatar')   || '') : '';

  const idBadge = document.createElement('a');
  idBadge.id        = 'navbar-user-badge';
  idBadge.href      = 'profile.html';
  idBadge.className = 'navbar__user-pill';
  idBadge.style.display = sid ? 'flex' : 'none';

  const avatarEl = document.createElement('div');
  avatarEl.className = 'navbar__user-avatar';
  if (storedAvatar) {
    const img = document.createElement('img');
    img.setAttribute('src', storedAvatar);
    img.alt = '';
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%;';
    img.addEventListener('error', () => { img.style.display = 'none'; });
    avatarEl.appendChild(img);
  }

  const usernameEl = document.createElement('span');
  usernameEl.className = 'navbar__user-name';
  usernameEl.textContent = storedUsername || (sid ? sid.slice(-4) : '');

  idBadge.appendChild(avatarEl);
  idBadge.appendChild(usernameEl);

  // Live update when profile loads
  const refreshBadge = () => {
    const u = localStorage.getItem('achievely_username');
    const a = localStorage.getItem('achievely_avatar');
    if (u) usernameEl.textContent = u;
    if (a) {
      avatarEl.innerHTML = '';
      const img = document.createElement('img');
      img.setAttribute('src', a);
      img.alt = '';
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%;';
      img.addEventListener('error', () => { img.style.display = 'none'; });
      avatarEl.appendChild(img);
    }
    if (getSteamId()) idBadge.style.display = 'flex';
  };
  window.addEventListener('achievely:username', refreshBadge);
  window.addEventListener('achievely:avatar', refreshBadge);

  // Bookmark icon + badge (shown on all pages)
  const bmWrap = document.createElement('div');
  bmWrap.className = 'navbar__bookmarks-wrap';

  const bmIcon = document.createElement('button');
  bmIcon.className = 'navbar__bookmark-icon';
  bmIcon.setAttribute('aria-label', 'Open bookmarks');
  bmIcon.setAttribute('type', 'button');
  bmIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`;

  const bmBadge = document.createElement('span');
  bmBadge.className = 'navbar__bookmark-badge';
  bmBadge.setAttribute('aria-label', 'bookmarks count');

  bmWrap.appendChild(bmIcon);
  bmWrap.appendChild(bmBadge);

  function refreshBmBadge() {
    const n = Bookmarks.count();
    bmBadge.textContent = n;
    bmBadge.classList.toggle('visible', n > 0);
  }
  refreshBmBadge();
  window.addEventListener('bookmarks:change', refreshBmBadge);
  bmIcon.addEventListener('click', () => openBookmarkDrawer());

  // Hamburger
  const burger = document.createElement('button');
  burger.className = 'navbar__hamburger';
  burger.setAttribute('aria-label', 'Open menu');
  burger.setAttribute('aria-expanded', 'false');
  burger.innerHTML = `<span></span><span></span><span></span>`;

  nav.appendChild(logo);
  nav.appendChild(navEl);
  nav.appendChild(spacer);
  nav.appendChild(idBadge);  // user pill (avatar + name)
  nav.appendChild(bmWrap);   // bookmark icon
  nav.appendChild(burger);   // hamburger (mobile)

  // Mobile drawer
  const drawer = document.createElement('div');
  drawer.className = 'navbar__drawer';
  links.forEach(({ href, label }) => {
    const a = document.createElement('a');
    a.href = href;
    a.className = 'navbar__link' + (activePage === label.toLowerCase() ? ' active' : '');
    a.textContent = label;
    drawer.appendChild(a);
  });
  document.body.insertBefore(drawer, document.body.firstChild);

  burger.addEventListener('click', () => {
    const open = drawer.classList.toggle('open');
    burger.setAttribute('aria-expanded', String(open));
  });
}
window.renderNavbar = renderNavbar;

/* ── Footer Renderer ── */
function renderFooter() {
  const footer = document.querySelector('.footer');
  if (!footer) return;

  const copy = document.createElement('p');
  copy.className = 'footer__copy';
  copy.textContent = '© 2026 Achievely';

  const links = document.createElement('div');
  links.className = 'footer__links';

  const socials = [
    { icon: Icons.github,   href: 'https://github.com/hamood268/', label: 'GitHub' },
    { icon: Icons.linktree, href: 'https://linktr.ee/haaoi/', label: 'Linktree' },
    { icon: Icons.twitter,  href: 'https://x.com/haaoi_dev/', label: 'X' },
    { icon: Icons.paypal,   href: 'https://paypal.me/mohammed0268/', label: 'PayPal' },
  ];

  socials.forEach(({ icon, href, label }) => {
    const a = document.createElement('a');
    a.href = href;
    a.className = 'footer__link';
    a.setAttribute('aria-label', label);
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener noreferrer');
    a.innerHTML = icon;
    links.appendChild(a);
  });

  footer.appendChild(copy);
  footer.appendChild(links);
}
window.renderFooter = renderFooter;

/* ── Skeleton Helpers ── */
function makeSkeleton(w, h) {
  const s = document.createElement('div');
  s.className = 'skeleton';
  s.style.width = w;
  s.style.height = h;
  return s;
}
window.makeSkeleton = makeSkeleton;

/* ── Error State Helper ── */
function renderErrorState(container, message, onRetry) {
  const state = document.createElement('div');
  state.className = 'error-state';

  const card = document.createElement('div');
  card.className = 'error-state__card';

  const iconWrap = document.createElement('div');
  iconWrap.className = 'error-state__icon';
  iconWrap.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;

  const title = document.createElement('h3');
  title.className = 'error-state__title';
  title.textContent = 'Something went wrong';

  const msg = document.createElement('p');
  msg.className = 'error-state__message';
  msg.textContent = String(message);

  card.appendChild(iconWrap);
  card.appendChild(title);
  card.appendChild(msg);

  if (onRetry) {
    const btn = document.createElement('button');
    btn.className = 'btn btn--sm';
    btn.innerHTML = Icons.search + '<span>Try Again</span>';
    btn.addEventListener('click', onRetry);
    card.appendChild(btn);
  }

  state.appendChild(card);
  container.innerHTML = '';
  container.appendChild(state);
}
window.renderErrorState = renderErrorState;

/* ── Empty State Helper ── */
function renderEmptyState(container, title, message, iconSvg) {
  const state = document.createElement('div');
  state.className = 'empty-state';

  const iconWrap = document.createElement('div');
  iconWrap.className = 'empty-state__icon';
  iconWrap.innerHTML = iconSvg || `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="8" y1="15" x2="16" y2="15"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>`;

  const t = document.createElement('h3');
  t.className = 'empty-state__title';
  t.textContent = String(title);

  const m = document.createElement('p');
  m.className = 'empty-state__message';
  m.textContent = String(message);

  state.appendChild(iconWrap);
  state.appendChild(t);
  state.appendChild(m);

  container.innerHTML = '';
  container.appendChild(state);
}
window.renderEmptyState = renderEmptyState;

/* ============================================================
   BOOKMARK SYSTEM
   Storage: localStorage key "achievely_bookmarks"
   Shape: [{ rawgId, name, slug, cover }]
   ============================================================ */
(function () {
  const KEY = 'achievely_bookmarks';

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
    catch (_) { return []; }
  }

  function save(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (_) {}
  }

  function getAll()  { return load(); }
  function count()   { return load().length; }

  function isBookmarked(rawgId) {
    return load().some(b => String(b.rawgId) === String(rawgId));
  }

  function add(game) {
    const list = load().filter(b => String(b.rawgId) !== String(game.rawgId));
    list.unshift({ rawgId: game.rawgId, name: game.name, slug: game.slug || '', cover: game.cover || '' });
    save(list);
    dispatchChange();
  }

  function remove(rawgId) {
    save(load().filter(b => String(b.rawgId) !== String(rawgId)));
    dispatchChange();
  }

  function toggle(game) {
    if (isBookmarked(game.rawgId)) {
      remove(game.rawgId);
      return false;
    } else {
      add(game);
      Toast.success(`"${game.name || 'Game'}" added to bookmarks`);
      return true;
    }
  }

  function dispatchChange() {
    window.dispatchEvent(new CustomEvent('bookmarks:change'));
  }

  window.Bookmarks = { getAll, count, isBookmarked, add, remove, toggle };
})();

/* ============================================================
   BOOKMARK DRAWER
   ============================================================ */
(function () {
  let drawer = null;
  let scrim  = null;

  function buildDrawer() {
    // Scrim
    scrim = document.createElement('div');
    scrim.className = 'bookmark-scrim';
    scrim.addEventListener('click', close);
    document.body.appendChild(scrim);

    // Drawer
    drawer = document.createElement('div');
    drawer.className = 'bookmark-drawer';
    drawer.setAttribute('role', 'dialog');
    drawer.setAttribute('aria-modal', 'true');
    drawer.setAttribute('aria-label', 'Bookmarks');

    const header = document.createElement('div');
    header.className = 'bookmark-drawer__header';

    const title = document.createElement('div');
    title.className = 'bookmark-drawer__title';
    title.textContent = 'BOOKMARKS';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'bookmark-drawer__close';
    closeBtn.setAttribute('aria-label', 'Close bookmarks');
    closeBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    closeBtn.addEventListener('click', close);

    header.appendChild(title);
    header.appendChild(closeBtn);

    const list = document.createElement('div');
    list.className = 'bookmark-drawer__list';
    list.id = 'bookmark-drawer-list';

    drawer.appendChild(header);
    drawer.appendChild(list);
    document.body.appendChild(drawer);

    // Keep list in sync when bookmarks change
    window.addEventListener('bookmarks:change', renderList);

    // ESC to close
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && drawer.classList.contains('open')) close();
    });
  }

  function renderList() {
    const list = document.getElementById('bookmark-drawer-list');
    if (!list) return;
    list.innerHTML = '';

    const all = Bookmarks.getAll();

    if (!all.length) {
      const empty = document.createElement('div');
      empty.className = 'bookmark-drawer__empty';
      const icon = document.createElement('div');
      icon.className = 'bookmark-drawer__empty-icon';
      icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`;
      const msg = document.createElement('div');
      msg.textContent = 'No bookmarks yet. Save games from their detail page.';
      empty.appendChild(icon);
      empty.appendChild(msg);
      list.appendChild(empty);
      return;
    }

    all.forEach(bm => {
      const item = document.createElement('a');
      item.className = 'bookmark-drawer__item';
      const params = new URLSearchParams();
      if (bm.rawgId) params.set('id',   String(bm.rawgId));
      if (bm.slug)   params.set('name', String(bm.slug));
      item.href = `game.html?${params}`;
      item.addEventListener('click', close);

      const cover = document.createElement('img');
      cover.className = 'bookmark-drawer__cover';
      cover.alt = '';
      cover.loading = 'lazy';
      if (bm.cover) cover.setAttribute('src', bm.cover);
      cover.addEventListener('error', () => { cover.style.display = 'none'; });

      const name = document.createElement('div');
      name.className = 'bookmark-drawer__name';
      name.textContent = bm.name || 'Unknown Game';

      const removeBtn = document.createElement('button');
      removeBtn.className = 'bookmark-drawer__remove';
      removeBtn.setAttribute('aria-label', `Remove ${bm.name || 'game'} from bookmarks`);
      removeBtn.setAttribute('type', 'button');
      removeBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
      removeBtn.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        Bookmarks.remove(bm.rawgId);
      });

      item.appendChild(cover);
      item.appendChild(name);
      item.appendChild(removeBtn);
      list.appendChild(item);
    });
  }

  function open() {
    if (!drawer) buildDrawer();
    renderList();
    drawer.classList.add('open');
    scrim.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    if (!drawer) return;
    drawer.classList.remove('open');
    scrim.classList.remove('open');
    document.body.style.overflow = '';
  }

  window.openBookmarkDrawer = open;
  window.closeBookmarkDrawer = close;
})();

/* ============================================================
   UNIVERSAL DRAG-SCROLL
   Applies momentum drag to every .scroll-track AND
   .profile-scroll-track on the page — present and future
   (MutationObserver re-runs on new nodes).
   ============================================================ */
(function initUniversalDragScroll() {
  const SELECTORS = '.scroll-track, .profile-scroll-track, .dlc-track, .screenshots-track';
  const DRAG_THRESHOLD = 5;   // px before a mousedown is treated as a drag
  const FRICTION       = 0.92; // momentum decay per frame

  function bindTrack(track) {
    if (track.dataset.dragBound) return;
    track.dataset.dragBound = '1';

    let isDown = false, hasDragged = false;
    let startX = 0, scrollLeft = 0;
    let velX = 0, lastX = 0, lastT = 0, rafId = null;

    const stopMomentum = () => { if (rafId) { cancelAnimationFrame(rafId); rafId = null; } };

    const runMomentum = () => {
      if (Math.abs(velX) < 0.5) { stopMomentum(); return; }
      track.scrollLeft -= velX;
      velX *= FRICTION;
      rafId = requestAnimationFrame(runMomentum);
    };

    const startDrag = (e) => {
      // Ignore right-clicks and clicks inside inputs/buttons that aren't the track itself
      if (e.button !== 0) return;
      stopMomentum();
      isDown = true; hasDragged = false;
      startX = e.clientX; scrollLeft = track.scrollLeft;
      lastX = e.clientX; lastT = performance.now(); velX = 0;
      track.classList.add('is-dragging');
      track.style.cursor         = 'grabbing';
      track.style.userSelect     = 'none';
      track.style.scrollBehavior = 'auto';
    };

    const endDrag = () => {
      if (!isDown) return;
      isDown = false;
      track.classList.remove('is-dragging');
      track.style.cursor         = 'grab';
      track.style.userSelect     = '';
      track.style.scrollBehavior = '';
      if (hasDragged && Math.abs(velX) > 1) runMomentum();
    };

    const onMove = (e) => {
      if (!isDown) return;
      e.preventDefault();
      const now = performance.now();
      const dt  = Math.max(now - lastT, 1);
      const dx  = e.clientX - lastX;
      velX  = -dx * (16 / dt);
      lastX = e.clientX;
      lastT = now;
      const walk = e.clientX - startX;
      if (Math.abs(walk) > DRAG_THRESHOLD) hasDragged = true;
      track.scrollLeft = scrollLeft - walk;
    };

    // Also support native wheel on the track (horizontal scroll with mouse wheel)
    const onWheel = (e) => {
      // Only hijack purely-vertical wheel events when the track overflows horizontally
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; // already horizontal — let it pass
      if (track.scrollWidth <= track.clientWidth) return;   // nothing to scroll
      e.preventDefault();
      stopMomentum();
      track.scrollLeft += e.deltaY * 1.5;
    };

    track.addEventListener('mousedown',  startDrag);
    track.addEventListener('mouseup',    endDrag);
    track.addEventListener('mouseleave', endDrag);
    track.addEventListener('mousemove',  onMove, { passive: false });
    track.addEventListener('wheel',      onWheel, { passive: false });

    // Block link/card navigation clicks that were actually drags
    track.addEventListener('click', (e) => {
      if (hasDragged) { e.preventDefault(); e.stopPropagation(); }
    }, true);
  }

  function applyAll() {
    document.querySelectorAll(SELECTORS).forEach(bindTrack);
  }

  // Run on DOM ready and whenever new tracks appear (lazy-loaded sections)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyAll);
  } else {
    applyAll();
  }

  const mo = new MutationObserver(applyAll);
  mo.observe(document.body || document.documentElement, { childList: true, subtree: true });

  window.applyDragScroll = applyAll; // expose for manual re-runs
})();
