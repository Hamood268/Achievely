/* ============================================================
   ACHIEVELY — game.js
   Game detail: fetch sequence, hero, meta, screenshots,
   lightbox, achievement cards, filter/sort, Steam ID banner
   ============================================================ */

'use strict';

/* ── State ── */
let gameData        = null;
let allAchievements = [];
let currentFilter   = 'all';
let currentSort     = 'rarity';
let lightboxIndex   = 0;
let lightboxImages  = [];

/* ── Platform / Store SVG icons ── */
// Generic fallback: simple monitor icon
const GENERIC_PLATFORM_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><polyline points="8 21 12 17 16 21"/><line x1="12" y1="17" x2="12" y2="3"/></svg>`;

const PlatformIcons = {
  // PC — monitor
  'PC': `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,

  // Steam
  'Steam': `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V9c0-2.485 2.01-4.5 4.5-4.5 2.485 0 4.5 2.015 4.5 4.5s-2.015 4.5-4.5 4.5h-.105l-4.083 2.919c0 .052.004.103.004.156 0 1.86-1.516 3.375-3.375 3.375-1.66 0-3.04-1.195-3.32-2.77l-4.6-1.901C3.647 20.245 7.514 24 11.979 24 18.626 24 24 18.627 24 12c0-6.626-5.374-12-12.021-12z"/></svg>`,

  // PlayStation — PS wordmark tower shape (same path used in shared.js navbar)
  'PlayStation':    `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8.984 2.596v17.548l3.915 1.856V6.688c0-.69.304-1.151.794-.991.636.18.763.802.763 1.49v5.515c1.875.884 3.292-.12 3.292-2.604 0-2.553-.876-3.712-3.838-4.79A47.233 47.233 0 0 0 8.984 2.596zM5 19.036l3.148 2.141c-.006-5.67-.006-9.776-.006-13.917L5 8.854v10.182zm14.918-5.32c-.445-.494-1.379-.687-2.927-.446l-4.27.703v2.128l3.152-.512c.546-.09.735.078.735.418 0 .367-.217.573-.735.662l-3.152.516v2.259l4.27-.703c1.548-.256 2.93-1.083 2.927-5.025z"/></svg>`,
  'PlayStation 2':  `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8.984 2.596v17.548l3.915 1.856V6.688c0-.69.304-1.151.794-.991.636.18.763.802.763 1.49v5.515c1.875.884 3.292-.12 3.292-2.604 0-2.553-.876-3.712-3.838-4.79A47.233 47.233 0 0 0 8.984 2.596zM5 19.036l3.148 2.141c-.006-5.67-.006-9.776-.006-13.917L5 8.854v10.182zm14.918-5.32c-.445-.494-1.379-.687-2.927-.446l-4.27.703v2.128l3.152-.512c.546-.09.735.078.735.418 0 .367-.217.573-.735.662l-3.152.516v2.259l4.27-.703c1.548-.256 2.93-1.083 2.927-5.025z"/></svg>`,
  'PlayStation 3':  `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8.984 2.596v17.548l3.915 1.856V6.688c0-.69.304-1.151.794-.991.636.18.763.802.763 1.49v5.515c1.875.884 3.292-.12 3.292-2.604 0-2.553-.876-3.712-3.838-4.79A47.233 47.233 0 0 0 8.984 2.596zM5 19.036l3.148 2.141c-.006-5.67-.006-9.776-.006-13.917L5 8.854v10.182zm14.918-5.32c-.445-.494-1.379-.687-2.927-.446l-4.27.703v2.128l3.152-.512c.546-.09.735.078.735.418 0 .367-.217.573-.735.662l-3.152.516v2.259l4.27-.703c1.548-.256 2.93-1.083 2.927-5.025z"/></svg>`,
  'PlayStation 4':  `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8.984 2.596v17.548l3.915 1.856V6.688c0-.69.304-1.151.794-.991.636.18.763.802.763 1.49v5.515c1.875.884 3.292-.12 3.292-2.604 0-2.553-.876-3.712-3.838-4.79A47.233 47.233 0 0 0 8.984 2.596zM5 19.036l3.148 2.141c-.006-5.67-.006-9.776-.006-13.917L5 8.854v10.182zm14.918-5.32c-.445-.494-1.379-.687-2.927-.446l-4.27.703v2.128l3.152-.512c.546-.09.735.078.735.418 0 .367-.217.573-.735.662l-3.152.516v2.259l4.27-.703c1.548-.256 2.93-1.083 2.927-5.025z"/></svg>`,
  'PlayStation 5':  `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8.984 2.596v17.548l3.915 1.856V6.688c0-.69.304-1.151.794-.991.636.18.763.802.763 1.49v5.515c1.875.884 3.292-.12 3.292-2.604 0-2.553-.876-3.712-3.838-4.79A47.233 47.233 0 0 0 8.984 2.596zM5 19.036l3.148 2.141c-.006-5.67-.006-9.776-.006-13.917L5 8.854v10.182zm14.918-5.32c-.445-.494-1.379-.687-2.927-.446l-4.27.703v2.128l3.152-.512c.546-.09.735.078.735.418 0 .367-.217.573-.735.662l-3.152.516v2.259l4.27-.703c1.548-.256 2.93-1.083 2.927-5.025z"/></svg>`,

  // Xbox — sphere with X cutout (simple, renders well at small size)
  'Xbox':           `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM6.29 16.4C5.17 15.08 4.5 13.38 4.5 12c0-1.11.32-2.18.9-3.1L10 13.5l-3.71 2.9zm1.42 1.31L11 15.14l3.29 2.57A7.44 7.44 0 0 1 12 18.5a7.44 7.44 0 0 1-4.29-1.5V17.71zm4.29-5.25L9.5 9.5l2.5-4.38 2.5 4.38-2.5 2.16zm5.71 4.25-3.71-2.9 4.6-4.6c.58.92.9 1.99.9 3.1 0 1.38-.67 3.08-1.79 4.4zm-1.42-8.02L12.5 12.14l-1.79-1.65L13.5 6.5l2.79 2.19z"/></svg>`,
  'Xbox One':       `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM6.29 16.4C5.17 15.08 4.5 13.38 4.5 12c0-1.11.32-2.18.9-3.1L10 13.5l-3.71 2.9zm1.42 1.31L11 15.14l3.29 2.57A7.44 7.44 0 0 1 12 18.5a7.44 7.44 0 0 1-4.29-1.5V17.71zm4.29-5.25L9.5 9.5l2.5-4.38 2.5 4.38-2.5 2.16zm5.71 4.25-3.71-2.9 4.6-4.6c.58.92.9 1.99.9 3.1 0 1.38-.67 3.08-1.79 4.4zm-1.42-8.02L12.5 12.14l-1.79-1.65L13.5 6.5l2.79 2.19z"/></svg>`,
  'Xbox 360':       `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM6.29 16.4C5.17 15.08 4.5 13.38 4.5 12c0-1.11.32-2.18.9-3.1L10 13.5l-3.71 2.9zm1.42 1.31L11 15.14l3.29 2.57A7.44 7.44 0 0 1 12 18.5a7.44 7.44 0 0 1-4.29-1.5V17.71zm4.29-5.25L9.5 9.5l2.5-4.38 2.5 4.38-2.5 2.16zm5.71 4.25-3.71-2.9 4.6-4.6c.58.92.9 1.99.9 3.1 0 1.38-.67 3.08-1.79 4.4zm-1.42-8.02L12.5 12.14l-1.79-1.65L13.5 6.5l2.79 2.19z"/></svg>`,
  'Xbox Series S/X':`<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM6.29 16.4C5.17 15.08 4.5 13.38 4.5 12c0-1.11.32-2.18.9-3.1L10 13.5l-3.71 2.9zm1.42 1.31L11 15.14l3.29 2.57A7.44 7.44 0 0 1 12 18.5a7.44 7.44 0 0 1-4.29-1.5V17.71zm4.29-5.25L9.5 9.5l2.5-4.38 2.5 4.38-2.5 2.16zm5.71 4.25-3.71-2.9 4.6-4.6c.58.92.9 1.99.9 3.1 0 1.38-.67 3.08-1.79 4.4zm-1.42-8.02L12.5 12.14l-1.79-1.65L13.5 6.5l2.79 2.19z"/></svg>`,

  // Nintendo Switch — two joycons + screen
  'Nintendo Switch': `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M14.176 24c3.222 0 5.824-2.602 5.824-5.824V5.824C20 2.602 17.398 0 14.176 0H9.824C6.602 0 4 2.602 4 5.824v12.352C4 21.398 6.602 24 9.824 24h4.352zM16 6.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm-1.5 11a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0zM6 5.5h3v13H6a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2zm2.5 4a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"/></svg>`,

  // Wii — generic controller
  'Wii':             GENERIC_PLATFORM_ICON,
  'Wii U':           GENERIC_PLATFORM_ICON,
  'GameCube':        GENERIC_PLATFORM_ICON,
  'Dreamcast':       GENERIC_PLATFORM_ICON,
  'Nintendo DS':     GENERIC_PLATFORM_ICON,
  'Nintendo 3DS':    GENERIC_PLATFORM_ICON,
  'Game Boy Advance':GENERIC_PLATFORM_ICON,

  // iOS — phone outline (notch-free, clean at small size)
  'iOS': `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 1h-8A2.5 2.5 0 0 0 5 3.5v17A2.5 2.5 0 0 0 7.5 23h8a2.5 2.5 0 0 0 2.5-2.5v-17A2.5 2.5 0 0 0 15.5 1zM12 21a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm4-4H8V4h8v13z"/></svg>`,

  // Android — robot head
  'Android': `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85-.29-.15-.65-.06-.83.22l-1.88 3.24A9.82 9.82 0 0 0 12 8c-1.53 0-2.97.37-4.27 1.01L5.85 5.77a.636.636 0 0 0-.87-.2c-.28.18-.37.54-.2.83L6.6 9.48A9.994 9.994 0 0 0 2 18h20a9.994 9.994 0 0 0-4.4-8.52zM7 15.25a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm10 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5z"/></svg>`,

  // macOS — Apple logo (viewBox normalized to 24x24 to render correctly at small sizes)
  'macOS': `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>`,

  // Linux — Tux
  'Linux': `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C9.8 2 8 3.8 8 6c0 1.4.7 2.6 1.8 3.4C8.1 10.5 7 12.5 7 14.7c0 .7.1 1.4.3 2H5.5C4.7 16.7 4 17.4 4 18.2v.3c0 .8.6 1.5 1.5 1.5h1c.5 1.2 1.7 2 3 2h5c1.3 0 2.5-.8 3-2h1c.8 0 1.5-.7 1.5-1.5v-.3c0-.8-.7-1.5-1.5-1.5h-1.8c.2-.6.3-1.3.3-2 0-2.2-1.1-4.2-2.8-5.3C15.3 8.6 16 7.4 16 6c0-2.2-1.8-4-4-4zm0 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm-1 8h2c1.9 0 3.5 1.7 3.5 3.7 0 .4-.1.9-.2 1.3H7.7c-.1-.4-.2-.9-.2-1.3C7.5 13.7 9.1 12 11 12zm-1 8h4c-.4.6-1 1-1.7 1h-.6c-.7 0-1.3-.4-1.7-1z"/></svg>`,
};

