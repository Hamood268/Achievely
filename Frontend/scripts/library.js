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
  initDragScroll();
  initScrollArrows();

  // Back button: return from search results to browse view
  const backBtn = document.getElementById('search-back-btn');
  if (backBtn) backBtn.addEventListener('click', clearSearch);
});

/* ── Click-drag scroll handled globally by shared.js initUniversalDragScroll ── */
function initDragScroll() {
  // shared.js already binds all .scroll-track elements via MutationObserver.
  // This stub exists so any callers don't throw.
  if (typeof window.applyDragScroll === 'function') window.applyDragScroll();
}

/* ── Scroll arrows: click to page a row, auto-hide at each end ── */
function initScrollArrows() {
  document.querySelectorAll('.scroll-arrow').forEach(btn => {
    btn.addEventListener('click', () => {
      const track = document.getElementById(btn.dataset.target);
      if (!track) return;
      const dir = btn.classList.contains('scroll-arrow--left') ? -1 : 1;
      // Page by ~80% of the visible width so the next card is always partially cued
      track.scrollBy({ left: dir * track.clientWidth * 0.8, behavior: 'smooth' });
    });
  });

  // Hide/show edge arrows based on scroll position
  document.querySelectorAll('.scroll-track').forEach(track => {
    const wrap = track.closest('.scroll-track-wrap');
    if (!wrap) return;
    const leftBtn  = wrap.querySelector('.scroll-arrow--left');
    const rightBtn = wrap.querySelector('.scroll-arrow--right');
    if (!leftBtn || !rightBtn) return;

    const update = () => {
      const max = track.scrollWidth - track.clientWidth;
      leftBtn.classList.toggle('is-hidden', track.scrollLeft <= 4);
      rightBtn.classList.toggle('is-hidden', track.scrollLeft >= max - 4);
    };

    track.addEventListener('scroll', update, { passive: true });
    // Re-check once content loads in (cards are added async by loadSection/loadJumpBackIn)
    new MutationObserver(update).observe(track, { childList: true });
    update();
  });
}

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
  // Trending is the first row on the page, so its first few covers are the
  // likely LCP element — load those eagerly at high priority; everything
  // else (including Trending's own tail) stays lazy/auto.
  loadSection('trending-track', '/trending',        'Trending', 'scroll', 4);
  loadSection('recent-track',   '/recent-releases', 'Recently Added');
  loadSection('upcoming-track', '/upcoming',        'Upcoming', 'upcoming');
  loadJumpBackIn();
}

/* ============================================================
   JUMP BACK IN (personal recently-played, Steam-only)
   ============================================================ */
async function loadJumpBackIn() {
  const steamId = typeof window.SteamID !== 'undefined' ? SteamID.get() : null;
  const section = document.getElementById('jump-back-section');

  if (!steamId) {
    if (section) section.style.display = 'none';
    return;
  }

  if (section) section.style.display = '';

  const track = document.getElementById('jump-back-track');
  if (!track) return;

  renderSkeletonRow(track, 6);

  try {
    const data  = await apiFetch(`/users/${encodeURIComponent(steamId)}/games`);
    const rawList = Array.isArray(data) ? data : (data.games || data.profile?.games || data.results || []);

    // Sort by recent activity (playtime_2weeks desc, then lastPlayed desc)
    const sorted = [...rawList]
      .filter(g => (g.playtime_2weeks || g.playtime2wks || 0) > 0 || (g.lastPlayed || g.rtime_last_played || 0) > 0)
      .sort((a, b) => {
        const a2w = a.playtime_2weeks || a.playtime2wks || 0;
        const b2w = b.playtime_2weeks || b.playtime2wks || 0;
        if (b2w !== a2w) return b2w - a2w;
        return ((b.lastPlayed || b.rtime_last_played || 0) - (a.lastPlayed || a.rtime_last_played || 0));
      })
      .slice(0, 12);

    track.innerHTML = '';

    // Quick stats strip pulls from the full library, not just the recent slice
    renderQuickStats(rawList);

    if (!sorted.length) {
      if (section) section.style.display = 'none';
      return;
    }

    sorted.forEach(game => {
      const appId    = game.gameId || game.appId || game.appid || game.steamAppId;
      const coverSrc = game.cover || game.background_image
      || (appId ? `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${appId}/library_600x900.jpg` : '');

      const enriched = { ...game, cover: coverSrc, background_image: game.background_image || coverSrc };
      const card = buildGameCard(enriched, 'jumpback');
      track.appendChild(card);
    });

  } catch (_) {
    if (section) section.style.display = 'none';
  }
}

