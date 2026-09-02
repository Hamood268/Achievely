'use strict';

const ADMIN_KEY_STORAGE = 'achievely_admin_key';

let selectedPreset = 'cyan';
let usingCustomColor = false;
let verifiedKey = null;

document.addEventListener('DOMContentLoaded', () => {
  wireGate();
  wireColorControls();
  wireLivePreview();
  wireForm();
  wireLockButton();

  // Auto-unlock if a previously-verified key is stored — still re-checked
  // against the server, never trusted blindly.
  const stored = localStorage.getItem(ADMIN_KEY_STORAGE);
  if (stored) {
    document.getElementById('admin-key-input').value = stored;
    attemptUnlock(stored, /* silent */ true);
  }
});

function wireGate() {
  const form = document.getElementById('key-gate-form');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const key = document.getElementById('admin-key-input').value.trim();
    if (!key) {
      setGateStatus('Enter the admin key.', true);
      return;
    }
    attemptUnlock(key, false);
  });
}

async function attemptUnlock(key, silent) {
  if (!silent) setGateStatus('Checking…', false);

  try {
    const res = await fetch(`${API_BASE}/banner/verify`, {
      headers: { 'x-admin-key': key },
    });

    if (res.status === 429) {
      setGateStatus('Too many attempts — please wait a bit before trying again.', true);
      return;
    }

    if (!res.ok) {
      if (!silent) setGateStatus('Incorrect admin key.', true);
      localStorage.removeItem(ADMIN_KEY_STORAGE);
      return;
    }

    verifiedKey = key;
    localStorage.setItem(ADMIN_KEY_STORAGE, key);
    setGateStatus('', false);
    unlock();
  } catch (err) {
    if (!silent) setGateStatus('Network error — could not verify key.', true);
  }
}

function unlock() {
  document.getElementById('key-gate-form').hidden = true;
  document.getElementById('admin-protected').hidden = false;
  loadCurrentBanner();
}

function wireLockButton() {
  document.getElementById('lock-btn').addEventListener('click', () => {
    verifiedKey = null;
    localStorage.removeItem(ADMIN_KEY_STORAGE);
    document.getElementById('admin-key-input').value = '';
    document.getElementById('admin-protected').hidden = true;
    document.getElementById('key-gate-form').hidden = false;
    setGateStatus('', false);
  });
}

function setGateStatus(text, isError) {
  const el = document.getElementById('gate-status');
  el.textContent = text;
  el.classList.toggle('admin-status--error', !!isError);
}

async function loadCurrentBanner() {
  try {
    const res = await fetch(`${API_BASE}/banner`);
    const data = await res.json();
    const banner = data.banner;
    if (!banner) return;

    document.getElementById('field-enabled').checked = !!banner.enabled;
    document.getElementById('field-title').value = banner.title || '';
    document.getElementById('field-message').value = banner.message || '';
    document.getElementById('field-expires').value = msToLocalInputValue(banner.expiresAt);
    document.getElementById('field-link-url').value = banner.linkUrl || '';
    document.getElementById('field-link-text').value = banner.linkText || '';

    const presets = ['cyan', 'green', 'amber', 'red', 'purple'];
    if (presets.includes(banner.color)) {
      setActivePreset(banner.color);
    } else if (banner.color) {
      usingCustomColor = true;
      document.getElementById('field-color-custom').value = banner.color;
      document.querySelectorAll('.admin-swatch').forEach(b => b.classList.remove('active'));
    }

    const pages = banner.pages || [];
    document.querySelectorAll('#field-pages input[type="checkbox"]').forEach(cb => {
      cb.checked = pages.includes(cb.value);
    });

    renderPreview();
  } catch (err) {
    setStatus('Could not load the current banner.', true);
  }
}

