'use strict';

/* ── Month names ── */
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/* ── State ── */
const today = new Date();
const MIN_MONTH = today.getMonth() + 1; // 1-12
const MIN_YEAR  = today.getFullYear();

let state = {
  month: MIN_MONTH,
  year: MIN_YEAR,
};

let requestToken = 0; // guards against out-of-order responses when clicking fast

/* ── Init ── */
document.addEventListener('DOMContentLoaded', () => {
  renderNavbar('calendar');
  renderFooter();

  document.getElementById('month-prev').addEventListener('click', () => changeMonth(-1));
  document.getElementById('month-next').addEventListener('click', () => changeMonth(1));

  loadMonth(state.month, state.year);
});

/* ── Month navigation ── */
function changeMonth(delta) {
  let { month, year } = state;
  month += delta;

  if (month > 12) { month = 1; year += 1; }
  if (month < 1)  { month = 12; year -= 1; }

  // Never allow navigating before the current real-world month
  if (year < MIN_YEAR || (year === MIN_YEAR && month < MIN_MONTH)) return;

  state = { month, year };
  loadMonth(month, year);
}

function isAtMinMonth() {
  return state.year === MIN_YEAR && state.month === MIN_MONTH;
}

function updateNavButtons() {
  document.getElementById('month-prev').disabled = isAtMinMonth();
}

/* ── Fetch + render a given month ── */
async function loadMonth(month, year) {
  const token = ++requestToken;

  document.getElementById('month-label').textContent = `${MONTH_NAMES[month - 1]} ${year}`;
  updateNavButtons();
  renderSkeletonGrid(month, year);

  try {
    const data = await apiFetch('/upcoming', { month, year });
    if (token !== requestToken) return; // a newer request has since started

    const gamesByDay = groupGamesByDay(data.games || [], month, year);
    renderGrid(month, year, gamesByDay);
  } catch (err) {
    if (token !== requestToken) return;
    const grid = document.getElementById('calendar-grid');
    renderErrorState(grid, err.message || 'Could not load releases for this month.', () => loadMonth(month, year));
  }
}

/* ── Group games by day-of-month using their release date ──
   NOTE: we deliberately do NOT re-validate the game's year/month against
   the requested month here. RAWG's `dates` filter isn't always exact —
   it can return a game whose release date sits just outside the strict
   range. Re-validating and discarding those silently drops games that
   are legitimately present in the response, so instead we trust the
   day-of-month straight from the "YYYY-MM-DD" string and just clamp it
   into a valid slot for the month being rendered. ── */
function groupGamesByDay(games, month, year) {
  const map = {};
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  games.forEach((game) => {
    if (!game.released) return;
    const parts = game.released.split('-');
    if (parts.length !== 3) return;

    let day = parseInt(parts[2], 10);
    if (!Number.isInteger(day)) return;

    // Clamp instead of dropping, in case RAWG's date sits just outside this month
    day = Math.min(Math.max(day, 1), daysInMonth);

    if (!map[day]) map[day] = [];
    map[day].push(game);
  });

  return map;
}

/* ── Skeleton state while loading ── */
function renderSkeletonGrid(month, year) {
  const grid = document.getElementById('calendar-grid');
  grid.innerHTML = '';

  const { leading, daysInMonth } = getMonthLayout(month, year);

  for (let i = 0; i < leading; i++) {
    grid.appendChild(el('div', { className: 'cal-cell cal-cell--empty' }));
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const cell = el('div', { className: 'cal-cell cal-cell--skeleton' });
    const badgeRow = el('div', { className: 'cal-cell__badges' });
    badgeRow.appendChild(el('span', { className: 'cal-cell__day', textContent: String(day) }));
    cell.appendChild(badgeRow);
    grid.appendChild(cell);
  }
}

/* ── Real grid render ── */
function renderGrid(month, year, gamesByDay) {
  const grid = document.getElementById('calendar-grid');
  grid.innerHTML = '';

  const { leading, daysInMonth } = getMonthLayout(month, year);
  const isViewingCurrentMonth = (month === today.getMonth() + 1) && (year === today.getFullYear());
  const todayDate = today.getDate();

  for (let i = 0; i < leading; i++) {
    grid.appendChild(el('div', { className: 'cal-cell cal-cell--empty' }));
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const games = gamesByDay[day] || [];
    const isPast = isViewingCurrentMonth && day < todayDate;
    const isToday = isViewingCurrentMonth && day === todayDate;
    grid.appendChild(buildDayCell(day, games, { isPast, isToday, month, year }));
  }
}