/* ── Quick stats strip (games tracked / 100%'d) ── */
function renderQuickStats(games) {
  const el = document.getElementById('quick-stats');
  if (!el) return;

  if (!games.length) { el.style.display = 'none'; return; }

  const total     = games.length;
  const perfected = games.map(getCompletionPct).filter(p => typeof p === 'number' && p >= 100).length;

  const chips = [
    { value: total, label: total === 1 ? 'game tracked' : 'games tracked' },
  ];
  if (perfected > 0) chips.push({ value: perfected, label: perfected === 1 ? 'game 100%\u2019d' : 'games 100%\u2019d', gold: true });

  el.innerHTML = '';
  chips.forEach(c => {
    const chip = document.createElement('div');
    chip.className = 'quick-stats__chip' + (c.gold ? ' quick-stats__chip--gold' : '');
    const val = document.createElement('span');
    val.className = 'quick-stats__value';
    val.textContent = c.value;
    const label = document.createElement('span');
    label.className = 'quick-stats__label';
    label.textContent = c.label;
    chip.appendChild(val);
    chip.appendChild(label);
    el.appendChild(chip);
  });
  el.style.display = 'flex';
}

async function loadSection(trackId, endpoint, label, mode = 'scroll', priorityCount = 0) {
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
    games.forEach((game, i) => {
      const card = buildGameCard(game, mode, i < priorityCount);
      // Upcoming row: caption below the cover instead of the on-image pill;
      // the pill still shows up when this card is cloned into the "View all" modal.
      track.appendChild(mode === 'upcoming' ? buildUpcomingTile(card, game) : card);
    });
  } catch (err) {
    track.innerHTML = '';
    const errWrap = document.createElement('div');
    errWrap.style.padding = 'var(--sp-lg)';
    renderErrorState(errWrap, `Couldn't load ${label.toLowerCase()}.`, () => loadSection(trackId, endpoint, label, mode, priorityCount));
    track.appendChild(errWrap);
    Toast.error(`Couldn't load ${label.toLowerCase()}. ${err.message}`);
  }
}

/* Routes a cover image through a public resizing proxy (images.weserv.nl) so
   the browser downloads something close to the rendered size instead of the
   source's full 600x900 asset. Falls back to the original URL if the proxy
   is unreachable — see the error handler in buildGameCard. */
