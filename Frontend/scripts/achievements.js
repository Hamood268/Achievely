'use strict';

/* ── State ── */
let autocompleteIdx  = -1;       // keyboard nav index in dropdown
let autocompleteList = [];        // current dropdown results
let currentSort      = 'rarity';
let currentFilter    = 'all';    // 'all' | 'normal' | 'hidden'
let currentGame      = null;      // { rawgId, name, cover, ... }
let currentAchievements = [];
let lookupMode        = 'name';   // 'name' | 'appid'
let currentSearchQuery = '';      // achievement name/description search, set by the search toggle

/* ── Init ── */
document.addEventListener('DOMContentLoaded', () => {
  renderNavbar('achievements');
  renderFooter();
  initSearch();
  initAppIdLookup();
  initModeToggle();
  initBookmarksBtn();
  initFilterTabs();
  initAchSearchToggle();
  updateFilterTabsForSteam();
  showInitialState();
  initRecentHunt();
  initSteamLinkCard();
  initExportModal();
});

/* ── Achievement search toggle ── */
function initAchSearchToggle() {
  const toggleBtn = document.getElementById('ach-search-toggle');
  const wrap      = document.getElementById('ach-search-wrap');
  const input     = document.getElementById('ach-search-input');
  const clearBtn  = document.getElementById('ach-search-clear');
  if (!toggleBtn || !wrap || !input || !clearBtn) return;

  function closeSearch() {
    wrap.hidden = true;
    toggleBtn.classList.remove('active');
    toggleBtn.setAttribute('aria-expanded', 'false');
    if (input.value) {
      input.value = '';
      currentSearchQuery = '';
      clearBtn.hidden = true;
      if (currentAchievements.length) renderAchievementGrid(currentAchievements, currentSort);
    }
  }

  toggleBtn.addEventListener('click', () => {
    if (wrap.hidden) {
      wrap.hidden = false;
      toggleBtn.classList.add('active');
      toggleBtn.setAttribute('aria-expanded', 'true');
      input.focus();
    } else {
      closeSearch();
    }
  });

  input.addEventListener('input', () => {
    currentSearchQuery = input.value.trim().toLowerCase();
    clearBtn.hidden = !input.value;
    if (currentAchievements.length) renderAchievementGrid(currentAchievements, currentSort);
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      closeSearch();
    }
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    currentSearchQuery = '';
    clearBtn.hidden = true;
    input.focus();
    if (currentAchievements.length) renderAchievementGrid(currentAchievements, currentSort);
  });
}

/* ============================================================
   LOOKUP MODE TOGGLE (search by name vs. Steam App ID)
   ============================================================ */
function initModeToggle() {
  const toggle = document.getElementById('explorer-mode-toggle');
  if (!toggle) return;

  toggle.querySelectorAll('.explorer-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => setLookupMode(btn.dataset.mode));
  });
}

function setLookupMode(mode) {
  if (mode === lookupMode) return;
  lookupMode = mode;

  const toggle = document.getElementById('explorer-mode-toggle');
  if (toggle) {
    toggle.querySelectorAll('.explorer-mode-btn').forEach(b => {
      const active = b.dataset.mode === mode;
      b.classList.toggle('active', active);
      b.setAttribute('aria-pressed', String(active));
    });
  }

  const nameWrap  = document.getElementById('explorer-search-wrap');
  const appidWrap = document.getElementById('appid-search-wrap');
  const hintBlock = document.getElementById('search-hint-block');

  if (mode === 'appid') {
    if (nameWrap)  nameWrap.hidden = true;
    if (appidWrap) appidWrap.hidden = false;
    if (hintBlock) hintBlock.classList.add('hidden');
  } else {
    if (nameWrap)  nameWrap.hidden = false;
    if (appidWrap) appidWrap.hidden = true;
    if (hintBlock && !currentGame) hintBlock.classList.remove('hidden');
  }

  clearSelection();
}

function initAppIdLookup() {
  const form  = document.getElementById('appid-form');
  const input = document.getElementById('appid-input');
  const infoBtn   = document.getElementById('appid-info-btn');
  const infoPanel = document.getElementById('appid-info-panel');

  if (infoBtn && infoPanel) {
    infoBtn.addEventListener('click', () => {
      const open = infoPanel.hidden;
      infoPanel.hidden = !open;
      infoBtn.setAttribute('aria-expanded', String(open));
    });
  }

  if (!form || !input) return;

  form.addEventListener('submit', e => {
    e.preventDefault();
    const appId = input.value.trim();
    if (!/^\d+$/.test(appId)) {
      Toast.error('Enter a valid numeric Steam App ID.');
      return;
    }
    selectGameByAppId(appId);
  });
}

async function selectGameByAppId(appId) {
  closeDropdown();

  // Minimal game object — the direct Steam endpoint doesn't return
  // game metadata (no RAWG lookup involved), so we build what we can
  // from the App ID itself and Steam's public CDN image.
  const game = {
    name: `Steam App ${appId}`,
    appId,
    cover: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`,
    coverFallback: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`,
    noPageLink: true,
  };
  currentGame = game;

  renderGameHeader(game, null);
  hideInitialState();
  showSkeletonGrid(12);

  try {
    const steamId  = SteamID.get();
    const achSuffix = steamId ? `?steamId=${encodeURIComponent(steamId)}` : '';
    const data = await apiFetch(`/games/steam/${encodeURIComponent(appId)}/achievements${achSuffix}`);
    currentAchievements = normalizeAchievements(data);
    updateGameHeaderCount(currentAchievements.length);
    if (!currentAchievements.length) {
      const content = document.getElementById('explorer-grid-wrap');
      if (content) renderErrorState(content, 'This App ID has no achievements, or the app was not found on Steam.', () => selectGameByAppId(appId));
    } else {
      renderAchievementGrid(currentAchievements, currentSort);
    }
  } catch (err) {
    Toast.error(`Couldn't load achievements for App ID ${appId}.`);
    const content = document.getElementById('explorer-grid-wrap');
    if (content) renderErrorState(content, err.message, () => selectGameByAppId(appId));
  }
}

function updateFilterTabsForSteam() {
  const hasSteam = !!SteamID.get();
  const tabs = document.getElementById('explorer-filter-tabs');
  if (!tabs) return;
  tabs.querySelectorAll('[data-steam-only]').forEach(t => t.remove());
  if (!hasSteam) return;
  ['completed', 'incomplete'].forEach(filter => {
    const tab = document.createElement('button');
    tab.className = 'explorer-filter-tab';
    tab.dataset.filter = filter;
    tab.dataset.steamOnly = '1';
    tab.type = 'button';
    tab.textContent = filter.charAt(0).toUpperCase() + filter.slice(1);
    tab.addEventListener('click', () => {
      tabs.querySelectorAll('.explorer-filter-tab').forEach(t => { t.classList.remove('active'); });
      tab.classList.add('active');
      currentFilter = filter;
      if (currentAchievements.length) renderAchievementGrid(currentAchievements, currentSort);
    });
    tabs.appendChild(tab);
  });
}

/* ============================================================
   SEARCH + AUTOCOMPLETE
   ============================================================ */
