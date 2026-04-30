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
  const urlId   = params.get('steamid') || params.get('steamId');
  const localId = SteamID.get();

  if (!urlId && !localId) {
    showConnectView();
    return;
  }

  // If a URL steamId is present but it's NOT the user's own saved ID,
  // treat it as a read-only lookup (don't auto-persist a shared link).
  if (urlId && urlId !== localId) {
    showLoadingState();
    loadProfileReadOnly(urlId);
    return;
  }

  // Own linked account (localId, or urlId === localId)
  const steamId = localId || urlId;
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

  /* ── Add a "Link my account" vs "Lookup" toggle UI ── */
  const card = connectView.querySelector('.connect-card');
  if (card && !card.querySelector('.connect-mode-tabs')) {
    // Mode tabs
    const tabs = document.createElement('div');
    tabs.className = 'connect-mode-tabs';
    tabs.setAttribute('role', 'group');
    tabs.setAttribute('aria-label', 'Profile mode');

    const linkTab   = document.createElement('button');
    linkTab.type    = 'button';
    linkTab.className = 'connect-mode-tab active';
    linkTab.dataset.mode = 'link';
    linkTab.textContent = 'Link My Account';

    const lookupTab   = document.createElement('button');
    lookupTab.type    = 'button';
    lookupTab.className = 'connect-mode-tab';
    lookupTab.dataset.mode = 'lookup';
    lookupTab.textContent = 'Lookup Any Profile';

    tabs.appendChild(linkTab);
    tabs.appendChild(lookupTab);

    // Insert before the form
    const form = card.querySelector('.connect-form');
    if (form) card.insertBefore(tabs, form);

    const desc     = card.querySelector('.connect-card__desc');
    const helper   = card.querySelector('.connect-helper');
    const titleEl  = card.querySelector('.connect-card__title');

    const COPY = {
      link: {
        title:  'Connect Steam',
        desc:   'Enter your Steam ID to track your achievement progress, see your library completion stats, and discover your rarest unlocks.',
        btn:    'Connect Steam Account',
        helper: true,
      },
      lookup: {
        title:  'Lookup Profile',
        desc:   'Enter any Steam ID to view that player\'s achievements and library — without linking it as your own account.',
        btn:    'View Profile',
        helper: false,
      },
    };

    let mode = 'link';
    const applyMode = (m) => {
      mode = m;
      [linkTab, lookupTab].forEach(t => t.classList.toggle('active', t.dataset.mode === m));
      if (titleEl) titleEl.textContent = COPY[m].title;
      if (desc)    desc.textContent    = COPY[m].desc;
      // Update button text
      const btnText = submitBtn.childNodes[submitBtn.childNodes.length - 1];
      if (btnText && btnText.nodeType === 3) btnText.textContent = ' ' + COPY[m].btn;
      if (helper)  helper.style.display = COPY[m].helper ? '' : 'none';
    };

    linkTab.addEventListener('click',   () => applyMode('link'));
    lookupTab.addEventListener('click', () => applyMode('lookup'));

    // Override submit logic to respect mode
    const originalHandler = submitBtn.onclick;

    const doAction = () => {
      const val = input.value.trim();
      if (!SteamID.validate(val)) {
        Toast.error('Invalid Steam ID. Must be exactly 17 digits.');
        input.focus();
        return;
      }
      if (mode === 'link') {
        SteamID.set(val);
        connectView.style.display = 'none';
        showLoadingState();
        loadProfile(val);
      } else {
        // Lookup only — don't persist
        connectView.style.display = 'none';
        showLoadingState();
        loadProfileReadOnly(val);
      }
    };

    submitBtn.replaceWith(submitBtn.cloneNode(true)); // remove old listeners
    const newBtn = card.querySelector('#connect-submit');
    if (newBtn) {
      newBtn.addEventListener('click', doAction);
      input.addEventListener('keydown', e => { if (e.key === 'Enter') doAction(); });
    }
    return;
  }

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

/* ── Read-only profile load (lookup mode — doesn't persist steamId) ── */
/* ============================================================
   SHARED DATA FETCH — used by both loadProfile and loadProfileReadOnly
   ============================================================ */