const StoreIcons = {
  'Steam':             PlatformIcons['Steam'],

  // Epic Games — correct logo (shield/E shape)
  'Epic Games': `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3.002 3H21v5.5h-2V5H5v4.5H3V3zm0 7.5H5V15h11v-1.5h2V17H3v-6.5zM5 18.5h14V21h2v-4.5H3V21h2v-2.5z"/></svg>`,

  // GOG — galaxy/planet icon (GOG Galaxy)
  'GOG': `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 2c1.5 0 2.9.4 4.1 1.2-2.1.5-4.2 1.5-6 2.8C8.6 6.2 7.1 5 5.6 4.4A8.1 8.1 0 0 1 12 4zM4 12c0-.8.1-1.5.3-2.2 1.5.5 3.1 1.6 4.4 3-1.2 1.5-2 3.2-2.3 5A8 8 0 0 1 4 12zm8 8c-1.5 0-2.9-.4-4.1-1.1.4-1.7 1.2-3.3 2.4-4.6 1 .6 2.1 1 3.2 1.2.1 1.6.5 3.1 1.1 4.3-.8.1-1.7.2-2.6.2zm1.2-6.5c-1-.2-1.9-.5-2.7-1.1C11.7 11 13.5 10 15.4 9.4c.5 1 .8 2.1.9 3.2-1 .1-2 .2-3.1-.1zm3.8.2c-.1-1.3-.5-2.6-1.1-3.8 1.1-.2 2.2-.3 3.2-.2.4.8.7 1.7.8 2.6-.9.5-1.9.9-2.9 1.4zm1-5.7c-1.2 0-2.4.2-3.6.4a9.7 9.7 0 0 0-4.6-3.2A8 8 0 0 1 20 12c0 .2 0 .4-.1.6-1-.1-2.1 0-3.1.1-.1-1.7-.7-3.3-1.6-4.7 1-.2 2-.5 2.8-.9z"/></svg>`,

  'PlayStation Store': PlatformIcons['PlayStation'],
  'Xbox Store':        PlatformIcons['Xbox'],
  'Nintendo eShop':    PlatformIcons['Nintendo Switch'],

  // App Store — Apple logo (normalized 24x24 viewBox)
  'App Store': `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>`,

  // Google Play — correct triangle play logo
  'Google Play': `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3.18 23.76a2 2 0 0 0 2.76.74l12.05-6.96-3.4-3.4-11.41 9.62zm-1.18-21v18.48L14.34 9 1.96.45C1.74.31 1.48.24 1.22.24A2 2 0 0 0 0 2.76zM21.4 9.58l-3.42-1.97L14.34 9l3.64 3.64 3.44-1.98A2 2 0 0 0 21.4 9.58zm-18.22-7.2L14.34 9 17.74 5.6 5.94.74A2 2 0 0 0 3.18 2.38z"/></svg>`,

  // Xbox 360 Store (not in original but mapping just in case)
  'Xbox 360 Store': PlatformIcons['Xbox'],
};

