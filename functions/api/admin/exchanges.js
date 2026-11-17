import { SLUG_RE } from '../../../lib/schema.js';

const ID_RE = /^\d{13}-[a-f0-9-]{6}$/;

// Signed-in only (the middleware checks the cookie for every /api/admin/ path).
export async function onRequestGet({ env, request }) {
  const slug = new URL(request.url).searchParams.get('slug') || '';
  if (!SLUG_RE.test(slug)) return Response.json({ error: 'bad slug' }, { status: 400 });
  const l = await env.CARDS.list({ prefix: `xc:${slug}:`, limit: 200 });
  const rows = await Promise.all(l.keys.map(async (k) => ({ id: k.name.slice(`xc:${slug}:`.length), ...(await env.CARDS.get(k.name, 'json')) })));
  rows.sort((a, b) => (a.id < b.id ? 1 : -1));
  return Response.json(rows.filter((r) => r.name));
}

export async function onRequestDelete({ env, request }) {
  const u = new URL(request.url);
  const slug = u.searchParams.get('slug') || '', id = u.searchParams.get('id') || '';
  if (!SLUG_RE.test(slug) || !ID_RE.test(id)) return Response.json({ error: 'bad request' }, { status: 400 });
  await env.CARDS.delete(`xc:${slug}:${id}`);
  return Response.json({ ok: true });
}
