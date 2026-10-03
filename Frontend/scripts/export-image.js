'use strict';
/* ============================================================
   Achievely — image export (canvas → PNG)
   16:9 always. Canvas grows with the achievement count: more
   columns are added (and the left panel grows with the canvas),
   so the ratio never changes and the left side never looks empty.

   Public API
     AchievelyExport.render(opts)      -> Promise<Blob>
     AchievelyExport.download(blob, name)
     AchievelyExport.detectGroups(list)-> [{label, items}] | null
     AchievelyExport.prefetch(urls)    -> Promise   (optional warm-up)

   Options understood by render():
     gameName, cover, coverFallback, background, achievements,
     statsList, hasPlayerData, preview, groups, onInfo,
     showStatus, showGlobal, showHidden, showStats,
     progressView, accentFromArt, blurBg, group,
     showBadge (completion badge on the cover, only when every achievement is unlocked),
     badgeSrc (optional override for the badge image path),
     banner (wide art used for the blurred background; falls back to the cover)
   ============================================================ */
(function () {
  const THEME = {
    bg: '#0a1424', bg2: '#0d1a30', panel: '#0f1d33', line: '#1c2d47',
    text: '#e6f1ff', muted: '#8aa0bd', accent: '#00b8d9', locked: '#5b7090',
    hidden: '#f5b94a', iconBg: '#12304f',
  };
  const FONT = {
    head: '"Bebas Neue", Impact, sans-serif',
    body: '"DM Sans", system-ui, sans-serif',
    mono: '"JetBrains Mono", monospace',
  };
  // Layout units (px at 1x)
  const PAD = 40, GAP = 40, COL_GAP = 24;
  const ROW = 72, CARD = 64, ICON = 48, TITLE_H = 56, HEAD_H = 34;
  const LEFT_FRAC = 0.22, LEFT_MIN = 260, LEFT_MAX = 560;
  const GLOBAL_W = 92, STATUS_W = 30;
  // Frontend/icons/completion.png (override with window.ACHIEVELY_COMPLETION_BADGE or opts.badgeSrc)
  const BADGE_SRC = '/icons/completion.png';

  /* ── colour helpers ── */
  const hex2rgb = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    let h = 0; const l = (mx + mn) / 2;
    const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
    if (d) {
      if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
      h /= 6; if (h < 0) h += 1;
    }
    return [h, s, l];
  }
  function hslToRgb(h, s, l) {
    const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h * 6) % 2) - 1)), m = l - c / 2;
    const [r, g, b] = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]][Math.floor(h * 6) % 6];
    return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
  }
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ============================================================
     IMAGE LOADING — built to keep the image proxy nearly idle
       1. in-memory (one fetch per URL per page view, in-flight de-duped)
       2. Cache API (survives reloads — a second export costs 0 requests)
       3. direct CORS load (hosts that allow it never touch the proxy;
          the result is learned per host, so a host that refuses is only
          tried twice)
       4. proxy, as the last resort — and the response is stored in (2)
     ============================================================ */
  const memo = new Map();          // url -> Promise<img|null>
  const failedAt = new Map();      // url -> timestamp (don't hammer broken URLs)
  const hostStat = new Map();      // host -> { ok, fail }
  const CACHE_NAME = 'achievely-img-v1';
  const FAIL_TTL = 60 * 1000;
  let cachePromise = null;

  const getCache = () => {
    if (!('caches' in window)) return Promise.resolve(null);
    return (cachePromise = cachePromise || caches.open(CACHE_NAME).catch(() => null));
  };

  function proxied(url) {
    const base = window.ACHIEVELY_API || '/api/v1';
    return `${base}/image-proxy?url=${encodeURIComponent(url)}`;
  }

  function toImage(src, cors) {
    return new Promise(resolve => {
      const img = new Image();
      if (cors) img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  async function blobToImage(blob) {
    const u = URL.createObjectURL(blob);
    const img = await toImage(u, false);
    URL.revokeObjectURL(u);
    return img;
  }

  async function loadUncached(url) {
    if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('/')) return toImage(url, false);

    const cache = await getCache();
    if (cache) {
      try {
        const hit = await cache.match(url);
        if (hit) { const img = await blobToImage(await hit.blob()); if (img) return img; }
      } catch (_) {}
    }

    let host = '';
    try { host = new URL(url).host; } catch (_) { return null; }
    const st = hostStat.get(host) || { ok: 0, fail: 0 };
    hostStat.set(host, st);
    if (st.ok > 0 || st.fail < 2) {                  // direct, no proxy involved
      const img = await toImage(url, true);
      if (img) { st.ok++; return img; }
      st.fail++;
    }

    try {                                            // proxy fallback
      const res = await fetch(proxied(url));
      if (!res.ok) return null;
      const blob = await res.blob();
      if (cache) {
        cache.put(url, new Response(blob, { headers: { 'Content-Type': blob.type || 'image/png' } })).catch(() => {});
      }
      return await blobToImage(blob);
    } catch (_) { return null; }
  }

  function getImage(url) {
    if (!url) return Promise.resolve(null);
    const f = failedAt.get(url);
    if (f && Date.now() - f < FAIL_TTL) return Promise.resolve(null);
    if (memo.has(url)) return memo.get(url);
    const p = loadUncached(url).then(img => {
      if (!img) { memo.delete(url); failedAt.set(url, Date.now()); }
      return img;
    });
    memo.set(url, p);
    return p;
  }

  async function loadMany(urls, limit = 6) {
    const unique = [...new Set(urls.filter(Boolean))];
    const out = new Map();
    let i = 0;
    async function worker() {
      while (i < unique.length) { const u = unique[i++]; out.set(u, await getImage(u)); }
    }
    await Promise.all(Array.from({ length: Math.min(limit, unique.length) }, worker));
    return out;
  }

  /* ── greyscale copies for the "progress view" (cached per image) ── */
  const greyCache = new WeakMap();
  function greyOf(img) {
    if (greyCache.has(img)) return greyCache.get(img);
    let out = img;
    try {
      const s = ICON * 2, c = document.createElement('canvas');
      c.width = c.height = s;
      const x = c.getContext('2d', { willReadFrequently: true });
      x.drawImage(img, 0, 0, s, s);
      const d = x.getImageData(0, 0, s, s), p = d.data;
      for (let i = 0; i < p.length; i += 4) {
        const g = (p[i] * 0.299 + p[i + 1] * 0.587 + p[i + 2] * 0.114) * 0.85;
        p[i] = p[i + 1] = p[i + 2] = g;
      }
      x.putImageData(d, 0, 0);
      out = c;
    } catch (_) {}
    greyCache.set(img, out);
    return out;
  }

  /* ── accent colour pulled from the cover art ── */
  function accentFromImage(img) {
    try {
      const S = 48, c = document.createElement('canvas');
      c.width = c.height = S;
      const x = c.getContext('2d', { willReadFrequently: true });
      x.drawImage(img, 0, 0, S, S);
      const d = x.getImageData(0, 0, S, S).data;
      const bins = Array.from({ length: 24 }, () => ({ w: 0, r: 0, g: 0, b: 0 }));
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 200) continue;
        const [h, s, l] = rgbToHsl(d[i], d[i + 1], d[i + 2]);
        if (s < 0.25 || l < 0.18 || l > 0.88) continue;
        const w = s * (1 - Math.abs(l - 0.5) * 1.4);
        const b = bins[Math.floor(h * 24) % 24];
        b.w += w; b.r += d[i] * w; b.g += d[i + 1] * w; b.b += d[i + 2] * w;
      }
      const best = bins.reduce((a, b) => (b.w > a.w ? b : a), bins[0]);
      if (best.w < 1) return null;
      const [h, s] = rgbToHsl(best.r / best.w, best.g / best.w, best.b / best.w);
      return hslToRgb(h, clamp(s, 0.6, 0.9), 0.58);
    } catch (_) { return null; }
  }

  /* ── dominant colour of the art (vivid areas count more) — drives the glow ── */
  function artColor(img) {
    try {
      const S = 40, c = document.createElement('canvas');
      c.width = c.height = S;
      const x = c.getContext('2d', { willReadFrequently: true });
      x.drawImage(img, 0, 0, S, S);
      const d = x.getImageData(0, 0, S, S).data;
      let w = 0, r = 0, g = 0, b = 0, n = 0, ar = 0, ag = 0, ab = 0;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 200) continue;
        ar += d[i]; ag += d[i + 1]; ab += d[i + 2]; n++;
        const [, s, l] = rgbToHsl(d[i], d[i + 1], d[i + 2]);
        const wt = (s * s + 0.02) * Math.max(0.05, 1 - Math.abs(l - 0.5) * 1.3);
        w += wt; r += d[i] * wt; g += d[i + 1] * wt; b += d[i + 2] * wt;
      }
      if (!n) return null;
      const col = w > 0.05 ? [r / w, g / w, b / w] : [ar / n, ag / n, ab / n];
      const [h, s, l] = rgbToHsl(col[0], col[1], col[2]);
      // black & white / near-grey art has no real colour → let the caller use the white fallback
      if (s < 0.15) return null;
      return hslToRgb(h, clamp(s * 1.1, 0.25, 0.95), clamp(l, 0.4, 0.6));
    } catch (_) { return null; }
  }

  /* ============================================================
     GROUP DETECTION (heuristics — the API has no categories)
       A) shared prefix in the NAME         "Chapter 1: …", "DLC | …", "[DLC] …"
       B) shared prefix in the DESCRIPTION  "Baba Yaga: Rescue Nadia from Trinity"
       C) shared trailing location          "… in Inkwell Isle IV"
       D) shared leading words in the NAME  "Frozen Wastes Explorer", "Frozen Wastes Master"
     Labels are compared ignoring case / punctuation / spacing, so
     "Baba Yaga", "BABA YAGA" and "Baba-Yaga" are the same category.
     A strategy only counts when the pattern is clear (see groupBy);
     prefix strategies (A, B) beat the looser ones (C, D). A single
     category is allowed (e.g. one DLC among base-game achievements).
     If nothing is clear the list is simply left ungrouped.
     ============================================================ */
  const PREFIX_RE = /^(?:[\[(]\s*([^\])]{2,30}?)\s*[\])]\s*[-–—:|]?\s*|(.{2,30}?)\s*(?::|：|\||\s[-–—]\s)\s*)\S/;
  const DESC_PLACE = /\b(?:in|on|at|during|within|of)\s+(?:the\s+)?((?:[A-Z0-9][\w'’.-]*)(?:\s+(?:of|the|and|&|[A-Z0-9][\w'’.-]*)){0,5})\s*[.!]?$/;
  const GENERIC_LABEL = /^(note|tip|hint|warning|spoiler|spoilers|hidden|secret|objective|reward|achievement|achievements|unlock|unlocked|complete|completed)$/i;
  const STOP_WORDS = new Set(['the', 'a', 'an', 'of', 'and', 'to', 'in', 'on', 'at', 'for', 'with', 'you', 'your', 'i', 'it', 'is', 'be', 'no', 'all']);

  const normKey = s => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  function goodLabel(l) {
    if (!l || l.length < 2 || l.length > 30) return false;
    if (!/^[\p{Lu}\p{N}]/u.test(l)) return false;           // categories start like a title
    if (/[.!?,;]$/.test(l)) return false;                    // …not like a sentence
    if (l.split(/\s+/).length > 5) return false;
    return !GENERIC_LABEL.test(l.trim());
  }

  /* keyFn(a) -> label | null.  Returns { groups, score, single } or null. */
  function groupBy(list, keyFn, minItems = 2) {
    const tally = new Map();                                 // key -> { label, n }
    const keys = list.map(a => {
      const raw = keyFn(a);
      if (!raw || !goodLabel(raw)) return null;
      const k = normKey(raw);
      if (!k) return null;
      const t = tally.get(k), form = raw.trim();
      if (t) { t.n++; t.forms.set(form, (t.forms.get(form) || 0) + 1); }
      else tally.set(k, { label: form, n: 1, forms: new Map([[form, 1]]) });
      return k;
    });
    tally.forEach(v => { v.label = [...v.forms].sort((a, b) => b[1] - a[1])[0][0]; });   // most common spelling
    const valid = new Set([...tally].filter(([, v]) => v.n >= minItems).map(([k]) => k));
    if (!valid.size || valid.size > 14) return null;

    const map = new Map(), order = [], other = [];
    list.forEach((a, i) => {
      const k = keys[i];
      if (k && valid.has(k)) {
        if (!map.has(k)) { map.set(k, []); order.push(k); }
        map.get(k).push(a);
      } else other.push(a);
    });
    const grouped = list.length - other.length;
    const single = order.length === 1;
    // a lone category must be unmistakable: 3+ items and something left to separate it from
    if (single && (grouped < 3 || !other.length)) return null;

    order.sort((a, b) => tally.get(a).label.localeCompare(tally.get(b).label, undefined, { numeric: true, sensitivity: 'base' }));
    const groups = order.map(k => ({ label: tally.get(k).label, items: map.get(k) }));
    if (other.length) {
      const o = { label: 'Other', items: other };
      single ? groups.unshift(o) : groups.push(o);          // base game first, DLC after
    }
    return { groups, score: grouped / list.length, single };
  }

  function detectGroups(list) {
    if (!Array.isArray(list) || list.length < 6) return null;
    const clean = s => s.replace(/[\s.:;,\-–—]+$/, '').trim();
    const prefix = text => { const m = PREFIX_RE.exec((text || '').trim()); return m ? clean(m[1] || m[2] || '') : null; };
    const ok = r => r && r.score >= (r.single ? 0.08 : 0.2);
    const best = rs => rs.filter(ok).sort((x, y) => y.score - x.score)[0];

    // 1) explicit prefixes in names / descriptions
    let pick = best([
      groupBy(list, a => prefix(a.name)),
      groupBy(list, a => prefix(a.description)),
    ]);
    // 2) trailing location in the description
    if (!pick) pick = best([groupBy(list, a => { const m = DESC_PLACE.exec((a.description || '').trim()); return m ? clean(m[1]) : null; })]);
    // 3) same first two words of the name (strict: 3+ per group)
    if (!pick) {
      const lead = a => {
        const w = (a.name || '').trim().split(/\s+/);
        if (w.length < 3 || w.slice(0, 2).some(x => STOP_WORDS.has(x.toLowerCase()) || !/^[\p{L}][\p{L}'’-]+$/u.test(x))) return null;
        return w.slice(0, 2).join(' ');
      };
      pick = best([groupBy(list, lead, 3)]);
    }
    return pick ? pick.groups : null;
  }

  /* ── Drawing helpers ── */
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function fitText(ctx, text, maxW) {
    if (ctx.measureText(text).width <= maxW) return text;
    let t = text;
    while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
    return t.trimEnd() + '…';
  }

  function wrap(ctx, text, maxW, maxLines) {
    const words = String(text || '').split(/\s+/).filter(Boolean);
    const lines = [];
    let cur = '';
    for (const w of words) {
      const test = cur ? cur + ' ' + w : w;
      if (ctx.measureText(test).width <= maxW || !cur) cur = test;
      else { lines.push(cur); cur = w; }
    }
    if (cur) lines.push(cur);
    if (lines.length > maxLines) {
      const rest = lines.slice(maxLines - 1).join(' ');
      lines.length = maxLines - 1;
      lines.push(rest);
    }
    return lines.map(l => fitText(ctx, l, maxW));
  }

  function drawCover(ctx, img, x, y, w, h, name, spine = true) {
    ctx.save();
    rr(ctx, x, y, w, h, 6);
    ctx.clip();
    if (img) {
      const s = Math.max(w / img.width, h / img.height);
      const dw = img.width * s, dh = img.height * s;
      ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
    } else {
      ctx.fillStyle = THEME.iconBg;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = THEME.accent;
      ctx.font = `28px ${FONT.head}`;
      ctx.textAlign = 'center';
      ctx.fillText(name.slice(0, 18), x + w / 2, y + h / 2);
      ctx.textAlign = 'left';
    }
    if (spine) {
      const g = ctx.createLinearGradient(x, 0, x + w, 0);
      g.addColorStop(0, 'rgba(0,0,0,0.35)');
      g.addColorStop(0.06, 'rgba(255,255,255,0.10)');
      g.addColorStop(0.12, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,0.18)');
      ctx.fillStyle = g;
      ctx.fillRect(x, y, w, h);
    }
    ctx.restore();
  }

  /* completion badge, drawn flat on the top-left of the cover (before the perspective slicing,
     so it tilts together with the art) */
  function drawBadge(ctx, img, w) {
    const bw = Math.round(w * 0.26), bh = Math.round((bw * img.height) / img.width), m = Math.round(w * 0.04);
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2;
    ctx.drawImage(img, m, m, bw, bh);
    ctx.restore();
  }

  /* ── true perspective "book": the art is sliced into 1px columns and each
        column is scaled by its distance, so the near edge is taller than the far
        edge (rotateY + perspective). The spine side is drawn as a solid face and
        a coloured glow, taken from the art itself, sits behind it. ── */
  function drawBook(ctx, img, cx, cy, w, h, o) {
    const th = (o.angle * Math.PI) / 180, sin = Math.sin(th), cos = Math.cos(th);
    const d = Math.max(w, h) * 2.6, hw = w / 2, hh = h / 2, t = o.thick, sc = o.scale;
    const P = (x, y, z, ox, oy) => {
      const rx = x * cos + z * sin, rz = -x * sin + z * cos, s = d / (d - rz);
      return [ox + rx * s, oy + y * s, s];
    };
    // centre the visible silhouette on (cx, cy)
    const pts = [[-hw, -hh, 0], [-hw, hh, 0], [hw, -hh, 0], [hw, hh, 0], [-hw, -hh, -t], [-hw, hh, -t]].map(q => P(q[0], q[1], q[2], 0, 0));
    const ox = cx - (Math.min(...pts.map(p => p[0])) + Math.max(...pts.map(p => p[0]))) / 2;
    const oy = cy - (Math.min(...pts.map(p => p[1])) + Math.max(...pts.map(p => p[1]))) / 2;
    const Q = (x, y, z) => P(x, y, z, ox, oy);
    const FTL = Q(-hw, -hh, 0), FTR = Q(hw, -hh, 0), FBR = Q(hw, hh, 0), FBL = Q(-hw, hh, 0);
    const BTL = Q(-hw, -hh, -t), BBL = Q(-hw, hh, -t);
    const glow = o.glow;

    // 1) soft aura in the art's colours
    const ry = Math.max(h, w) * 0.8, rx = Math.min(ry * 1.15, o.maxW * 0.62);
    ctx.save();
    ctx.translate(cx, cy); ctx.scale(rx / ry, 1);
    const rg = ctx.createRadialGradient(0, 0, ry * 0.1, 0, 0, ry);
    rg.addColorStop(0, rgba(glow, 0.42));
    rg.addColorStop(0.5, rgba(glow, 0.16));
    rg.addColorStop(1, rgba(glow, 0));
    ctx.fillStyle = rg; ctx.fillRect(-ry, -ry, ry * 2, ry * 2);
    ctx.restore();

    // 2) coloured drop shadow + a tight dark contact shadow for depth
    const outline = () => {
      ctx.beginPath();
      [BTL, FTL, FTR, FBR, FBL, BBL].forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
      ctx.closePath();
    };
    ctx.save();
    ctx.fillStyle = rgba(mix(glow, [0, 0, 0], 0.35), 1);
    ctx.shadowColor = rgba(glow, 0.75); ctx.shadowBlur = 60 * sc;
    ctx.shadowOffsetX = -4 * sc; ctx.shadowOffsetY = 12 * sc;
    outline(); ctx.fill();
    ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 18 * sc;
    ctx.shadowOffsetX = -6 * sc; ctx.shadowOffsetY = 14 * sc;
    outline(); ctx.fill();
    ctx.restore();

    // 3) spine / thickness face (skipped for a plain flat cover)
    if (t > 0) {
    const sg = ctx.createLinearGradient(BTL[0], 0, FTL[0], 0);
    sg.addColorStop(0, rgba(mix(glow, [0, 0, 0], 0.72), 1));
    sg.addColorStop(1, rgba(mix(glow, [0, 0, 0], 0.38), 1));
    ctx.beginPath();
    [BTL, FTL, FBL, BBL].forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.closePath(); ctx.fillStyle = sg; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(FTL[0], FTL[1]); ctx.lineTo(FBL[0], FBL[1]); ctx.stroke();
    }

    // 4) front face: flat art (+ light falloff / sheen) sliced into perspective columns
    const res = Math.max(1, Math.min(2, sc));
    const fw = Math.round(w * res), fh = Math.round(h * res);
    const flat = document.createElement('canvas');
    flat.width = fw; flat.height = fh;
    const fx = flat.getContext('2d');
    fx.scale(res, res);
    drawCover(fx, img, 0, 0, w, h, o.name, o.spine);
    fx.globalCompositeOperation = 'source-atop';
    const lg = fx.createLinearGradient(0, 0, w, h * 0.35);
    lg.addColorStop(0, 'rgba(255,255,255,0.14)');
    lg.addColorStop(0.5, 'rgba(255,255,255,0.02)');
    lg.addColorStop(1, 'rgba(0,0,0,0.26)');
    fx.fillStyle = lg; fx.fillRect(0, 0, w, h);
    if (o.badge) drawBadge(fx, o.badge, w);
    const imgSmooth = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    for (let i = 0; i < fw; i++) {
      const a = Q(-hw + (w * i) / fw, 0, 0), b = Q(-hw + (w * (i + 1)) / fw, 0, 0);
      const hs = (h * (a[2] + b[2])) / 2;
      ctx.drawImage(flat, i, 0, 1, fh, a[0], oy - hs / 2, b[0] - a[0] + 0.7, hs);
    }
    ctx.imageSmoothingEnabled = imgSmooth;
  }

  function drawCheck(ctx, cx, cy, color) {
    ctx.save();
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.arc(cx, cy, 11, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 5, cy + 0.5); ctx.lineTo(cx - 1.5, cy + 4); ctx.lineTo(cx + 5, cy - 3.5);
    ctx.stroke();
    ctx.restore();
  }

  function drawLock(ctx, cx, cy) {
    ctx.save();
    ctx.strokeStyle = THEME.locked; ctx.fillStyle = THEME.locked;
    ctx.lineWidth = 2; ctx.lineCap = 'round';
    rr(ctx, cx - 7, cy - 1, 14, 11, 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy - 2, 5, Math.PI, 0); ctx.stroke();
    ctx.restore();
  }

  /* Smooth blur that works everywhere (Safari-safe, no ctx.filter):
       1. shrink the art to a small canvas
       2. run a real box blur (3 passes ≈ gaussian) on its pixels
       3. enlarge in 2x steps with smoothing, so no blocky / pixelated edges */
  function boxBlurRGBA(data, w, h, r) {
    const tmp = new Uint8ClampedArray(data.length);
    const pass = (src, dst, horizontal) => {
      const len = horizontal ? w : h, lines = horizontal ? h : w;
      const step = horizontal ? 4 : w * 4, lineStep = horizontal ? w * 4 : 4;
      const div = r * 2 + 1;
      for (let l = 0; l < lines; l++) {
        const base = l * lineStep;
        for (let c = 0; c < 4; c++) {
          let sum = 0;
          for (let i = -r; i <= r; i++) sum += src[base + clamp(i, 0, len - 1) * step + c];
          for (let i = 0; i < len; i++) {
            dst[base + i * step + c] = sum / div;
            sum += src[base + clamp(i + r + 1, 0, len - 1) * step + c]
                 - src[base + clamp(i - r, 0, len - 1) * step + c];
          }
        }
      }
    };
    for (let n = 0; n < 3; n++) { pass(data, tmp, true); pass(tmp, data, false); }
  }

  function drawBlurBg(ctx, img, W, H) {
    const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
    const w1 = Math.max(48, Math.round(W / 16)), h1 = Math.max(27, Math.round((w1 * H) / W));
    let cur = mk(w1, h1);
    const cx = cur.getContext('2d', { willReadFrequently: true });
    cx.imageSmoothingQuality = 'high';
    const s = Math.max(w1 / img.width, h1 / img.height);
    cx.drawImage(img, (w1 - img.width * s) / 2, (h1 - img.height * s) / 2, img.width * s, img.height * s);
    try {
      const d = cx.getImageData(0, 0, w1, h1);
      boxBlurRGBA(d.data, w1, h1, Math.max(2, Math.round(w1 / 40)));
      cx.putImageData(d, 0, 0);
    } catch (_) { /* tainted canvas: fall through, the 2x upscale below still smooths it */ }

    // enlarge in 2x steps (each step is bilinear-smooth) until we are near full size
    while (cur.width * 2 < W) {
      const nxt = mk(cur.width * 2, cur.height * 2), nx = nxt.getContext('2d');
      nx.imageSmoothingEnabled = true; nx.imageSmoothingQuality = 'high';
      nx.drawImage(cur, 0, 0, nxt.width, nxt.height);
      cur = nxt;
    }
    ctx.save();
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(cur, 0, 0, W, H);
    ctx.restore();

    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, 'rgba(8,16,30,0.80)');
    g.addColorStop(1, 'rgba(6,12,24,0.90)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  /* ── one achievement card ── */
  function drawRow(ctx, a, x, y, colW, icons, o, accent) {
    const locked = o.progress && !a.unlocked;

    rr(ctx, x, y, colW, CARD, 8);
    ctx.fillStyle = o.blur ? 'rgba(10,22,40,0.76)' : THEME.panel; ctx.fill();
    ctx.strokeStyle = o.progress && a.unlocked ? rgba(accent, 0.55) : THEME.line;
    ctx.lineWidth = 1; ctx.stroke();

    // icon (colour art; greyscale + dim when locked in progress view)
    const ix = x + 8, iy = y + (CARD - ICON) / 2;
    const img = icons.get(a.icon) || icons.get(a.iconIncomplete);
    ctx.save();
    rr(ctx, ix, iy, ICON, ICON, 6); ctx.clip();
    if (img) {
      if (locked) ctx.globalAlpha = 0.7;
      ctx.drawImage(locked ? greyOf(img) : img, ix, iy, ICON, ICON);
    } else { ctx.fillStyle = THEME.iconBg; ctx.fillRect(ix, iy, ICON, ICON); }
    ctx.restore();
    rr(ctx, ix, iy, ICON, ICON, 6);
    ctx.strokeStyle = locked ? 'rgba(91,112,144,0.45)' : rgba(accent, 0.45);
    ctx.lineWidth = 1; ctx.stroke();

    const textX = ix + ICON + 12;
    let rightEdge = x + colW - 12;
    const statusX = rightEdge - 11;
    if (o.status) rightEdge -= STATUS_W;
    const globalX = rightEdge;
    if (o.global) rightEdge -= GLOBAL_W;

    // hidden tag
    let tagW = 0;
    const showTag = o.hidden && a.isHidden;
    if (showTag) { ctx.font = `600 11px ${FONT.mono}`; tagW = ctx.measureText('HIDDEN').width + 16; }

    // name
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    ctx.fillStyle = locked ? '#8196b3' : THEME.text;
    ctx.font = `600 17px ${FONT.body}`;
    const name = fitText(ctx, a.name, rightEdge - textX - (showTag ? tagW + 8 : 0));
    ctx.fillText(name, textX, y + 24);
    if (showTag) {
      const tx = textX + ctx.measureText(name).width + 8;
      rr(ctx, tx, y + 10, tagW, 18, 9);
      ctx.strokeStyle = THEME.hidden; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = THEME.hidden; ctx.font = `600 11px ${FONT.mono}`;
      ctx.fillText('HIDDEN', tx + 8, y + 23);
    }

    // description (max 2 lines)
    ctx.fillStyle = locked ? THEME.locked : THEME.muted;
    ctx.font = `400 13px ${FONT.body}`;
    wrap(ctx, a.description, rightEdge - textX, 2).forEach((l, i) => ctx.fillText(l, textX, y + 43 + i * 16));

    // global completion rate (plain percentage — no rarity tiers) + small caption
    if (o.global) {
      ctx.textAlign = 'right';
      if (a.pct > 0) {
        ctx.fillStyle = locked ? THEME.locked : rgba(accent, 1);
        ctx.font = `600 14px ${FONT.mono}`;
        ctx.fillText(`${a.pct.toFixed(1)}%`, globalX, y + 31);
        ctx.fillStyle = THEME.locked;
        ctx.font = `500 9px ${FONT.body}`;
        ctx.fillText('Global Unlock Rate', globalX, y + 44);
      } else {
        ctx.fillStyle = THEME.locked; ctx.font = `600 13px ${FONT.mono}`;
        ctx.fillText('—', globalX, y + CARD / 2 + 5);
      }
      ctx.textAlign = 'left';
    }

    // status
    if (o.status) {
      const cy = y + CARD / 2;
      a.unlocked ? drawCheck(ctx, statusX, cy, rgba(accent, 1)) : drawLock(ctx, statusX, cy);
    }
  }

  function drawGroupHead(ctx, label, count, x, y, colW, accent) {
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = rgba(accent, 1); ctx.font = `22px ${FONT.head}`;
    const txt = fitText(ctx, label.toUpperCase(), colW - 90);
    ctx.fillText(txt, x, y + 22);
    let cx = x + ctx.measureText(txt).width + 10;
    ctx.fillStyle = THEME.locked; ctx.font = `400 11px ${FONT.mono}`;
    const c = String(count);
    ctx.fillText(c, cx, y + 21);
    cx += ctx.measureText(c).width + 12;
    ctx.fillStyle = rgba(accent, 0.28);
    ctx.fillRect(cx, y + 16, Math.max(0, x + colW - cx), 1);
  }

  /* ============================================================
     LAYOUT — works from a flat list of entries (rows + group headers)
     ============================================================ */
  function dims(cols, colW) {
    const gridW = cols * colW + (cols - 1) * COL_GAP;
    const base = 2 * PAD + GAP + gridW;
    let W = Math.round(base / (1 - LEFT_FRAC));
    let leftW = Math.round(W * LEFT_FRAC);
    if (leftW > LEFT_MAX) { leftW = LEFT_MAX; W = base + leftW; }
    if (leftW < LEFT_MIN) { leftW = LEFT_MIN; W = base + leftW; }
    return { gridW, W, H: Math.round((W * 9) / 16), leftW };
  }

  function flow(entries, colH, cols) {
    const pos = [];
    let col = 0, y = 0;
    for (const e of entries) {
      const need = e.t === 'head' ? HEAD_H + CARD : CARD;
      if (y > 0 && y + need > colH) { col++; y = 0; }
      if (col >= cols) return null;
      pos.push({ e, col, y });
      y += e.t === 'head' ? HEAD_H : ROW;
    }
    return pos;
  }

  function layout(entries, baseColW) {
    for (let cols = 1; cols <= 80; cols++) {
      const colW = cols === 1 ? Math.max(900, baseColW) : baseColW;
      const d = dims(cols, colW);
      const colH = d.H - PAD - TITLE_H - PAD;
      const pos = flow(entries, colH, cols);
      if (pos) return Object.assign({ cols, colW, colH, pos }, d);
    }
    const d = dims(80, baseColW), colH = d.H - PAD - TITLE_H - PAD;
    return Object.assign({ cols: 80, colW: baseColW, colH, pos: flow(entries, colH, 1e9) }, d);
  }

  /* ── summary panel (left column) ── */
  function drawStatsPanel(ctx, x, y, w, h, st, o, accent) {
    rr(ctx, x, y, w, h, 10);
    ctx.fillStyle = o.blur ? 'rgba(10,22,40,0.76)' : THEME.panel; ctx.fill();
    ctx.strokeStyle = THEME.line; ctx.lineWidth = 1; ctx.stroke();

    const ix = x + 14, iw = w - 28;
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    ctx.fillStyle = THEME.text; ctx.font = `26px ${FONT.head}`;
    ctx.fillText(`${st.total} ACHIEVEMENT${st.total !== 1 ? 'S' : ''}`, ix, y + 14 + 22);

    ctx.fillStyle = rgba(accent, 0.28);
    ctx.fillRect(ix, y + 50, iw, 1);

    const half = iw / 2;
    st.rows.forEach(([label, value], i) => {
      const lx = ix + (i % 2) * half, ly = y + 74 + Math.floor(i / 2) * 22;
      ctx.fillStyle = THEME.muted; ctx.font = `400 12px ${FONT.body}`; ctx.textAlign = 'left';
      ctx.fillText(label, lx, ly);
      ctx.fillStyle = THEME.text; ctx.font = `600 12px ${FONT.mono}`; ctx.textAlign = 'right';
      ctx.fillText(String(value), lx + half - 12, ly);
      ctx.textAlign = 'left';
    });
  }
  const STATS_H = 110;

  /* ============================================================
     MAIN
     ============================================================ */
  async function render(opts) {
    const gameName = opts.gameName || 'Achievements';
    const player = !!opts.hasPlayerData;

    const norm = a => {
      const p = parseFloat(a.completionPercentage);
      return {
        name: a.name || 'Unknown Achievement',
        description: a.description || '',
        isHidden: !!a.isHidden,
        icon: a.icon || '',
        iconIncomplete: a.iconIncomplete || '',
        unlocked: a.completed === true || a.unlocked === true,
        pct: Number.isFinite(p) ? p : 0,
      };
    };
    const rawList = opts.achievements || [];
    const normOf = new Map(rawList.map(a => [a, norm(a)]));
    const list = rawList.map(a => normOf.get(a));
    const statsAll = (opts.statsList && opts.statsList.length ? opts.statsList : rawList).map(norm);

    const o = {
      status: !!opts.showStatus && player,
      progress: !!opts.progressView && player,
      global: !!opts.showGlobal,
      hidden: !!opts.showHidden,
      stats: !!opts.showStats,
      blur: !!opts.blurBg,
      // only for a fully completed game (every achievement of the game, not just the filtered ones)
      badge: !!opts.showBadge && player && statsAll.length > 0 && statsAll.every(a => a.unlocked),
    };

    // grouping (preview passes its own sample groups; full renders detect)
    let groups = null;
    if (opts.group) {
      const raw = opts.groups || (opts.preview ? null : detectGroups(rawList));
      if (raw && raw.length) groups = raw.map(g => ({ label: g.label, items: g.items.map(i => normOf.get(i) || norm(i)) }));
    }
    if (typeof opts.onInfo === 'function') opts.onInfo({ grouped: !!groups });

    const entries = [];
    if (groups) groups.forEach(g => { entries.push({ t: 'head', label: g.label, count: g.items.length }); g.items.forEach(a => entries.push({ t: 'row', a })); });
    else list.forEach(a => entries.push({ t: 'row', a }));
    const flatList = entries.filter(e => e.t === 'row').map(e => e.a);

    try {
      await Promise.all([
        document.fonts.load(`40px ${FONT.head}`),
        document.fonts.load(`600 17px ${FONT.body}`),
        document.fonts.load(`400 13px ${FONT.body}`),
        document.fonts.load(`500 9px ${FONT.body}`),
        document.fonts.load(`600 11px ${FONT.mono}`),
      ]);
    } catch (_) {}

    const colW = 420 + (o.global ? 64 : 0);
    const L = layout(entries, colW);

    let scale = L.W <= 1300 ? 2 : L.W <= 2200 ? 1.5 : 1;
    while ((L.W * scale * L.H * scale > 16000000 || L.W * scale > 15000) && scale > 0.25) scale -= 0.25;
    if (opts.preview) scale = Math.min(scale, 1);

    // images: cover first, then the blurred-background art (banner), then icons.
    // Icons only fall back to the "incomplete" art when the main one is missing.
    const [coverMap, icons, bannerImg, badgeImg] = await Promise.all([
      loadMany([opts.cover, opts.coverFallback]),
      loadMany(flatList.map(a => a.icon)),
      o.blur && opts.banner ? getImage(opts.banner) : Promise.resolve(null),
      o.badge ? getImage(opts.badgeSrc || window.ACHIEVELY_COMPLETION_BADGE || BADGE_SRC) : Promise.resolve(null),
    ]);
    const missing = flatList.filter(a => !(a.icon && icons.get(a.icon)) && a.iconIncomplete && a.iconIncomplete !== a.icon);
    if (missing.length) (await loadMany(missing.map(a => a.iconIncomplete))).forEach((v, k) => icons.set(k, v));
    const coverImg = coverMap.get(opts.cover) || coverMap.get(opts.coverFallback) || null;
    const artImg = coverImg;                        // what the left panel shows
    // background: banner when there is one, otherwise the cover
    let bgImg = bannerImg || coverImg;
    if (o.blur && !bgImg && opts.background) bgImg = await getImage(opts.background);

    const accent = (opts.accentFromArt && artImg && accentFromImage(artImg)) || hex2rgb(THEME.accent);
    const accentCss = rgba(accent, 1);

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(L.W * scale);
    canvas.height = Math.round(L.H * scale);
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);

    // background
    if (o.blur && bgImg) drawBlurBg(ctx, bgImg, L.W, L.H);
    else {
      const tint = opts.accentFromArt ? 0.1 : 0;
      const bg = ctx.createLinearGradient(0, 0, L.W, L.H);
      bg.addColorStop(0, rgba(mix(hex2rgb(THEME.bg2), accent, tint), 1));
      bg.addColorStop(1, THEME.bg);
      ctx.fillStyle = bg; ctx.fillRect(0, 0, L.W, L.H);
    }

    /* ── left column ── */
    const { leftW } = L;
    const titleSize = leftW >= 420 ? 52 : leftW >= 340 ? 46 : 40;
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    ctx.fillStyle = THEME.text;
    ctx.font = `${titleSize}px ${FONT.head}`;
    const nameLines = wrap(ctx, gameName.toUpperCase(), leftW, 3);
    nameLines.forEach((l, i) => ctx.fillText(l, PAD, PAD + titleSize - 6 + i * (titleSize + 2)));
    const nameH = nameLines.length * (titleSize + 2);

    // stack the bottom blocks upwards, then centre the cover in what is left
    const done = statsAll.filter(a => a.unlocked).length, total = statsAll.length;
    const progH = o.progress ? 38 : o.status ? 22 : 0;
    let yb = L.H - PAD - 34;
    let progTop = 0, statsTop = 0;
    if (progH) { yb -= 14 + progH; progTop = yb; }
    if (o.stats) { yb -= 16 + STATS_H; statsTop = yb; }

    const regionTop = PAD + nameH + 22, regionBot = yb - 22;
    const regionH = Math.max(120, regionBot - regionTop);
    const glow = (artImg && artColor(artImg)) || [255, 255, 255];   // white when the art has no colour
    const book = { scale, maxW: leftW, glow, name: gameName };
    // cover: flat 2:3 art (no spine / thickness), tilted in 3D perspective
    const cw = Math.round(Math.min(leftW - 44, (clamp(regionH - 36, 120, 640) * 2) / 3) * 0.96);
    const ch = Math.round((cw * 3) / 2);
    drawBook(ctx, coverImg, PAD + leftW / 2, regionTop + regionH / 2, cw, ch, Object.assign(book, { angle: 16, thick: 0, spine: false, badge: badgeImg }));

    if (o.stats) {
      const rated = statsAll.filter(a => a.pct > 0);
      const hiddenN = statsAll.filter(a => a.isHidden).length;
      const fmt = v => `${v.toFixed(1)}%`;
      drawStatsPanel(ctx, PAD, statsTop, leftW, STATS_H, {
        total,
        rows: [
          ['Normal', total - hiddenN],
          ['Hidden', hiddenN],
          ['Rarest', rated.length ? fmt(Math.min(...rated.map(a => a.pct))) : '—'],
          ['Average', rated.length ? fmt(rated.reduce((n, a) => n + a.pct, 0) / rated.length) : '—'],
        ],
      }, o, accent);
    }

    if (progH) {
      ctx.textAlign = 'left'; ctx.fillStyle = THEME.muted; ctx.font = `400 13px ${FONT.mono}`;
      ctx.fillText(`${done} / ${total} unlocked`, PAD, progTop + 14);
      if (o.progress) {
        const pct = total ? done / total : 0;
        ctx.textAlign = 'right'; ctx.fillStyle = accentCss; ctx.font = `600 13px ${FONT.mono}`;
        ctx.fillText(`${Math.round(pct * 100)}%`, PAD + leftW, progTop + 14);
        ctx.textAlign = 'left';
        ctx.save();
        rr(ctx, PAD, progTop + 24, leftW, 10, 5); ctx.clip();
        ctx.fillStyle = THEME.line; ctx.fillRect(PAD, progTop + 24, leftW, 10);
        const g = ctx.createLinearGradient(PAD, 0, PAD + leftW, 0);
        g.addColorStop(0, rgba(mix(accent, [255, 255, 255], 0.0), 1));
        g.addColorStop(1, rgba(mix(accent, [255, 255, 255], 0.35), 1));
        ctx.fillStyle = g; ctx.fillRect(PAD, progTop + 24, leftW * pct, 10);
        ctx.restore();
      }
    }

    // brand
    const fy = L.H - PAD;
    ctx.textAlign = 'left';
    ctx.fillStyle = accentCss; ctx.font = `28px ${FONT.head}`;
    ctx.fillText('ACHIEVELY', PAD, fy - 4);
    const bw = ctx.measureText('ACHIEVELY').width;
    ctx.fillStyle = THEME.locked; ctx.font = `400 11px ${FONT.mono}`;
    ctx.fillText('achievely.onrender.com', PAD + bw + 12, fy - 5);

    /* ── right: title + grid ── */
    const RIGHT_X = PAD + leftW + GAP;
    ctx.fillStyle = THEME.muted; ctx.font = `26px ${FONT.head}`;
    ctx.fillText('ACHIEVEMENTS', RIGHT_X, PAD + 24);
    ctx.fillStyle = o.blur ? 'rgba(255,255,255,0.14)' : THEME.line;
    ctx.fillRect(RIGHT_X, PAD + 36, L.gridW, 1);

    const startY = PAD + TITLE_H;
    L.pos.forEach(({ e, col, y }) => {
      const x = RIGHT_X + col * (L.colW + COL_GAP);
      if (e.t === 'head') drawGroupHead(ctx, e.label, e.count, x, startY + y, L.colW, accent);
      else drawRow(ctx, e.a, x, startY + y, L.colW, icons, o, accent);
    });

    return new Promise((resolve, reject) =>
      canvas.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png'));
  }

  function download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  window.AchievelyExport = {
    render, download, detectGroups,
    prefetch: urls => loadMany(urls),
  };
})();