/* ── Game page inline search bar ── */
function renderGameSearchBar() {
  const wrap = document.getElementById('game-search-wrap');
  if (!wrap) return;

  let searchDebounce = null;
  let dropdownIdx    = -1;
  let results        = [];

  const outerWrap = document.createElement('div');
  outerWrap.style.cssText = 'position:relative;max-width:480px;';

  const form = document.createElement('div');
  form.className = 'game-search-form';

  const icon = document.createElement('label');
  icon.className = 'game-search-icon';
  icon.htmlFor   = 'game-search-input';
  icon.setAttribute('aria-label', 'Search');
  icon.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;

  const input = document.createElement('input');
  input.id = 'game-search-input';
  input.type = 'text';
  input.className = 'game-search-input';
  input.placeholder = 'Search another game…';
  input.maxLength = 120;
  input.setAttribute('autocomplete', 'off');
  input.setAttribute('spellcheck', 'false');

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'game-search-btn';
  btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;

  // Dropdown
  const dropdown = document.createElement('div');
  dropdown.style.cssText = 'position:absolute;top:calc(100% + 6px);left:0;right:0;background:rgba(10,20,38,0.97);border:1px solid var(--cyan-border);border-radius:var(--r-lg);backdrop-filter:blur(20px);box-shadow:0 12px 40px rgba(0,0,0,.5);overflow:hidden;display:none;z-index:50;';

  const closeDropdown = () => { dropdown.style.display = 'none'; dropdown.innerHTML = ''; results = []; dropdownIdx = -1; };

  const goToGame = (game) => {
    closeDropdown();
    const slug = game.slug || (game.name || '').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
    const params = new URLSearchParams({ name: slug });
    location.href = `game.html?${params}`;
  };

  const renderDropdown = (games) => {
    results = games;
    dropdown.innerHTML = '';
    if (!games.length) { closeDropdown(); return; }
    dropdown.style.display = 'block';
    games.slice(0, 8).forEach((game, i) => {
      const item = document.createElement('div');
      item.style.cssText = 'display:flex;align-items:center;gap:12px;padding:9px 14px;cursor:pointer;border-bottom:1px solid rgba(0,212,255,.05);transition:background .15s;';
      item.addEventListener('mouseenter', () => { dropdownIdx = i; highlightItem(); });
      item.addEventListener('click', () => goToGame(game));

      const coverSrc = game.background_image || game.cover || '';
      const img = document.createElement('img');
      img.style.cssText = 'width:48px;height:28px;border-radius:4px;object-fit:cover;flex-shrink:0;background:var(--bg-surface);';
      img.alt = '';
      if (coverSrc) img.setAttribute('src', coverSrc);
      img.addEventListener('error', () => { img.style.display = 'none'; });

      const name = document.createElement('span');
      name.style.cssText = 'font-size:13px;font-weight:600;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;';
      name.textContent = game.name || '';

      item.appendChild(img);
      item.appendChild(name);
      dropdown.appendChild(item);
    });
  };

  const highlightItem = () => {
    Array.from(dropdown.children).forEach((el, i) => {
      el.style.background = i === dropdownIdx ? 'rgba(0,212,255,.07)' : '';
    });
  };

  const runSearch = async (q) => {
    if (!q) { closeDropdown(); return; }
    try {
      const params = new URLSearchParams({ q });
      const data = await apiFetch(`/search?${params}`);
      const games = Array.isArray(data) ? data : (data.results || data.games || []);
      renderDropdown(games);
    } catch (_) { closeDropdown(); }
  };

  input.addEventListener('input', () => {
    const val = input.value.trim();
    clearTimeout(searchDebounce);
    if (!val) { closeDropdown(); return; }
    searchDebounce = setTimeout(() => runSearch(val), 350);
  });

  input.addEventListener('keydown', e => {
    const items = Array.from(dropdown.children);
    if (e.key === 'ArrowDown') { e.preventDefault(); dropdownIdx = Math.min(dropdownIdx+1, items.length-1); highlightItem(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); dropdownIdx = Math.max(dropdownIdx-1, 0); highlightItem(); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (dropdownIdx >= 0 && results[dropdownIdx]) goToGame(results[dropdownIdx]);
      else if (results.length) goToGame(results[0]);
    }
    else if (e.key === 'Escape') closeDropdown();
  });

  btn.addEventListener('click', () => {
    if (dropdownIdx >= 0 && results[dropdownIdx]) goToGame(results[dropdownIdx]);
    else if (results.length) goToGame(results[0]);
    else { const val = input.value.trim(); if (val) runSearch(val); }
  });

  document.addEventListener('click', e => { if (!outerWrap.contains(e.target)) closeDropdown(); });

  form.appendChild(icon);
  form.appendChild(input);
  form.appendChild(btn);
  outerWrap.appendChild(form);
  outerWrap.appendChild(dropdown);
  wrap.appendChild(outerWrap);
}

/* ── Date formatter: YYYY-MM-DD → DD-MM-YYYY ── */
function fmtDate(str) {
  if (!str) return '';
  const p = String(str).split('T')[0].split('-');
  if (p.length === 3) return `${p[2]}-${p[1]}-${p[0]}`;
  return str;
}

/* ── Init ── */
document.addEventListener('DOMContentLoaded', () => {
  renderNavbar('game');
  renderFooter();
  initGame();
});

/* ============================================================
   MAIN INIT — parse URL, kick off fetch sequence
   ============================================================ */
async function initGame() {
  const params = new URLSearchParams(location.search);
  // Use 'name' (slug) as the primary identifier — human-readable URLs
  // Also accept legacy 'id' param for backwards compatibility
  const slug   = params.get('name');
  const rawgId = params.get('id');
  const identifier = slug || rawgId;

  if (!identifier) {
    showPageError('No game specified. Please go back and select a game.');
    return;
  }

  // Show skeleton while loading
  showHeroSkeleton();
  showAchievementSkeletons(12);

  try {
    // ── Step 1: game metadata ──
    const gameRaw = await apiFetch(`/games/${encodeURIComponent(identifier)}`);
    if (!gameRaw) throw new Error('Game not found.');
    // API response shape: { code, status, games: { rawgId, name, slug, ... } }
    gameData = gameRaw.games || gameRaw.game || gameRaw.data || gameRaw;
    if (!gameData || (!gameData.name && !gameData.slug)) throw new Error('Game not found.');

    renderHero(gameData);
    renderGameSearchBar();
    renderMeta(gameData);
    renderDescription(gameData);

    // Screenshots: read from sessionStorage (written on card click).
    // Not returned by detail endpoint. Hidden silently if not present.
    const screenshotKey = `game_screenshots_${gameData.rawgId || identifier}`;
    let screenshots = [];
    try {
      const stored = sessionStorage.getItem(screenshotKey);
      if (stored) screenshots = JSON.parse(stored);
    } catch (_) { /* parse error or storage unavailable — stay empty */ }
    renderScreenshots(screenshots);

    // ── Step 2: achievements (single endpoint, includes personal progress) ──
    const steamId  = SteamID.get();
    const gameId   = gameData.slug || gameData.rawgId || identifier;
    const achParams = steamId ? `?steamId=${encodeURIComponent(steamId)}` : '';
    let achieveRaw = null;
    try {
      achieveRaw = await apiFetch(`/games/${encodeURIComponent(gameId)}/achievements${achParams}`);
    } catch (err) {
      // 404 = game not on Steam — show informational banner, don't error the whole page
      if (err.message && (err.message.includes('404') || err.message.toLowerCase().includes('not available') || err.message.toLowerCase().includes('not found'))) {
        showNotOnSteamBanner();
        allAchievements = [];
      } else {
        throw err;
      }
    }
    if (achieveRaw !== null) allAchievements = normalizeAchievements(achieveRaw);

    // completed: true/false/null is embedded per achievement in the response.
    // No separate merge step needed.
    renderSteamBanner(steamId, gameData);
    renderAchievements();

  } catch (err) {
    Toast.error(`Couldn't load game. ${err.message}`);
    showPageError(err.message);
  }
}

