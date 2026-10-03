/* Image proxy — lets the browser draw cross-origin Steam / RAWG images onto a
   canvas without tainting it (needed for the PNG export).
   Locked down: https only, host allowlist, raster images only, size + time
   limits (covering the whole body download), redirects re-checked against
   the allowlist.

   Optimizations over the previous version
     - one upstream request per URL, however many clients ask at once
     - byte-budgeted LRU cache (was: entry count only, up to ~1.8 GB)
     - body is streamed with a hard byte cap (no unbounded buffering when
       content-length is missing or lies)
     - the timeout now covers the body download, not just the headers
     - ETag + 304 so browsers revalidate for free; long browser caching
       (Steam/RAWG image URLs are content-addressed)
     - short negative cache so a broken URL isn't hammered
     - explicit MIME allowlist (no more "anything image/* except svg")
   Requires Node 18+ (global fetch / web streams). */

const crypto = require("crypto");

const MAX_BYTES     = 6 * 1024 * 1024;        // per image
const CACHE_BYTES   = 96 * 1024 * 1024;       // whole cache
const TIMEOUT_MS    = 8000;                   // headers + body, together
const MAX_HOPS      = 2;
const CACHE_TTL     = 6 * 60 * 60 * 1000;
const FAIL_TTL      = 30 * 1000;
const BROWSER_CACHE = "public, max-age=604800, stale-while-revalidate=86400";

const ALLOWED_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif", "image/avif",
]);

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

/* ── cache: Map keeps insertion order, so re-inserting on hit gives LRU ── */
const cache = new Map();                      // url -> { buf, type, etag, at }
let cacheSize = 0;
const failed   = new Map();                   // url -> { status, message, at }
const inflight = new Map();                   // url -> Promise<entry>

function cacheDelete(key) {
  const e = cache.get(key);
  if (e) { cacheSize -= e.buf.length; cache.delete(key); }
}
function cacheGet(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL) { cacheDelete(key); return null; }
  cache.delete(key); cache.set(key, hit);     // mark as most recently used
  return hit;
}
function cacheSet(key, entry) {
  cacheDelete(key);
  cache.set(key, entry);
  cacheSize += entry.buf.length;
  while (cacheSize > CACHE_BYTES && cache.size) cacheDelete(cache.keys().next().value);
}

/* ── allowlist ── */
function isAllowedHost(host) {
  host = host.toLowerCase();
  return (
    host === "steamcdn-a.akamaihd.net" ||
    host === "media.rawg.io" ||
    host === "cdn2.steamgriddb.com" ||
    host === "steamgriddb.com" ||
    host.endsWith(".steamstatic.com")          // cdn.*, shared.*.steamstatic.com (banners, library art…)
  );
}

function parseAllowed(raw) {
  if (typeof raw !== "string" || raw.length > 2048) return null;
  let u;
  try { u = new URL(raw); } catch { return null; }
  if (u.protocol !== "https:" || u.port || u.username || u.password) return null;
  return isAllowedHost(u.hostname) ? u : null;
}

/* ── upstream fetch: manual redirects, one abort signal for everything ── */
async function fetchAllowed(url, signal, hops = 0) {
  const r = await fetch(url, { signal, redirect: "manual", headers: { Accept: "image/*" } });
  if (r.status >= 300 && r.status < 400 && r.headers.get("location")) {
    if (hops >= MAX_HOPS) throw new HttpError(502, "Too many redirects.");
    const next = parseAllowed(new URL(r.headers.get("location"), url).href);
    if (!next) throw new HttpError(502, "Redirect to a disallowed host.");
    r.body?.cancel?.().catch(() => {});
    return fetchAllowed(next.href, signal, hops + 1);
  }
  return r;
}

async function readCapped(res) {
  const chunks = [];
  let total = 0;
  const reader = res.body.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > MAX_BYTES) throw new HttpError(413, "Image is too large.");
      chunks.push(value);
    }
  } catch (err) {
    reader.cancel().catch(() => {});
    throw err;
  }
  return Buffer.concat(chunks, total);
}

async function download(key) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);   // covers headers AND body
  try {
    const r = await fetchAllowed(key, ctrl.signal);
    if (!r.ok || !r.body) throw new HttpError(502, "Image source returned an error.");

    const type = (r.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    if (!ALLOWED_TYPES.has(type)) throw new HttpError(415, "Only raster images are allowed.");

    const declared = Number(r.headers.get("content-length") || 0);
    if (declared > MAX_BYTES) throw new HttpError(413, "Image is too large.");

    const buf = await readCapped(r);
    const etag = `"${crypto.createHash("sha1").update(buf).digest("base64url").slice(0, 22)}"`;
    return { buf, type, etag, at: Date.now() };
  } catch (err) {
    if (err instanceof HttpError) throw err;
    if (err.name === "AbortError") throw new HttpError(504, "Image source timed out.");
    throw new HttpError(502, "Could not fetch the image.");
  } finally {
    clearTimeout(timer);
  }
}

/* de-duplicates concurrent requests for the same image */
function load(key) {
  let p = inflight.get(key);
  if (!p) {
    p = download(key)
      .then(entry => { if (entry.buf.length <= CACHE_BYTES / 4) cacheSet(key, entry); return entry; })
      .catch(err => { failed.set(key, { status: err.status || 502, message: err.message, at: Date.now() }); throw err; })
      .finally(() => inflight.delete(key));
    inflight.set(key, p);
  }
  return p;
}

const STATUS_NAMES = {
  400: "Bad Request", 413: "Payload Too Large", 415: "Unsupported Media Type",
  502: "Bad Gateway", 504: "Gateway Timeout",
};
function sendError(res, status, message) {
  return res.status(status).json({ code: status, status: STATUS_NAMES[status] || "Error", message });
}

function sendImage(req, res, entry) {
  res.set("ETag", entry.etag);
  res.set("Cache-Control", BROWSER_CACHE);
  res.set("X-Content-Type-Options", "nosniff");
  if (req.headers["if-none-match"] === entry.etag) return res.status(304).end();
  res.set("Content-Type", entry.type);
  res.set("Content-Length", String(entry.buf.length));
  return res.send(entry.buf);
}

const imageProxy = async (req, res) => {
  const target = parseAllowed(req.query.url);
  if (!target) return sendError(res, 400, "Invalid or disallowed image URL.");

  const key = target.href;

  const hit = cacheGet(key);
  if (hit) return sendImage(req, res, hit);

  const bad = failed.get(key);
  if (bad) {
    if (Date.now() - bad.at < FAIL_TTL) return sendError(res, bad.status, bad.message);
    failed.delete(key);
  }
  if (failed.size > 500) failed.clear();

  try {
    return sendImage(req, res, await load(key));
  } catch (err) {
    if (!(err instanceof HttpError)) console.error("Image proxy error:", err.message);
    return sendError(res, err.status || 502, err.status ? err.message : "Could not fetch the image.");
  }
};

module.exports = { imageProxy };
