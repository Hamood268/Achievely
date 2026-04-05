/* ============================================================
   ACHIEVELY — profile.js
   Steam profile: connect, fetch, avatar, stats, game rows,
   rarest achievements, private profile state
   ============================================================ */

'use strict';

/* ── State ── */
let profileData  = null;
let gamesData    = [];

/* ── Init ── */
document.addEventListener('DOMContentLoaded', () => {
  renderNavbar('profile');
  renderFooter();
  initProfile();
});

/* ============================================================
   INIT — resolve steamId, start load or show connect
   ============================================================ */
function initProfile() {
  // URL param takes precedence
  const params  = new URLSearchParams(location.search);
  const urlId   = params.get('steamId');
  const localId = SteamID.get();
  const steamId = urlId || localId;

  if (!steamId) {
    showConnectView();
    return;
  }

  // If came from URL, persist it
  if (urlId && !localId) SteamID.set(urlId);

  showLoadingState();
  loadProfile(steamId);
}

/* ============================================================
   CONNECT VIEW (no Steam ID)
   ============================================================ */
function showConnectView() {
  const connectView = document.getElementById('connect-view');
  const profileView = document.getElementById('profile-view');
  if (connectView) connectView.style.display = 'flex';
  if (profileView) profileView.classList.remove('active');

  const input     = document.getElementById('connect-input');
  const submitBtn = document.getElementById('connect-submit');

  if (!submitBtn || !input) return;

  const doConnect = () => {
    const val = input.value.trim();
    if (!SteamID.validate(val)) {
      Toast.error('Invalid Steam ID. Must be exactly 17 digits.');
      input.focus();
      return;
    }
    SteamID.set(val);
    connectView.style.display = 'none';
    showLoadingState();
    loadProfile(val);
  };

  submitBtn.addEventListener('click', doConnect);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') doConnect(); });
}

/* ============================================================
   LOADING STATE — skeleton hero + placeholder sections
   ============================================================ */
function showLoadingState() {
  const connectView = document.getElementById('connect-view');
  const profileView = document.getElementById('profile-view');
  if (connectView) connectView.style.display = 'none';
  if (profileView) profileView.classList.add('active');

  renderProfileHeroSkeleton();
  renderStatsSkeleton();
  renderScrollSkeleton('recent-track', 8);
  renderScrollSkeleton('perfect-track', 6);
  renderRarestSkeleton();
}

/* ============================================================
   LOAD DATA
   ============================================================ */
async function loadProfile(steamId) {
  try {
    // Fetch profile + games in parallel
    const [profile, games] = await Promise.all([
      apiFetch(`/users/${encodeURIComponent(steamId)}/profile`),
      apiFetch(`/users/${encodeURIComponent(steamId)}/games`).catch(() => []),
    ]);

    // Unwrap envelope: { profile: {...} }
    const profileObj = profile.profile || profile;
    if (!profileObj) throw new Error('Profile not found.');

    // Detect private profile
    if (profileObj.communityVisibilityState === 1 || profileObj.private === true || profileObj.isPrivate === true) {
      showPrivateProfile(steamId);
      return;
    }

    profileData = profileObj;
    // Games response: { count, profile: { games: [...] } }
    const gamesRaw = games.profile ? games.profile.games : (games.games || games);
    gamesData = normalizeGames(gamesRaw);

    renderProfileHero(profileData, gamesData);
    renderStatsRow(profileData, gamesData);
    renderRecentlyPlayed(gamesData);
    renderPerfectGames(gamesData);
    renderRarestAchievements(gamesData);

  } catch (err) {
    Toast.error(`Couldn't load profile. ${err.message}`);

    const profileView = document.getElementById('profile-view');
    if (profileView) {
      profileView.innerHTML = '';
      renderErrorState(profileView, err.message, () => {
        showLoadingState();
        const steamId = SteamID.get();
        if (steamId) loadProfile(steamId);
      });
    }
  }
}

