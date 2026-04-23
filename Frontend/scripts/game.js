'use strict';

/* ── State ── */
let gameData        = null;
let allAchievements = [];
let currentFilter   = 'all';
let currentSort     = 'rarity';
let lightboxIndex   = 0;
let lightboxImages  = [];

/* ── Platform / Store icon class maps ──
   Icons are rendered as CSS background-image data URIs on a <span class="pill-icon pill-icon--X">.
   This lets the browser rasterize at full device pixel ratio (crisp on HiDPI/retina)
   rather than rendering complex SVG paths inline at 14px where aliasing is visible. */

const GENERIC_ICON_CLASS = 'pill-icon--generic';

const PlatformIconClasses = {
  'PC':              'pill-icon--pc',
  'Steam':           'pill-icon--steam',
  'PlayStation':     'pill-icon--playstation',
  'PlayStation 2':   'pill-icon--playstation',
  'PlayStation 3':   'pill-icon--playstation',
  'PlayStation 4':   'pill-icon--playstation',
  'PlayStation 5':   'pill-icon--playstation',
  'Xbox':            'pill-icon--xbox',
  'Xbox One':        'pill-icon--xbox',
  'Xbox 360':        'pill-icon--xbox',
  'Xbox Series S/X': 'pill-icon--xbox',
  'Nintendo Switch': 'pill-icon--nintendo',
  'Wii':             'pill-icon--nintendo',
  'Wii U':           'pill-icon--nintendo',
  'GameCube':        GENERIC_ICON_CLASS,
  'Dreamcast':       GENERIC_ICON_CLASS,
  'Nintendo DS':     'pill-icon--nintendo',
  'Nintendo 3DS':    'pill-icon--nintendo',
  'Game Boy Advance':GENERIC_ICON_CLASS,
  'iOS':             'pill-icon--apple',
  'macOS':           'pill-icon--apple',
  'Android':         'pill-icon--android',
  'Linux':           'pill-icon--linux',
};