/* ── Normalize achievement array ──
   Response shape: { count, hasPlayerData, achievements: [] }
   completed: true = unlocked, false = locked, null/absent = no Steam data ── */
function normalizeAchievements(data) {
  // Store hasPlayerData so renderAchievements can decide whether to show progress bar
  window._achHasPlayerData = !!(data.hasPlayerData);
  const list = Array.isArray(data) ? data : (data.achievements || data.results || []);
  return list.map(a => ({
    name:                 a.name        || 'Unknown Achievement',
    description:          a.description || '',
    isHidden:             a.isHidden    || false,
    icon:                 a.icon        || '',
    iconIncomplete:       a.iconIncomplete || a.icon || '',
    completionPercentage: parseFloat(a.completionPercentage || a.percent || 0),
    apiName:              a.apiName     || a.name || '',
    unlocked:             a.completed === true,
    unlockTime:           a.unlockTime  || a.unlocktime || null,
  }));
}

/* ============================================================
   HERO
   ============================================================ */
function showHeroSkeleton() {
  const wrap = document.getElementById('hero-wrap');
  if (!wrap) return;
  wrap.innerHTML = '';
  const sk = document.createElement('div');
  sk.className = 'hero-skeleton';
  wrap.appendChild(sk);
}

function renderHero(game) {
  const wrap = document.getElementById('hero-wrap');
  if (!wrap) return;

  wrap.innerHTML = '';

  const hero = document.createElement('section');
  hero.className = 'game-hero';
  hero.setAttribute('aria-label', 'Game hero');

  // Background
  const bg = document.createElement('div');
  bg.className = 'game-hero__bg';
  if (game.background_image) {
    bg.style.backgroundImage = `url(${CSS.escape ? "'" + game.background_image + "'" : ''})`;
    bg.setAttribute('style', `background-image: url('${game.background_image}')`);
  }

  const overlay = document.createElement('div');
  overlay.className = 'game-hero__overlay';

  const scan = document.createElement('div');
  scan.className = 'game-hero__scan';
  scan.setAttribute('aria-hidden', 'true');

  // Content
  const content = document.createElement('div');
  content.className = 'game-hero__content';

  // Back button
  const backBar = document.createElement('div');
  backBar.className = 'back-bar';
  const backBtn = document.createElement('a');
  backBtn.href = 'library.html';
  backBtn.className = 'btn btn--sm btn--ghost';
  backBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>`;
  const backText = document.createTextNode('Library');
  backBtn.appendChild(backText);
  backBar.appendChild(backBtn);
  hero.appendChild(backBar);

  // Cover — use background_image (landscape 16:9) as the primary source
  // since RAWG covers are landscape; fall back to cover field
  const coverWrap = document.createElement('div');
  coverWrap.className = 'game-hero__cover-wrap';

  const coverSrc = game.cover || game.background_image || '';
  if (coverSrc) {
    const img = document.createElement('img');
    img.className = 'game-hero__cover';
    img.alt       = '';
    img.loading   = 'eager';
    img.setAttribute('src', coverSrc);
    img.addEventListener('error', () => {
      img.replaceWith(buildHeroCoverFallback());
    });
    coverWrap.appendChild(img);
  } else {
    coverWrap.appendChild(buildHeroCoverFallback());
  }

  // Info
  const info = document.createElement('div');
  info.className = 'game-hero__info';

  // Eyebrow
  const eyebrow = document.createElement('div');
  eyebrow.className = 'game-hero__eyebrow';
  if (game.genres && game.genres.length) {
    const eb = document.createElement('span');
    eb.className = 'game-hero__eyebrow-text';
    eb.textContent = game.genres[0];
    eyebrow.appendChild(eb);
  }

  // Title
  const title = document.createElement('h1');
  title.className = 'game-hero__title';
  title.textContent = game.name || 'Unknown Game';

  // Sub row
  const sub = document.createElement('div');
  sub.className = 'game-hero__sub';

  if (game.developers && game.developers.length) {
    const dev = document.createElement('span');
    dev.className = 'game-hero__developer';
    dev.textContent = game.developers[0];
    sub.appendChild(dev);
  }

  if (game.release_date) {
    const rel = document.createElement('span');
    rel.className = 'game-hero__release';
    rel.textContent = fmtDate(game.release_date);
    sub.appendChild(rel);
  }

  // Rating
  const ratingRow = document.createElement('div');
  ratingRow.className = 'game-hero__rating';

  if (game.rating) {
    const stars = buildStars(parseFloat(game.rating));
    ratingRow.appendChild(stars);
    const ratingVal = document.createElement('span');
    ratingVal.className = 'rating-value';
    ratingVal.textContent = parseFloat(game.rating).toFixed(1);
    ratingRow.appendChild(ratingVal);
  }

  if (game.metacritic) {
    const mc = document.createElement('span');
    const score = parseInt(game.metacritic, 10);
    mc.className = 'metacritic-badge ' + (score >= 75 ? 'metacritic-badge--green' : score >= 50 ? 'metacritic-badge--yellow' : 'metacritic-badge--red');
    mc.textContent = score;
    ratingRow.appendChild(mc);
  }

  // Actions
  const actions = document.createElement('div');
  actions.className = 'game-hero__actions';

  const achBtn = document.createElement('a');
  achBtn.href = '#achievements';
  achBtn.className = 'btn btn--sm';
  achBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="8 21 12 17 16 21"/><path d="M5 3H19"/><path d="M5 3C5 3 5 10 12 10 19 10 19 3 19 3"/><path d="M5 3H3a2 2 0 0 0-2 2v1a4 4 0 0 0 4 4h1"/><path d="M19 3h2a2 2 0 0 1 2 2v1a4 4 0 0 1-4 4h-1"/><line x1="12" y1="17" x2="12" y2="10"/></svg>`;
  achBtn.appendChild(document.createTextNode('Achievements'));
  actions.appendChild(achBtn);

  // Bookmark toggle button
  const bmBtn = buildBookmarkButton(game);
  actions.appendChild(bmBtn);

  info.appendChild(eyebrow);
  info.appendChild(title);
  info.appendChild(sub);
  if (ratingRow.children.length) info.appendChild(ratingRow);
  info.appendChild(actions);

  content.appendChild(coverWrap);
  content.appendChild(info);

  hero.appendChild(bg);
  hero.appendChild(overlay);
  hero.appendChild(scan);
  hero.appendChild(content);

  wrap.appendChild(hero);
}

