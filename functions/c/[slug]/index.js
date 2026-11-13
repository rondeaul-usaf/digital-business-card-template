import { getCard } from '../../../lib/store.js';
import { renderCardHTML } from '../../../lib/render.js';

export async function onRequestGet({ params, env, request }) {
  const card = await getCard(env, params.slug);
  if (!card || card.published === false) return new Response('Not found', { status: 404 });
  const origin = new URL(request.url).origin;
  return new Response(renderCardHTML(card, { origin }), {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=30' },
  });
}
