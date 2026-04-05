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
const PlatformIcons = {
  'PC':                  `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
  'Steam':               `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V9c0-2.485 2.01-4.5 4.5-4.5 2.485 0 4.5 2.015 4.5 4.5s-2.015 4.5-4.5 4.5h-.105l-4.083 2.919c0 .052.004.103.004.156 0 1.86-1.516 3.375-3.375 3.375-1.66 0-3.04-1.195-3.32-2.77l-4.6-1.901C3.647 20.245 7.514 24 11.979 24 18.626 24 24 18.627 24 12c0-6.626-5.374-12-12.021-12z"/></svg>`,
  'PlayStation':         `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8.984 2.596v17.548l3.915 1.856V6.688c0-.69.304-1.151.794-.991.636.18.763.802.763 1.49v5.515c1.875.884 3.292-.12 3.292-2.604 0-2.553-.876-3.712-3.838-4.79A47.233 47.233 0 0 0 8.984 2.596zM5 19.036l3.148 2.141c-.006-5.67-.006-9.776-.006-13.917L5 8.854v10.182zm14.918-5.32c-.445-.494-1.379-.687-2.927-.446l-4.27.703v2.128l3.152-.512c.546-.09.735.078.735.418 0 .367-.217.573-.735.662l-3.152.516v2.259l4.27-.703c1.548-.256 2.93-1.083 2.927-5.025z"/></svg>`,
  'PlayStation 4':       `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8.984 2.596v17.548l3.915 1.856V6.688c0-.69.304-1.151.794-.991.636.18.763.802.763 1.49v5.515c1.875.884 3.292-.12 3.292-2.604 0-2.553-.876-3.712-3.838-4.79A47.233 47.233 0 0 0 8.984 2.596zM5 19.036l3.148 2.141c-.006-5.67-.006-9.776-.006-13.917L5 8.854v10.182zm14.918-5.32c-.445-.494-1.379-.687-2.927-.446l-4.27.703v2.128l3.152-.512c.546-.09.735.078.735.418 0 .367-.217.573-.735.662l-3.152.516v2.259l4.27-.703c1.548-.256 2.93-1.083 2.927-5.025z"/></svg>`,
  'PlayStation 5':       `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8.984 2.596v17.548l3.915 1.856V6.688c0-.69.304-1.151.794-.991.636.18.763.802.763 1.49v5.515c1.875.884 3.292-.12 3.292-2.604 0-2.553-.876-3.712-3.838-4.79A47.233 47.233 0 0 0 8.984 2.596zM5 19.036l3.148 2.141c-.006-5.67-.006-9.776-.006-13.917L5 8.854v10.182zm14.918-5.32c-.445-.494-1.379-.687-2.927-.446l-4.27.703v2.128l3.152-.512c.546-.09.735.078.735.418 0 .367-.217.573-.735.662l-3.152.516v2.259l4.27-.703c1.548-.256 2.93-1.083 2.927-5.025z"/></svg>`,
  'Xbox':                `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M4.102 7.542c-.875 1.125-1.4 2.528-1.4 4.059 0 1.88.782 3.57 2.034 4.784C4.49 9.44 7.205 6.49 7.205 6.49S5.448 6.46 4.102 7.542zm12.896.948c-1.347-.082-3.104.034-5.003 1.014-1.898-.98-3.656-1.096-5.003-1.014C5.85 8.514 5 9.44 5 11.6c0 2.16 1.85 5.09 2.992 5.818l2.01 1.174C10.002 18.592 10 12 10 12c0-.553.448-1 1-1s1 .447 1 1c0 0-.002 6.592 0 6.592l2.01-1.174C15.15 16.69 17 13.76 17 11.6c0-2.16-.85-3.086-2-3.11zm-6.998-2c1.2 0 2.4.38 3 1 .6-.62 1.8-1 3-1 1.2 0 1.975.38 2.575 1C17.078 5.59 14.74 4.4 12 4.4S6.922 5.59 5.425 7.49c.6-.62 1.375-1 2.575-1z"/></svg>`,
  'Xbox One':            `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M4.102 7.542c-.875 1.125-1.4 2.528-1.4 4.059 0 1.88.782 3.57 2.034 4.784C4.49 9.44 7.205 6.49 7.205 6.49S5.448 6.46 4.102 7.542zm12.896.948c-1.347-.082-3.104.034-5.003 1.014-1.898-.98-3.656-1.096-5.003-1.014C5.85 8.514 5 9.44 5 11.6c0 2.16 1.85 5.09 2.992 5.818l2.01 1.174C10.002 18.592 10 12 10 12c0-.553.448-1 1-1s1 .447 1 1c0 0-.002 6.592 0 6.592l2.01-1.174C15.15 16.69 17 13.76 17 11.6c0-2.16-.85-3.086-2-3.11zm-6.998-2c1.2 0 2.4.38 3 1 .6-.62 1.8-1 3-1 1.2 0 1.975.38 2.575 1C17.078 5.59 14.74 4.4 12 4.4S6.922 5.59 5.425 7.49c.6-.62 1.375-1 2.575-1z"/></svg>`,
  'Nintendo Switch':     `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M9 3H7C4.8 3 3 4.8 3 7v10c0 2.2 1.8 4 4 4h2V3zm-2 7.5c-.8 0-1.5-.7-1.5-1.5S6.2 7.5 7 7.5 8.5 8.2 8.5 9 7.8 10.5 7 10.5zm9.5 9.5H15V3h1.5C18.9 3 21 5.1 21 7.5v9C21 18.9 18.9 21 16.5 21zm0-10c-.8 0-1.5.7-1.5 1.5s.7 1.5 1.5 1.5 1.5-.7 1.5-1.5S17.3 11 16.5 11zM10 3h4v18h-4z"/></svg>`,
  'iOS':                 `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>`,
  'Android':             `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.523 15.341A7.04 7.04 0 0 0 19 11c0-3.866-3.134-7-7-7S5 7.134 5 11a7.04 7.04 0 0 0 1.477 4.341l-1.33 2.303a.5.5 0 0 0 .433.75H7v2.5a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5v-2.5h1.42a.5.5 0 0 0 .433-.75l-1.33-2.303zM9.5 11a.5.5 0 1 1 0-1 .5.5 0 0 1 0 1zm5 0a.5.5 0 1 1 0-1 .5.5 0 0 1 0 1z"/></svg>`,
  'macOS':               `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98l-.09.06c-.22.14-2.22 1.3-2.2 3.88.03 3.07 2.7 4.1 2.73 4.11zM13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>`,
  'Linux':               `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12.504 0C6.009 0 .5 5.509.5 12.004S6.009 24 12.504 24c6.497 0 11.996-5.497 11.996-11.996C24.5 5.509 19.001 0 12.504 0zm-.002 2c.773 0 1.476.17 2.128.434L9.87 4.849A9.987 9.987 0 0 0 6.06 9.5c-.463 1.012-.7 2.1-.7 3.255V13h.86v-.386c.043-1.898.568-3.638 1.504-5.053l.058-.085.043-.071a5.1 5.1 0 0 1 4.677-2.405zM10.5 4.5a1 1 0 0 1 1 1 1 1 0 0 1-1 1 1 1 0 0 1-1-1 1 1 0 0 1 1-1zm3 0a1 1 0 0 1 1 1 1 1 0 0 1-1 1 1 1 0 0 1-1-1 1 1 0 0 1 1-1z"/></svg>`,
};

