'use strict';
/* ============================================================
   Achievely — search controller (debounce + cancel + cache)

   Fixes the "one request per typing pause" behaviour:
   • waits for a real pause (default 500 ms) before hitting the API
   • ignores queries shorter than `minLength`
   • aborts the previous in-flight request when a newer one starts
   • drops stale responses (a slow reply can never overwrite a newer one)
   • caches results per normalised query (repeat/backspace = 0 requests)
   • de-dupes: never re-fires the query that is already on screen / in flight
   • ignores keystrokes while an IME composition is active

   const search = createSearchController({
     fetcher:   (q, signal) => Promise<results>,
     onStart:   (q) => {},          // network request about to start (not for cache hits)
     onResults: (results, q) => {}, // fresh results for the current query
     onClear:   () => {},           // input emptied / below minLength
     onError:   (err, q) => {},     // real errors only (aborts are swallowed)
   });
   search.attach(inputEl);          // wires input + composition events
   search.flush(value)  -> Promise  // run now (Enter / button), skips the delay
   search.isFresh(value)            // true if the results on screen match `value`
   search.cancel()
   ============================================================ */
(function () {
  const norm = s => String(s || '').trim().replace(/\s+/g, ' ').toLowerCase();

  function createSearchController(cfg) {
    const delay     = cfg.delay     ?? 500;
    const minLength = cfg.minLength ?? 2;
    const maxCache  = cfg.cacheSize ?? 50;
    const ttl       = cfg.ttl       ?? 5 * 60 * 1000;

    const cache = new Map();           // key -> { at, results }
    let timer = null, ctrl = null, seq = 0;
    let inflightKey = null, shownKey = null, latestKey = '';

    const cacheGet = key => {
      const hit = cache.get(key);
      if (!hit) return null;
      if (Date.now() - hit.at > ttl) { cache.delete(key); return null; }
      cache.delete(key); cache.set(key, hit);        // LRU bump
      return hit;
    };
    const cachePut = (key, results) => {
      cache.set(key, { at: Date.now(), results });
      while (cache.size > maxCache) cache.delete(cache.keys().next().value);
    };

    function cancel() {
      clearTimeout(timer); timer = null;
      if (ctrl) { ctrl.abort(); ctrl = null; }
      inflightKey = null;
      seq++;                                          // invalidates anything still running
    }

    function clear() {
      cancel();
      shownKey = null; latestKey = '';
      if (cfg.onClear) cfg.onClear();
    }

    async function run(raw) {
      const q = String(raw || '').trim().replace(/\s+/g, ' ');
      const key = norm(q);
      latestKey = key;
      if (key.length < minLength) { clear(); return null; }

      const hit = cacheGet(key);
      if (hit) {                                      // free: no request at all
        cancel(); latestKey = key; shownKey = key;
        cfg.onResults(hit.results, q);
        return hit.results;
      }
      if (key === inflightKey) return null;           // identical request already running

      cancel(); latestKey = key;
      const my = ++seq;
      ctrl = new AbortController();
      const signal = ctrl.signal;
      inflightKey = key;
      if (cfg.onStart) cfg.onStart(q);
      try {
        const results = await cfg.fetcher(q, signal);
        if (my !== seq) return null;                  // a newer query took over
        cachePut(key, results);
        shownKey = key; inflightKey = null; ctrl = null;
        cfg.onResults(results, q);
        return results;
      } catch (err) {
        if (my !== seq || (err && err.name === 'AbortError')) return null;
        inflightKey = null; ctrl = null;
        if (cfg.onError) cfg.onError(err, q);
        return null;
      }
    }

    function query(raw) {
      clearTimeout(timer);
      const key = norm(raw);
      latestKey = key;
      if (key.length < minLength) { clear(); return; }
      if (key === shownKey || key === inflightKey) return;   // nothing new to ask
      const hit = cacheGet(key);
      if (hit) { run(raw); return; }                          // cache = instant
      timer = setTimeout(() => run(raw), delay);
    }

    function attach(input) {
      let composing = false;
      input.addEventListener('compositionstart', () => { composing = true; });
      input.addEventListener('compositionend',   () => { composing = false; query(input.value); });
      input.addEventListener('input', e => {
        if (composing || (e && e.isComposing)) return;
        query(input.value);
      });
    }

    return {
      query, attach, cancel,
      flush: raw => { clearTimeout(timer); return run(raw); },
      isFresh: raw => norm(raw) === shownKey,
    };
  }

  window.createSearchController = createSearchController;
})();