function normalizeGames(raw) {
  const list = Array.isArray(raw) ? raw : (raw.games || raw.results || []);
  return list.map(g => {
    // API uses gameId as the Steam App ID
    const appId = g.gameId || g.appId || g.appid || g.steamAppId;
    const cover = appId
      ? `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`
      : (g.cover || g.background_image || '');
    // playtime fields arrive in MINUTES
    const playtimeMins     = g.playtime       || g.playtime_forever || 0;
    const playtime2wksMins = g.playtime_2weeks || 0;
    return {
      rawgId:       g.rawgId   || g.gameId || appId,
      appId,
      name:         g.name     || 'Unknown Game',
      slug:         g.slug     || slugify(g.name || ''),
      cover,
      playtime:     playtimeMins,            // keep raw minutes for display
      playtimeHrs:  Math.round(playtimeMins / 60),
      playtime2wks: playtime2wksMins,
      lastPlayed:   g.lastPlayed || g.rtime_last_played || 0,
      completion:   g.completion || g.userCompletion || 0,
      achieved:     g.achieved   || 0,
      total:        g.total      || 0,
      rarestAchievement: g.rarestAchievement || null,
    };
  });
}

function slugify(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

/* Convert a Unix timestamp (seconds) to a readable date string */
function fmtTimestamp(ts) {
  if (!ts) return null;
  const ms = ts > 1e10 ? ts : ts * 1000; // handle seconds vs ms
  return new Date(ms).toLocaleDateString('en-US', {
    year:  'numeric',
    month: 'long',
    day:   'numeric',
  });
}

/* ============================================================
   PRIVATE PROFILE STATE
   ============================================================ */
function showPrivateProfile(steamId) {
  const profileView = document.getElementById('profile-view');
  const connectView = document.getElementById('connect-view');
  if (connectView) connectView.style.display = 'none';
  if (profileView) {
    profileView.classList.add('active');
    profileView.innerHTML = '';
  }

  const view = document.createElement('div');
  view.className = 'private-view';

  const card = document.createElement('div');
  card.className = 'private-card';

  // Icon
  const iconWrap = document.createElement('div');
  iconWrap.className = 'private-card__icon';
  iconWrap.innerHTML = `<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;

  const title = document.createElement('h2');
  title.className = 'private-card__title';
  title.textContent = 'Profile Is Private';

  const desc = document.createElement('p');
  desc.className = 'private-card__desc';
  desc.textContent = 'This Steam profile is private or inaccessible. The player must set their profile and game details to public in their Steam privacy settings.';

  // Share URL row
  const shareRow = document.createElement('div');
  shareRow.className = 'private-share';

  const urlBox = document.createElement('div');
  urlBox.className = 'private-share__url';
  const shareUrl = `${location.origin}${location.pathname}?steamId=${encodeURIComponent(steamId)}`;
  urlBox.textContent = shareUrl;

  const copyBtn = document.createElement('button');
  copyBtn.className = 'btn btn--sm';
  copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
  copyBtn.appendChild(document.createTextNode('Copy'));
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      copyBtn.childNodes[1].textContent = 'Copied!';
      setTimeout(() => { copyBtn.childNodes[1].textContent = 'Copy'; }, 2000);
    }).catch(() => Toast.error('Could not copy to clipboard.'));
  });

  shareRow.appendChild(urlBox);
  shareRow.appendChild(copyBtn);

  // Try different ID button
  const tryBtn = document.createElement('button');
  tryBtn.className = 'btn btn--sm btn--ghost';
  tryBtn.textContent = 'Try a different Steam ID';
  tryBtn.addEventListener('click', () => {
    SteamID.clear();
    location.href = 'profile.html';
  });

  card.appendChild(iconWrap);
  card.appendChild(title);
  card.appendChild(desc);
  card.appendChild(shareRow);
  card.appendChild(tryBtn);
  view.appendChild(card);
  profileView.appendChild(view);
}

/* ============================================================
   HERO
   ============================================================ */
function renderProfileHeroSkeleton() {
  const wrap = document.getElementById('profile-hero-wrap');
  if (!wrap) return;
  wrap.innerHTML = '';

  const sk = document.createElement('div');
  sk.className = 'profile-hero-skeleton';

  const avatar = document.createElement('div');
  avatar.className = 'skeleton skeleton-avatar';

  const info = document.createElement('div');
  info.className = 'skeleton-info';
  info.appendChild(makeSkeleton('220px', '40px'));
  info.appendChild(makeSkeleton('160px', '20px'));
  info.appendChild(makeSkeleton('120px', '16px'));

  const ring = document.createElement('div');
  ring.className = 'skeleton';
  ring.style.cssText = 'width:120px;height:120px;border-radius:50%;flex-shrink:0;';

  sk.appendChild(avatar);
  sk.appendChild(info);
  sk.appendChild(ring);
  wrap.appendChild(sk);
}

function renderProfileHero(profile, games) {
  const wrap = document.getElementById('profile-hero-wrap');
  if (!wrap) return;
  wrap.innerHTML = '';

  const hero = document.createElement('div');
  hero.className = 'profile-hero';

  const inner = document.createElement('div');
  inner.className = 'profile-hero__inner';

  // ── Avatar ──
  const avatarWrap = document.createElement('div');
  avatarWrap.className = 'profile-avatar-wrap';

  const avatarSrc = (profile.avatar && profile.avatar.full) || profile.avatarfull || '';
  if (avatarSrc) {
    const img = document.createElement('img');
    img.className = 'profile-avatar';
    img.alt       = profile.username || profile.personaname || 'Steam avatar';
    img.setAttribute('src', avatarSrc);
    img.addEventListener('error', () => img.replaceWith(buildAvatarFallback()));
    avatarWrap.appendChild(img);
  } else {
    avatarWrap.appendChild(buildAvatarFallback());
  }

  // Online dot — status comes as string "Online"/"Offline"/"Away"
  const dot = document.createElement('div');
  const statusStr = (profile.status || '').toLowerCase();
  const dotClass  = statusStr === 'online' ? 'online' : statusStr === 'away' ? 'away' : 'offline';
  dot.className = 'profile-status-dot profile-status-dot--' + dotClass;
  dot.setAttribute('aria-label', profile.status || 'Offline');
  avatarWrap.appendChild(dot);

  // ── Info ──
  const info = document.createElement('div');
  info.className = 'profile-info';

  const name = document.createElement('h1');
  name.className = 'profile-name';
  name.textContent = profile.username || profile.personaname || profile.displayName || 'Steam User';

  const badges = document.createElement('div');
  badges.className = 'profile-badges';

  // Steam level
  if (profile.steamLevel != null || profile.level != null) {
    const lvl = document.createElement('div');
    lvl.className = 'steam-level-badge';
    lvl.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
    lvl.appendChild(document.createTextNode(`Lvl ${profile.steamLevel ?? profile.level}`));
    badges.appendChild(lvl);
  }

  // Country
  if (profile.loccountrycode || profile.country) {
    const country = document.createElement('div');
    country.className = 'profile-country';
    country.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`;
    country.appendChild(document.createTextNode(profile.loccountrycode || profile.country));
    badges.appendChild(country);
  }

  // Member since (created_at Unix timestamp)
  const memberDate = fmtTimestamp(profile.created_at);
  if (memberDate) {
    const member = document.createElement('div');
    member.className = 'profile-country';
    member.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;
    member.appendChild(document.createTextNode('Member since ' + memberDate));
    badges.appendChild(member);
  }

  // Last seen (Logged_out Unix timestamp)
  const lastSeen = fmtTimestamp(profile.Logged_out || profile.lastlogoff);
  if (lastSeen && (profile.status || '').toLowerCase() !== 'online') {
    const seen = document.createElement('div');
    seen.className = 'profile-country';
    seen.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
    seen.appendChild(document.createTextNode('Last seen ' + lastSeen));
    badges.appendChild(seen);
  }

  // Actions
  const actions = document.createElement('div');
  actions.className = 'profile-actions';

  // Share profile button
  const shareBtn = document.createElement('button');
  shareBtn.className = 'btn btn--sm';
  shareBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>`;
  shareBtn.appendChild(document.createTextNode('Share Profile'));
  shareBtn.addEventListener('click', () => shareProfile(SteamID.get()));

  // Steam profile link
  if (profile.profileUrl || profile.profileurl) {
    const steamLink = document.createElement('a');
    steamLink.href   = profile.profileUrl || profile.profileurl;
    steamLink.target = '_blank';
    steamLink.rel    = 'noopener noreferrer';
    steamLink.className = 'btn btn--sm btn--ghost';
    steamLink.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V9c0-2.485 2.01-4.5 4.5-4.5 2.485 0 4.5 2.015 4.5 4.5s-2.015 4.5-4.5 4.5h-.105l-4.083 2.919c0 .052.004.103.004.156 0 1.86-1.516 3.375-3.375 3.375-1.66 0-3.04-1.195-3.32-2.77l-4.6-1.901C3.647 20.245 7.514 24 11.979 24 18.626 24 24 18.627 24 12c0-6.626-5.374-12-12.021-12z"/></svg>`;
    steamLink.appendChild(document.createTextNode('Steam Profile'));
    actions.appendChild(steamLink);
  }

  // Disconnect
  const disconnectBtn = document.createElement('button');
  disconnectBtn.className = 'btn btn--sm btn--ghost';
  disconnectBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`;
  disconnectBtn.appendChild(document.createTextNode('Disconnect'));
  disconnectBtn.addEventListener('click', () => {
    SteamID.clear();
    location.href = 'profile.html';
  });

  actions.appendChild(shareBtn);
  actions.appendChild(disconnectBtn);

  info.appendChild(name);
  info.appendChild(badges);
  info.appendChild(actions);

  // ── Completion ring ──
  const ringWrap = buildCompletionRing(games);

  inner.appendChild(avatarWrap);
  inner.appendChild(info);
  inner.appendChild(ringWrap);
  hero.appendChild(inner);
  wrap.appendChild(hero);
}

function buildAvatarFallback() {
  const d = document.createElement('div');
  d.className = 'profile-avatar-fallback';
  d.innerHTML = `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.3"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
  return d;
}