function initSearch() {
  const input    = document.getElementById('explorer-input');
  const clearBtn = document.getElementById('explorer-clear');
  const dropdown = document.getElementById('autocomplete-dropdown');
  const form     = document.getElementById('explorer-form');

  if (!input) return;

  const searchCtl = createSearchController({
    fetcher: async (q, signal) => {
      const params = new URLSearchParams({ q });
      const data   = await apiFetch(`/search?${params}`, { signal });
      return Array.isArray(data) ? data : (data.results || data.games || []);
    },
    onStart:   () => showDropdownLoading(),
    onResults: (games, q) => {
      autocompleteList = games;
      if (!games.length) { showDropdownEmpty(q); return; }
      renderDropdownItems(games.slice(0, 8));
    },
    onClear: () => closeDropdown(),
    onError: (err) => { Toast.error(`Search failed. ${err.message}`); showDropdownFallback(); },
  });

  /* Press / to focus */
  document.addEventListener('keydown', e => {
    const activeTag = document.activeElement && document.activeElement.tagName;
    if (e.key === '/' && activeTag !== 'INPUT' && activeTag !== 'TEXTAREA') {
      e.preventDefault();
      input.focus();
    }
    if (e.key === 'Escape' && document.activeElement === input) {
      closeDropdown();
      input.blur();
    }
  });

  /* Keyboard nav inside dropdown */
  input.addEventListener('keydown', e => {
    const items = dropdown.querySelectorAll('.autocomplete-item');
    if (!items.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      autocompleteIdx = Math.min(autocompleteIdx + 1, items.length - 1);
      applyFocus(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      autocompleteIdx = Math.max(autocompleteIdx - 1, 0);
      applyFocus(items);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (autocompleteIdx >= 0 && items[autocompleteIdx]) {
        items[autocompleteIdx].click();
      } else if (autocompleteList.length === 1) {
        selectGame(autocompleteList[0]);
      }
    }
  });

  function applyFocus(items) {
    items.forEach((item, i) => item.classList.toggle('focused', i === autocompleteIdx));
    if (items[autocompleteIdx]) items[autocompleteIdx].scrollIntoView({ block: 'nearest' });
  }

  /* Input: debounced search */
  input.addEventListener('input', () => {
    const val = input.value.trim();
    autocompleteIdx = -1;

    if (val.length === 0) {
      searchCtl.query('');          // cancels any pending / in-flight request
      clearBtn.classList.remove('visible');
      closeDropdown();
      return;
    }

    clearBtn.classList.add('visible');

    // debounce / abort / cache handled by the controller (scripts/search-controller.js)
    searchCtl.query(val);
  });

  /* Clear button */
  clearBtn.addEventListener('click', () => {
    searchCtl.query('');
    input.value = '';
    clearBtn.classList.remove('visible');
    closeDropdown();
    input.focus();
  });

  /* Form submit (fallback) */
  form.addEventListener('submit', e => {
    e.preventDefault();
    const val = input.value.trim();
    if (val) searchCtl.flush(val);
  });

  /* Click outside closes dropdown */
  document.addEventListener('click', e => {
    const wrap = document.getElementById('explorer-search-wrap');
    if (wrap && !wrap.contains(e.target)) closeDropdown();
  });
}

function showDropdownFallback() {
  const dropdown = document.getElementById('autocomplete-dropdown');
  if (!dropdown) return;
  dropdown.innerHTML = '';
  dropdown.classList.add('open');

  const msg = document.createElement('div');
  msg.className = 'autocomplete-message';
  msg.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex-shrink:0"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
  msg.appendChild(document.createTextNode(' Search is unavailable right now.'));
  dropdown.appendChild(msg);

  const fallbackBtn = document.createElement('button');
  fallbackBtn.type = 'button';
  fallbackBtn.className = 'autocomplete-fallback-btn';
  fallbackBtn.textContent = 'Look up by Steam App ID instead →';
  fallbackBtn.addEventListener('click', () => {
    closeDropdown();
    setLookupMode('appid');
    const appidInput = document.getElementById('appid-input');
    if (appidInput) appidInput.focus();
  });
  dropdown.appendChild(fallbackBtn);
}

function renderDropdownItems(games) {
  const dropdown = document.getElementById('autocomplete-dropdown');
  if (!dropdown) return;

  dropdown.innerHTML = '';
  dropdown.classList.add('open');
  autocompleteIdx = -1;

  games.forEach((game, i) => {
    const item = document.createElement('div');
    item.className = 'autocomplete-item';
    item.setAttribute('role', 'option');
    item.setAttribute('tabindex', '-1');

    // Cover thumbnail — prefer background_image (landscape) for better fit
    const coverSrc = game.background_image || game.cover || '';
    const cover = document.createElement('img');
    cover.className = 'autocomplete-item__cover';
    cover.alt       = '';
    cover.loading   = 'lazy';
    if (coverSrc) cover.setAttribute('src', coverSrc);
    cover.addEventListener('error', () => { cover.style.visibility = 'hidden'; });

    // Info
    const info = document.createElement('div');
    info.className = 'autocomplete-item__info';

    const namEl = document.createElement('div');
    namEl.className = 'autocomplete-item__name';
    namEl.textContent = game.name || 'Unknown Game';

    const meta = document.createElement('div');
    meta.className = 'autocomplete-item__meta';
    const parts = [];
    if (game.release_date) parts.push(game.release_date.slice(0, 4));
    if (game.genres && game.genres.length) parts.push(game.genres[0]);
    meta.textContent = parts.join(' · ');

    info.appendChild(namEl);
    info.appendChild(meta);

    // Arrow
    const arrow = document.createElement('div');
    arrow.className = 'autocomplete-item__arrow';
    arrow.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>`;

    item.appendChild(cover);
    item.appendChild(info);
    item.appendChild(arrow);

    item.addEventListener('click', () => selectGame(game));
    item.addEventListener('mouseenter', () => {
      autocompleteIdx = i;
      dropdown.querySelectorAll('.autocomplete-item').forEach((el, j) => el.classList.toggle('focused', j === i));
    });

    dropdown.appendChild(item);
  });
}

function showDropdownLoading() {
  const dropdown = document.getElementById('autocomplete-dropdown');
  if (!dropdown) return;
  dropdown.innerHTML = '';
  dropdown.classList.add('open');

  const msg = document.createElement('div');
  msg.className = 'autocomplete-message';
  const spinner = document.createElement('div');
  spinner.className = 'autocomplete-spinner';
  msg.appendChild(spinner);
  msg.appendChild(document.createTextNode('Searching…'));
  dropdown.appendChild(msg);
}

function showDropdownEmpty(query) {
  const dropdown = document.getElementById('autocomplete-dropdown');
  if (!dropdown) return;
  dropdown.innerHTML = '';
  dropdown.classList.add('open');

  const msg = document.createElement('div');
  msg.className = 'autocomplete-message';
  msg.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex-shrink:0"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;
  msg.appendChild(document.createTextNode(` No games found for "${query}"`));
  dropdown.appendChild(msg);
  Toast.error(`No games found matching "${query}"`);
}

function closeDropdown() {
  const dropdown = document.getElementById('autocomplete-dropdown');
  if (dropdown) {
    dropdown.classList.remove('open');
    dropdown.innerHTML = '';
  }
  autocompleteList = [];
  autocompleteIdx  = -1;
}

/* ============================================================
   GAME SELECTION
   ============================================================ */
async function selectGame(game) {
  closeDropdown();

  const input    = document.getElementById('explorer-input');
  const clearBtn = document.getElementById('explorer-clear');

  if (input)    input.value = game.name || '';
  if (clearBtn) clearBtn.classList.add('visible');

  currentGame = game;

  // Show game header
  renderGameHeader(game, null);

  // Hide initial state
  hideInitialState();

  // Show skeleton grid
  showSkeletonGrid(12);

  // Fetch achievements
  const rawgId = game.rawgId || game.id;
  try {
    const steamId  = SteamID.get();
    const achSuffix = steamId ? `?steamId=${encodeURIComponent(steamId)}` : '';
    const data = await apiFetch(`/games/${encodeURIComponent(rawgId)}/achievements${achSuffix}`);
    currentAchievements = normalizeAchievements(data);
    updateGameHeaderCount(currentAchievements.length);
    renderAchievementGrid(currentAchievements, currentSort);
  } catch (err) {
    Toast.error(`Couldn't load achievements for ${game.name}.`);
    const content = document.getElementById('explorer-grid-wrap');
    if (content) renderErrorState(content, err.message, () => selectGame(game));
  }
}

// Unlock timestamp → epoch ms (0 when unknown). Accepts Steam-style
// `unlocktime` (seconds), ms timestamps, or ISO strings.
function parseUnlockTime(a) {
  const raw = a.unlockTime ?? a.unlocktime ?? a.unlock_time ?? a.unlockedAt ?? a.unlocked_at ?? a.achievedAt ?? a.achieved_at ?? null;
  if (raw == null || raw === '' || raw === 0 || raw === '0') return 0;
  if (typeof raw === 'number' || /^\d+$/.test(String(raw))) {
    const n = Number(raw);
    return n < 1e12 ? n * 1000 : n;
  }
  const t = Date.parse(raw);
  return Number.isNaN(t) ? 0 : t;
}

function normalizeAchievements(data) {
  const list = Array.isArray(data) ? data : (data.achievements || data.results || []);
  return list.map(a => ({
    unlockTime:          parseUnlockTime(a),
    name:                a.name        || 'Unknown Achievement',
    description:         a.description || '',
    isHidden:            a.isHidden    || false,
    icon:                a.icon        || '',
    iconIncomplete:      a.iconIncomplete || a.icon || '',
    completionPercentage: parseFloat(a.completionPercentage || a.percent || 0),
    completed:           a.completed   ?? false,
  }));
}

/* ============================================================
   GAME HEADER
   ============================================================ */
function renderGameHeader(game, achCount) {
  const header = document.getElementById('game-header');
  if (!header) return;

  header.innerHTML = '';
  header.classList.add('visible');

  // Back button
  const backBtn = document.createElement('button');
  backBtn.className = 'game-header__back';
  backBtn.type = 'button';
  backBtn.setAttribute('aria-label', 'Clear game selection');
  backBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>`;
  backBtn.appendChild(document.createTextNode('Clear'));
  backBtn.addEventListener('click', clearSelection);
  header.appendChild(backBtn);

  // Cover
  const coverWrap = document.createElement('div');
  coverWrap.className = 'game-header__cover-wrap';
  const coverSrc = game.cover || game.background_image || '';
  if (coverSrc) {
    const img = document.createElement('img');
    img.className = 'game-header__cover';
    img.alt       = '';
    img.loading   = 'eager';
    img.setAttribute('src', coverSrc);
    const fallbackSrc = game.coverFallback || (game.cover ? game.background_image : '') || '';
    img.addEventListener('error', () => {
      if (fallbackSrc && img.getAttribute('src') !== fallbackSrc) {
        img.setAttribute('src', fallbackSrc);
        return;
      }
      img.replaceWith(buildCoverFallback());
    });
    coverWrap.appendChild(img);
  } else {
    coverWrap.appendChild(buildCoverFallback());
  }
  header.appendChild(coverWrap);

  // Name
  const nameEl = document.createElement('h2');
  nameEl.className = 'game-header__name';
  nameEl.textContent = game.name || 'Unknown Game';
  header.appendChild(nameEl);

  // Meta row
  const meta = document.createElement('div');
  meta.className = 'game-header__meta';
  meta.id = 'game-header-meta';

  if (achCount != null) {
    const countBadge = document.createElement('span');
    countBadge.id = 'ach-count-badge';
    countBadge.className = 'game-header__ach-count';
    countBadge.textContent = `${achCount} achievement${achCount !== 1 ? 's' : ''}`;
    meta.appendChild(countBadge);
  } else {
    const loadingBadge = document.createElement('span');
    loadingBadge.id = 'ach-count-badge';
    loadingBadge.className = 'game-header__ach-count';
    loadingBadge.textContent = 'Loading…';
    meta.appendChild(loadingBadge);
  }

  // Game page link
  const rawgId = game.rawgId || game.id;
  const slug   = game.slug   || slugify(game.name || '');
  if ((rawgId || slug) && !game.noPageLink) {
    const params = new URLSearchParams();
    // Use slug for human-friendly URL; fall back to id
    if (slug) params.set('name', String(slug));
    else params.set('name', String(rawgId));
    const link = document.createElement('a');
    link.href = `game.html?${params}`;
    link.className = 'btn btn--sm';
    link.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6" transform="scale(-1,1) translate(-24,0)"/></svg>`;
    link.appendChild(document.createTextNode('Full Game Page'));
    // Store screenshots before navigating to game.html
    link.addEventListener('click', () => {
      const shots = game.screenshots || game.short_screenshots || [];
      if (rawgId != null && shots.length) {
        try {
          sessionStorage.setItem(
            `game_screenshots_${rawgId}`,
            JSON.stringify(shots)
          );
        } catch (_) { /* storage unavailable — fail silently */ }
      }
    });
    meta.insertBefore(link, meta.firstChild); // Full Game Page on the left, count pill on the right
  }

  header.appendChild(meta);
}

function updateGameHeaderCount(count) {
  const badge = document.getElementById('ach-count-badge');
  if (badge) badge.textContent = `${count} achievement${count !== 1 ? 's' : ''}`;
}

function buildCoverFallback() {
  const d = document.createElement('div');
  d.className = 'game-header__cover-fallback';
  d.innerHTML = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.3"><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><circle cx="15.5" cy="11.5" r="0.5" fill="currentColor"/><circle cx="17.5" cy="13.5" r="0.5" fill="currentColor"/><path d="M21 6H3a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2z"/></svg>`;
  return d;
}

function slugify(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

/* ============================================================
   ACHIEVEMENT GRID
   ============================================================ */
function showSkeletonGrid(count) {
  const wrap = document.getElementById('explorer-grid-wrap');
  if (!wrap) return;

  // Show sort bar with skeleton label
  const sortBar = document.getElementById('explorer-sort-bar');
  if (sortBar) sortBar.style.visibility = 'hidden';

  wrap.innerHTML = '';
  const grid = document.createElement('div');
  grid.className = 'explorer-grid';

  for (let i = 0; i < count; i++) {
    const sk = document.createElement('div');
    sk.className = 'explorer-ach-skeleton';
    grid.appendChild(sk);
  }
  wrap.appendChild(grid);
}

// Name hit always counts. Descriptions of hidden+locked achievements are
// skipped so search can't be used to fish out what they secretly require.
function achievementMatchesQuery(a, q) {
  if ((a.name || '').toLowerCase().includes(q)) return true;
  if (a.isHidden && !a.completed) return false;
  return (a.description || '').toLowerCase().includes(q);
}

function filterAndSortAchievements(achievements, sortKey) {
  let filtered = achievements;
  if (currentFilter === 'normal')     filtered = achievements.filter(a => !a.isHidden);
  if (currentFilter === 'hidden')     filtered = achievements.filter(a => a.isHidden);
  if (currentFilter === 'completed')  filtered = achievements.filter(a => a.completed === true);
  if (currentFilter === 'incomplete') filtered = achievements.filter(a => a.completed !== true);

  if (currentSearchQuery) {
    filtered = filtered.filter(a => achievementMatchesQuery(a, currentSearchQuery));
  }

  return [...filtered].sort((a, b) => {
    if (sortKey === 'unlock') {
      // Unlocked first (most recent unlock on top), then the locked ones by rarity
      const ac = a.completed === true, bc = b.completed === true;
      if (ac !== bc) return ac ? -1 : 1;
      if (ac) return ((b.unlockTime || 0) - (a.unlockTime || 0)) || (a.completionPercentage - b.completionPercentage);
      return a.completionPercentage - b.completionPercentage;
    }
    if (sortKey === 'rarity') return a.completionPercentage - b.completionPercentage;
    if (sortKey === 'name')   return (a.name || '').localeCompare(b.name || '');
    return 0;
  });
}

// "Unlock time" sort only makes sense when the game has unlocked achievements
function syncUnlockSortOption(achievements) {
  const sel = document.getElementById('explorer-sort-select');
  if (!sel) return;
  const hasCompleted = achievements.some(a => a.completed === true);
  const existing = sel.querySelector('option[value="unlock"]');
  if (hasCompleted && !existing) {
    const opt = document.createElement('option');
    opt.value = 'unlock';
    opt.textContent = 'Sort: Unlock time (recent first)';
    sel.appendChild(opt);
  } else if (!hasCompleted && existing) {
    if (sel.value === 'unlock') { sel.value = 'rarity'; currentSort = 'rarity'; }
    existing.remove();
  }
}

function renderAchievementGrid(achievements, sortKey) {
  const wrap = document.getElementById('explorer-grid-wrap');
  if (!wrap) return;

  const sortBar   = document.getElementById('explorer-sort-bar');
  const resultLbl = document.getElementById('explorer-results-label');

  if (sortBar)   sortBar.style.visibility = 'visible';

  syncUnlockSortOption(achievements);
  {
    const sel = document.getElementById('explorer-sort-select');
    if (sortKey === 'unlock' && !(sel && sel.querySelector('option[value="unlock"]'))) sortKey = 'rarity';
  }

  // Update filter tab counts
  const tabs = document.getElementById('explorer-filter-tabs');
  if (tabs) {
    const countMap = {
      all:        achievements.length,
      normal:     achievements.filter(a => !a.isHidden).length,
      hidden:     achievements.filter(a => a.isHidden).length,
      completed:  achievements.filter(a => a.completed === true).length,
      incomplete: achievements.filter(a => a.completed !== true).length,
    };
    tabs.querySelectorAll('.explorer-filter-tab').forEach(t => {
      const f = t.dataset.filter;
      if (f && countMap[f] != null) {
        // Remove existing count span
        t.querySelectorAll('.tab-count').forEach(s => s.remove());
        const countSpan = document.createElement('span');
        countSpan.className = 'tab-count';
        countSpan.textContent = countMap[f];
        t.appendChild(countSpan);
      }
    });
  }
  const sorted = filterAndSortAchievements(achievements, sortKey);

  if (resultLbl) {
    const total = achievements.length;
    const shown = sorted.length;
    resultLbl.textContent = shown === total
      ? `${total} achievement${total !== 1 ? 's' : ''}`
      : `${shown} of ${total} achievement${total !== 1 ? 's' : ''}`;
  }

  wrap.innerHTML = '';

  if (!sorted.length) {
    const searching = !!currentSearchQuery;
    renderEmptyState(
      wrap,
      searching ? 'No matching achievements' : 'No achievements found',
      searching ? 'No achievements match your search.' : 'This game has no achievement data in our database.',
      `<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><polyline points="8 21 12 17 16 21"/><path d="M5 3H19"/><path d="M5 3C5 3 5 10 12 10 19 10 19 3 19 3"/><path d="M5 3H3a2 2 0 0 0-2 2v1a4 4 0 0 0 4 4h1"/><path d="M19 3h2a2 2 0 0 1 2 2v1a4 4 0 0 1-4 4h-1"/><line x1="12" y1="17" x2="12" y2="10"/></svg>`
    );
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'explorer-grid';
  grid.setAttribute('role', 'list');
  grid.setAttribute('aria-label', 'Achievements');

  sorted.forEach(ach => {
    grid.appendChild(buildExplorerCard(ach));
  });

  wrap.appendChild(grid);
}

/* ── Build a single explorer achievement card ── */
function buildExplorerCard(ach) {
  const hasSteamId = !!SteamID.get();
  const isHidden   = ach.isHidden && !ach.completed;

  const card = document.createElement('div');
  card.className = 'explorer-ach-card';
  card.setAttribute('role', 'listitem');
  // No full-card blur — only description is blurred for hidden achievements

  // ── Icon ──
  // No steamId → always use coloured 'icon'.
  // SteamId present → 'icon' if completed, 'iconIncomplete' if not.
  const iconWrap = document.createElement('div');
  iconWrap.className = 'explorer-ach-icon-wrap';

  const iconSrc = (ach.isHidden && !ach.completed)
    ? (ach.iconIncomplete || ach.icon || '')
    : (!hasSteamId || ach.completed)
      ? (ach.icon || ach.iconIncomplete || '')
      : (ach.iconIncomplete || ach.icon || '');

  if (iconSrc) {
    const img = document.createElement('img');
    img.className = 'explorer-ach-icon' + (hasSteamId && !ach.completed ? ' explorer-ach-icon--locked' : '');
    img.alt       = '';
    img.loading   = 'lazy';
    img.setAttribute('src', iconSrc);
    img.addEventListener('error', () => img.replaceWith(buildIconPlaceholder()));
    iconWrap.appendChild(img);
  } else {
    iconWrap.appendChild(buildIconPlaceholder());
  }

  // ── Body ──
  const body = document.createElement('div');
  body.className = 'explorer-ach-body';

  // Name: always shown
  const nameEl = document.createElement('div');
  nameEl.className = 'explorer-ach-name';
  nameEl.textContent = ach.name || 'Unknown Achievement';

  body.appendChild(nameEl);

  // Subtle hidden label (only for hidden+locked)
  if (isHidden) {
    const tag = document.createElement('div');
    tag.className = 'explorer-hidden-tag';
    tag.innerHTML = `<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Hidden — click to reveal`;
    body.appendChild(tag);
  }

  // Description: blurred for hidden+locked; revealed on click
  const descEl = document.createElement('div');
  descEl.className = 'explorer-ach-desc' + (isHidden ? ' explorer-ach-desc--blurred' : '');
  descEl.textContent = ach.description || 'No description available.';
  body.appendChild(descEl);

  // Expand toggle for long descriptions (only non-hidden)
  if (!isHidden && (ach.description || '').length > 80) {
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'explorer-ach-desc-toggle visible';
    toggleBtn.textContent = 'Show more';
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const expanded = descEl.classList.toggle('expanded');
      toggleBtn.textContent = expanded ? 'Show less' : 'Show more';
    });
    body.appendChild(toggleBtn);
  }

  // ── Rarity ──
  const rarityWrap = document.createElement('div');
  rarityWrap.className = 'explorer-ach-rarity';

  const pct = ach.completionPercentage;
  const pctEl = document.createElement('div');
  pctEl.className = 'explorer-ach-pct';
  pctEl.textContent = pct > 0 ? `${pct.toFixed(1)}%` : '—';
  rarityWrap.appendChild(pctEl);

  if (pct > 0) {
    const { cls, label } = getRarityInfo(pct);
    const badge = document.createElement('div');
    badge.className = 'explorer-rarity-badge ' + cls;
    badge.textContent = label;
    rarityWrap.appendChild(badge);
  }

  // ── Completed badge (when steamId connected) ──
  if (hasSteamId && ach.completed) {
    const check = document.createElement('div');
    check.className = 'explorer-ach-completed-badge';
    check.setAttribute('aria-label', 'Unlocked');
    check.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`;
    iconWrap.appendChild(check);
  }

  card.appendChild(iconWrap);
  card.appendChild(body);
  card.appendChild(rarityWrap);

  // Click to reveal blurred description
  if (isHidden) {
    card.style.cursor = 'pointer';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `${ach.name} — hidden, click to reveal description`);

    const toggle = () => {
      descEl.classList.toggle('explorer-ach-desc--blurred');
    };
    card.addEventListener('click', toggle);
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
  }

  return card;
}

function buildIconPlaceholder() {
  const d = document.createElement('div');
  d.className = 'explorer-ach-icon-placeholder';
  d.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="8 21 12 17 16 21"/><path d="M5 3H19"/><path d="M5 3C5 3 5 10 12 10 19 10 19 3 19 3"/></svg>`;
  return d;
}

function getRarityInfo(pct) {
  if (pct < 5)  return { cls: 'explorer-rarity-badge--ultra',    label: 'Ultra Rare' };
  if (pct < 20) return { cls: 'explorer-rarity-badge--rare',     label: 'Rare' };
  if (pct < 40) return { cls: 'explorer-rarity-badge--uncommon', label: 'Uncommon' };
  return             { cls: 'explorer-rarity-badge--common',   label: 'Common' };
}

/* ============================================================
   FILTER TABS
   ============================================================ */
function initFilterTabs() {
  const tabs = document.querySelectorAll('.explorer-filter-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      currentFilter = tab.dataset.filter;
      if (currentAchievements.length) {
        renderAchievementGrid(currentAchievements, currentSort);
      }
    });
  });
}