const StoreIconClasses = {
  'Steam':             'pill-icon--steam',
  'Epic Games':        'pill-icon--epic',
  'GOG':               'pill-icon--gog',
  'PlayStation Store': 'pill-icon--playstation',
  'Xbox Store':        'pill-icon--xbox',
  'Xbox 360 Store':    'pill-icon--xbox',
  'Nintendo eShop':    'pill-icon--nintendo',
  'App Store':         'pill-icon--apple',
  'Google Play':       'pill-icon--googleplay',
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
    // ── Step 1: game metadata (30s timeout for game page) ──
    const gameRaw = await apiFetch(`/games/${encodeURIComponent(identifier)}`, {}, { timeout: 30000 });
    if (!gameRaw) throw new Error('Game not found.');
    // API response shape: { code, status, games: { rawgId, name, slug, ... } }
    gameData = gameRaw.games || gameRaw.game || gameRaw.data || gameRaw;
    if (!gameData || (!gameData.name && !gameData.slug)) throw new Error('Game not found.');

    renderHero(gameData);
    renderGameSearchBar();
    renderMeta(gameData);
    renderDescription(gameData);

    // Screenshots: prefer API response field; fall back to sessionStorage from card click
    const screenshotKey = `game_screenshots_${gameData.rawgId || identifier}`;
    let screenshots = [];
    if (Array.isArray(gameData.screenshots) && gameData.screenshots.length) {
      screenshots = gameData.screenshots;
    } else {
      try {
        const stored = sessionStorage.getItem(screenshotKey);
        if (stored) screenshots = JSON.parse(stored);
      } catch (_) { /* parse error or storage unavailable — stay empty */ }
    }
    renderScreenshots(screenshots);
    renderDLCs(gameData);
    renderPrice(gameData);

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

  // Background — prefer banner (3840×1240 wide hero image), fall back to background_image
  const bg = document.createElement('div');
  bg.className = 'game-hero__bg';
  const bgSrc = game.banner || game.background_image || '';
  if (bgSrc) {
    bg.setAttribute('style', `background-image: url('${bgSrc}')`);
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
    section.appendChild(buildMetaGroup('Platforms', game.platforms, PlatformIconClasses, false));
  }

  // Stores
  if (game.stores && game.stores.length) {
    section.appendChild(buildMetaGroup('Available On', game.stores, StoreIconClasses, false));
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

function buildMetaGroup(label, items, iconClassMap, isGenre) {
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

    if (!isGenre) {
      const iconClass = iconClassMap[item] || GENERIC_ICON_CLASS;
      const iconEl = document.createElement('span');
      iconEl.className = 'pill-icon ' + iconClass;
      iconEl.setAttribute('aria-hidden', 'true');
      pill.appendChild(iconEl);
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
   PRICE — compact pill overlaid in screenshots header
   ============================================================ */
function renderPrice(game) {
  // Inject into the slot created by renderScreenshots inside the section header
  const slot = document.getElementById('price-pill-slot');
  if (!slot) return;

  const price = game.price;
  if (!price) return;

  const current  = (price.current  || '').trim();
  const original = (price.original || '').trim();
  const discount = parseInt(price.discount || 0, 10);
  const onSale   = !!price.onSale;
  const editions = Array.isArray(price.editions) ? price.editions : [];
  const isFree   = !current || current === '$0' || current === '$0.00'
                   || current.toLowerCase() === 'free to play'
                   || current.toLowerCase() === 'free';

  const pill = document.createElement('div');
  pill.className = 'price-pill';

  if (isFree) {
    pill.classList.add('price-pill--free');
    pill.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`;
    pill.appendChild(document.createTextNode('Free to Play'));
  } else if (onSale && original && discount > 0) {
    pill.classList.add('price-pill--sale');
    const badge = document.createElement('span');
    badge.className = 'price-pill__discount';
    badge.textContent = `-${discount}%`;
    const orig = document.createElement('span');
    orig.className = 'price-pill__original';
    orig.textContent = original;
    const cur = document.createElement('span');
    cur.className = 'price-pill__current';
    cur.textContent = current;
    pill.appendChild(badge);
    pill.appendChild(orig);
    pill.appendChild(cur);
  } else {
    pill.classList.add('price-pill--regular');
    const cur = document.createElement('span');
    cur.className = 'price-pill__current';
    cur.textContent = current;
    pill.appendChild(cur);
  }

  // Editions popover chevron — only when multiple editions exist
  if (editions.length > 1) {
    const edBtn = document.createElement('button');
    edBtn.className = 'price-pill__editions-btn';
    edBtn.type = 'button';
    edBtn.setAttribute('aria-label', 'View editions');
    edBtn.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>`;

    const popover = document.createElement('div');
    popover.className = 'price-editions-popover';
    popover.setAttribute('role', 'listbox');
    popover.setAttribute('aria-label', 'Game editions');

    editions.forEach(ed => {
      const item = document.createElement('div');
      item.className = 'price-editions-popover__item';
      const cleanName = (ed.name || '').replace(/\s*[-–]\s*\$[\d.,]+(\s*[-–]?\s*\$[\d.,]+)?$/, '').trim();
      const nameEl = document.createElement('span');
      nameEl.className = 'price-editions-popover__name';
      nameEl.textContent = cleanName;
      const priceEl = document.createElement('span');
      priceEl.className = 'price-editions-popover__price';
      priceEl.textContent = ed.price ? `$${parseFloat(ed.price).toFixed(2)}` : '';
      item.appendChild(nameEl);
      item.appendChild(priceEl);
      popover.appendChild(item);
    });

    let open = false;
    edBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      open = !open;
      popover.classList.toggle('open', open);
      edBtn.classList.toggle('active', open);
    });
    document.addEventListener('click', () => {
      if (open) { open = false; popover.classList.remove('open'); edBtn.classList.remove('active'); }
    });

    pill.appendChild(edBtn);
    slot.appendChild(pill);
    slot.appendChild(popover);
    return;
  }

  slot.appendChild(pill);
}

/* ============================================================
   DLC SECTION — horizontal scroll row (mirrors screenshots layout)
   ============================================================ */
function renderDLCs(game) {
  const wrap = document.getElementById('dlc-wrap');
  if (!wrap) return;
  wrap.innerHTML = '';

  const dlcs = Array.isArray(game.DLC) ? game.DLC : [];
  if (!dlcs.length) return; // hidden when empty

  const section = document.createElement('section');
  section.className = 'dlc-section';
  section.setAttribute('aria-labelledby', 'dlc-heading');

  // ── Header (mirrors screenshots-header) ──
  const header = document.createElement('div');
  header.className = 'screenshots-header dlc-section__header';

  const titleEl = document.createElement('h2');
  titleEl.className = 'screenshots-title';
  titleEl.id = 'dlc-heading';
  titleEl.textContent = 'DLCs';

  const countBadge = document.createElement('span');
  countBadge.className = 'dlc-count';
  countBadge.textContent = dlcs.length;

  // Space filler so nav buttons push to the right
  const spacer = document.createElement('div');
  spacer.style.flex = '1';

  // Nav buttons (prev / next) — same style as screenshots
  const navRow = document.createElement('div');
  navRow.className = 'screenshots-nav';

  const prevBtn = document.createElement('button');
  prevBtn.type = 'button';
  prevBtn.className = 'screenshots-nav-btn';
  prevBtn.setAttribute('aria-label', 'Scroll DLCs left');
  prevBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>`;

  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.className = 'screenshots-nav-btn';
  nextBtn.setAttribute('aria-label', 'Scroll DLCs right');
  nextBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>`;

  navRow.appendChild(prevBtn);
  navRow.appendChild(nextBtn);

  header.appendChild(titleEl);
  header.appendChild(countBadge);
  header.appendChild(spacer);
  header.appendChild(navRow);

  // ── Scroll track (mirrors screenshots-track) ──
  const track = document.createElement('div');
  track.className = 'dlc-track';

  prevBtn.addEventListener('click', () => track.scrollBy({ left: -220, behavior: 'smooth' }));
  nextBtn.addEventListener('click', () => track.scrollBy({ left:  220, behavior: 'smooth' }));

  dlcs.forEach(dlc => {
    const card = document.createElement('div');
    card.className = 'dlc-card';

    // ── Image (same 16:9 ratio as screenshot thumbs) ──
    const imgWrap = document.createElement('div');
    imgWrap.className = 'dlc-card__img-wrap';

    if (dlc.image) {
      const img = document.createElement('img');
      img.className = 'dlc-card__img';
      img.alt = '';
      img.loading = 'lazy';
      img.setAttribute('src', dlc.image);
      img.addEventListener('error', () => {
        imgWrap.innerHTML = '';
        const ph = buildDlcPlaceholder();
        imgWrap.appendChild(ph);
      });
      imgWrap.appendChild(img);
    } else {
      imgWrap.appendChild(buildDlcPlaceholder());
    }

    card.appendChild(imgWrap);

    // ── Name ──
    const nameEl = document.createElement('div');
    nameEl.className = 'dlc-card__name';
    const cleanName = (dlc.name || '').replace(/^[^:]+:\s*/, '').trim() || dlc.name || 'DLC';
    nameEl.textContent = cleanName;
    nameEl.title = dlc.name || '';
    card.appendChild(nameEl);

    // ── Price (same pill format as the main price pill) ──
    const p = dlc.price;
    if (p) {
      const dlcCurrent  = (p.current  || '').trim();
      const dlcOriginal = (p.original || '').trim();
      const dlcDiscount = parseInt(p.discount || 0, 10);
      const dlcOnSale   = !!p.onSale;
      const dlcFree     = !dlcCurrent || dlcCurrent === '$0' || dlcCurrent === '$0.00'
                          || dlcCurrent.toLowerCase() === 'free';

      const pill = document.createElement('div');
      pill.className = 'price-pill dlc-price-pill';

      if (dlcFree) {
        pill.classList.add('price-pill--free');
        pill.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`;
        pill.appendChild(document.createTextNode('Free'));
      } else if (dlcOnSale && dlcOriginal && dlcDiscount > 0) {
        pill.classList.add('price-pill--sale');
        const badge = document.createElement('span');
        badge.className = 'price-pill__discount';
        badge.textContent = `-${dlcDiscount}%`;
        const orig = document.createElement('span');
        orig.className = 'price-pill__original';
        orig.textContent = dlcOriginal;
        const cur = document.createElement('span');
        cur.className = 'price-pill__current';
        cur.textContent = dlcCurrent;
        pill.appendChild(badge);
        pill.appendChild(orig);
        pill.appendChild(cur);
      } else {
        pill.classList.add('price-pill--regular');
        const cur = document.createElement('span');
        cur.className = 'price-pill__current';
        cur.textContent = dlcCurrent;
        pill.appendChild(cur);
      }

      card.appendChild(pill);
    }

    track.appendChild(card);
  });

  section.appendChild(header);
  section.appendChild(track);
  wrap.appendChild(section);
}

function buildDlcPlaceholder() {
  const ph = document.createElement('div');
  ph.className = 'dlc-card__img-ph';
  ph.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.25"><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><circle cx="15.5" cy="11.5" r="0.5" fill="currentColor"/><circle cx="17.5" cy="13.5" r="0.5" fill="currentColor"/><path d="M21 6H3a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2z"/></svg>`;
  return ph;
}

/* ============================================================
   SCREENSHOTS + LIGHTBOX
   ============================================================ */
function renderScreenshots(shots) {
  lightboxImages = shots.filter(s => typeof s === 'string' ? s : (s.image || s.url || s));

  const wrap = document.getElementById('screenshots-wrap');
  if (!wrap) return;

  // Even if no screenshots, we still render the section shell so the
  // price pill has somewhere to live.
  wrap.innerHTML = '';
  const section = document.createElement('section');
  section.className = 'screenshots-section';
  section.setAttribute('aria-label', 'Screenshots');

  // Header with title, price pill (injected later by renderPrice), and nav
  const header = document.createElement('div');
  header.className = 'screenshots-header';

  const titleEl = document.createElement('h2');
  titleEl.className = 'screenshots-title';
  titleEl.textContent = 'Screenshots';

  // Price pill placeholder — renderPrice() will populate this
  const pricePillSlot = document.createElement('div');
  pricePillSlot.id = 'price-pill-slot';
  pricePillSlot.className = 'screenshots-price-slot';

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
  header.appendChild(pricePillSlot);
  header.appendChild(navRow);

  const track = document.createElement('div');
  track.className = 'screenshots-track';

  prevBtn.addEventListener('click', () => { track.scrollBy({ left: -260, behavior: 'smooth' }); });
  nextBtn.addEventListener('click', () => { track.scrollBy({ left:  260, behavior: 'smooth' }); });

  if (lightboxImages.length) {
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
  } else {
    // No screenshots — hide nav buttons, keep header for price pill
    navRow.style.display = 'none';
    titleEl.style.display = 'none';
    section.classList.add('screenshots-section--price-only');
  }

  section.appendChild(header);
  if (lightboxImages.length) section.appendChild(track);
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
  const iconEl = document.createElement('span');
  iconEl.className = 'pill-icon pill-icon--steam steam-banner__steam-icon';
  iconEl.setAttribute('aria-hidden', 'true');
  iconWrap.appendChild(iconEl);

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
  input.placeholder = 'XXXXXXXXXXXXXXXXX';
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

  // Expand toggle for long non-hidden descriptions
  if (!(ach.isHidden && !ach.unlocked) && (ach.description || '').length > 80) {
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'achievement-desc-toggle';
    toggleBtn.textContent = 'Show more';
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const expanded = desc.classList.toggle('expanded');
      toggleBtn.textContent = expanded ? 'Show less' : 'Show more';
    });
    body.appendChild(toggleBtn);
  }

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

const iconOutline = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display: block;"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`;
const iconFilled  = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display: block;"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`;

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