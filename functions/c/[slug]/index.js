import { getCard } from '../../../lib/store.js';
import { renderCardHTML } from '../../../lib/render.js';
import { gate } from '../../../lib/access.js';
import { record, looksLikeBot, cleanSrc } from '../../../lib/stats.js';

export async function onRequestGet({ params, env, request, waitUntil }) {
  const card = await getCard(env, params.slug);
  const g = await gate(card, env, request);
  if (g.res) return g.res;
  const url = new URL(request.url);
  if (!g.owner && request.method === 'GET' && !looksLikeBot(request.headers.get('User-Agent'))) {
    const p = record(env, card.slug, 'v', cleanSrc(url.searchParams.get('src'))).catch(() => {});
    if (waitUntil) waitUntil(p); else await p;
  }
  return new Response(renderCardHTML(card, { origin: url.origin, key: card.secretKey }), {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': card.secretKey ? 'private, no-store' : 'no-cache' },
  });
}