async function fetchProfileData(steamId) {
  const [profile, games, owned] = await Promise.all([
    apiFetch(`/users/${encodeURIComponent(steamId)}/profile`, {}, { timeout: 14000 }),
    apiFetch(`/users/${encodeURIComponent(steamId)}/games`, {}, { timeout: 14000 }).catch(() => []),
    apiFetch(`/users/${encodeURIComponent(steamId)}/games/owned`, {}, { timeout: 14000 }).catch(() => []),
  ]);

  const profileObj = profile.profile || profile;
  if (!profileObj) throw new Error('Profile not found.');

  if (profileObj.communityVisibilityState === 1 || profileObj.private === true || profileObj.isPrivate === true) {
    return { private: true };
  }

  const gamesRaw = games.profile ? games.profile.games : (games.games || games);
  const ownedRaw = owned.profile ? owned.profile.games : (owned.games || owned) || owned || [];
  return { profileObj, gamesRaw, ownedRaw, private: false };
}

async function loadProfileReadOnly(steamId) {
  try {
    // Update the URL so the page is shareable / bookmarkable
    const url = new URL(location.href);
    url.searchParams.set('steamid', steamId);
    history.replaceState(null, '', url.toString());

    const result = await fetchProfileData(steamId);
    if (result.private) { showPrivateProfile(steamId); return; }

    profileData = result.profileObj;
    gamesData   = normalizeGames(result.gamesRaw);
    const ownedData = normalizeGames(result.ownedRaw || []);

    renderProfileHero(profileData, gamesData, true /* readOnly */);
    renderStatsRow(profileData, gamesData, ownedData, true);
    renderRecentlyPlayed(gamesData);
    renderOwnedGames(ownedData);
    renderPerfectGames(gamesData);
    renderRarestAchievements(gamesData);
  } catch (err) {
    Toast.error(`Couldn't load profile. ${err.message}`);
    showConnectView();
  }
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
  renderScrollSkeleton('owned-track', 8);
  renderScrollSkeleton('perfect-track', 6);
  renderRarestSkeleton();
}

/* ============================================================
   LOAD DATA
   ============================================================ */
async function loadProfile(steamId) {
  try {
    const result = await fetchProfileData(steamId);
    if (result.private) { showPrivateProfile(steamId); return; }

    profileData = result.profileObj;

    // Save username/avatar for navbar display
    if (typeof window.SteamUser !== 'undefined') {
      if (result.profileObj.username) window.SteamUser.setUsername(result.profileObj.username);
      const avatarUrl = (result.profileObj.avatar && result.profileObj.avatar.full) || result.profileObj.avatarfull || '';
      if (avatarUrl) window.SteamUser.setAvatar(avatarUrl);
    }

    gamesData = normalizeGames(result.gamesRaw);
    const ownedData = normalizeGames(result.ownedRaw || []);

    renderProfileHero(profileData, gamesData);
    renderStatsRow(profileData, gamesData, ownedData, true);
    renderRecentlyPlayed(gamesData);
    renderOwnedGames(ownedData);
    renderPerfectGames(gamesData);
    renderRarestAchievements(gamesData);

  } catch (err) {
    Toast.error(`Couldn't load profile. ${err.message}`);

    const profileView = document.getElementById('profile-view');
    if (profileView) {
      profileView.innerHTML = '';
      renderErrorState(profileView, err.message, () => {
        showLoadingState();
        const id = SteamID.get();
        if (id) loadProfile(id);
      });
    }
  }
}