/* ============================================================
   SORT SELECT
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  const sel = document.getElementById('explorer-sort-select');
  if (!sel) return;
  sel.addEventListener('change', () => {
    currentSort = sel.value;
    if (currentAchievements.length) {
      renderAchievementGrid(currentAchievements, currentSort);
    }
  });
});

/* ============================================================
   INITIAL / CLEAR STATES
   ============================================================ */
function refreshShellLayout() {
  const shell = document.getElementById('explorer-shell');
  if (!shell) return;
  // Keeps the idle-state vertical centering from leaving a huge empty
  // gap once the hunt panel (or a selected game) adds real content.
  const hasContent = !!currentGame || huntGames.length > 0;
  shell.classList.toggle('has-results', hasContent);
}

function showInitialState() {
  const initialEl  = document.getElementById('explorer-initial');
  const gameHeader = document.getElementById('game-header');
  const gridWrap   = document.getElementById('explorer-grid-wrap');
  const sortBar    = document.getElementById('explorer-sort-bar');
  const hintBlock  = document.getElementById('search-hint-block');

  if (initialEl)  initialEl.style.display = 'flex';
  if (gameHeader) { gameHeader.classList.remove('visible'); gameHeader.innerHTML = ''; }
  if (gridWrap)   gridWrap.innerHTML = '';
  if (sortBar)    sortBar.style.visibility = 'hidden';
  if (hintBlock && lookupMode === 'name') hintBlock.classList.remove('hidden');
  setHuntSuppressed(false); // back to the idle screen → recently played returns
}