function getMonthLayout(month, year) {
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay(); // 0 = Sunday
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { leading: firstWeekday, daysInMonth };
}

/* ── Build a single day cell ── */
function buildDayCell(day, games, { isPast, isToday, month, year } = {}) {
  const hasGames = games.length > 0;

  const cell = el('div', {
    className: [
      'cal-cell',
      hasGames ? 'cal-cell--has-game' : 'cal-cell--empty-day',
      isPast ? 'cal-cell--past' : '',
      isToday ? 'cal-cell--today' : '',
    ].filter(Boolean).join(' '),
    role: 'listitem',
  });

  const badgeRow = el('div', { className: 'cal-cell__badges' });
  const dayBadge = el('span', { className: 'cal-cell__day', textContent: String(day) });
  badgeRow.appendChild(dayBadge);
  cell.appendChild(badgeRow);

  if (!hasGames) {
    cell.appendChild(el('span', { className: 'cal-cell__empty-label', textContent: 'No games' }));
    return cell;
  }

  const primary = games[0];
  const trigger = el('button', {
    type: 'button',
    className: 'cal-cell__link',
    'aria-label': `${games.length > 1 ? games.length + ' games release' : primary.name + ' releases'} on ${MONTH_NAMES[month - 1]} ${day}`,
    title: games.length > 1 ? `${games.length} releases` : primary.name,
  });

  if (games.length === 1) {
    // Single release — full-bleed cover with the name on a bottom overlay
    const coverSrc = primary.cover || '';
    if (coverSrc) {
      const img = el('img', { className: 'cal-cell__cover', alt: '', loading: 'lazy', decoding: 'async' });
      img.setAttribute('src', coverSrc);
      img.addEventListener('error', () => img.replaceWith(buildCalCoverFallback()));
      trigger.appendChild(img);
    } else {
      trigger.appendChild(buildCalCoverFallback());
    }

    const overlay = el('div', { className: 'cal-cell__overlay' });
    overlay.appendChild(el('div', { className: 'cal-cell__name', textContent: primary.name || 'Unknown Game' }));
    trigger.appendChild(overlay);
  } else {
    // Multiple releases — one full, undistorted hero cover with the
    // others fanned in behind (just a sliver, not meant to be legible on
    // their own) so it reads as "a stack of games" at a glance. A small
    // corner badge gives the exact count, and the actual titles only
    // appear on hover (or immediately in the tap-to-open day modal).
    const stack = el('div', { className: 'cal-cell__stack' });

    const heroWrap = el('div', { className: 'cal-cell__hero-wrap' });
    const heroSrc = primary.cover || '';
    if (heroSrc) {
      const img = el('img', { className: 'cal-cell__cover', alt: '', loading: 'lazy', decoding: 'async' });
      img.setAttribute('src', heroSrc);
      img.addEventListener('error', () => img.replaceWith(buildCalCoverFallback()));
      heroWrap.appendChild(img);
    } else {
      heroWrap.appendChild(buildCalCoverFallback());
    }

    // Same title-strip treatment as a single-release day, just for the hero
    const heroOverlay = el('div', { className: 'cal-cell__overlay' });
    heroOverlay.appendChild(el('div', { className: 'cal-cell__name', textContent: primary.name || 'Unknown Game' }));
    heroWrap.appendChild(heroOverlay);

    stack.appendChild(heroWrap);

    const fanRail = el('div', { className: 'cal-cell__fan-rail' });
    games.slice(1, 3).forEach((game) => {
      const fan = el('div', { className: 'cal-cell__fan' });
      const fanSrc = game.cover || '';
      if (fanSrc) {
        const img = el('img', { alt: '', loading: 'lazy', decoding: 'async' });
        img.setAttribute('src', fanSrc);
        img.addEventListener('error', () => img.replaceWith(buildCalCoverFallback()));
        fan.appendChild(img);
      } else {
        fan.appendChild(buildCalCoverFallback());
      }
      fanRail.appendChild(fan);
    });
    stack.appendChild(fanRail);

    trigger.appendChild(stack);
    // Own corner, own positioning context — no longer shares a row (or a
    // width budget) with the date pill, so the two can never collide.
    const badge = el('span', { className: 'cal-cell__badge cal-cell__badge--count' });
    badge.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>';
    badge.appendChild(document.createTextNode(`+${games.length - 1}`));
    trigger.appendChild(badge);

    // Hover reveal: a mini thumbnail + name per game, so the badge turns
    // into an actual preview instead of just a flag that something exists
    const namesPanel = el('div', { className: 'cal-cell__hover-names' });
    games.slice(0, 3).forEach((g) => {
      const row = el('div', { className: 'cal-cell__hover-row' });
      const thumbSrc = g.cover || '';
      if (thumbSrc) {
        const thumb = el('img', { className: 'cal-cell__hover-thumb', alt: '', loading: 'lazy' });
        thumb.setAttribute('src', thumbSrc);
        thumb.addEventListener('error', () => thumb.replaceWith(buildCalCoverFallback()));
        row.appendChild(thumb);
      } else {
        row.appendChild(buildCalCoverFallback());
      }
      row.appendChild(el('span', { textContent: g.name || 'Unknown Game' }));
      namesPanel.appendChild(row);
    });
    if (games.length > 3) {
      namesPanel.appendChild(el('span', { className: 'cal-cell__hover-more', textContent: `+${games.length - 3} more` }));
    }
    trigger.appendChild(namesPanel);
  }

  trigger.addEventListener('click', () => openDayModal(day, month, year, games));

  cell.appendChild(trigger);
  return cell;
}