function buildHeroCoverFallback() {
  const d = document.createElement('div');
  d.className = 'game-hero__cover-fallback';
  d.innerHTML = `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.3"><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><circle cx="15.5" cy="11.5" r="0.5" fill="currentColor"/><circle cx="17.5" cy="13.5" r="0.5" fill="currentColor"/><path d="M21 6H3a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2z"/></svg>`;
  return d;
}

function buildStars(rating) {
  const wrap = document.createElement('div');
  wrap.className = 'rating-stars';
  wrap.setAttribute('aria-label', `Rating: ${rating} out of 5`);
  const max = 5;
  for (let i = 1; i <= max; i++) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '16');
    svg.setAttribute('height', '16');
    svg.setAttribute('aria-hidden', 'true');
    const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    poly.setAttribute('points', '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2');
    poly.setAttribute('fill', 'currentColor');
    svg.appendChild(poly);
    svg.setAttribute('class', 'rating-star ' + (i <= Math.floor(rating) ? '' : i <= rating + 0.5 ? 'rating-star--half' : 'rating-star--empty'));
    wrap.appendChild(svg);
  }
  return wrap;
}

/* ============================================================
   METADATA
   ============================================================ */
function renderMeta(game) {
  const wrap = document.getElementById('meta-wrap');
  if (!wrap) return;

  wrap.innerHTML = '';
  const section = document.createElement('div');
  section.className = 'game-meta';

  // Platforms
  if (game.platforms && game.platforms.length) {
    section.appendChild(buildMetaGroup('Platforms', game.platforms, PlatformIcons, false));
  }

  // Stores
  if (game.stores && game.stores.length) {
    section.appendChild(buildMetaGroup('Available On', game.stores, StoreIcons, false));
  }

  // Genres
  if (game.genres && game.genres.length) {
    section.appendChild(buildMetaGroup('Genres', game.genres, {}, true));
  }

  // Tags
  if (game.tags && game.tags.length) {
    section.appendChild(buildMetaGroup('Tags', game.tags.slice(0, 10), {}, true));
  }

  // Dev / Pub fields
  const fields = document.createElement('div');
  fields.className = 'meta-fields';

  if (game.developers && game.developers.length) {
    fields.appendChild(buildMetaField('Developer', game.developers.join(', ')));
  }
  if (game.publishers && game.publishers.length) {
    fields.appendChild(buildMetaField('Publisher', game.publishers.join(', ')));
  }
  if (game.release_date) {
    fields.appendChild(buildMetaField('Released', fmtDate(game.release_date)));
  }
  if (game.latest_update) {
    fields.appendChild(buildMetaField('Recent Update', fmtDate(game.latest_update)));
  }
  if (game.playtime) {
    fields.appendChild(buildMetaField('Avg. Playtime', `${game.playtime} hours`));
  }

  if (fields.children.length) section.appendChild(fields);

  wrap.appendChild(section);
}

function buildMetaGroup(label, items, iconMap, isGenre) {
  const group = document.createElement('div');
  group.className = 'meta-group';

  const lbl = document.createElement('div');
  lbl.className = 'meta-group__label';
  lbl.textContent = label;

  const pills = document.createElement('div');
  pills.className = 'meta-pills';

  items.forEach(item => {
    const pill = document.createElement('div');
    pill.className = 'meta-pill' + (isGenre ? ' meta-pill--genre' : '');

    const icon = iconMap[item];
    // Use generic platform icon as fallback for unknown platforms/stores
    const iconToUse = !isGenre ? (icon || GENERIC_PLATFORM_ICON) : null;
    if (iconToUse) {
      const iconWrap = document.createElement('span');
      iconWrap.setAttribute('aria-hidden', 'true');
      iconWrap.innerHTML = iconToUse;
      pill.appendChild(iconWrap);
    }

    const text = document.createTextNode(item);
    pill.appendChild(text);
    pills.appendChild(pill);
  });

  group.appendChild(lbl);
  group.appendChild(pills);
  return group;
}

function buildMetaField(label, value) {
  const field = document.createElement('div');
  field.className = 'meta-field';
  const lbl = document.createElement('div');
  lbl.className = 'meta-field__label';
  lbl.textContent = label;
  const val = document.createElement('div');
  val.className = 'meta-field__value';
  val.textContent = value;
  field.appendChild(lbl);
  field.appendChild(val);
  return field;
}

/* ── Description ── */
function renderDescription(game) {
  const wrap = document.getElementById('description-wrap');
  if (!wrap || !game.description) { if (wrap) wrap.style.display = 'none'; return; }

  wrap.innerHTML = '';
  const section = document.createElement('div');
  section.className = 'game-description';

  const text = document.createElement('p');
  text.className = 'game-description__text truncated';
  // Safe — escaped via sanitizeHTML
  text.innerHTML = sanitizeHTML(game.description);

  const toggle = document.createElement('button');
  toggle.className = 'game-description__toggle';
  toggle.textContent = 'Show more';
  toggle.addEventListener('click', () => {
    const expanded = text.classList.toggle('truncated');
    toggle.textContent = expanded ? 'Show less' : 'Show more';
  });

  section.appendChild(text);
  section.appendChild(toggle);
  wrap.appendChild(section);
}

/* ============================================================
   SCREENSHOTS + LIGHTBOX
   ============================================================ */