function hideInitialState() {
  const initialEl = document.getElementById('explorer-initial');
  const hintBlock = document.getElementById('search-hint-block');
  const shell     = document.getElementById('explorer-shell');
  if (initialEl)  initialEl.style.display = 'none';
  if (hintBlock)  hintBlock.classList.add('hidden');
  if (shell)      shell.classList.add('has-results');
  setHuntSuppressed(true); // a game search is on screen → hide recently played
}

function clearSelection() {
  currentGame         = null;
  currentAchievements = [];
  currentFilter       = 'all';
  currentSearchQuery  = '';
  // Reset filter tab UI
  document.querySelectorAll('.explorer-filter-tab').forEach((t, i) => {
    t.classList.toggle('active', i === 0);
  });
  // Reset achievement search UI
  const achSearchWrap   = document.getElementById('ach-search-wrap');
  const achSearchInput  = document.getElementById('ach-search-input');
  const achSearchClear  = document.getElementById('ach-search-clear');
  const achSearchToggle = document.getElementById('ach-search-toggle');
  if (achSearchWrap)   achSearchWrap.hidden = true;
  if (achSearchInput)  achSearchInput.value = '';
  if (achSearchClear)  achSearchClear.hidden = true;
  if (achSearchToggle) {
    achSearchToggle.classList.remove('active');
    achSearchToggle.setAttribute('aria-expanded', 'false');
  }
  refreshShellLayout();

  const input    = document.getElementById('explorer-input');
  const clearBtn = document.getElementById('explorer-clear');
  const appidInput = document.getElementById('appid-input');
  if (input)      input.value = '';
  if (clearBtn)   clearBtn.classList.remove('visible');
  if (appidInput) appidInput.value = '';

  closeDropdown();
  showInitialState();
}