function buildCalCoverFallback() {
  const wrap = el('div', { className: 'cal-cell__cover-fallback' });
  wrap.innerHTML = `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.35"><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><circle cx="15.5" cy="11.5" r="0.5" fill="currentColor"/><circle cx="17.5" cy="13.5" r="0.5" fill="currentColor"/><path d="M21 6H3a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2z"/></svg>`;
  return wrap;
}

function buildGameHref(rawgId, slug) {
  const params = new URLSearchParams();
  if (slug) params.set('name', String(slug));
  else if (rawgId != null) params.set('name', String(rawgId));
  return `game.html?${params}`;
}

function formatFullDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

/* Maps RAWG's broad "parent platform" names (PC, PlayStation, Xbox, Nintendo...)
   down to the small icon set already defined in shared.js, deduped, capped at 4. */
function getPlatformIconKeys(platforms) {
  if (!platforms || !platforms.length) return [];
  const keys = [];
  platforms.forEach((name) => {
    const lower = (name || '').toLowerCase();
    let key = null;
    if (lower.includes('playstation')) key = 'playstation';
    else if (lower.includes('xbox')) key = 'xbox';
    else if (lower.includes('nintendo')) key = 'nintendo';
    else if (lower.includes('pc') || lower.includes('mac') || lower.includes('linux')) key = 'steam';

    if (key && !keys.includes(key)) keys.push(key);
  });
  return keys.slice(0, 4);
}

/* ============================================================
   DAY-DETAIL MODAL
   Shows every game releasing on a given day with covers,
   dates, and a hover-animated card.
   ============================================================ */
