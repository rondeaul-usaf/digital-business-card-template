import { getStats } from '../../../lib/stats.js';
import { SLUG_RE } from '../../../lib/schema.js';

export async function onRequestGet({ env, request }) {
  const u = new URL(request.url);
  const slug = u.searchParams.get('slug') || '';
  if (!SLUG_RE.test(slug)) return Response.json({ error: 'bad slug' }, { status: 400 });
  const days = Math.max(7, Math.min(90, parseInt(u.searchParams.get('days'), 10) || 30));
  return Response.json(await getStats(env, slug, days));
}
