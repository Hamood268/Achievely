/* ============================================================
   ACHIEVELY — library.js
   Search, trending, recent releases, game card rendering
   ============================================================ */

'use strict';

/* ── State ── */
let searchDebounce = null;
let currentQuery   = '';

/* ── Init ── */
document.addEventListener('DOMContentLoaded', () => {
  renderNavbar('library');
  renderFooter();
  initSearch();
  loadHomeSections();
  initViewAllButtons();

  // Back button: return from search results to browse view
  const backBtn = document.getElementById('search-back-btn');
  if (backBtn) backBtn.addEventListener('click', clearSearch);
});

/* ── "View all" opens full overlay ── */
function initViewAllButtons() {
  document.querySelectorAll('.section-viewall[data-scroll]').forEach(btn => {
    btn.addEventListener('click', () => {
      const trackId = btn.dataset.scroll;
      const track   = document.getElementById(trackId);
      if (!track) return;
      const cards  = Array.from(track.querySelectorAll('.game-card'));
      const title  = btn.closest('.section-header')?.querySelector('.section-title')?.textContent?.trim() || 'Games';
      openGamesOverlay(title, cards);
    });
  });
}

/* ── Games overlay ── */
function openGamesOverlay(title, cards) {
  // Remove any existing overlay
  document.getElementById('games-overlay')?.remove();
  document.getElementById('games-overlay-scrim')?.remove();

  const scrim = document.createElement('div');
  scrim.id = 'games-overlay-scrim';
  scrim.className = 'games-overlay-scrim';

  const overlay = document.createElement('div');
  overlay.id = 'games-overlay';
  overlay.className = 'games-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', title);

  // Header
  const header = document.createElement('div');
  header.className = 'games-overlay__header';
  const titleEl = document.createElement('h2');
  titleEl.className = 'games-overlay__title';
  titleEl.textContent = title;
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'games-overlay__close';
  closeBtn.setAttribute('aria-label', 'Close');
  closeBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
  header.appendChild(titleEl);
  header.appendChild(closeBtn);

  // Grid of cloned cards
  const grid = document.createElement('div');
  grid.className = 'games-overlay__grid';
  cards.forEach(card => {
    const clone = card.cloneNode(true);
    grid.appendChild(clone);
  });

  overlay.appendChild(header);
  overlay.appendChild(grid);
  document.body.appendChild(scrim);
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  const close = () => {
    overlay.remove();
    scrim.remove();
    document.body.style.overflow = '';
    document.removeEventListener('keydown', escHandler);
  };
  const escHandler = e => { if (e.key === 'Escape') close(); };
  closeBtn.addEventListener('click', close);
  scrim.addEventListener('click', close);
  document.addEventListener('keydown', escHandler);
}

/* ============================================================
   SEARCH
   ============================================================ */
function initSearch() {
  const input    = document.getElementById('search-input');
  const clearBtn = document.getElementById('search-clear');
  const form     = document.getElementById('search-form');

  if (!input) return;

  // Focus shortcut: press / to focus search
  document.addEventListener('keydown', e => {
    if (e.key === '/' && document.activeElement !== input) {
      e.preventDefault();
      input.focus();
    }
    if (e.key === 'Escape' && document.activeElement === input) {
      clearSearch();
    }
  });

  input.addEventListener('input', () => {
    const val = input.value.trim();

    // Show/hide clear button
    if (val.length > 0) {
      clearBtn.classList.add('visible');
    } else {
      clearBtn.classList.remove('visible');
      clearSearch();
      return;
    }

    // Debounce
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => runSearch(val), 400);
  });

  clearBtn.addEventListener('click', clearSearch);

  form.addEventListener('submit', e => {
    e.preventDefault();
    const val = input.value.trim();
    if (val) runSearch(val);
  });
}

