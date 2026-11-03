// Lightweight spam protection — no third-party services.
// 1. Honeypot: a hidden "website" field real people never fill in.
// 2. Timing: bots submit instantly; humans need a few seconds to fill the form.
// 3. Rate limit: max N submissions per IP per window.
//    Note: this lives in memory, so on Vercel it is per running instance (best effort).
//    If spam gets through after launch, add Cloudflare Turnstile or a shared store (e.g. Upstash Redis).

const MIN_FILL_MS = 3000;
const RATE_LIMIT = Number(process.env.RATE_LIMIT_MAX || 5);
const RATE_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MIN || 15) * 60 * 1000;

const hits = new Map();

export function looksLikeBot(body) {
  if (String(body?.website ?? '').trim() !== '') return 'honeypot';
  const elapsed = Number(body?.elapsedMs);
  if (!Number.isFinite(elapsed) || elapsed < MIN_FILL_MS) return 'too_fast';
  return null;
}

export function isRateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

export function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd) return fwd.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}