/* ============================================================
   RECENTLY PLAYED — vertical quick-hunt list (Steam-linked only)

   Design notes:
   - The games list call (/users/:steamId/games) already returns
     per-game achievement counts, so the list costs exactly one
     lightweight request on load — no per-game fetch, no fan-out.
   - A game's full achievement list is only fetched when its row is
     expanded, and cached in huntAchCache so re-opening the same game
     never re-fetches.
   - Rows expand inline (accordion, one open at a time). With no Steam
     ID or no recent games the whole section stays hidden.
   - Decoupled from the main search flow (currentGame /
     currentAchievements) — it's a quick side-channel.
   ============================================================ */
let huntGames      = [];     // every eligible recently played game (uncapped)
let huntOpenGameId = null;
let huntFilter     = 'all';
let huntQuery      = '';       // recent-games search text
let huntAchQuery   = '';       // achievement search inside the open dropdown
let huntState      = 'idle';   // 'idle' | 'loading' | 'ready' | 'none'
let huntSuppressed = false;    // true while a searched game is on screen
let huntSearchBound = false;
const HUNT_DEFAULT_LIMIT = 10; // rows shown when not searching
const huntAchCache = new Map(); // gameId -> normalized achievements array

const HUNT_CHEVRON_SVG = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>`;

function huntEl(tag, className) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  return el;
}

function getHuntRow(gameId) {
  return document.querySelector(`.recent-hunt-row[data-game-id="${CSS.escape(String(gameId))}"]`);
}

function setHuntState(state) {
  huntState = state;
  syncHuntVisibility();
}

function setHuntSuppressed(flag) {
  huntSuppressed = flag;
  syncHuntVisibility();
}

// The section shows only when Steam-linked, there is something to show,
// and no searched game is currently on screen.
function syncHuntVisibility() {
  const section = document.getElementById('recent-hunt');
  if (!section) return;
  section.hidden = huntSuppressed || huntState === 'idle' || huntState === 'none';
}

function getHuntVisibleGames() {
  const q = huntQuery.trim().toLowerCase();
  if (!q) return huntGames.slice(0, HUNT_DEFAULT_LIMIT);
  return huntGames.filter(g => (g.name || '').toLowerCase().includes(q));
}

async function initRecentHunt() {
  bindHuntSearch();

  const steamId = SteamID.get();
  if (!steamId) { setHuntState('none'); return; }

  setHuntState('loading');
  renderHuntListLoading();

  try {
    const data  = await apiFetch(`/users/${encodeURIComponent(steamId)}/games`);
    const games = (data && data.profile && data.profile.games) || [];

    huntGames = games
      .filter(g => (g.playtime_2weeks || 0) > 0)
      // Skip games with no achievements and fully completed games —
      // nothing left to hunt, so they'd only take up space.
      .filter(g => g.achievements && g.achievements.total > 0 && g.achievements.completed < g.achievements.total)
      .sort((a, b) => (b.playtime_2weeks || 0) - (a.playtime_2weeks || 0));

    // Nothing left to hunt → show nothing at all
    if (!huntGames.length) { setHuntState('none'); return; }
    setHuntState('ready');
    renderHuntList();
    refreshShellLayout();
  } catch (err) {
    // Convenience section, not the core flow — fail quietly rather than
    // toasting an error over a page the user didn't actively request.
    setHuntState('none');
  }
}

/* ── Search inside the recently played list ── */
function bindHuntSearch() {
  if (huntSearchBound) return;
  const input = document.getElementById('recent-hunt-search');
  const clear = document.getElementById('recent-hunt-search-clear');
  if (!input) return;
  huntSearchBound = true;

  const apply = () => {
    huntQuery = input.value;
    if (clear) clear.hidden = !input.value;
    if (huntState === 'ready') rerenderHuntList();
  };

  input.addEventListener('input', apply);
  input.addEventListener('keydown', e => {
    if (e.key === 'Escape' && input.value) {
      e.stopPropagation();
      input.value = '';
      apply();
    }
  });
  if (clear) clear.addEventListener('click', () => {
    input.value = '';
    apply();
    input.focus();
  });
}

// Re-render the list for a new query, keeping an open dropdown open when
// that game is still in the results and its achievements are already cached.
function rerenderHuntList() {
  const openId = huntOpenGameId;
  renderHuntList();
  if (openId === null) return;

  const game   = getHuntVisibleGames().find(g => g.gameId === openId);
  const cached = huntAchCache.get(openId);
  const row    = getHuntRow(openId);
  if (!game || !cached || !row) { huntOpenGameId = null; return; }

  const toggle = row.querySelector('.recent-hunt-row__toggle');
  const panel  = row.querySelector('.recent-hunt-row__panel');
  if (!panel) { huntOpenGameId = null; return; }
  row.classList.add('open');
  if (toggle) toggle.setAttribute('aria-expanded', 'true');
  panel.hidden = false;
  renderHuntPanel(panel, game, cached);
}

function renderHuntListLoading() {
  const list = document.getElementById('recent-hunt-list');
  if (!list) return;
  list.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    list.appendChild(huntEl('div', 'recent-hunt-row recent-hunt-row--skeleton'));
  }
}

function renderHuntList() {
  const list = document.getElementById('recent-hunt-list');
  if (!list) return;
  list.innerHTML = '';

  const visible = getHuntVisibleGames();
  if (!visible.length) {
    const empty = huntEl('div', 'recent-hunt__empty');
    empty.textContent = `No recent games match "${huntQuery.trim()}"`;
    list.appendChild(empty);
    return;
  }

  visible.forEach(game => {
    const hasAch    = !!(game.achievements && game.achievements.total > 0);
    const total     = hasAch ? game.achievements.total : 0;
    const completed = hasAch ? (game.achievements.completed || 0) : 0;
    const pct       = hasAch ? Math.min(100, Math.max(0, Math.round(game.achievements.percentage || 0))) : 0;
    const panelId   = `recent-hunt-panel-${game.gameId}`;

    const row = huntEl('div', 'recent-hunt-row');
    row.setAttribute('role', 'listitem');
    row.dataset.gameId = game.gameId;

    // ── Main: tilted cover + name / progress / divider ──
    const main = huntEl('div', 'recent-hunt-row__main');

    const coverWrap = huntEl('div', 'recent-hunt-row__cover-wrap');
    const cover = huntEl('img', 'recent-hunt-row__cover');
    cover.alt     = '';
    cover.loading  = 'lazy';
    cover.decoding = 'async';
    if (game.cover) cover.setAttribute('src', game.cover);
    cover.addEventListener('error', () => { cover.style.visibility = 'hidden'; });
    coverWrap.appendChild(cover);
    main.appendChild(coverWrap);

    const info = huntEl('div', 'recent-hunt-row__info');

    const titleRow = huntEl('div', 'recent-hunt-row__title-row');
    const nameEl = huntEl('div', 'recent-hunt-row__name');
    nameEl.textContent = game.name || 'Unknown Game';
    titleRow.appendChild(nameEl);

    const progressText = huntEl('div', 'recent-hunt-row__progress-text');
    progressText.textContent = `${completed} / ${total}`;
    titleRow.appendChild(progressText);
    info.appendChild(titleRow);

    if (hasAch) {
      const track = huntEl('div', 'recent-hunt-chip__track recent-hunt-row__track');
      const fill  = huntEl('div', 'recent-hunt-chip__fill');
      fill.style.width = `${pct}%`;
      track.appendChild(fill);
      info.appendChild(track);
    }

    info.appendChild(huntEl('div', 'recent-hunt-row__divider'));
    main.appendChild(info);
    row.appendChild(main);

    // ── Achievement count + dropdown arrow (inside the info column) ──
    if (hasAch) {
      const toggle = huntEl('button', 'recent-hunt-row__toggle');
      toggle.type = 'button';
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-controls', panelId);

      const count = huntEl('span', 'recent-hunt-row__count');
      count.textContent = `${total} achievement${total === 1 ? '' : 's'}`;
      toggle.appendChild(count);

      const chevron = huntEl('span', 'recent-hunt-row__chevron');
      chevron.innerHTML = HUNT_CHEVRON_SVG;
      toggle.appendChild(chevron);

      toggle.addEventListener('click', () => toggleHuntGame(game));
      info.appendChild(toggle); // sits beside the poster, under the divider

      // ── Inline panel (filled on first expand) ──
      const panel = huntEl('div', 'recent-hunt-row__panel');
      panel.id = panelId;
      panel.hidden = true;
      panel.setAttribute('aria-live', 'polite');
      row.appendChild(panel);
    }

    list.appendChild(row);
  });
}

function closeHuntRow(gameId) {
  const row = getHuntRow(gameId);
  if (!row) return;
  row.classList.remove('open');
  const toggle = row.querySelector('.recent-hunt-row__toggle');
  const panel  = row.querySelector('.recent-hunt-row__panel');
  if (toggle) toggle.setAttribute('aria-expanded', 'false');
  if (panel)  { panel.hidden = true; panel.innerHTML = ''; }
}

async function toggleHuntGame(game) {
  const prevId = huntOpenGameId;
  if (prevId !== null) closeHuntRow(prevId);

  // Clicking the already-open row just collapses it
  if (prevId === game.gameId) { huntOpenGameId = null; return; }

  const row = getHuntRow(game.gameId);
  if (!row) return;
  const toggle = row.querySelector('.recent-hunt-row__toggle');
  const panel  = row.querySelector('.recent-hunt-row__panel');
  if (!panel) return;

  huntOpenGameId = game.gameId;
  huntFilter     = 'all';
  huntAchQuery   = '';
  row.classList.add('open');
  if (toggle) toggle.setAttribute('aria-expanded', 'true');
  panel.hidden = false;
  renderHuntPanelSkeleton(panel);

  try {
    let achievements = huntAchCache.get(game.gameId);
    if (!achievements) {
      const steamId = SteamID.get();
      const suffix  = steamId ? `?steamId=${encodeURIComponent(steamId)}` : '';
      const data    = await apiFetch(`/games/steam/${encodeURIComponent(game.gameId)}/achievements${suffix}`);
      achievements  = normalizeAchievements(data);
      huntAchCache.set(game.gameId, achievements);
    }
    if (huntOpenGameId !== game.gameId) return; // user switched rows mid-fetch
    renderHuntPanel(panel, game, achievements);
  } catch (err) {
    if (huntOpenGameId !== game.gameId) return;
    renderHuntPanelError(panel, game, err);
  }
}

function renderHuntPanelSkeleton(panel) {
  panel.innerHTML = '';
  const grid = huntEl('div', 'explorer-grid recent-hunt__grid');
  for (let i = 0; i < 6; i++) grid.appendChild(huntEl('div', 'explorer-ach-skeleton'));
  panel.appendChild(grid);
}

function renderHuntPanelError(panel, game, err) {
  panel.innerHTML = '';
  const errWrap = document.createElement('div');
  panel.appendChild(errWrap);
  renderErrorState(
    errWrap,
    (err && err.message) || `Couldn't load achievements for ${game.name}.`,
    () => { huntAchCache.delete(game.gameId); closeHuntRow(game.gameId); huntOpenGameId = null; toggleHuntGame(game); }
  );
}