async function runSearch(query) {
  if (query === currentQuery) return;
  currentQuery = query;

  showSearchResults(query);

  const resultsGrid = document.getElementById('search-grid');
  if (!resultsGrid) return;

  // Show skeletons
  renderSkeletonGrid(resultsGrid, 12);
  updateResultsCount('Searching…');

  try {
    const params = new URLSearchParams({ q: query });
    const data   = await apiFetch(`/search?${params}`);
    const games  = Array.isArray(data) ? data : (data.results || data.games || []);

    if (!games.length) {
      Toast.error(`No results found for "${query}"`);
      renderEmptyState(
        resultsGrid,
        'No results',
        `We couldn't find any games matching "${query}". Try a different search.`,
        Icons.search
      );
      updateResultsCount('0 results');
      return;
    }

    updateResultsCount(`${games.length} result${games.length !== 1 ? 's' : ''}`);
    renderGameGrid(resultsGrid, games);
  } catch (err) {
    Toast.error('Search failed. Check your connection and try again.');
    renderErrorState(resultsGrid, err.message, () => runSearch(query));
    updateResultsCount('Error');
  }
}

function showSearchResults(query) {
  const homeContent    = document.getElementById('home-content');
  const searchResults  = document.getElementById('search-results');
  const resultsTitle   = document.getElementById('search-results-title');

  if (homeContent)   homeContent.classList.add('hidden');
  if (searchResults) searchResults.classList.add('active');
  if (resultsTitle)  resultsTitle.textContent = `Results for "${query}"`;
}

function clearSearch() {
  currentQuery = '';

  const input         = document.getElementById('search-input');
  const clearBtn      = document.getElementById('search-clear');
  const homeContent   = document.getElementById('home-content');
  const searchResults = document.getElementById('search-results');

  if (input)         input.value = '';
  if (clearBtn)      clearBtn.classList.remove('visible');
  if (homeContent)   homeContent.classList.remove('hidden');
  if (searchResults) searchResults.classList.remove('active');
}
window.clearSearch = clearSearch;

function updateResultsCount(text) {
  const el = document.getElementById('search-count');
  if (el) el.textContent = text;
}

/* ============================================================
   HOME SECTIONS
   ============================================================ */
async function loadHomeSections() {
  loadSection('trending-track', '/trending',        'Trending');
  loadSection('recent-track',   '/recent-releases', 'Recently Added');
}

async function loadSection(trackId, endpoint, label) {
  const track = document.getElementById(trackId);
  if (!track) return;

  // Skeleton cards
  renderSkeletonRow(track, 10);

  try {
    const data  = await apiFetch(endpoint);
    const games = Array.isArray(data) ? data : (data.results || data.games || []);

    if (!games.length) {
      track.innerHTML = '';
      const msg = document.createElement('p');
      msg.className = 'section-loading';
      msg.textContent = `No ${label.toLowerCase()} games available.`;
      track.appendChild(msg);
      return;
    }

    track.innerHTML = '';
    games.forEach(game => {
      const card = buildGameCard(game, 'scroll');
      track.appendChild(card);
    });
  } catch (err) {
    track.innerHTML = '';
    const errWrap = document.createElement('div');
    errWrap.style.padding = 'var(--sp-lg)';
    renderErrorState(errWrap, `Couldn't load ${label.toLowerCase()}.`, () => loadSection(trackId, endpoint, label));
    track.appendChild(errWrap);
    Toast.error(`Couldn't load ${label.toLowerCase()}. ${err.message}`);
  }
}

/* ============================================================
   GAME CARD BUILDER
   ============================================================ */