function optimizedCoverUrl(url, w, h) {
  if (!url || !/^https?:\/\//.test(url)) return url; // skip data URIs/relative paths
  const bare = url.replace(/^https?:\/\//, '');
  return `https://images.weserv.nl/?url=${encodeURIComponent(bare)}&w=${w}&h=${h}&fit=cover&q=80&output=webp`;
}

/* ============================================================
   GAME CARD BUILDER
   ============================================================ */
function buildGameCard(game, mode = 'scroll', priority = false) {
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

  // ── Cover image ── wrapped in its own clipping box so oversized source
  // images (and the hover zoom) never bleed past the card's rounded corners.
  // Prefer background_image (wide format) for cards, fall back to cover
  const coverSrc  = game.cover || game.background_image || '';
  const coverWrap = document.createElement('div');
  coverWrap.className = 'game-card__cover-wrap';

  if (coverSrc) {
    const [w, h] = [360, 540]; // ~2x the 160×240 CSS size, for retina
    const img = document.createElement('img');
    img.className = 'game-card__cover';
    img.alt       = '';          // decorative; name in overlay
    img.width     = 300;         // intrinsic aspect-ratio hint only, not exact
    img.height    = 450;
    img.decoding  = 'async';
    if (priority) {
      img.loading = 'eager';
      img.setAttribute('fetchpriority', 'high');
    } else {
      img.loading = 'lazy';
    }
    img.dataset.rawSrc = coverSrc;
    img.setAttribute('src', optimizedCoverUrl(coverSrc, w, h));
    img.addEventListener('error', () => {
      // First failure is likely the resize proxy — retry once with the
      // original, unproxied URL before giving up and showing the fallback.
      if (img.src !== coverSrc) {
        img.src = coverSrc;
      } else {
        img.replaceWith(buildCoverFallback());
      }
    });
    coverWrap.appendChild(img);
  } else {
    coverWrap.appendChild(buildCoverFallback());
  }
  card.appendChild(coverWrap);

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
  const pct = getCompletionPct(game);
  if (typeof pct === 'number') {
    const badge     = document.createElement('div');
    badge.className = 'game-card__badge ' + completionBadgeClass(pct);
    badge.textContent = pct + '%';
    card.appendChild(badge);
  }

  // ── Jump Back In: always-visible progress bar along the bottom edge ──
  if (mode === 'jumpback' && typeof pct === 'number') {
    const barWrap = document.createElement('div');
    barWrap.className = 'game-card__progressbar';
    const fill = document.createElement('div');
    fill.className = 'game-card__progressbar-fill' + (pct >= 100 ? ' game-card__progressbar-fill--complete' : '');
    fill.style.width = Math.min(100, Math.max(0, pct)) + '%';
    barWrap.appendChild(fill);
    card.appendChild(barWrap);
  }

  // ── Upcoming: always-visible release chip ──
  const releaseStr = getReleaseDateStr(game);
  if (mode === 'upcoming' && releaseStr) {
    const countdown = formatReleaseCountdown(releaseStr);
    if (countdown) {
      const chip = document.createElement('div');
      chip.className = 'game-card__release-chip' + (countdown.soon ? ' game-card__release-chip--soon' : '');
      chip.textContent = countdown.text;
      card.appendChild(chip);
    }
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
  } else if (getReleaseDateStr(game)) {
    const meta = document.createElement('div');
    meta.className = 'game-card__meta';
    meta.textContent = getReleaseDateStr(game).slice(0, 4);
    overlay.appendChild(meta);
  }

  card.appendChild(overlay);
  return card;
}

/* Wraps an Upcoming card in a tile with a two-line caption below the cover:
   the full release date, then a "Released in Xd" countdown. Only used in
   the main scroll row — the on-cover pill (.game-card__release-chip) is
   hidden here via CSS, but stays visible when this same .game-card node is
   cloned into the "View all" modal, since the clone doesn't carry the
   wrapper along with it. */
function buildUpcomingTile(card, game) {
  const wrap = document.createElement('div');
  wrap.className = 'game-tile game-tile--upcoming';
  wrap.setAttribute('role', 'listitem');
  wrap.appendChild(card);

  const releaseStr = getReleaseDateStr(game);
  const countdown  = releaseStr ? formatReleaseCountdown(releaseStr) : null;
  if (countdown) {
    const caption = document.createElement('div');
    caption.className = 'game-tile__caption';

    const dateLine = document.createElement('div');
    dateLine.className = 'game-tile__caption-date';
    dateLine.textContent = countdown.full;

    const countLine = document.createElement('div');
    countLine.className = 'game-tile__caption-countdown' + (countdown.soon ? ' game-tile__caption-countdown--soon' : '');
    countLine.textContent = countdown.days === 0
      ? 'Releases today'
      : countdown.days === 1
        ? 'Releases tomorrow'
        : `Releases in ${countdown.days}d`;

    caption.appendChild(dateLine);
    caption.appendChild(countLine);
    wrap.appendChild(caption);
  }
  return wrap;
}

function buildCoverFallback() {
  const wrap = document.createElement('div');
  wrap.className = 'game-card__cover-fallback';
  wrap.innerHTML = `<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.3"><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><circle cx="15.5" cy="11.5" r="0.5" fill="currentColor"/><circle cx="17.5" cy="13.5" r="0.5" fill="currentColor"/><path d="M21 6H3a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2z"/></svg>`;
  return wrap;
}

/* Turns a release date string into both a short chip form ("54d" / "Today")
   for the on-cover pill, and a full calendar date + day-count for the
   two-line caption used in the main scroll row. */
function formatReleaseCountdown(dateStr) {
  const releaseDate = new Date(dateStr);
  if (isNaN(releaseDate.getTime())) return null;

  const now  = new Date();
  const days = Math.ceil((releaseDate - now) / 86400000);
  if (days < 0) return null; // already out — not "upcoming"

  const full = releaseDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

  if (days === 0) return { text: 'Today',    full, days, soon: true };
  if (days === 1) return { text: 'Tomorrow', full, days, soon: true };
  if (days <= 14) return { text: `${days}d`, full, days, soon: true  };
  if (days <= 90) return { text: `${days}d`, full, days, soon: false };
  return { text: releaseDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), full, days, soon: false };
}

/* Reads a 0–100 completion % from either a flat userCompletion field or a
   nested achievements object ({ completed, total, percentage }); returns
   null when there's nothing to show (e.g. a demo with 0 total achievements). */
function getCompletionPct(game) {
  if (typeof game.userCompletion === 'number') return game.userCompletion;
  const ach = game.achievements;
  if (ach) {
    if (typeof ach.percentage === 'number') return ach.percentage;
    if (typeof ach.completed === 'number' && typeof ach.total === 'number' && ach.total > 0) {
      return Math.round((ach.completed / ach.total) * 100);
    }
  }
  return null;
}

/* Reads a release date string from either `released` (upcoming endpoint) or
   `release_date` (used elsewhere), whichever is present. */
function getReleaseDateStr(game) {
  return game.released || game.release_date || null;
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
