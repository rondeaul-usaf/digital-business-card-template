import { getCard, putCard, deleteCard } from '../../../../lib/store.js';

export async function onRequestGet({ params, env }) {
  const c = await getCard(env, params.slug);
  return c ? Response.json(c) : new Response('{"error":"not found"}', { status: 404 });
}
export async function onRequestPut({ params, request, env }) {
  if (!(await getCard(env, params.slug))) return Response.json({ error: 'not found' }, { status: 404 });
  const body = await request.json().catch(() => null);
  if (!body) return Response.json({ error: 'bad json' }, { status: 400 });
  await putCard(env, params.slug, body);
  return Response.json(await getCard(env, params.slug));
}
export async function onRequestDelete({ params, env }) {
  await deleteCard(env, params.slug);
  return Response.json({ ok: true });
}