function buildGameCard(game, mode = 'scroll') {
  /* game shape:
     rawgId, name, slug, cover / background_image,
     rating, metacritic, platforms, genres
     + optional: userCompletion (0–100) */

  const rawgId   = game.rawgId || game.id;
  const slug     = game.slug   || slugify(game.name || '');
  const href     = buildGameHref(rawgId, slug);

  const card = document.createElement('a');
  card.href      = href;
  card.className = 'game-card';
  card.setAttribute('aria-label', game.name || 'Game');
  card.setAttribute('title', game.name || '');

  // Persist screenshots to sessionStorage before navigation so game.html
  // can display them (the detail endpoint does not return screenshots).
  card.addEventListener('click', () => {
    const shots = game.screenshots || game.short_screenshots || [];
    if (rawgId != null && shots.length) {
      try {
        sessionStorage.setItem(
          `game_screenshots_${rawgId}`,
          JSON.stringify(shots)
        );
      } catch (_) { /* storage full or unavailable — fail silently */ }
    }
  });

  // ── Cover image ──
  // Prefer background_image (wide format) for cards, fall back to cover
  const coverSrc = game.background_image || game.cover || '';
  if (coverSrc) {
    const img = document.createElement('img');
    img.className = 'game-card__cover';
    img.alt       = '';          // decorative; name in overlay
    img.loading   = 'lazy';
    img.decoding  = 'async';
    // Set src via setAttribute to avoid innerHTML XSS
    img.setAttribute('src', coverSrc);
    img.addEventListener('error', () => {
      img.replaceWith(buildCoverFallback());
    });
    card.appendChild(img);
  } else {
    card.appendChild(buildCoverFallback());
  }

  // ── Rating badge (top-left) ──
  if (game.rating && parseFloat(game.rating) > 0) {
    const ratingBadge = document.createElement('div');
    ratingBadge.className = 'game-card__rating';
    ratingBadge.innerHTML = `<svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
    const ratingText = document.createTextNode(parseFloat(game.rating).toFixed(1));
    ratingBadge.appendChild(ratingText);
    card.appendChild(ratingBadge);
  }

  // ── Completion badge (top-right) ──
  const pct = game.userCompletion;
  if (typeof pct === 'number') {
    const badge     = document.createElement('div');
    badge.className = 'game-card__badge ' + completionBadgeClass(pct);
    badge.textContent = pct + '%';
    card.appendChild(badge);
  }

  // ── Hover overlay ──
  const overlay = document.createElement('div');
  overlay.className = 'game-card__overlay';
  overlay.setAttribute('aria-hidden', 'true');

  const nameEl = document.createElement('div');
  nameEl.className = 'game-card__name';
  nameEl.textContent = game.name || 'Unknown Game';

  overlay.appendChild(nameEl);

  if (game.genres && game.genres.length) {
    const meta = document.createElement('div');
    meta.className = 'game-card__meta';
    meta.textContent = game.genres.slice(0, 2).join(' · ');
    overlay.appendChild(meta);
  } else if (game.release_date) {
    const meta = document.createElement('div');
    meta.className = 'game-card__meta';
    meta.textContent = game.release_date.slice(0, 4);
    overlay.appendChild(meta);
  }

  card.appendChild(overlay);
  return card;
}

function buildCoverFallback() {
  const wrap = document.createElement('div');
  wrap.className = 'game-card__cover-fallback';
  wrap.innerHTML = `<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.3"><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><circle cx="15.5" cy="11.5" r="0.5" fill="currentColor"/><circle cx="17.5" cy="13.5" r="0.5" fill="currentColor"/><path d="M21 6H3a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2z"/></svg>`;
  return wrap;
}

function completionBadgeClass(pct) {
  if (pct >= 100) return 'game-card__badge--gold';
  if (pct >= 80)  return 'game-card__badge--cyan';
  if (pct >= 1)   return 'game-card__badge--blue';
  return 'game-card__badge--grey';
}

function buildGameHref(rawgId, slug) {
  const params = new URLSearchParams();
  // Prefer slug for human-friendly URLs; fall back to id only if no slug
  if (slug)           params.set('name', String(slug));
  else if (rawgId != null) params.set('name', String(rawgId));
  return `game.html?${params}`;
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

/* ============================================================
   SKELETON HELPERS
   ============================================================ */
function renderSkeletonRow(container, count = 8) {
  container.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const s = document.createElement('div');
    s.className = 'game-card-skeleton';
    container.appendChild(s);
  }
}

function renderSkeletonGrid(container, count = 12) {
  container.innerHTML = '';
  container.className = 'search-grid';
  for (let i = 0; i < count; i++) {
    const s = document.createElement('div');
    s.className = 'game-card-skeleton';
    container.appendChild(s);
  }
}

/* ============================================================
   SEARCH GRID RENDER
   ============================================================ */
function renderGameGrid(container, games) {
  container.innerHTML = '';
  container.className = 'search-grid';
  games.forEach(game => {
    const card = buildGameCard(game, 'grid');
    container.appendChild(card);
  });
}