function renderHuntPanel(panel, game, achievements) {
  panel.innerHTML = '';

  const countMap = {
    all:        achievements.length,
    normal:     achievements.filter(a => !a.isHidden).length,
    hidden:     achievements.filter(a => a.isHidden).length,
    completed:  achievements.filter(a => a.completed === true).length,
    incomplete: achievements.filter(a => a.completed !== true).length,
  };
  const filterDefs = [
    { key: 'all',        label: 'All' },
    { key: 'normal',     label: 'Noraml' },
    { key: 'hidden',     label: 'Hidden' },
    { key: 'completed',  label: 'Unlocked' },
    { key: 'incomplete', label: 'Locked' },
  ];

  // ── Toolbar: filters + achievement search ──
  const toolbar = huntEl('div', 'recent-hunt__toolbar');

  const filters = huntEl('div', 'explorer-filter-tabs recent-hunt__filters');
  const tabBtns = [];
  filterDefs.forEach(f => {
    const btn = huntEl('button', 'explorer-filter-tab' + (huntFilter === f.key ? ' active' : ''));
    btn.type = 'button';
    btn.dataset.filter = f.key;
    btn.appendChild(document.createTextNode(f.label));
    const countSpan = huntEl('span', 'tab-count');
    countSpan.textContent = countMap[f.key];
    btn.appendChild(countSpan);
    btn.addEventListener('click', () => {
      huntFilter = f.key;
      tabBtns.forEach(b => b.classList.toggle('active', b.dataset.filter === f.key));
      fillHuntGrid();
    });
    tabBtns.push(btn);
    filters.appendChild(btn);
  });
  toolbar.appendChild(filters);

  // Right side: achievement search + export, kept together
  const tools = huntEl('div', 'recent-hunt__tools');

  const searchWrap = huntEl('div', 'recent-hunt__search recent-hunt__search--ach');
  searchWrap.innerHTML = `<svg class="recent-hunt__search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;

  const searchInput = huntEl('input', 'recent-hunt__search-input');
  searchInput.type = 'text';
  searchInput.placeholder = 'Search achievements...';
  searchInput.autocomplete = 'off';
  searchInput.spellcheck = false;
  searchInput.maxLength = 120;
  searchInput.value = huntAchQuery;
  searchInput.setAttribute('aria-label', 'Search achievements by name or description');
  searchWrap.appendChild(searchInput);

  const searchClear = huntEl('button', 'recent-hunt__search-clear');
  searchClear.type = 'button';
  searchClear.hidden = !huntAchQuery;
  searchClear.setAttribute('aria-label', 'Clear achievement search');
  searchClear.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
  searchWrap.appendChild(searchClear);
  tools.appendChild(searchWrap);

  // ── Export (same text / image modal as the main explorer) ──
  const exportBtn = huntEl('button', 'export-btn recent-hunt__export');
  exportBtn.type = 'button';
  exportBtn.title = 'Export achievements';
  exportBtn.setAttribute('aria-label', `Export ${game.name || 'game'} achievements`);
  exportBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg><span class="export-btn__label">Export</span>`;
  exportBtn.addEventListener('click', () => {
    if (!window.AchievelyExportModal) return;
    AchievelyExportModal.open({
      getGame: () => ({
        name: game.name,
        slug: slugify(game.name || ''),
        cover: game.cover || '',
        coverFallback: '',
        banner: '',
        background: game.cover || '',
      }),
      getAll: () => achievements,
      getView: () => getHuntView(),   // respects this panel's filter tab + search
      hasPlayerData: () => achievements.some(a => a.completed === true || a.completed === false),
    }, exportBtn);
  });
  tools.appendChild(exportBtn);

  toolbar.appendChild(tools);
  panel.appendChild(toolbar);

  // ── Grid (re-filled in place so typing never loses focus) ──
  const gridWrap = huntEl('div', 'recent-hunt__grid-wrap');
  panel.appendChild(gridWrap);

  // What the panel currently shows: filter tab + search, rarest first
  function getHuntView() {
    const q = huntAchQuery.trim().toLowerCase();

    let filtered = achievements;
    if (huntFilter === 'normal')     filtered = achievements.filter(a => !a.isHidden);
    if (huntFilter === 'hidden')     filtered = achievements.filter(a => a.isHidden);
    if (huntFilter === 'completed')  filtered = achievements.filter(a => a.completed === true);
    if (huntFilter === 'incomplete') filtered = achievements.filter(a => a.completed !== true);
    if (q) filtered = filtered.filter(a => achievementMatchesQuery(a, q));

    return [...filtered].sort((a, b) => a.completionPercentage - b.completionPercentage);
  }

  function fillHuntGrid() {
    const q = huntAchQuery.trim().toLowerCase();
    const sorted = getHuntView();

    gridWrap.innerHTML = '';
    if (!sorted.length) {
      renderEmptyState(
        gridWrap,
        q ? 'No matching achievements' : 'No achievements',
        q ? 'No achievements match your search.' : 'Nothing matches this filter.',
        `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><polyline points="8 21 12 17 16 21"/><path d="M5 3H19"/><path d="M5 3C5 3 5 10 12 10 19 10 19 3 19 3"/></svg>`
      );
      return;
    }
    const grid = huntEl('div', 'explorer-grid recent-hunt__grid');
    sorted.forEach(ach => grid.appendChild(buildExplorerCard(ach)));
    gridWrap.appendChild(grid);
  }

  searchInput.addEventListener('input', () => {
    huntAchQuery = searchInput.value;
    searchClear.hidden = !searchInput.value;
    fillHuntGrid();
  });
  searchInput.addEventListener('keydown', e => {
    if (e.key === 'Escape' && searchInput.value) {
      e.stopPropagation();
      searchInput.value = '';
      searchInput.dispatchEvent(new Event('input'));
    }
  });
  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    searchInput.dispatchEvent(new Event('input'));
    searchInput.focus();
  });

  fillHuntGrid();
}

