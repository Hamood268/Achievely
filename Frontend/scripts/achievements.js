/* ============================================================
   ACHIEVELY — achievements.js
   Achievement Explorer: autocomplete search, game selection,
   achievement grid, sort, hidden reveal
   ============================================================ */

'use strict';

/* ── State ── */
let searchDebounce   = null;
let autocompleteIdx  = -1;       // keyboard nav index in dropdown
let autocompleteList = [];        // current dropdown results
let currentSort      = 'rarity';
let currentFilter    = 'all';    // 'all' | 'normal' | 'hidden'
let currentGame      = null;      // { rawgId, name, cover, ... }
let currentAchievements = [];

/* ── Init ── */
document.addEventListener('DOMContentLoaded', () => {
  renderNavbar('achievements');
  renderFooter();
  initSearch();
  initBookmarksBtn();
  initFilterTabs();
  showInitialState();
});

/* ============================================================
   SEARCH + AUTOCOMPLETE
   ============================================================ */
function initSearch() {
  const input    = document.getElementById('explorer-input');
  const clearBtn = document.getElementById('explorer-clear');
  const dropdown = document.getElementById('autocomplete-dropdown');
  const form     = document.getElementById('explorer-form');

  if (!input) return;

  /* Press / to focus */
  document.addEventListener('keydown', e => {
    if (e.key === '/' && document.activeElement !== input) {
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
      clearBtn.classList.remove('visible');
      closeDropdown();
      return;
    }

    clearBtn.classList.add('visible');

    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => runAutocomplete(val), 350);
  });

  /* Clear button */
  clearBtn.addEventListener('click', () => {
    input.value = '';
    clearBtn.classList.remove('visible');
    closeDropdown();
    input.focus();
  });

  /* Form submit (fallback) */
  form.addEventListener('submit', e => {
    e.preventDefault();
    const val = input.value.trim();
    if (val) runAutocomplete(val);
  });

  /* Click outside closes dropdown */
  document.addEventListener('click', e => {
    const wrap = document.getElementById('explorer-search-wrap');
    if (wrap && !wrap.contains(e.target)) closeDropdown();
  });
}

async function runAutocomplete(query) {
  const dropdown = document.getElementById('autocomplete-dropdown');
  if (!dropdown) return;

  showDropdownLoading();

  try {
    const params = new URLSearchParams({ q: query });
    const data   = await apiFetch(`/search?${params}`);
    const games  = Array.isArray(data) ? data : (data.results || data.games || []);

    autocompleteList = games;

    if (!games.length) {
      showDropdownEmpty(query);
      return;
    }

    renderDropdownItems(games.slice(0, 8));
  } catch (err) {
    Toast.error(`Search failed. ${err.message}`);
    closeDropdown();
  }
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
    const coverSrc =  game.cover || game.background_image || '';
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
    const data = await apiFetch(`/games/${encodeURIComponent(rawgId)}/achievements`);
    currentAchievements = normalizeAchievements(data);
    updateGameHeaderCount(currentAchievements.length);
    renderAchievementGrid(currentAchievements, currentSort);
  } catch (err) {
    Toast.error(`Couldn't load achievements for ${game.name}.`);
    const content = document.getElementById('explorer-grid-wrap');
    if (content) renderErrorState(content, err.message, () => selectGame(game));
  }
}

function normalizeAchievements(data) {
  const list = Array.isArray(data) ? data : (data.achievements || data.results || []);
  return list.map(a => ({
    name:                a.name        || 'Unknown Achievement',
    description:         a.description || '',
    isHidden:            a.isHidden    || false,
    icon:                a.icon        || '',
    iconIncomplete:      a.iconIncomplete || a.icon || '',
    completionPercentage: parseFloat(a.completionPercentage || a.percent || 0),
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
    img.addEventListener('error', () => img.replaceWith(buildCoverFallback()));
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
  if (rawgId || slug) {
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
    meta.appendChild(link);
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

function renderAchievementGrid(achievements, sortKey) {
  const wrap = document.getElementById('explorer-grid-wrap');
  if (!wrap) return;

  const sortBar   = document.getElementById('explorer-sort-bar');
  const resultLbl = document.getElementById('explorer-results-label');

  if (sortBar)   sortBar.style.visibility = 'visible';

  // Apply visibility filter
  let filtered = achievements;
  if (currentFilter === 'hidden') filtered = achievements.filter(a => a.isHidden);
  if (currentFilter === 'normal') filtered = achievements.filter(a => !a.isHidden);

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (sortKey === 'rarity') return a.completionPercentage - b.completionPercentage;
    if (sortKey === 'name')   return (a.name || '').localeCompare(b.name || '');
    return 0;
  });

  if (resultLbl) {
    const total = achievements.length;
    const shown = sorted.length;
    resultLbl.textContent = shown === total
      ? `${total} achievement${total !== 1 ? 's' : ''}`
      : `${shown} of ${total} achievement${total !== 1 ? 's' : ''}`;
  }

  wrap.innerHTML = '';

  if (!sorted.length) {
    renderEmptyState(
      wrap,
      'No achievements found',
      'This game has no achievement data in our database.',
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

  const iconSrc = (!hasSteamId || ach.completed)
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

  // Description: blurred for hidden+locked
  const descEl = document.createElement('div');
  descEl.className = 'explorer-ach-desc' + (isHidden ? ' explorer-ach-desc--blurred' : '');
  descEl.textContent = ach.description || 'No description available.';
  body.appendChild(descEl);

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
  if (hintBlock)  hintBlock.classList.remove('hidden');
}

function hideInitialState() {
  const initialEl = document.getElementById('explorer-initial');
  const hintBlock = document.getElementById('search-hint-block');
  const shell     = document.getElementById('explorer-shell');
  if (initialEl)  initialEl.style.display = 'none';
  if (hintBlock)  hintBlock.classList.add('hidden');
  if (shell)      shell.classList.add('has-results');
}

function clearSelection() {
  currentGame         = null;
  currentAchievements = [];
  currentFilter       = 'all';
  // Reset filter tab UI
  document.querySelectorAll('.explorer-filter-tab').forEach((t, i) => {
    t.classList.toggle('active', i === 0);
  });
  const shell = document.getElementById('explorer-shell');
  if (shell) shell.classList.remove('has-results');

  const input    = document.getElementById('explorer-input');
  const clearBtn = document.getElementById('explorer-clear');
  if (input)    input.value = '';
  if (clearBtn) clearBtn.classList.remove('visible');

  closeDropdown();
  showInitialState();
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
