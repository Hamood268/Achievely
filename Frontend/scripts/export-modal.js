'use strict';
/* ============================================================
   Achievely — shared Export modal (used by achievements.html
   and game.html). Two tabs: Text (copy / .txt) and Image (PNG).

   AchievelyExportModal.init({
     openBtn,                // element or id
     getGame(),              // { name, slug, cover, coverFallback, background }
     getAll(),               // every achievement of the game
     getView(),              // what the page currently shows (filters/search/sort)
     hasPlayerData(),        // true when unlocked state is known
   })
   ============================================================ */
(function () {
  const CSS = `
.export-btn{display:inline-flex;align-items:center;gap:8px;height:38px;padding:0 14px;border-radius:var(--r-pill);border:1px solid var(--cyan-border);background:rgba(13,30,53,.7);color:var(--text-secondary);font-family:var(--font-body);font-size:13px;font-weight:500;cursor:pointer;flex-shrink:0;transition:border-color var(--t-fast),color var(--t-fast),background var(--t-fast)}
.export-btn:hover{border-color:rgba(0,212,255,.5);color:var(--cyan);background:rgba(0,212,255,.08)}
.xm[hidden]{display:none}
.xm{position:fixed;inset:0;z-index:200;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(2,8,18,.74);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
.xm__dialog{width:min(100%,640px);max-height:min(92dvh,780px);display:flex;flex-direction:column;gap:var(--sp-md);padding:var(--sp-lg);box-sizing:border-box;background:rgba(8,18,34,.98);border:1px solid var(--cyan-border);border-radius:var(--r-lg);box-shadow:0 24px 60px rgba(0,0,0,.6),0 0 30px rgba(0,212,255,.12);animation:xm-in .25s ease forwards}
@keyframes xm-in{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
.xm__head{display:flex;align-items:flex-start;justify-content:space-between;gap:var(--sp-md)}
.xm__title{margin:0;font-family:var(--font-display);font-size:26px;letter-spacing:.06em;color:var(--text-primary)}
.xm__count{margin-top:2px;font-size:12px;color:var(--text-muted);font-family:var(--font-mono)}
.xm__close{display:flex;align-items:center;justify-content:center;width:32px;height:32px;flex-shrink:0;border:none;border-radius:50%;background:rgba(255,255,255,.06);color:var(--text-muted);cursor:pointer;transition:color var(--t-fast),background var(--t-fast)}
.xm__close:hover{color:var(--text-primary);background:rgba(255,255,255,.12)}
.xm__tabs{display:flex;gap:4px;padding:4px;border-radius:var(--r-pill);background:rgba(255,255,255,.05);border:1px solid var(--cyan-border);align-self:flex-start}
.xm__tab{padding:7px 18px;border:none;border-radius:var(--r-pill);background:transparent;color:var(--text-secondary);font:600 13px var(--font-body);cursor:pointer;transition:background var(--t-fast),color var(--t-fast)}
.xm__tab[aria-selected="true"]{background:rgba(0,212,255,.22);color:var(--cyan)}
.xm__pane{display:flex;flex-direction:column;gap:var(--sp-md);min-height:0;overflow:auto;scrollbar-width:none;-ms-overflow-style:none}
.xm__pane::-webkit-scrollbar{display:none;width:0;height:0}
.xm,.xm *{scrollbar-width:none;-ms-overflow-style:none}
.xm *::-webkit-scrollbar{display:none;width:0;height:0}
.xm__pane[hidden]{display:none}
.xm__group{display:flex;flex-direction:column;gap:var(--sp-sm)}
.xm__label{font:600 11px var(--font-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--text-muted)}
.xm__opts{display:flex;flex-wrap:wrap;gap:var(--sp-sm) var(--sp-lg)}
.xm-toggle{display:inline-flex;align-items:center;gap:10px;cursor:pointer;font-size:13px;color:var(--text-secondary);user-select:none}
.xm-toggle input{position:absolute;opacity:0;width:0;height:0}
.xm-toggle__track{position:relative;width:36px;height:20px;flex-shrink:0;border-radius:999px;background:rgba(255,255,255,.1);border:1px solid var(--cyan-border);transition:background var(--t-fast),border-color var(--t-fast)}
.xm-toggle__track::after{content:'';position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:var(--text-muted);transition:transform var(--t-fast),background var(--t-fast)}
.xm-toggle input:checked+.xm-toggle__track{background:rgba(0,212,255,.25);border-color:var(--cyan)}
.xm-toggle input:checked+.xm-toggle__track::after{transform:translateX(16px);background:var(--cyan)}
.xm-toggle input:focus-visible+.xm-toggle__track{box-shadow:0 0 0 3px rgba(0,212,255,.25)}
.xm-toggle input:disabled~*{opacity:.4}
.xm-toggle:has(input:disabled){cursor:not-allowed}
.xm-toggle code{font-family:var(--font-mono);font-size:12px;color:var(--cyan)}
.xm-tag{font:600 10px var(--font-mono);font-style:normal;letter-spacing:.06em;text-transform:uppercase;color:var(--gold);border:1px solid var(--gold-border);border-radius:999px;padding:1px 6px;margin-left:4px}
.xm__select{height:38px;padding:0 12px;border-radius:var(--r-md);border:1px solid var(--cyan-border);background:rgba(5,13,26,.8);color:var(--text-primary);font:500 13px var(--font-body);outline:none}
.xm__select:focus{border-color:var(--cyan)}
.xm__text{width:100%;min-height:150px;box-sizing:border-box;resize:vertical;padding:12px 14px;background:rgba(5,13,26,.8);border:1px solid var(--cyan-border);border-radius:var(--r-md);color:var(--text-primary);font:12.5px/1.6 var(--font-mono);white-space:pre;overflow:auto;outline:none}
.xm__note{font-size:12px;color:var(--text-muted);margin:0}
.xm__preview{width:100%;aspect-ratio:16/9;border-radius:var(--r-md);border:1px solid var(--cyan-border);background:rgba(5,13,26,.8);display:block;object-fit:contain}
.xm__actions{display:flex;flex-wrap:wrap;gap:var(--sp-sm);justify-content:flex-end}
.xm__btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:10px 18px;border-radius:var(--r-pill);border:1px solid var(--cyan-border);background:rgba(13,30,53,.7);color:var(--text-secondary);font:600 13px var(--font-body);cursor:pointer;transition:border-color var(--t-fast),color var(--t-fast),background var(--t-fast)}
.xm__btn:hover:not(:disabled){border-color:rgba(0,212,255,.5);color:var(--text-primary)}
.xm__btn:disabled{opacity:.6;cursor:progress}
.xm__btn--primary{background:linear-gradient(135deg,rgba(0,212,255,.28),rgba(0,184,217,.18));border-color:var(--cyan);color:var(--cyan)}
@media (max-width:600px){
  .xm{align-items:flex-end;padding:0}
  .xm__dialog{width:100%;max-height:92dvh;border-radius:var(--r-lg) var(--r-lg) 0 0;padding-bottom:calc(var(--sp-lg) + env(safe-area-inset-bottom,0px))}
  .xm__actions>*{flex:1}
}
@media (max-width:480px){.export-btn__label{display:none}.export-btn{width:38px;padding:0;justify-content:center}}
`;

  const isUnlocked = a => a.completed === true || a.unlocked === true;
  const pctOf = a => {
    const p = parseFloat(a.completionPercentage);
    return Number.isFinite(p) ? p : Infinity;
  };
  const slug = s => String(s || 'achievements').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'achievements';

  /* A short sample that shows what the toggles do: first rows plus one hidden,
     one unlocked and one locked entry when they exist. */
  function pickSample(list, max, player) {
    const picks = new Set(list.slice(0, 3));
    const firstHidden = list.find(a => a.isHidden);
    if (firstHidden) picks.add(firstHidden);
    if (player) {
      const u = list.find(isUnlocked), l = list.find(a => !isUnlocked(a));
      if (u) picks.add(u);
      if (l) picks.add(l);
    }
    return list.filter(a => picks.has(a)).slice(0, max);
  }

  function buildText(list, gameName, o) {
    const lines = [gameName || 'Achievements'];
    list.forEach(a => {
      let line = a.name || 'Unknown Achievement';
      if (a.description) line += ` - ${a.description}`;
      if (o.hidden && a.isHidden) line += ' (Hidden)';
      const done = isUnlocked(a);
      let prefix = '';
      if (o.todo) prefix = o.status && done ? '[x] ' : '[ ] ';
      else if (o.status) prefix = done ? '✓ ' : '✗ ';
      lines.push(prefix + line);
    });
    return lines.join('\n');
  }

  const tg = (id, label, checked, extra) =>
    `<label class="xm-toggle"><input type="checkbox" id="${id}"${checked ? ' checked' : ''}/><span class="xm-toggle__track" aria-hidden="true"></span><span class="xm-toggle__label">${label}${extra || ''}</span></label>`;
  const EXP = '<em class="xm-tag">experimental</em>';

  let ctl = null; // set once the modal DOM exists

  function init(cfg) {
    const openBtn = typeof cfg.openBtn === 'string' ? document.getElementById(cfg.openBtn) : (cfg.openBtn || null);
    // Modal already built (e.g. a second trigger on the same page): just wire the extra button
    if (ctl) { if (openBtn) ctl.bind(openBtn, cfg); return; }
    if (document.getElementById('xm')) return;
    const baseCfg = cfg;   // the page's main export config; other triggers can pass their own
    let trigger = openBtn; // element to return focus to on close

    const st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);

    const root = document.createElement('div');
    root.className = 'xm';
    root.id = 'xm';
    root.hidden = true;
    root.innerHTML = `
<div class="xm__dialog" role="dialog" aria-modal="true" aria-labelledby="xm-title">
  <div class="xm__head">
    <div><h2 class="xm__title" id="xm-title">Export Achievements</h2><div class="xm__count" id="xm-count"></div></div>
    <button type="button" class="xm__close" id="xm-close" aria-label="Close"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
  </div>
  <div class="xm__tabs" role="tablist" aria-label="Export type">
    <button type="button" class="xm__tab" role="tab" data-tab="text" aria-selected="true">Text</button>
    <button type="button" class="xm__tab" role="tab" data-tab="image" aria-selected="false">Image</button>
  </div>

  <div class="xm__pane" id="xm-pane-text">
    <div class="xm__opts">
      ${tg('xm-t-todo', 'To-do list <code>[ ]</code>', false)}
      ${tg('xm-t-status', 'Unlocked / locked indicator', false)}
      ${tg('xm-t-hidden', 'Hidden marker <code>(Hidden)</code>', true)}
    </div>
    <textarea class="xm__text" id="xm-t-text" readonly spellcheck="false" aria-label="Text export preview"></textarea>
    <p class="xm__note" id="xm-t-note"></p>
    <div class="xm__actions">
      <button type="button" class="xm__btn xm__btn--primary" id="xm-t-copy"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg><span>Copy</span></button>
      <button type="button" class="xm__btn" id="xm-t-dl">Download .txt</button>
    </div>
  </div>

  <div class="xm__pane" id="xm-pane-image" hidden>
    <div class="xm__group">
      <label class="xm__label" for="xm-i-filter">Achievements to include</label>
      <select class="xm__select" id="xm-i-filter"></select>
    </div>
    <div class="xm__group">
      <div class="xm__label">Show</div>
      <div class="xm__opts">
        ${tg('xm-i-status', 'Completed / not completed', true)}
        ${tg('xm-i-global', 'Global completion rate', true)}
        ${tg('xm-i-hidden', 'Hidden tag', true)}
        ${tg('xm-i-stats', 'Summary stats', true)}
      </div>
    </div>
    <div class="xm__group">
      <div class="xm__label">Style</div>
      <div class="xm__opts">
        ${tg('xm-i-progress', 'Progress view <span style="opacity:.7">(greyscale locked + bar)</span>', false)}
        ${tg('xm-i-accent', 'Colors from game art', true)}
        ${tg('xm-i-blur', 'Blurred art background', false, EXP)}
        ${tg('xm-i-group', 'Group by category', false, EXP)}
      </div>
    </div>
    <img class="xm__preview" id="xm-i-preview" alt="Preview of the exported image" />
    <p class="xm__note" id="xm-i-note"></p>
    <div class="xm__actions">
      <button type="button" class="xm__btn xm__btn--primary" id="xm-i-dl">Download PNG</button>
    </div>
  </div>
</div>`;
    document.body.appendChild(root);

    const $ = id => document.getElementById(id);
    const on = id => $(id).checked;
    let tab = 'text', prevUrl = null, token = 0, timer = null, copyTimer = null;

    /* ── shared helpers ── */
    const game = () => cfg.getGame() || {};
    const all = () => cfg.getAll() || [];
    const player = () => !!cfg.hasPlayerData();

    function setTab(t) {
      tab = t;
      root.querySelectorAll('.xm__tab').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === t)));
      $('xm-pane-text').hidden = t !== 'text';
      $('xm-pane-image').hidden = t !== 'image';
      if (t === 'text') refreshText(); else refreshImage();
    }

    /* ── Text ── */
    function textOpts() {
      return { todo: on('xm-t-todo'), status: on('xm-t-status'), hidden: on('xm-t-hidden') };
    }
    function refreshText() {
      const list = cfg.getView() || [];
      const total = all().length, g = game();
      const sample = pickSample(list, 5, player());
      let preview = buildText(sample, g.name, textOpts());
      const rest = list.length - sample.length;
      if (rest > 0) preview += `\n… +${rest} more`;
      $('xm-t-text').value = preview;
      $('xm-count').textContent = list.length === total
        ? `${total} achievement${total !== 1 ? 's' : ''}`
        : `${list.length} of ${total} achievements (current filter/search)`;
      $('xm-t-note').textContent = `Preview shows a sample of ${sample.length}. Copy and download include all ${list.length}.`;
    }
    const fullText = () => buildText(cfg.getView() || [], game().name, textOpts());

    async function copy() {
      const text = fullText();
      let ok = false;
      try { await navigator.clipboard.writeText(text); ok = true; }
      catch (_) {
        const ta = document.createElement('textarea');
        ta.value = text; document.body.appendChild(ta); ta.select();
        try { ok = document.execCommand('copy'); } catch (__) {}
        ta.remove();
      }
      const label = $('xm-t-copy').querySelector('span');
      label.textContent = ok ? 'Copied!' : 'Press Ctrl+C';
      clearTimeout(copyTimer);
      copyTimer = setTimeout(() => { label.textContent = 'Copy'; }, 1800);
    }
    function downloadText() {
      const blob = new Blob([fullText()], { type: 'text/plain;charset=utf-8' });
      AchievelyExport.download(blob, `${game().slug || slug(game().name)}-achievements.txt`);
    }

    /* ── Image ── */
    const FILTERS = [
      ['all', 'All achievements'],
      ['unlocked', 'Unlocked only'],
      ['locked', 'Locked only'],
      ['normal', 'Normal only'],
      ['hidden', 'Hidden only'],
      ['category', 'Category only'],
      ['rarest', 'Rarest 10'],
    ];

    const byRarity = arr => [...arr].sort((x, y) => pctOf(x) - pctOf(y));

    /* Categories detected for the whole game, without the "Other" bucket
       (achievements that belong to no category). Cached per achievement list. */
    let catFor = null, catCache = null;
    function categoryGroups() {
      const a = all();
      if (catFor !== a) {
        catFor = a;
        const g = AchievelyExport.detectGroups(a);
        const out = g ? g.filter(x => x.label !== 'Other')
          .map(x => ({ label: x.label, items: byRarity(x.items) }))
          .filter(x => x.items.length) : [];
        catCache = out.length ? out : null;
      }
      return catCache;
    }

    function listFor(f) {
      const a = all();
      switch (f) {
        case 'all': return byRarity(a);
        case 'unlocked': return byRarity(a.filter(isUnlocked));
        case 'locked': return byRarity(a.filter(x => !isUnlocked(x)));
        case 'normal': return byRarity(a.filter(x => !x.isHidden));
        case 'hidden': return byRarity(a.filter(x => x.isHidden));
        case 'category': { const g = categoryGroups(); return g ? g.flatMap(x => x.items) : []; }
        case 'rarest': return byRarity(a).slice(0, 10);
        default: return a;
      }
    }

    function buildFilterOptions() {
      const sel = $('xm-i-filter'), keep = sel.value || 'all', p = player();
      const hasCats = !!categoryGroups();
      sel.innerHTML = FILTERS.map(([v, l]) => {
        const noPlayer = !p && (v === 'unlocked' || v === 'locked');
        const noCats = v === 'category' && !hasCats;
        const dis = noPlayer || noCats;
        const why = noPlayer ? ' — needs Steam ID' : noCats ? ' — no categories found' : '';
        return `<option value="${v}"${dis ? ' disabled' : ''}>${l} (${listFor(v).length})${why}</option>`;
      }).join('');
      sel.value = [...sel.options].some(o => o.value === keep && !o.disabled) ? keep : 'all';
    }

    function syncAvailability() {
      const p = player();
      ['xm-i-status', 'xm-i-progress'].forEach(id => {
        const el = $(id);
        el.disabled = !p;
        el.closest('label').title = p ? '' : 'Link your Steam ID to use this';
        if (!p) el.checked = false;
      });
      $('xm-t-status').disabled = !p;
      $('xm-t-status').closest('label').title = p ? '' : 'Link your Steam ID to use this';
      if (!p) $('xm-t-status').checked = false;
    }

    function imageOpts(list, extra) {
      const g = game();
      return Object.assign({
        gameName: g.name, cover: g.cover, coverFallback: g.coverFallback, background: g.background,
        banner: g.banner,
        achievements: list, statsList: all(), hasPlayerData: player(),
        showStatus: on('xm-i-status'), showGlobal: on('xm-i-global'), showHidden: on('xm-i-hidden'),
        showStats: on('xm-i-stats'), progressView: on('xm-i-progress'),
        accentFromArt: on('xm-i-accent'), blurBg: on('xm-i-blur'), group: on('xm-i-group'),
      }, extra);
    }

    function setNote(msg) { $('xm-i-note').textContent = msg; }

    /* groups the image should use: the detected categories for "Category only",
       otherwise null (the renderer detects them itself on the filtered list) */
    const forcedGroups = f => (f === 'category' && on('xm-i-group') ? categoryGroups() : null);

    function previewSample(list, f) {
      if (on('xm-i-group')) {
        const groups = forcedGroups(f) || AchievelyExport.detectGroups(list);
        if (groups) {
          const g = groups.slice(0, 3).map(x => ({ label: x.label, items: x.items.slice(0, 2) }));
          return { sample: g.flatMap(x => x.items), groups: g };
        }
      }
      return { sample: pickSample(list, 6, player()) };
    }

    function refreshImage() {
      buildFilterOptions();
      syncAvailability();
      const n = listFor($('xm-i-filter').value).length;
      $('xm-count').textContent = `${n} achievement${n !== 1 ? 's' : ''} in the image`;
      clearTimeout(timer);
      setNote('Updating preview…');
      timer = setTimeout(renderPreview, 120);
    }

    async function renderPreview() {
      const my = ++token;
      const f = $('xm-i-filter').value;
      const list = listFor(f);
      const img = $('xm-i-preview');
      if (!list.length) { setNote('No achievements match this filter.'); img.removeAttribute('src'); return; }
      const { sample, groups } = previewSample(list, f);
      let info = null;
      try {
        const blob = await AchievelyExport.render(imageOpts(sample, {
          statsList: all(), preview: true, groups, onInfo: i => { info = i; },
        }));
        if (my !== token) return;
        const url = URL.createObjectURL(blob);
        img.src = url;
        if (prevUrl) URL.revokeObjectURL(prevUrl);
        prevUrl = url;
        let msg = `Preview uses a sample of ${sample.length}. The full image includes all ${list.length}.`;
        if (on('xm-i-group') && !(info && info.grouped)) msg += ' No categories were detected for this game, so it exports as one list.';
        setNote(msg);
      } catch (_) { if (my === token) setNote('Preview failed. You can still try downloading.'); }
    }

    async function downloadImage() {
      const btn = $('xm-i-dl');
      const f = $('xm-i-filter').value;
      const list = listFor(f);
      if (!list.length) return;
      btn.disabled = true; btn.textContent = 'Rendering…';
      try {
        const blob = await AchievelyExport.render(imageOpts(list, { groups: forcedGroups(f) }));
        const suffix = f === 'all' ? '' : `-${f}`;
        AchievelyExport.download(blob, `${game().slug || slug(game().name)}-achievements${suffix}.png`);
        btn.textContent = 'Done!';
      } catch (_) { btn.textContent = 'Failed, try again'; }
      finally {
        btn.disabled = false;
        setTimeout(() => { btn.textContent = 'Download PNG'; }, 1800);
      }
    }

    /* ── open / close ── */
    function open() {
      if (!all().length) return;
      root.hidden = false;
      document.body.style.overflow = 'hidden';
      setTab(tab);
      $('xm-close').focus();
    }
    function close() {
      root.hidden = true;
      document.body.style.overflow = '';
      if (trigger && trigger.isConnected) trigger.focus();
    }

    /* Open for a given config (defaults to the page's main one). */
    function show(next, from) {
      cfg = next || baseCfg;
      trigger = from || openBtn;
      $('xm-i-preview').removeAttribute('src'); // don't flash the previous game's preview
      open();
    }
    ctl = {
      open: show,
      bind: (btn, c) => btn.addEventListener('click', () => show(c, btn)),
    };

    if (openBtn) openBtn.addEventListener('click', () => show(baseCfg, openBtn));
    $('xm-close').addEventListener('click', close);
    root.addEventListener('click', e => { if (e.target === root) close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !root.hidden) close(); });
    root.querySelectorAll('.xm__tab').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));
    ['xm-t-todo', 'xm-t-status', 'xm-t-hidden'].forEach(id => $(id).addEventListener('change', refreshText));
    ['xm-i-filter', 'xm-i-status', 'xm-i-global', 'xm-i-hidden', 'xm-i-stats', 'xm-i-progress', 'xm-i-accent', 'xm-i-blur', 'xm-i-group']
      .forEach(id => $(id).addEventListener('change', () => {
        const n = listFor($('xm-i-filter').value).length;
        $('xm-count').textContent = `${n} achievement${n !== 1 ? 's' : ''} in the image`;
        clearTimeout(timer); setNote('Updating preview…');
        timer = setTimeout(renderPreview, 120);
      }));
    $('xm-t-copy').addEventListener('click', copy);
    $('xm-t-dl').addEventListener('click', downloadText);
    $('xm-i-dl').addEventListener('click', downloadImage);
  }

  window.AchievelyExportModal = {
    init,
    /* Open the modal for any list of achievements, from any button:
       AchievelyExportModal.open({ getGame, getAll, getView, hasPlayerData }, triggerEl) */
    open(cfg, from) {
      if (!ctl) init(Object.assign({}, cfg, { openBtn: null }));
      if (ctl) ctl.open(cfg, from);
    },
  };
})();