const StoreIcons = {
  'Steam':              PlatformIcons['Steam'],
  'Epic Games':         `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 2h18v20H3zm2 2v16h14V4zm2 2h10v2H7zm0 4h10v2H7zm0 4h6v2H7z"/></svg>`,
  'GOG':                `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M7 12h10"/></svg>`,
  'PlayStation Store':  PlatformIcons['PlayStation'],
  'Xbox Store':         PlatformIcons['Xbox'],
  'Nintendo eShop':     PlatformIcons['Nintendo Switch'],
  'App Store':          `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-.22.14-2.2 1.3-.03 2.58 2.7 4.1 2.73 4.11zM13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>`,
  'Google Play':        PlatformIcons['Android'],
};

/* ── Init ── */
document.addEventListener('DOMContentLoaded', () => {
  renderNavbar('library');
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
    const achieveRaw = await apiFetch(`/games/${encodeURIComponent(gameId)}/achievements${achParams}`);
    allAchievements  = normalizeAchievements(achieveRaw);

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
    rel.textContent = game.release_date.slice(0, 4);
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

  if (game.playtime) {
    const playtimeTag = document.createElement('span');
    playtimeTag.className = 'tag';
    playtimeTag.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
    playtimeTag.appendChild(document.createTextNode(`${game.playtime}h avg`));
    actions.appendChild(playtimeTag);
  }

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
    fields.appendChild(buildMetaField('Released', game.release_date));
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
    if (icon) {
      const iconWrap = document.createElement('span');
      iconWrap.setAttribute('aria-hidden', 'true');
      iconWrap.innerHTML = icon;
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

  const titleEl = document.createElement('h2');
  titleEl.className = 'screenshots-title';
  titleEl.textContent = 'Screenshots';

  const track = document.createElement('div');
  track.className = 'screenshots-track';

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

  section.appendChild(titleEl);
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
    // Show connected indicator
    if (!game.steamAppId) {
      const notice = document.createElement('div');
      notice.className = 'steam-banner';
      const inner = document.createElement('div');
      inner.className = 'steam-banner__inner';
      const iconWrap = document.createElement('div');
      iconWrap.className = 'steam-banner__icon';
      iconWrap.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
      const textEl = document.createElement('div');
      textEl.className = 'steam-banner__text';
      const t = document.createElement('div');
      t.className = 'steam-banner__title';
      t.textContent = 'No Steam App ID';
      const s = document.createElement('div');
      s.className = 'steam-banner__sub';
      s.textContent = 'Personal progress tracking is unavailable for this game.';
      textEl.appendChild(t);
      textEl.appendChild(s);
      inner.appendChild(iconWrap);
      inner.appendChild(textEl);
      notice.appendChild(inner);
      wrap.appendChild(notice);
    }
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

  // Filter
  let filtered = merged;
  if (currentFilter === 'completed')  filtered = merged.filter(a => a.unlocked);
  if (currentFilter === 'incomplete') filtered = merged.filter(a => !a.unlocked);

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
      currentFilter === 'completed' ? 'No completed achievements' : currentFilter === 'incomplete' ? 'All done!' : 'No achievements found',
      currentFilter === 'completed' ? 'Start playing to unlock achievements.' : currentFilter === 'incomplete' ? 'You\'ve unlocked everything. Legend.' : 'This game has no achievement data.',
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

  const iconSrc = (!hasSteamId || ach.unlocked)
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