/* ── SVG Completion Ring ── */
function buildCompletionRing(games) {
  const wrap = document.createElement('div');
  wrap.className = 'profile-ring-wrap';

  const totalAch    = games.reduce((s, g) => s + (g.total || 0), 0);
  const doneAch     = games.reduce((s, g) => s + (g.achieved || 0), 0);
  const overallPct  = totalAch > 0 ? Math.round((doneAch / totalAch) * 100) : 0;
  const circumf     = 314; // 2π×50
  const dashOffset  = circumf - (circumf * overallPct) / 100;

  const ringDiv = document.createElement('div');
  ringDiv.className = 'completion-ring';

  const svgNS = 'http://www.w3.org/2000/svg';
  const svg   = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '0 0 120 120');
  svg.setAttribute('width',   '120');
  svg.setAttribute('height',  '120');
  svg.setAttribute('aria-label', `Overall completion: ${overallPct}%`);
  svg.setAttribute('role', 'img');

  // Gradient def
  const defs  = document.createElementNS(svgNS, 'defs');
  const grad  = document.createElementNS(svgNS, 'linearGradient');
  grad.setAttribute('id', 'ringGradient');
  grad.setAttribute('x1', '0%'); grad.setAttribute('y1', '0%');
  grad.setAttribute('x2', '100%'); grad.setAttribute('y2', '100%');
  const s1 = document.createElementNS(svgNS, 'stop');
  s1.setAttribute('offset', '0%'); s1.setAttribute('stop-color', '#00d4ff');
  const s2 = document.createElementNS(svgNS, 'stop');
  s2.setAttribute('offset', '100%'); s2.setAttribute('stop-color', '#00b8d9');
  grad.appendChild(s1); grad.appendChild(s2);
  defs.appendChild(grad);
  svg.appendChild(defs);

  // Track circle
  const track = document.createElementNS(svgNS, 'circle');
  track.setAttribute('class', 'completion-ring__track');
  track.setAttribute('cx', '60'); track.setAttribute('cy', '60'); track.setAttribute('r', '50');

  // Fill circle
  const fill = document.createElementNS(svgNS, 'circle');
  fill.setAttribute('class', 'completion-ring__fill');
  fill.setAttribute('cx', '60'); fill.setAttribute('cy', '60'); fill.setAttribute('r', '50');
  fill.setAttribute('stroke-dasharray', String(circumf));
  fill.setAttribute('stroke-dashoffset', String(circumf)); // start hidden, animate in
  fill.style.strokeDashoffset = String(circumf);

  svg.appendChild(track);
  svg.appendChild(fill);

  // Center text
  const textWrap = document.createElement('div');
  textWrap.className = 'completion-ring__text';

  const pctEl = document.createElement('div');
  pctEl.className = 'ring-pct';
  pctEl.textContent = '0%';

  const labelEl = document.createElement('div');
  labelEl.className = 'ring-label';
  labelEl.textContent = 'Complete';

  textWrap.appendChild(pctEl);
  textWrap.appendChild(labelEl);

  ringDiv.appendChild(svg);
  ringDiv.appendChild(textWrap);

  // Sub text
  const sub = document.createElement('div');
  sub.className = 'ring-sub';
  sub.textContent = `${doneAch.toLocaleString()} / ${totalAch.toLocaleString()} unlocked`;

  wrap.appendChild(ringDiv);
  wrap.appendChild(sub);

  // Animate ring after render
  requestAnimationFrame(() => {
    setTimeout(() => {
      fill.style.strokeDashoffset = String(dashOffset);
      // Count up percent
      let start = 0;
      const end  = overallPct;
      const dur  = 1200;
      const t0   = performance.now();
      function tick(now) {
        const p   = Math.min((now - t0) / dur, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        pctEl.textContent = Math.round(ease * end) + '%';
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }, 200);
  });

  return wrap;
}

/* ============================================================
   STATS ROW
   ============================================================ */
function renderStatsSkeleton() {
  const wrap = document.getElementById('stats-wrap');
  if (!wrap) return;
  wrap.innerHTML = '';
  const row = document.createElement('div');
  row.className = 'stats-row';
  for (let i = 0; i < 3; i++) {
    const card = document.createElement('div');
    card.className = 'stat-card';
    card.style.minHeight = '100px';
    card.appendChild(makeSkeleton('80px', '12px'));
    card.style.gap = '12px';
    card.style.paddingTop = '20px';
    const big = makeSkeleton('100px', '40px');
    card.appendChild(big);
    row.appendChild(card);
  }
  wrap.appendChild(row);
}

function renderStatsRow(profile, games) {
  const wrap = document.getElementById('stats-wrap');
  if (!wrap) return;
  wrap.innerHTML = '';

  const totalGames  = games.length;
  const avgCompl    = games.length
    ? Math.round(games.reduce((s, g) => s + (g.completion || 0), 0) / games.length)
    : 0;

  // Rarest achievement across all games
  let rarest = null;
  games.forEach(g => {
    if (g.rarestAchievement) {
      if (!rarest || g.rarestAchievement.completionPercentage < rarest.completionPercentage) {
        rarest = { ...g.rarestAchievement, gameName: g.name };
      }
    }
  });

  const row = document.createElement('div');
  row.className = 'stats-row';

  row.appendChild(buildStatCard(
    'Total Games',
    totalGames.toLocaleString(),
    '',
    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><circle cx="15.5" cy="11.5" r="0.5" fill="currentColor"/><circle cx="17.5" cy="13.5" r="0.5" fill="currentColor"/><path d="M21 6H3a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2z"/></svg>`,
    ''
  ));

  row.appendChild(buildStatCard(
    'Avg Completion',
    avgCompl + '%',
    'across all owned games',
    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
    'stat-card__value--cyan'
  ));

  const rarestSub = rarest
    ? `${rarest.completionPercentage?.toFixed(1) || '?'}% global · ${rarest.gameName || ''}`
    : 'Play more games!';

  row.appendChild(buildStatCard(
    'Rarest Achievement',
    rarest ? (rarest.name || '?') : '—',
    rarestSub,
    `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
    'stat-card__value--gold',
    true // small value text
  ));

  wrap.appendChild(row);
}

function buildStatCard(label, value, sub, iconSvg, valueClass = '', small = false) {
  const card = document.createElement('div');
  card.className = 'stat-card';

  const lbl = document.createElement('div');
  lbl.className = 'stat-card__label';
  if (iconSvg) {
    const iw = document.createElement('span');
    iw.setAttribute('aria-hidden', 'true');
    iw.innerHTML = iconSvg;
    lbl.appendChild(iw);
  }
  lbl.appendChild(document.createTextNode(label));

  const val = document.createElement('div');
  val.className = 'stat-card__value ' + valueClass;
  if (small) {
    val.style.fontSize = 'clamp(14px, 2vw, 20px)';
    val.style.lineHeight = '1.3';
    val.style.letterSpacing = '0';
    val.style.fontFamily = 'var(--font-body)';
    val.style.fontWeight = '700';
    val.style.whiteSpace = 'nowrap';
    val.style.overflow = 'hidden';
    val.style.textOverflow = 'ellipsis';
  }
  val.textContent = value;

  card.appendChild(lbl);
  card.appendChild(val);

  if (sub) {
    const s = document.createElement('div');
    s.className = 'stat-card__sub';
    s.textContent = sub;
    card.appendChild(s);
  }

  return card;
}

/* ============================================================
   RECENTLY PLAYED
   ============================================================ */
function renderScrollSkeleton(trackId, count) {
  const track = document.getElementById(trackId);
  if (!track) return;
  track.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const sk = document.createElement('div');
    sk.className = 'profile-game-card-skeleton';
    const cover = document.createElement('div');
    cover.className = 'profile-game-card-skeleton__cover';
    const bar = document.createElement('div');
    bar.className = 'skeleton profile-game-card-skeleton__bar';
    sk.appendChild(cover);
    sk.appendChild(bar);
    track.appendChild(sk);
  }
}

