import { listCards, getCard, putCard } from '../../../../lib/store.js';
import { SLUG_RE } from '../../../../lib/schema.js';
import { EMPTY_CARD } from '../../../../lib/render.js';

export async function onRequestGet({ env }) { return Response.json(await listCards(env)); }

export async function onRequestPost({ request, env }) {
  const b = await request.json().catch(() => ({}));
  const slug = String(b.slug || '').toLowerCase();
  if (!SLUG_RE.test(slug)) return Response.json({ error: 'Slug must be 2-32 chars: a-z, 0-9, dashes' }, { status: 400 });
  if (await getCard(env, slug)) return Response.json({ error: 'That slug already exists' }, { status: 409 });
  const card = { ...EMPTY_CARD(), ...(b.copyFrom ? (await getCard(env, b.copyFrom)) || {} : {}), label: b.label || slug, isDefault: false };
  await putCard(env, slug, card);
  return Response.json(await getCard(env, slug), { status: 201 });
}