function renderScreenshots(shots) {
  lightboxImages = shots.filter(s => typeof s === 'string' ? s : (s.image || s.url || s));

  const wrap = document.getElementById('screenshots-wrap');
  if (!wrap || !lightboxImages.length) { if (wrap) wrap.style.display = 'none'; return; }

  wrap.innerHTML = '';
  const section = document.createElement('section');
  section.className = 'screenshots-section';
  section.setAttribute('aria-label', 'Screenshots');

  // Header with nav buttons
  const header = document.createElement('div');
  header.className = 'screenshots-header';

  const titleEl = document.createElement('h2');
  titleEl.className = 'screenshots-title';
  titleEl.textContent = 'Screenshots';

  const navRow = document.createElement('div');
  navRow.className = 'screenshots-nav';

  const prevBtn = document.createElement('button');
  prevBtn.type = 'button';
  prevBtn.className = 'screenshots-nav-btn';
  prevBtn.setAttribute('aria-label', 'Scroll left');
  prevBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>`;

  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.className = 'screenshots-nav-btn';
  nextBtn.setAttribute('aria-label', 'Scroll right');
  nextBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>`;

  navRow.appendChild(prevBtn);
  navRow.appendChild(nextBtn);
  header.appendChild(titleEl);
  header.appendChild(navRow);

  const track = document.createElement('div');
  track.className = 'screenshots-track';

  prevBtn.addEventListener('click', () => { track.scrollBy({ left: -260, behavior: 'smooth' }); });
  nextBtn.addEventListener('click', () => { track.scrollBy({ left:  260, behavior: 'smooth' }); });

  lightboxImages.forEach((shot, i) => {
    const src = typeof shot === 'string' ? shot : (shot.image || shot.url || '');
    if (!src) return;

    const thumb = document.createElement('button');
    thumb.className = 'screenshot-thumb';
    thumb.setAttribute('aria-label', `Screenshot ${i + 1}`);
    thumb.type = 'button';

    const img = document.createElement('img');
    img.alt     = '';
    img.loading = 'lazy';
    img.setAttribute('src', src);
    img.addEventListener('error', () => { thumb.style.display = 'none'; });

    thumb.appendChild(img);
    thumb.addEventListener('click', () => openLightbox(i));
    track.appendChild(thumb);
  });

  section.appendChild(header);
  section.appendChild(track);
  wrap.appendChild(section);
}

function openLightbox(idx) {
  lightboxIndex = idx;
  const lb = document.getElementById('lightbox');
  if (!lb) return;
  lb.classList.add('open');
  lb.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  updateLightboxImage();
  document.addEventListener('keydown', lightboxKeyHandler);
}

function closeLightbox() {
  const lb = document.getElementById('lightbox');
  if (!lb) return;
  lb.classList.remove('open');
  lb.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  document.removeEventListener('keydown', lightboxKeyHandler);
}

function updateLightboxImage() {
  const src = getLightboxSrc(lightboxIndex);
  if (!src) return;

  const img     = document.getElementById('lightbox-img');
  const counter = document.getElementById('lightbox-counter');
  const dotsWrap = document.getElementById('lightbox-dots');

  if (img) {
    img.style.opacity = '0';
    img.style.transform = 'scale(0.97)';
    img.setAttribute('src', src);
    img.onload = () => {
      img.style.opacity = '1';
      img.style.transform = 'scale(1)';
    };
  }

  if (counter) counter.textContent = `${lightboxIndex + 1} / ${lightboxImages.length}`;

  if (dotsWrap) {
    dotsWrap.querySelectorAll('.lightbox__dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === lightboxIndex);
    });
  }
}

function getLightboxSrc(i) {
  const shot = lightboxImages[i];
  return typeof shot === 'string' ? shot : (shot && (shot.image || shot.url)) || '';
}

function lightboxKeyHandler(e) {
  if (e.key === 'Escape')     closeLightbox();
  if (e.key === 'ArrowRight') lightboxNext();
  if (e.key === 'ArrowLeft')  lightboxPrev();
}

function lightboxNext() {
  lightboxIndex = (lightboxIndex + 1) % lightboxImages.length;
  updateLightboxImage();
}

function lightboxPrev() {
  lightboxIndex = (lightboxIndex - 1 + lightboxImages.length) % lightboxImages.length;
  updateLightboxImage();
}

function buildLightbox() {
  const lb = document.createElement('div');
  lb.id = 'lightbox';
  lb.className = 'lightbox';
  lb.setAttribute('role', 'dialog');
  lb.setAttribute('aria-modal', 'true');
  lb.setAttribute('aria-label', 'Screenshot viewer');
  lb.setAttribute('aria-hidden', 'true');

  // Close
  const closeBtn = document.createElement('button');
  closeBtn.className = 'lightbox__close';
  closeBtn.setAttribute('aria-label', 'Close lightbox');
  closeBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
  closeBtn.addEventListener('click', closeLightbox);

  // Image wrap
  const imgWrap = document.createElement('div');
  imgWrap.className = 'lightbox__img-wrap';

  const prevBtn = document.createElement('button');
  prevBtn.className = 'lightbox__arrow lightbox__arrow--prev';
  prevBtn.setAttribute('aria-label', 'Previous screenshot');
  prevBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>`;
  prevBtn.addEventListener('click', lightboxPrev);

  const img = document.createElement('img');
  img.id = 'lightbox-img';
  img.className = 'lightbox__img';
  img.alt = 'Screenshot';
  img.style.transition = 'opacity 0.2s ease, transform 0.2s ease';

  const nextBtn = document.createElement('button');
  nextBtn.className = 'lightbox__arrow lightbox__arrow--next';
  nextBtn.setAttribute('aria-label', 'Next screenshot');
  nextBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>`;
  nextBtn.addEventListener('click', lightboxNext);

  imgWrap.appendChild(prevBtn);
  imgWrap.appendChild(img);
  imgWrap.appendChild(nextBtn);

  // Counter
  const counter = document.createElement('div');
  counter.id = 'lightbox-counter';
  counter.className = 'lightbox__counter';

  // Dots (up to 12)
  const dotsWrap = document.createElement('div');
  dotsWrap.id = 'lightbox-dots';
  dotsWrap.className = 'lightbox__dots';
  const dotCount = Math.min(lightboxImages.length, 12);
  for (let i = 0; i < dotCount; i++) {
    const dot = document.createElement('button');
    dot.className = 'lightbox__dot' + (i === 0 ? ' active' : '');
    dot.setAttribute('aria-label', `Go to screenshot ${i + 1}`);
    const idx = i;
    dot.addEventListener('click', () => { lightboxIndex = idx; updateLightboxImage(); });
    dotsWrap.appendChild(dot);
  }

  lb.appendChild(closeBtn);
  lb.appendChild(imgWrap);
  lb.appendChild(counter);
  lb.appendChild(dotsWrap);

  // Click outside image closes
  lb.addEventListener('click', e => { if (e.target === lb) closeLightbox(); });

  document.body.appendChild(lb);
}

/* ============================================================
   STEAM ID BANNER
   ============================================================ */