function renderRecentlyPlayed(games) {
  const track   = document.getElementById('recent-track');
  const countEl = document.getElementById('recent-count');
  if (!track) return;

  // Sort by last played, take top 20
  const sorted = [...games]
    .filter(g => g.playtime > 0 || g.playtime2wks > 0 || g.lastPlayed > 0)
    .sort((a, b) => (b.playtime2wks || 0) - (a.playtime2wks || 0) || (b.playtime || 0) - (a.playtime || 0))
    .slice(0, 20);

  if (countEl) countEl.textContent = sorted.length;

  track.innerHTML = '';

  if (!sorted.length) {
    renderTrackEmpty(track, 'No recent games', 'Start playing something!');
    return;
  }

  sorted.forEach(game => {
    const card = buildProfileGameCard(game, false);
    track.appendChild(card);
  });
}

/* ============================================================
   100% COMPLETED GAMES
   ============================================================ */
function renderPerfectGames(games) {
  const track   = document.getElementById('perfect-track');
  const countEl = document.getElementById('perfect-count');
  if (!track) return;

  const perfect = games.filter(g => g.completion >= 100 || (g.total > 0 && g.achieved >= g.total));

  if (countEl) countEl.textContent = perfect.length;

  track.innerHTML = '';

  if (!perfect.length) {
    renderTrackEmpty(track, 'No perfect games yet', '100% completions appear here.');
    return;
  }

  perfect.forEach(game => {
    const card = buildProfileGameCard(game, true);
    track.appendChild(card);
  });
}