function msToLocalInputValue(ms) {
  if (!ms) return '';
  const d = new Date(ms);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function wireColorControls() {
  document.querySelectorAll('.admin-swatch').forEach(btn => {
    btn.addEventListener('click', () => {
      setActivePreset(btn.dataset.color);
      renderPreview();
    });
  });

  document.getElementById('field-color-custom').addEventListener('input', () => {
    usingCustomColor = true;
    document.querySelectorAll('.admin-swatch').forEach(b => b.classList.remove('active'));
    renderPreview();
  });
}

function setActivePreset(color) {
  selectedPreset = color;
  usingCustomColor = false;
  document.querySelectorAll('.admin-swatch').forEach(b => b.classList.toggle('active', b.dataset.color === color));
}

function getCurrentColor() {
  return usingCustomColor
    ? document.getElementById('field-color-custom').value
    : selectedPreset;
}

function wireLivePreview() {
  ['field-title', 'field-message', 'field-enabled', 'field-expires', 'field-link-url', 'field-link-text'].forEach(id => {
    document.getElementById(id).addEventListener('input', renderPreview);
  });
}

function renderPreview() {
  const wrap = document.getElementById('admin-preview');
  wrap.innerHTML = '';

  const enabled = document.getElementById('field-enabled').checked;
  const title = document.getElementById('field-title').value.trim();
  const message = document.getElementById('field-message').value.trim();
  const expiresVal = document.getElementById('field-expires').value;
  const expiresMs = expiresVal ? new Date(expiresVal).getTime() : null;
  const alreadyExpired = expiresMs && Date.now() > expiresMs;

  if (!enabled || (!title && !message)) {
    wrap.innerHTML = '<div class="admin-preview-empty">Banner is off or empty — nothing will show on the site.</div>';
    return;
  }

  if (alreadyExpired) {
    const note = document.createElement('div');
    note.className = 'admin-preview-expired-note';
    note.textContent = 'Heads up — this expiry time is already in the past, so the banner won\u2019t show until you move it forward.';
    wrap.appendChild(note);
  }

  const hex = BANNER_PRESETS[getCurrentColor()] || getCurrentColor();
  const el = document.createElement('div');
  el.className = 'site-banner admin-preview-banner';
  el.style.setProperty('--banner-bg', hexToRgba(hex, 0.14));
  el.style.setProperty('--banner-border', hexToRgba(hex, 0.4));
  el.style.setProperty('--banner-text', hex);

  const content = document.createElement('div');
  content.className = 'site-banner__content';
  if (title) {
    const t = document.createElement('span');
    t.className = 'site-banner__title';
    t.textContent = title;
    content.appendChild(t);
  }
  if (message) {
    const m = document.createElement('span');
    m.className = 'site-banner__message';
    m.textContent = message;
    content.appendChild(m);
  }
  const linkUrl = document.getElementById('field-link-url').value.trim();
  if (linkUrl) {
    const link = document.createElement('a');
    link.className = 'site-banner__link';
    link.href = linkUrl;
    link.textContent = document.getElementById('field-link-text').value.trim() || 'Learn more';
    content.appendChild(link);
  }
  const closeBtn = document.createElement('button');
  closeBtn.className = 'site-banner__close';
  closeBtn.innerHTML = Icons.close;

  el.appendChild(content);
  el.appendChild(closeBtn);
  wrap.appendChild(el);
}

function wireForm() {
  const form = document.getElementById('banner-form');
  form.addEventListener('submit', async e => {
    e.preventDefault();

    if (!verifiedKey) {
      setStatus('Session expired — lock and unlock again.', true);
      return;
    }

    const pageBoxes = Array.from(document.querySelectorAll('#field-pages input[type="checkbox"]'));
    const pages = pageBoxes.filter(cb => cb.checked).map(cb => cb.value);

    const expiresVal = document.getElementById('field-expires').value;
    const expiresAt = expiresVal ? new Date(expiresVal).getTime() : null;

    const linkUrl = document.getElementById('field-link-url').value.trim();
    const linkText = document.getElementById('field-link-text').value.trim();
    if (linkUrl && !/^(\/(?!\/)|https?:\/\/)/i.test(linkUrl)) {
      setStatus('Link URL must start with / or http(s)://', true);
      return;
    }

    const payload = {
      enabled: document.getElementById('field-enabled').checked,
      title: document.getElementById('field-title').value.trim(),
      message: document.getElementById('field-message').value.trim(),
      color: getCurrentColor(),
      pages,
      expiresAt,
      linkUrl,
      linkText,
    };

    setStatus('Saving…', false);

    try {
      const res = await fetch(`${API_BASE}/banner`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': verifiedKey,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.status === 401) {
        setStatus('Admin key was rejected — lock and unlock again.', true);
        verifiedKey = null;
        localStorage.removeItem(ADMIN_KEY_STORAGE);
        return;
      }
      if (res.status === 429) {
        setStatus('Too many requests — please wait before saving again.', true);
        return;
      }
      if (!res.ok) {
        setStatus(data.message || `Save failed (HTTP ${res.status}).`, true);
        return;
      }

      setStatus('Saved.', false);
      Toast.success('Banner saved.');
    } catch (err) {
      setStatus('Network error while saving.', true);
    }
  });
}

function setStatus(text, isError) {
  const el = document.getElementById('admin-status');
  el.textContent = text;
  el.classList.toggle('admin-status--error', !!isError);
}