function renderSteamBanner(steamId, game) {
  const wrap = document.getElementById('steam-banner-wrap');
  if (!wrap) return;

  wrap.innerHTML = '';

  if (steamId) {
    // User is connected — if the game has no steamAppId we simply hide the
    // banner entirely (no false error). Progress just won't be tracked.
    wrap.innerHTML = '';
    return;
  }

  // No Steam ID — show connect banner
  const banner = document.createElement('div');
  banner.className = 'steam-banner';

  const inner = document.createElement('div');
  inner.className = 'steam-banner__inner';

  const iconWrap = document.createElement('div');
  iconWrap.className = 'steam-banner__icon';
  iconWrap.innerHTML = PlatformIcons['Steam'];

  const textEl = document.createElement('div');
  textEl.className = 'steam-banner__text';
  const t = document.createElement('div');
  t.className = 'steam-banner__title';
  t.textContent = 'Connect your Steam ID to track your progress';
  const s = document.createElement('div');
  s.className = 'steam-banner__sub';
  s.textContent = 'Enter your 17-digit Steam ID to see which achievements you\'ve already unlocked.';
  textEl.appendChild(t);
  textEl.appendChild(s);

  const form = document.createElement('div');
  form.className = 'steam-banner__form';

  const input = document.createElement('input');
  input.type        = 'text';
  input.className   = 'steam-banner__input';
  input.placeholder = '76561198XXXXXXXXX';
  input.maxLength   = 17;
  input.setAttribute('aria-label', 'Steam ID');
  input.setAttribute('inputmode', 'numeric');
  input.setAttribute('pattern', '\\d{17}');

  const saveBtn = document.createElement('button');
  saveBtn.className = 'btn btn--sm';
  saveBtn.type = 'button';
  saveBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`;
  saveBtn.appendChild(document.createTextNode('Connect'));

  saveBtn.addEventListener('click', () => {
    const val = input.value.trim();
    if (!SteamID.validate(val)) {
      Toast.error('Invalid Steam ID. Must be exactly 17 digits.');
      input.focus();
      return;
    }
    SteamID.set(val);
    wrap.innerHTML = '';
    // Reload progress
    reloadPersonalProgress(game);
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') saveBtn.click();
  });

  form.appendChild(input);
  form.appendChild(saveBtn);

  inner.appendChild(iconWrap);
  inner.appendChild(textEl);
  inner.appendChild(form);
  banner.appendChild(inner);
  wrap.appendChild(banner);
}

async function reloadPersonalProgress(game) {
  const steamId = SteamID.get();
  const gameId  = game && (game.rawgId || game.id);
  if (!steamId || !gameId) return;

  try {
    const achParams = `?steamId=${encodeURIComponent(steamId)}`;
    const data = await apiFetch(`/games/${encodeURIComponent(gameId)}/achievements${achParams}`);
    allAchievements = normalizeAchievements(data);
    renderAchievements();
  } catch (err) {
    Toast.error("Couldn't load your progress. Check your Steam ID.");
  }
}

/* ============================================================
   ACHIEVEMENTS
   ============================================================ */
function showAchievementSkeletons(count) {
  const grid = document.getElementById('achievements-grid');
  if (!grid) return;
  grid.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const s = document.createElement('div');
    s.className = 'achievement-card-skeleton';
    grid.appendChild(s);
  }
}

function renderAchievements() {
  const grid     = document.getElementById('achievements-grid');
  const countEl  = document.getElementById('achievements-count');
  const pctEl    = document.getElementById('completion-pct');
  const barFill  = document.getElementById('completion-bar-fill');
  const barLabel = document.getElementById('completion-bar-label');

  if (!grid) return;

  // completed flag already baked into each achievement by normalizeAchievements
  const merged = allAchievements;

  // Completion stats
  const total    = merged.length;
  const unlocked = merged.filter(a => a.unlocked).length;
  const pct      = total > 0 ? Math.round((unlocked / total) * 100) : 0;

  if (countEl) countEl.textContent = `${total} achievement${total !== 1 ? 's' : ''}`;
  if (pctEl)   pctEl.textContent   = `${pct}%`;
  if (barFill) barFill.style.width = `${pct}%`;
  if (barLabel) barLabel.textContent = `${unlocked} / ${total} unlocked`;

  // Show progress bar only when server confirmed player data exists
  const progressBar = document.getElementById('completion-bar-wrap');
  if (progressBar) progressBar.style.display = window._achHasPlayerData && total > 0 ? 'flex' : 'none';

  // Filter — All / Normal (non-hidden) / Hidden
  let filtered = merged;
  if (currentFilter === 'normal') filtered = merged.filter(a => !a.isHidden);
  if (currentFilter === 'hidden') filtered = merged.filter(a => a.isHidden);
  // Note: completed achievements show a tick mark on their icon — no separate filter needed

  // Sort
  filtered = [...filtered].sort((a, b) => {
    if (currentSort === 'rarity') return a.completionPercentage - b.completionPercentage;
    if (currentSort === 'name')   return (a.name || '').localeCompare(b.name || '');
    if (currentSort === 'date') {
      if (a.unlockTime && b.unlockTime) return b.unlockTime - a.unlockTime;
      if (a.unlockTime) return -1;
      if (b.unlockTime) return 1;
      return 0;
    }
    return 0;
  });

  grid.innerHTML = '';

  if (!filtered.length) {
    renderEmptyState(
      grid,
      currentFilter === 'hidden' ? 'No hidden achievements' : currentFilter === 'normal' ? 'No normal achievements' : 'No achievements found',
      currentFilter === 'hidden' ? 'This game has no hidden achievements.' : currentFilter === 'normal' ? 'All achievements in this game are hidden.' : 'This game has no achievement data.',
      `<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><polyline points="8 21 12 17 16 21"/><path d="M5 3H19"/><path d="M5 3C5 3 5 10 12 10 19 10 19 3 19 3"/><path d="M5 3H3a2 2 0 0 0-2 2v1a4 4 0 0 0 4 4h1"/><path d="M19 3h2a2 2 0 0 1 2 2v1a4 4 0 0 1-4 4h-1"/><line x1="12" y1="17" x2="12" y2="10"/></svg>`
    );
    return;
  }

  filtered.forEach(ach => {
    const card = buildAchievementCard(ach);
    grid.appendChild(card);
  });
}

function buildAchievementCard(ach) {
  const hasSteamId = !!SteamID.get();
  const card = document.createElement('div');
  card.className = 'achievement-card';
  if (ach.unlocked)  card.classList.add('unlocked');
  // Hidden: only blur the description, not the whole card
  if (ach.isHidden && !ach.unlocked) card.classList.add('is-hidden-ach');

  // ── Icon ──
  // Rule: no steamId → always use 'icon' (colour).
  //       steamId present → 'icon' if unlocked, 'iconIncomplete' (greyed) if not.
  const iconWrap = document.createElement('div');
  iconWrap.className = 'achievement-icon-wrap';

  // Hidden+locked always uses iconIncomplete (greyed);
  // No steamId → colour icon for all; steamId → colour if unlocked, grey if not
  const iconSrc = (ach.isHidden && !ach.unlocked)
    ? ( ach.icon || ach.iconIncomplete || '')
    : (!hasSteamId || ach.unlocked)
      ? (ach.icon || ach.iconIncomplete || '')
      : (ach.iconIncomplete || ach.icon || '');

  if (iconSrc) {
    const img = document.createElement('img');
    img.className = 'achievement-icon' + (hasSteamId && !ach.unlocked ? ' achievement-icon--locked' : '');
    img.alt       = '';
    img.loading   = 'lazy';
    img.setAttribute('src', iconSrc);
    img.addEventListener('error', () => img.style.display = 'none');
    iconWrap.appendChild(img);
  } else {
    const placeholder = document.createElement('div');
    placeholder.className = 'achievement-icon-lock';
    placeholder.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="8 21 12 17 16 21"/><path d="M5 3H19"/><path d="M5 3C5 3 5 10 12 10 19 10 19 3 19 3"/></svg>`;
    iconWrap.appendChild(placeholder);
  }

  // Checkmark overlay if unlocked
  if (hasSteamId && ach.unlocked) {
    const check = document.createElement('div');
    check.className = 'achievement-icon-check';
    check.setAttribute('aria-hidden', 'true');
    check.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
    iconWrap.appendChild(check);
  }

  // ── Body ──
  const body = document.createElement('div');
  body.className = 'achievement-body';

  // Name: always shown, even for hidden achievements
  const name = document.createElement('div');
  name.className = 'achievement-name';
  name.textContent = ach.name || 'Unknown Achievement';

  // Description: blurred for hidden+locked; revealed on click
  const desc = document.createElement('div');
  desc.className = 'achievement-desc' + (ach.isHidden && !ach.unlocked ? ' achievement-desc--blurred' : '');
  desc.textContent = ach.description || 'No description available.';

  body.appendChild(name);
  body.appendChild(desc);

  // Subtle "hidden" label below name (only for hidden+locked)
  if (ach.isHidden && !ach.unlocked) {
    const hiddenTag = document.createElement('div');
    hiddenTag.className = 'achievement-hidden-tag';
    hiddenTag.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Hidden — click to reveal description`;
    body.insertBefore(hiddenTag, desc);
  }

  // Unlock date
  if (ach.unlocked && ach.unlockTime) {
    const date = document.createElement('div');
    date.className = 'achievement-unlock-date';
    date.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
    const ts   = parseInt(ach.unlockTime, 10);
    const d    = new Date(ts > 1e10 ? ts : ts * 1000);
    date.appendChild(document.createTextNode(d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })));
    body.appendChild(date);
  }

  // ── Rarity ──
  const rarityWrap = document.createElement('div');
  rarityWrap.className = 'achievement-rarity';

  const pct = ach.completionPercentage;
  const pctEl = document.createElement('div');
  pctEl.className = 'rarity-pct text-mono';
  pctEl.textContent = pct > 0 ? `${pct.toFixed(1)}%` : '—';
  rarityWrap.appendChild(pctEl);

  if (pct > 0) {
    const { cls, label } = getRarityInfo(pct);
    const badge = document.createElement('div');
    badge.className = 'rarity-badge ' + cls;
    badge.textContent = label;
    rarityWrap.appendChild(badge);
  }

  card.appendChild(iconWrap);
  card.appendChild(body);
  card.appendChild(rarityWrap);

  // Click to reveal blurred description
  if (ach.isHidden && !ach.unlocked) {
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `${ach.name} — hidden achievement, click to reveal description`);
    card.style.cursor = 'pointer';

    const toggle = () => {
      const revealed = desc.classList.toggle('achievement-desc--blurred');
      // revealed is now false (unblurred) when class is removed
      card.setAttribute('aria-label', desc.classList.contains('achievement-desc--blurred')
        ? `${ach.name} — hidden achievement, click to reveal description`
        : `${ach.name} — description revealed`);
    };
    card.addEventListener('click', toggle);
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
  }

  return card;
}

/* Banner shown when game exists in RAWG but isn't on Steam (no achievements) */
function showNotOnSteamBanner() {
  const section = document.getElementById('achievements');
  if (!section) return;
  section.innerHTML = '';

  const banner = document.createElement('div');
  banner.className = 'not-on-steam-banner';
  banner.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V9c0-2.485 2.01-4.5 4.5-4.5 2.485 0 4.5 2.015 4.5 4.5s-2.015 4.5-4.5 4.5h-.105l-4.083 2.919c0 .052.004.103.004.156 0 1.86-1.516 3.375-3.375 3.375-1.66 0-3.04-1.195-3.32-2.77l-4.6-1.901C3.647 20.245 7.514 24 11.979 24 18.626 24 24 18.627 24 12c0-6.626-5.374-12-12.021-12z"/></svg>`;
  const txt = document.createElement('div');
  const title = document.createElement('div');
  title.className = 'not-on-steam-banner__title';
  title.textContent = 'Achievements unavailable';
  const msg = document.createElement('div');
  msg.className = 'not-on-steam-banner__msg';
  msg.textContent = 'This game is not available on Steam, so achievement data cannot be retrieved.';
  txt.appendChild(title);
  txt.appendChild(msg);
  banner.appendChild(txt);
  section.appendChild(banner);
}