(function () {
  let scrim = null;
  let modal = null;
  let lastFocused = null;

  function build() {
    scrim = el('div', { className: 'day-modal-scrim' });
    scrim.addEventListener('click', close);

    modal = el('div', { className: 'day-modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Releases for this day' });

    const header = el('div', { className: 'day-modal__header' });
    const titleWrap = el('div', { className: 'day-modal__title-wrap' });
    titleWrap.appendChild(el('h3', { className: 'day-modal__title', id: 'day-modal-title' }));
    titleWrap.appendChild(el('span', { className: 'day-modal__count', id: 'day-modal-count' }));
    header.appendChild(titleWrap);

    const closeBtn = el('button', { type: 'button', className: 'day-modal__close', 'aria-label': 'Close' });
    closeBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    closeBtn.addEventListener('click', close);
    header.appendChild(closeBtn);

    modal.appendChild(header);

    const grid = el('div', { className: 'day-modal__grid', id: 'day-modal-grid', role: 'list' });
    modal.appendChild(grid);

    document.body.appendChild(scrim);
    document.body.appendChild(modal);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('open')) close();
    });
  }

  function buildDayCardBookmarkButton(game) {
    const rawgId = game.rawgId;
    const btn = el('button', {
      type: 'button',
      className: 'bookmark-btn day-card__bookmark-btn',
      'aria-label': 'Bookmark this game',
    });

    const iconOutline = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>';
    const iconFilled = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>';

    function refresh() {
      const bookmarked = !!(window.Bookmarks && window.Bookmarks.isBookmarked(rawgId));
      btn.innerHTML = bookmarked ? iconFilled : iconOutline;
      btn.classList.toggle('bookmarked', bookmarked);
      btn.setAttribute('aria-label', bookmarked ? 'Remove bookmark' : 'Bookmark this game');
    }
    refresh();

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!window.Bookmarks) return;
      window.Bookmarks.toggle({
        rawgId,
        name: game.name || '',
        slug: game.slug || '',
        cover: game.cover || '',
      });
      refresh();
      btn.classList.remove('pulse');
      void btn.offsetWidth;
      btn.classList.add('pulse');
      btn.addEventListener('animationend', () => btn.classList.remove('pulse'), { once: true });
    });

    window.addEventListener('bookmarks:change', refresh);

    return btn;
  }

  function buildDayCard(game) {
    const card = el('a', {
      className: 'day-card',
      href: buildGameHref(game.rawgId, game.slug),
      'aria-label': `${game.name || 'Game'} — ${formatFullDate(game.released)}`,
      role: 'listitem',
    });

    const coverWrap = el('div', { className: 'day-card__cover-wrap' });
    const coverSrc = game.cover || '';
    if (coverSrc) {
      const img = el('img', { className: 'day-card__cover', alt: '', loading: 'lazy', decoding: 'async' });
      img.setAttribute('src', coverSrc);
      img.addEventListener('error', () => img.replaceWith(buildCalCoverFallback()));
      coverWrap.appendChild(img);
    } else {
      coverWrap.appendChild(buildCalCoverFallback());
    }
    coverWrap.appendChild(el('span', { className: 'day-card__sheen' }));
    coverWrap.appendChild(buildDayCardBookmarkButton(game));
    card.appendChild(coverWrap);

    const info = el('div', { className: 'day-card__info' });
    info.appendChild(el('div', { className: 'day-card__name', textContent: game.name || 'Unknown Game' }));
    info.appendChild(el('div', { className: 'day-card__date', textContent: formatFullDate(game.released) }));

    const iconKeys = getPlatformIconKeys(game.platforms);
    if (iconKeys.length) {
      const platformRow = el('div', { className: 'day-card__platforms' });
      iconKeys.forEach((key) => {
        const iconEl = el('span', { className: 'day-card__platform-icon', title: key, 'aria-hidden': 'true' });
        iconEl.innerHTML = (window.Icons && window.Icons[key]) || '';
        platformRow.appendChild(iconEl);
      });
      info.appendChild(platformRow);
    }

    card.appendChild(info);

    return card;
  }

  function open(day, month, year, games) {
    if (!modal) build();

    document.getElementById('day-modal-title').textContent = `${MONTH_NAMES[month - 1]} ${day}, ${year}`;
    document.getElementById('day-modal-count').textContent = `${games.length} release${games.length === 1 ? '' : 's'}`;

    const grid = document.getElementById('day-modal-grid');
    grid.innerHTML = '';
    games
      .slice()
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      .forEach((game) => grid.appendChild(buildDayCard(game)));

    lastFocused = document.activeElement;
    scrim.classList.add('open');
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    modal.querySelector('.day-modal__close')?.focus();
  }

  function close() {
    if (!modal) return;
    scrim.classList.remove('open');
    modal.classList.remove('open');
    document.body.style.overflow = '';
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
  }

  window.openDayModal = open;
  window.closeDayModal = close;
})();