/* ── Profile game card builder ── */
/* Inline empty state for scroll tracks — doesn't break display:flex */
function renderTrackEmpty(track, title, message) {
  track.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'profile-track-empty';

  const icon = document.createElement('div');
  icon.className = 'profile-track-empty__icon';
  icon.innerHTML = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><circle cx="15.5" cy="11.5" r="0.5" fill="currentColor"/><circle cx="17.5" cy="13.5" r="0.5" fill="currentColor"/><path d="M21 6H3a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2z"/></svg>`;

  const t = document.createElement('div');
  t.className = 'profile-track-empty__title';
  t.textContent = title;

  const m = document.createElement('div');
  m.className = 'profile-track-empty__msg';
  m.textContent = message;

  wrap.appendChild(icon);
  wrap.appendChild(t);
  wrap.appendChild(m);
  track.appendChild(wrap);
}

function buildProfileGameCard(game, isPerfect) {
  const href = buildGameHref(game.rawgId, game.slug);

  const card = document.createElement('a');
  card.href      = href;
  card.className = 'profile-game-card';
  card.setAttribute('aria-label', game.name);
  card.setAttribute('title', game.name);

  // Persist screenshots so game.html can display them (detail endpoint
  // does not return screenshots).
  card.addEventListener('click', () => {
    const rawgId = game.rawgId;
    const shots  = game.screenshots || game.short_screenshots || [];
    if (rawgId != null && shots.length) {
      try {
        sessionStorage.setItem(
          `game_screenshots_${rawgId}`,
          JSON.stringify(shots)
        );
      } catch (_) { /* storage unavailable — fail silently */ }
    }
  });

  // Cover wrap
  const coverWrap = document.createElement('div');
  coverWrap.className = 'profile-game-card__cover-wrap' + (isPerfect ? ' profile-game-card__cover-wrap--gold' : '');

  const coverSrc = game.cover || '';
  if (coverSrc) {
    const img = document.createElement('img');
    img.className = 'profile-game-card__img';
    img.alt       = '';
    img.loading   = 'lazy';
    img.setAttribute('src', coverSrc);
    img.addEventListener('error', () => img.style.opacity = '0');
    coverWrap.appendChild(img);
  }

  // Overlay (name on hover)
  const overlay = document.createElement('div');
  overlay.className = 'profile-game-card__overlay';
  overlay.setAttribute('aria-hidden', 'true');
  const nameEl = document.createElement('div');
  nameEl.className = 'profile-game-card__name';
  nameEl.textContent = game.name;
  overlay.appendChild(nameEl);
  coverWrap.appendChild(overlay);

  // Badge
  if (isPerfect) {
    const badge = document.createElement('div');
    badge.className = 'profile-game-card__badge profile-game-card__badge--gold';
    badge.textContent = '100%';
    coverWrap.appendChild(badge);
  } else if (game.completion > 0) {
    const badge = document.createElement('div');
    badge.className = 'profile-game-card__badge';
    badge.style.cssText = 'background:rgba(13,30,53,0.75);border:1px solid rgba(0,212,255,0.3);color:var(--cyan);font-family:var(--font-mono);';
    badge.textContent = Math.round(game.completion) + '%';
    coverWrap.appendChild(badge);
  }

  card.appendChild(coverWrap);

  // Progress bar below
  if (!isPerfect) {
    const progress = document.createElement('div');
    progress.className = 'profile-game-card__progress';

    const row = document.createElement('div');
    row.className = 'profile-game-card__progress-row';

    const lbl = document.createElement('div');
    lbl.className = 'profile-game-card__progress-label';
    lbl.textContent = game.name;

    const pct = document.createElement('div');
    pct.className = 'profile-game-card__progress-pct';
    pct.textContent = Math.round(game.completion || 0) + '%';

    row.appendChild(lbl);
    row.appendChild(pct);
    progress.appendChild(row);

    const bar = document.createElement('div');
    bar.className = 'progress-bar';
    const fill = document.createElement('div');
    fill.className = 'progress-bar__fill';
    fill.style.width = Math.round(game.completion || 0) + '%';
    bar.appendChild(fill);
    progress.appendChild(bar);

    card.appendChild(progress);
  }

  return card;
}

function buildGameHref(rawgId, slug) {
  const params = new URLSearchParams();
  // Prefer slug for human-friendly URLs; fall back to id only if no slug
  if (slug)           params.set('name', String(slug));
  else if (rawgId != null) params.set('name', String(rawgId));
  return `game.html?${params}`;
}

/* ============================================================
   RAREST ACHIEVEMENTS
   ============================================================ */
function renderRarestSkeleton() {
  const grid = document.getElementById('rarest-grid');
  if (!grid) return;
  grid.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const s = document.createElement('div');
    s.className = 'rarest-card-skeleton';
    grid.appendChild(s);
  }
}

function renderRarestAchievements(games) {
  const grid    = document.getElementById('rarest-grid');
  const section = document.getElementById('rarest-section');
  if (!grid) return;

  // Collect all rarest achievements across games
  const candidates = [];
  games.forEach(g => {
    if (g.rarestAchievement) {
      candidates.push({
        ...g.rarestAchievement,
        gameName:  g.name,
        rawgId:    g.rawgId,
        gameSlug:  g.slug,
      });
    }
  });

  // Sort by completionPercentage ascending (rarest first), take top 3
  const top3 = candidates
    .sort((a, b) => (a.completionPercentage || 100) - (b.completionPercentage || 100))
    .slice(0, 3);

  grid.innerHTML = '';

  if (!top3.length) {
    if (section) section.style.display = 'none';
    return;
  }

  if (section) section.style.display = '';

  top3.forEach(ach => {
    const card = buildRarestCard(ach);
    grid.appendChild(card);
  });
}

function buildRarestCard(ach) {
  const card = document.createElement('div');
  card.className = 'rarest-card';

  // Icon
  const iconSrc = ach.icon || ach.iconIncomplete || '';
  if (iconSrc) {
    const img = document.createElement('img');
    img.className = 'rarest-card__icon';
    img.alt       = '';
    img.loading   = 'lazy';
    img.setAttribute('src', iconSrc);
    img.addEventListener('error', () => img.replaceWith(buildRarestIconPlaceholder()));
    card.appendChild(img);
  } else {
    card.appendChild(buildRarestIconPlaceholder());
  }

  // Body
  const body = document.createElement('div');
  body.className = 'rarest-card__body';

  const name = document.createElement('div');
  name.className = 'rarest-card__name';
  name.textContent = ach.name || 'Unknown Achievement';

  const game = document.createElement('div');
  game.className = 'rarest-card__game';
  game.textContent = ach.gameName || '';

  body.appendChild(name);
  body.appendChild(game);
  card.appendChild(body);

  // Pct
  const pct = document.createElement('div');
  pct.className = 'rarest-card__pct';
  pct.textContent = ach.completionPercentage != null
    ? parseFloat(ach.completionPercentage).toFixed(1) + '%'
    : '—';
  card.appendChild(pct);

  return card;
}

function buildRarestIconPlaceholder() {
  const d = document.createElement('div');
  d.className = 'rarest-card__icon-placeholder';
  d.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="8 21 12 17 16 21"/><path d="M5 3H19"/><path d="M5 3C5 3 5 10 12 10 19 10 19 3 19 3"/></svg>`;
  return d;
}

/* ============================================================
   SHARE PROFILE
   ============================================================ */
function shareProfile(steamId) {
  if (!steamId) return;
  const url = `${location.origin}${location.pathname}?steamId=${encodeURIComponent(steamId)}`;

  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(() => {
      showShareToast('Profile link copied!');
    }).catch(() => showShareToast(url));
  } else {
    showShareToast(url);
  }
}

function showShareToast(msg) {
  let toast = document.getElementById('share-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'share-toast';
    toast.className = 'share-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), 2500);
}