function getRarityInfo(pct) {
  if (pct < 5)  return { cls: 'rarity-badge--ultra',    label: 'Ultra Rare' };
  if (pct < 20) return { cls: 'rarity-badge--rare',     label: 'Rare' };
  if (pct < 40) return { cls: 'rarity-badge--uncommon', label: 'Uncommon' };
  return             { cls: 'rarity-badge--common',   label: 'Common' };
}

/* ── Filter tabs ── */
function initFilterTabs() {
  const tabs = document.querySelectorAll('.filter-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilter = tab.dataset.filter;
      renderAchievements();
    });
  });
}

/* ── Sort select ── */
function initSortSelect() {
  const sel = document.getElementById('sort-select');
  if (!sel) return;
  sel.addEventListener('change', () => {
    currentSort = sel.value;
    renderAchievements();
  });
}

/* ── Page error ── */
function showPageError(message) {
  const wrap = document.getElementById('hero-wrap');
  if (wrap) {
    wrap.style.minHeight = '300px';
    renderErrorState(wrap, message, () => location.reload());
  }
  const achWrap = document.getElementById('achievements-grid');
  if (achWrap) achWrap.innerHTML = '';
}

/* ── Wire up controls after DOM ready (called from DOMContentLoaded) ── */
document.addEventListener('DOMContentLoaded', () => {
  buildLightbox();
  initFilterTabs();
  initSortSelect();
});

/* ============================================================
   BOOKMARK BUTTON
   ============================================================ */
function buildBookmarkButton(game) {
  const rawgId = game.rawgId || game.id;
  const btn = document.createElement('button');
  btn.className = 'bookmark-btn' + (Bookmarks.isBookmarked(rawgId) ? ' bookmarked' : '');
  btn.setAttribute('type', 'button');
  btn.setAttribute('aria-label', Bookmarks.isBookmarked(rawgId) ? 'Remove bookmark' : 'Bookmark this game');

  const iconOutline = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`;
  const iconFilled  = `<svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`;

  function refreshIcon() {
    btn.innerHTML = Bookmarks.isBookmarked(rawgId) ? iconFilled : iconOutline;
    btn.classList.toggle('bookmarked', Bookmarks.isBookmarked(rawgId));
    btn.setAttribute('aria-label', Bookmarks.isBookmarked(rawgId) ? 'Remove bookmark' : 'Bookmark this game');
  }

  refreshIcon();

  btn.addEventListener('click', () => {
    Bookmarks.toggle({
      rawgId,
      name:  game.name  || '',
      slug:  game.slug  || '',
      cover: game.cover || game.background_image || '',
    });
    refreshIcon();
    // Pulse animation
    btn.classList.remove('pulse');
    void btn.offsetWidth; // reflow to restart animation
    btn.classList.add('pulse');
    btn.addEventListener('animationend', () => btn.classList.remove('pulse'), { once: true });
  });

  window.addEventListener('bookmarks:change', refreshIcon);

  return btn;
}