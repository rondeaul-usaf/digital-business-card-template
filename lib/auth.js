const enc = new TextEncoder();
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function hmac(secret, data) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64u(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
}

function safeEqual(a, b) {
  const x = enc.encode(String(a)), y = enc.encode(String(b));
  let diff = x.length ^ y.length;
  const n = Math.max(x.length, y.length);
  for (let i = 0; i < n; i++) diff |= (x[i] || 0) ^ (y[i] || 0);
  return diff === 0;
}

export function configError(env) {
  if (!env.ADMIN_PASSCODE || !env.SESSION_SECRET || String(env.SESSION_SECRET).length < 16)
    return 'Server is not configured: set ADMIN_PASSCODE and SESSION_SECRET (16+ chars) in Cloudflare Pages settings, then redeploy.';
  return null;
}

export const COOKIE = 'bc_session';
const MAX_AGE = 60 * 60 * 24 * 30;

export async function makeSession(env) {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  const body = `v1.${exp}`;
  return `${body}.${await hmac(env.SESSION_SECRET, body)}`;
}

export async function verifySession(env, cookieHeader) {
  if (configError(env)) return false;
  const m = /(?:^|;\s*)bc_session=([^;]+)/.exec(cookieHeader || '');
  if (!m) return false;
  const [v, exp, sig] = m[1].split('.');
  if (v !== 'v1' || !exp || !sig || Number(exp) < Date.now() / 1000) return false;
  return safeEqual(sig, await hmac(env.SESSION_SECRET, `v1.${exp}`));
}

export const sessionCookie = (val, url) =>
  `${COOKIE}=${val}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${val ? MAX_AGE : 0}${new URL(url).protocol === 'https:' ? '; Secure' : ''}`;

export async function checkPasscode(env, supplied) {
  return safeEqual(supplied ?? '', env.ADMIN_PASSCODE);
}

// Simple per-IP failure limiter backed by KV: 8 failures per hour.
export async function rateLimited(env, ip) {
  const n = Number((await env.CARDS.get(`rl:${ip}`)) || 0);
  return n >= 8;
}
export async function noteFailure(env, ip) {
  const n = Number((await env.CARDS.get(`rl:${ip}`)) || 0);
  await env.CARDS.put(`rl:${ip}`, String(n + 1), { expirationTtl: 3600 });
}