/* ============================================================
   STEAM LINK CARD — sticky prompt when no Steam ID is linked
   ============================================================ */
function initSteamLinkCard() {
  const card = document.getElementById('steam-link-card');
  if (!card) return;

  let dismissed = false;
  try { dismissed = sessionStorage.getItem('achievely_steam_card_dismissed') === '1'; } catch (_) {}

  if (SteamID.get() || dismissed) { card.hidden = true; return; }

  // Reuse the navbar's Profile link so the card follows wherever Profile lives
  const navProfile = document.querySelector('nav a[href*="profile"], header a[href*="profile"]');
  const cta = document.getElementById('steam-link-card-cta');
  if (cta && navProfile) cta.setAttribute('href', navProfile.getAttribute('href'));

  card.hidden = false;
  const shell = document.getElementById('explorer-shell');
  if (shell) shell.classList.add('has-steam-card');

  const close = document.getElementById('steam-link-card-close');
  if (close) close.addEventListener('click', () => {
    card.hidden = true;
    if (shell) shell.classList.remove('has-steam-card');
    try { sessionStorage.setItem('achievely_steam_card_dismissed', '1'); } catch (_) {}
  });
}

/* ============================================================
   EXPORT ACHIEVEMENTS — shared modal (text + image), see
   scripts/export-modal.js and scripts/export-image.js
   ============================================================ */