function normalizeGames(raw) {
  const list = Array.isArray(raw) ? raw : (raw.games || raw.results || []);
  return list.map(g => {
    // API uses gameId as the Steam App ID
    const appId = g.gameId || g.appId || g.appid || g.steamAppId;
    // Prefer API-provided cover (may be SteamGridDB, direct Steam URL, etc).
    // Only construct a Steam CDN URL as a last resort if the API gave nothing.
    const cover = g.cover || g.background_image
      || (appId ? `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${appId}/library_600x900.jpg` : '');
    // playtime fields arrive in MINUTES
    const playtimeMins     = g.playtime       || g.playtime_forever || 0;
    const playtime2wksMins = g.playtime_2weeks || 0;
    // achievements field: { completed, total, percentage }
    const ach = g.achievements || {};
    const achCompleted  = ach.completed  ?? g.achieved   ?? 0;
    const achTotal      = ach.total      ?? g.total      ?? 0;
    const achPercentage = ach.percentage ?? g.completion ?? g.userCompletion ?? 0;
    return {
      rawgId:       g.rawgId   || g.gameId || appId,
      appId,
      name:         g.name     || 'Unknown Game',
      slug:         g.slug     || slugify(g.name || ''),
      cover,
      playtime:     playtimeMins,
      playtimeHrs:  Math.round(playtimeMins / 60),
      playtime2wks: playtime2wksMins,
      lastPlayed:   g.lastPlayed || g.last_played || g.rtime_last_played || 0,
      completion:   achPercentage,
      achieved:     achCompleted,
      total:        achTotal,
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

function renderProfileHero(profile, games, readOnly = false) {
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

  actions.appendChild(shareBtn);

  if (readOnly) {
    // Lookup mode — offer to link this account as their own
    const linkBtn = document.createElement('button');
    linkBtn.className = 'btn btn--sm';
    linkBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V9c0-2.485 2.01-4.5 4.5-4.5 2.485 0 4.5 2.015 4.5 4.5s-2.015 4.5-4.5 4.5h-.105l-4.083 2.919c0 .052.004.103.004.156 0 1.86-1.516 3.375-3.375 3.375-1.66 0-3.04-1.195-3.32-2.77l-4.6-1.901C3.647 20.245 7.514 24 11.979 24 18.626 24 24 18.627 24 12c0-6.626-5.374-12-12.021-12z"/></svg>`;
    linkBtn.appendChild(document.createTextNode(' Link as My Account'));
    linkBtn.addEventListener('click', () => {
      const sid = profile.steamId || profile.steamid || profile.id || profile.steamID64;
      if (sid) {
        SteamID.set(String(sid));
        location.reload();
      } else {
        Toast.error('Could not determine Steam ID for this profile.');
      }
    });
    actions.appendChild(linkBtn);

    // If user has their own account linked, offer a "My Profile" return button
    const ownId = SteamID.get();
    if (ownId) {
      const myBtn = document.createElement('button');
      myBtn.className = 'btn btn--sm btn--ghost';
      myBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
      myBtn.appendChild(document.createTextNode(' My Profile'));
      myBtn.addEventListener('click', () => {
        showLoadingState();
        loadProfile(ownId);
      });
      actions.appendChild(myBtn);
    } else {
      const backBtn = document.createElement('button');
      backBtn.className = 'btn btn--sm btn--ghost';
      backBtn.textContent = '← Back';
      backBtn.addEventListener('click', () => { location.href = 'profile.html'; });
      actions.appendChild(backBtn);
    }

  } else {
    // Own linked account — Lookup + Disconnect
    const lookupBtn = document.createElement('button');
    lookupBtn.className = 'btn btn--sm';
    lookupBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;
    lookupBtn.appendChild(document.createTextNode(' Lookup Profile'));
    lookupBtn.addEventListener('click', () => showLookupModal());
    actions.appendChild(lookupBtn);

    const disconnectBtn = document.createElement('button');
    disconnectBtn.className = 'btn btn--sm btn--ghost';
    disconnectBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`;
    disconnectBtn.appendChild(document.createTextNode(' Disconnect'));
    disconnectBtn.addEventListener('click', () => {
      SteamID.clear();
      location.href = 'profile.html';
    });
    actions.appendChild(disconnectBtn);
  }

  info.appendChild(name);
  info.appendChild(badges);
  info.appendChild(actions);

  // ── Completion ring (hidden in read-only/lookup mode) ──
  if (!readOnly) {
    const ringWrap = buildCompletionRing(games);
    inner.appendChild(avatarWrap);
    inner.appendChild(info);
    inner.appendChild(ringWrap);
  } else {
    inner.appendChild(avatarWrap);
    inner.appendChild(info);
  }
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
  sub.textContent = `${doneAch.toLocaleString()} / ${totalAch.toLocaleString()} Unlocked`;

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
   LOOKUP MODAL — accessible while own profile is loaded
   ============================================================ */
function showLookupModal() {
  const existing = document.getElementById('lookup-modal-scrim');
  if (existing) existing.remove();

  const scrim = document.createElement('div');
  scrim.id = 'lookup-modal-scrim';
  scrim.className = 'lookup-modal-scrim';
  scrim.setAttribute('role', 'dialog');
  scrim.setAttribute('aria-modal', 'true');
  scrim.setAttribute('aria-label', 'Lookup a Steam profile');

  const modal = document.createElement('div');
  modal.className = 'lookup-modal';

  const header = document.createElement('div');
  header.className = 'lookup-modal__header';

  const title = document.createElement('h2');
  title.className = 'lookup-modal__title';
  title.textContent = 'Lookup Profile';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'lookup-modal__close';
  closeBtn.type = 'button';
  closeBtn.setAttribute('aria-label', 'Close');
  closeBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

  header.appendChild(title);
  header.appendChild(closeBtn);

  const body = document.createElement('div');
  body.className = 'lookup-modal__body';

  const desc = document.createElement('p');
  desc.className = 'lookup-modal__desc';
  desc.textContent = "Enter any Steam ID to view that player's profile — without changing your linked account.";

  const inputRow = document.createElement('div');
  inputRow.className = 'lookup-modal__input-row';

  const input = document.createElement('input');
  input.className = 'connect-input lookup-modal__input';
  input.type = 'text';
  input.placeholder = 'Steam ID (17 digits)';
  input.maxLength = 17;
  input.setAttribute('inputmode', 'numeric');
  input.setAttribute('aria-label', 'Steam ID to look up');
  input.spellcheck = false;

  const submitBtn = document.createElement('button');
  submitBtn.className = 'btn lookup-modal__submit';
  submitBtn.type = 'button';
  submitBtn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;
  submitBtn.appendChild(document.createTextNode(' View Profile'));

  inputRow.appendChild(input);
  inputRow.appendChild(submitBtn);
  body.appendChild(desc);
  body.appendChild(inputRow);
  modal.appendChild(header);
  modal.appendChild(body);
  scrim.appendChild(modal);
  document.body.appendChild(scrim);

  requestAnimationFrame(() => scrim.classList.add('open'));
  setTimeout(() => input.focus(), 100);

  const close = () => {
    scrim.classList.remove('open');
    setTimeout(() => scrim.remove(), 250);
  };

  const doLookup = () => {
    const val = input.value.trim();
    if (!SteamID.validate(val)) {
      Toast.error('Invalid Steam ID. Must be exactly 17 digits.');
      input.focus();
      return;
    }
    close();
    showLoadingState();
    loadProfileReadOnly(val);
  };

  closeBtn.addEventListener('click', close);
  scrim.addEventListener('click', e => { if (e.target === scrim) close(); });
  submitBtn.addEventListener('click', doLookup);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') doLookup();
    if (e.key === 'Escape') close();
  });
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

/* ── Counter animation utility ── */
function animateCounter(el, from, to, duration, formatter, onDone) {
  if (!el || to === 0) { if (el) el.textContent = formatter ? formatter(0) : '0'; return; }
  const start = performance.now();
  const range = to - from;
  function step(now) {
    const elapsed  = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const ease     = 1 - Math.pow(1 - progress, 3);
    const current  = from + range * ease;
    el.textContent = formatter ? formatter(current) : Math.round(current).toLocaleString();
    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      el.textContent = formatter ? formatter(to) : to.toLocaleString();
      if (onDone) onDone();
    }
  }
  requestAnimationFrame(step);
}

function renderStatsRow(profile, games, ownedGames, readOnly = false) {
  const wrap = document.getElementById('stats-wrap');
  if (!wrap) return;
  wrap.innerHTML = '';

  const totalGames = (ownedGames && ownedGames.length) ? ownedGames.length : games.length;

  // ── Total Playtime (deduplicated) ──
  const playtimeMap = new Map();
  (ownedGames || []).forEach(g => {
    const key = g.appId || g.rawgId;
    if (key != null) playtimeMap.set(String(key), g.playtime || 0);
  });
  games.forEach(g => {
    const key = g.appId || g.rawgId;
    if (key != null) playtimeMap.set(String(key), g.playtime || 0);
  });
  const totalMins = Array.from(playtimeMap.values()).reduce((s, m) => s + m, 0);
  const totalHrs  = Math.floor(totalMins / 60);
  const remainMins = totalMins % 60;
  const totalPlaytimeLabel = totalHrs >= 1
    ? (totalHrs.toLocaleString() + 'h' + (remainMins > 0 ? ' & ' + remainMins + 'm' : ''))
    : (totalMins + 'm');

  // ── Most Played Game ──
  const allGames = [...games];
  (ownedGames || []).forEach(og => {
    const key = String(og.appId || og.rawgId);
    const alreadyPresent = games.some(g => String(g.appId || g.rawgId) === key);
    if (!alreadyPresent) allGames.push(og);
  });
  let mostPlayed = null;
  allGames.forEach(g => {
    if ((g.playtime || 0) > 0) {
      if (!mostPlayed || g.playtime > mostPlayed.playtime) mostPlayed = g;
    }
  });
  const mpHrs = mostPlayed ? Math.floor(mostPlayed.playtime / 60) : 0;
  const mpMin = mostPlayed ? mostPlayed.playtime % 60 : 0;
  const mostPlayedSub = mostPlayed
    ? ((mpHrs > 0 ? mpHrs + 'h' : '') + (mpHrs > 0 && mpMin > 0 ? ' & ' : '') + (mpMin > 0 ? mpMin + 'm' : '')).trim() + ' played'
    : 'No playtime recorded';

  const row = document.createElement('div');
  row.className = 'stats-row';

  row.appendChild(buildTotalGamesCard(totalGames, ownedGames, games));

  // Animated playtime card — count hours up, then snap to final label
  const playtimeCard = buildStatCard(
    'Total Playtime',
    '0h',
    'Across all games',
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    'stat-card__value--cyan'
  );
  requestAnimationFrame(() => {
    setTimeout(() => {
      const valEl = playtimeCard.querySelector('.stat-card__value');
      if (valEl) animateCounter(valEl, 0, totalHrs, 1000, v => {
        const h = Math.floor(v);
        return h >= 1 ? h.toLocaleString() + 'h' : Math.round(v * 60) + 'm';
      }, () => { if (valEl) valEl.textContent = totalPlaytimeLabel; });
    }, 80);
  });
  row.appendChild(playtimeCard);

  row.appendChild(buildStatCard(
    'Most Played',
    mostPlayed ? (mostPlayed.name || '?') : '—',
    mostPlayedSub,
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="5 3 19 12 5 21 5 3"/></svg>',
    'stat-card__value--cyan stat-card__value--game-name'
  ));

  wrap.appendChild(row);
}
function buildTotalGamesCard(totalGames, ownedGames, recentGames) {
  // Count perfect (100%) from owned library; unplayed from owned
  const perfect  = (ownedGames && ownedGames.length ? ownedGames : recentGames)
    .filter(g => g.completion >= 100 || (g.total > 0 && g.achieved >= g.total)).length;
  const unplayed = ownedGames ? ownedGames.filter(g => (g.playtime || 0) === 0).length : 0;

  const card = document.createElement('div');
  card.className = 'stat-card stat-card--total-games';

  // Label row
  const lbl = document.createElement('div');
  lbl.className = 'stat-card__label';
  lbl.innerHTML = '<span aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><circle cx="15.5" cy="11.5" r="0.5" fill="currentColor"/><circle cx="17.5" cy="13.5" r="0.5" fill="currentColor"/><path d="M21 6H3a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2z"/></svg></span>';
  lbl.appendChild(document.createTextNode('Total Games'));

  // Big number — directly in card, centered via flex on .stat-card--total-games
  const bigNum = document.createElement('div');
  bigNum.className = 'stat-card__total-games-num';
  bigNum.textContent = totalGames.toLocaleString();

  // Mini pill row: Perfect + In Progress
  const pills = document.createElement('div');
  pills.className = 'stat-card__total-games-pills';

  if (perfect > 0) {
    const p = document.createElement('div');
    p.className = 'total-games-pill total-games-pill--gold';
    p.innerHTML = '<svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
    p.appendChild(document.createTextNode(' ' + perfect + ' perfect'));
    pills.appendChild(p);
  }

  if (unplayed > 0) {
    const p = document.createElement('div');
    p.className = 'total-games-pill total-games-pill--cyan';
    p.innerHTML = '<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
    p.appendChild(document.createTextNode(' ' + unplayed + ' Unplayed'));
    pills.appendChild(p);
  }

  card.appendChild(lbl);
  card.appendChild(bigNum);
  if (pills.children.length > 0) card.appendChild(pills);

  return card;
}

function buildStatCard(label, value, sub, iconSvg, valueClass = '', small = false, centered = false) {
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
  if (centered) {
    val.style.textAlign = 'center';
    card.style.alignItems = 'center';
  }

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

  // Primary: games played in the last 2 weeks (most genuinely "recent")
  // Fallback: sort remaining by lastPlayed timestamp if available
  const recentlyActive = [...games]
    .filter(g => (g.playtime2wks || 0) > 0)
    .sort((a, b) => (b.playtime2wks || 0) - (a.playtime2wks || 0));

  const sorted = recentlyActive.length >= 6
    ? recentlyActive.slice(0, 20)
    : [...games]
        .filter(g => g.playtime > 0 || g.playtime2wks > 0 || g.lastPlayed > 0)
        .sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0) || (b.playtime2wks || 0) - (a.playtime2wks || 0))
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
   OWNED GAMES
   ============================================================ */
function renderOwnedGames(ownedGames) {
  const section  = document.getElementById('owned-section');
  const track    = document.getElementById('owned-track');
  const countEl  = document.getElementById('owned-count');

  if (!section || !track) return;

  if (!ownedGames || !ownedGames.length) {
    section.style.display = 'none';
    return;
  }

  section.style.display = '';

  // Build controls in header (only once)
  const header = section.querySelector('.profile-section-header');
  if (header && !header.querySelector('.owned-controls')) {
    const controls = document.createElement('div');
    controls.className = 'owned-controls';

    // Filter tabs
    const filterTabs = document.createElement('div');
    filterTabs.className = 'owned-filter-tabs';
    filterTabs.setAttribute('role', 'group');
    filterTabs.setAttribute('aria-label', 'Filter owned games');

    [
      { key: 'all',        label: 'All' },
      { key: 'played',     label: 'Played' },
      { key: 'unplayed',   label: 'Unplayed' },
    ].forEach(f => {
      const btn = document.createElement('button');
      btn.className = 'owned-filter-tab' + (f.key === 'all' ? ' active' : '');
      btn.type = 'button';
      btn.dataset.filter = f.key;
      btn.textContent = f.label;
      filterTabs.appendChild(btn);
    });

    // Sort dropdown
    const sortSel = document.createElement('select');
    sortSel.className = 'sort-select owned-sort-select';
    sortSel.setAttribute('aria-label', 'Sort owned games');
    [
      { value: 'recent',     label: 'Recent' },
      { value: 'playtime',   label: 'Playtime' },
      { value: 'name',       label: 'Name A\u2013Z' },
      { value: 'completion', label: 'Completion' },
    ].forEach(opt => {
      const o = document.createElement('option');
      o.value = opt.value; o.textContent = opt.label;
      sortSel.appendChild(o);
    });

    // Game count badge
    const gameBadge = document.createElement('span');
    gameBadge.className = 'owned-game-badge';
    gameBadge.id = 'owned-game-badge';

    controls.appendChild(filterTabs);
    controls.appendChild(sortSel);
    controls.appendChild(gameBadge);
    header.appendChild(controls);

    let activeFilter = 'all';
    let activeSort   = 'recent';
    const update = () => applyFilterSort(activeFilter, activeSort);

    filterTabs.addEventListener('click', e => {
      const btn = e.target.closest('.owned-filter-tab');
      if (!btn) return;
      filterTabs.querySelectorAll('.owned-filter-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
      update();
    });

    sortSel.addEventListener('change', () => { activeSort = sortSel.value; update(); });
  }

  const OWNED_PAGE = 30;

  const applyFilterSort = (filterKey, sortKey) => {
  let list = ownedGames.map((g, i) => ({ ...g, _originalIndex: i }));
    if (filterKey === 'played')     list = list.filter(g => (g.playtime || 0) > 0);
    if (filterKey === 'unplayed')   list = list.filter(g => (g.playtime || 0) === 0);

    list.sort((a, b) => {
      if (sortKey === 'playtime')   return (b.playtime || 0) - (a.playtime || 0);
      if (sortKey === 'name')       return (a.name || '').localeCompare(b.name || '');
      if (sortKey === 'completion') return (b.completion || 0) - (a.completion || 0);
      // 'recent': prefer lastPlayed if available, otherwise keep original API order
      const aLast = a.lastPlayed || a.rtime_last_played || 0;
      const bLast = b.lastPlayed || b.rtime_last_played || 0;
      if (aLast !== bLast) return bLast - aLast;
      // API returns owned games sorted by recent play — preserve that order
      return (a._originalIndex || 0) - (b._originalIndex || 0);
    });

    const badge = document.getElementById('owned-game-badge');
    if (badge) badge.textContent = list.length + ' games';
    if (countEl) countEl.textContent = list.length;

    track.innerHTML = '';
    if (!list.length) {
      renderTrackEmpty(track, 'No games', 'No games match this filter.');
      return;
    }

    let offset = 0;
    function renderPage() {
      const batch = list.slice(offset, offset + OWNED_PAGE);
      if (!batch.length) return false;
      batch.forEach(game => track.appendChild(buildProfileGameCard(game, false, true)));
      offset += batch.length;
      return offset < list.length;
    }

    renderPage();
    if (offset < list.length && typeof lazySentinel === 'function') {
      lazySentinel(track, renderPage);
    }
  };

  applyFilterSort('all', 'recent');
}

/* ============================================================
   100% COMPLETED GAMES
   ============================================================ */
function renderPerfectGames(games) {
  const track   = document.getElementById('perfect-track');
  const section = document.getElementById('perfect-section');
  const countEl = document.getElementById('perfect-count');
  if (!track || !section) return;

  const perfect = games.filter(g => g.completion >= 100 || (g.total > 0 && g.achieved >= g.total));

  // Only show section when there are perfect games in the recently-played data
  if (!perfect.length) {
    section.style.display = 'none';
    return;
  }

  section.style.display = '';
  if (countEl) countEl.textContent = perfect.length;

  track.innerHTML = '';

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

function buildProfileGameCard(game, isPerfect, isOwned = false) {
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
  const img = document.createElement('img');
  img.className = 'profile-game-card__img';
  img.alt       = '';
  img.loading   = 'lazy';
  img.addEventListener('error', () => {
    img.style.display = 'none';
    const fallback = document.createElement('div');
    fallback.className = 'profile-game-card__cover-fallback';
    fallback.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><circle cx="15.5" cy="11.5" r="0.5" fill="currentColor"/><circle cx="17.5" cy="13.5" r="0.5" fill="currentColor"/><path d="M21 6H3a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2z"/></svg><span>${game.name || ''}</span>`;
    coverWrap.appendChild(fallback);
  });
  if (coverSrc) {
    img.setAttribute('src', coverSrc);
  } else {
    // No cover URL at all — trigger the fallback immediately after mount
    requestAnimationFrame(() => img.dispatchEvent(new Event('error')));
  }
  coverWrap.appendChild(img);

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
  } else if (!isOwned && game.completion > 0) {
    const badge = document.createElement('div');
    badge.className = 'profile-game-card__badge';
    badge.style.cssText = 'background:rgba(13,30,53,0.75);border:1px solid rgba(0,212,255,0.3);color:var(--cyan);font-family:var(--font-mono);';
    badge.textContent = Math.round(game.completion) + '%';
    coverWrap.appendChild(badge);
  }

  card.appendChild(coverWrap);

  // Info strip below cover: name, achievement progress, playtime
  const info = document.createElement('div');
  info.className = 'profile-game-card__info';

  // Game name
  const nameLbl = document.createElement('div');
  nameLbl.className = 'profile-game-card__info-name';
  nameLbl.textContent = game.name;
  info.appendChild(nameLbl);

  if (!isPerfect && !isOwned) {
    // Achievement progress row
    const achRow = document.createElement('div');
    achRow.className = 'profile-game-card__progress-row';

    const achLbl = document.createElement('div');
    achLbl.className = 'profile-game-card__progress-label';
    // Show X/Y if we have totals, else just percentage
    if (game.total > 0) {
      achLbl.textContent = `${game.achieved}/${game.total} Achievements`;
    } else {
      achLbl.textContent = 'Achievements';
    }

    const pct = document.createElement('div');
    pct.className = 'profile-game-card__progress-pct';
    pct.textContent = Math.round(game.completion || 0) + '%';

    achRow.appendChild(achLbl);
    achRow.appendChild(pct);
    info.appendChild(achRow);

    // Progress bar
    const bar = document.createElement('div');
    bar.className = 'progress-bar';
    const fill = document.createElement('div');
    fill.className = 'progress-bar__fill';
    fill.style.width = Math.round(game.completion || 0) + '%';
    bar.appendChild(fill);
    info.appendChild(bar);
  }

  // Playtime
  if (game.playtime > 0) {
    const ptRow = document.createElement('div');
    ptRow.className = 'profile-game-card__playtime';
    const hrs = game.playtimeHrs;
    const mins = game.playtime % 60;
    const ptText = hrs > 0 ? `${hrs}h ${mins > 0 ? mins + 'm' : ''}`.trim() : `${mins}m`;
    ptRow.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
    ptRow.appendChild(document.createTextNode(' ' + ptText));
    info.appendChild(ptRow);
  }

  card.appendChild(info);

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