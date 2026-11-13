import { verifySession, configError } from '../lib/auth.js';

export async function onRequest(ctx) {
  const { request, env, next } = ctx;
  const url = new URL(request.url);
  const path = url.pathname;

  if (path.startsWith('/api/admin/')) {
    const err = configError(env);
    if (err) return json({ error: err }, 500);
    if (!(await verifySession(env, request.headers.get('Cookie')))) return json({ error: 'unauthorized' }, 401);
  }
  if (request.method !== 'GET' && request.method !== 'HEAD' && path.startsWith('/api/')) {
    const o = request.headers.get('Origin');
    if (o && o !== url.origin) return json({ error: 'bad origin' }, 403);
  }
  const res = await next();
  const h = new Headers(res.headers);
  h.set('X-Content-Type-Options', 'nosniff');
  h.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (path.startsWith('/admin') || path.startsWith('/api/')) { h.set('X-Frame-Options', 'DENY'); h.set('Cache-Control', 'no-store'); }
  if (path.startsWith('/c/') || path.startsWith('/admin') || path.startsWith('/api/')) h.set('X-Robots-Tag', 'noindex, nofollow');
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
}

function json(o, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json' } });
}