function initExportModal() {
  const openBtn = document.getElementById('export-btn');
  if (!openBtn || !window.AchievelyExportModal) return;

  AchievelyExportModal.init({
    openBtn,
    getGame: () => currentGame ? {
      name: currentGame.name,
      slug: slugify(currentGame.name || ''),
      cover: currentGame.cover || '',
      coverFallback: currentGame.coverFallback || '',
      banner: currentGame.banner || '',
      background: currentGame.banner || currentGame.coverFallback || currentGame.background_image || currentGame.cover || '',
    } : null,
    getAll: () => currentAchievements,
    getView: () => filterAndSortAchievements(currentAchievements, currentSort),
    // unlocked state is only known when the API returned completed true/false
    hasPlayerData: () => currentAchievements.some(a => a.completed === true || a.completed === false),
  });
}

/* ============================================================
   FROM BOOKMARKS BUTTON + DROPDOWN
   ============================================================ */
function initBookmarksBtn() {
  const btn      = document.getElementById('bookmarks-btn');
  const dropdown = document.getElementById('bookmarks-dropdown');
  if (!btn || !dropdown) return;

  function refreshBtn() {
    const n = Bookmarks.count();
    btn.classList.toggle('bookmarked', n > 0);
    btn.setAttribute('aria-label', `From bookmarks (${n})`);
  }

  function renderDropdown() {
    dropdown.innerHTML = '';
    const all = Bookmarks.getAll();

    const hdr = document.createElement('div');
    hdr.className = 'bookmarks-dropdown__header';
    hdr.textContent = 'Saved Games';
    dropdown.appendChild(hdr);

    if (!all.length) {
      const empty = document.createElement('div');
      empty.className = 'bookmarks-dropdown__empty';
      empty.textContent = 'No bookmarks saved yet.';
      dropdown.appendChild(empty);
      return;
    }

    all.forEach(bm => {
      const item = document.createElement('div');
      item.className = 'bookmarks-dropdown__item';
      item.setAttribute('role', 'button');
      item.setAttribute('tabindex', '0');

      const cover = document.createElement('img');
      cover.className = 'bookmarks-dropdown__cover';
      cover.alt     = '';
      cover.loading = 'lazy';
      if (bm.cover) cover.setAttribute('src', bm.cover);
      cover.addEventListener('error', () => { cover.style.display = 'none'; });

      const name = document.createElement('div');
      name.className = 'bookmarks-dropdown__name';
      name.textContent = bm.name || 'Unknown Game';

      item.appendChild(cover);
      item.appendChild(name);

      const choose = () => {
        closeDropdown2();
        // Fill search input
        const input = document.getElementById('explorer-input');
        const clearBtn = document.getElementById('explorer-clear');
        if (input) input.value = bm.name || '';
        if (clearBtn) clearBtn.classList.add('visible');
        // Trigger selection directly (we already have the game object)
        selectGame({ rawgId: bm.rawgId, name: bm.name, slug: bm.slug, cover: bm.cover });
      };

      item.addEventListener('click', choose);
      item.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(); } });
      dropdown.appendChild(item);
    });
  }

  function openDropdown2() {
    renderDropdown();
    dropdown.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
  }

  function closeDropdown2() {
    dropdown.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
  }

  btn.addEventListener('click', e => {
    e.stopPropagation();
    dropdown.classList.contains('open') ? closeDropdown2() : openDropdown2();
  });

  // Click outside closes
  document.addEventListener('click', e => {
    const wrap = document.getElementById('bookmarks-btn-wrap');
    if (wrap && !wrap.contains(e.target)) closeDropdown2();
  });

  // Refresh when bookmarks change
  window.addEventListener('bookmarks:change', () => {
    refreshBtn();
    if (dropdown.classList.contains('open')) renderDropdown();
  });

  refreshBtn();
}