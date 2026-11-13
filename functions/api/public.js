import { listCards } from '../../lib/store.js';

export async function onRequestGet({ env }) {
  const cards = (await listCards(env)).filter((c) => c.published !== false);
  const out = cards.map((c) => ({ isDefault: c.isDefault === true, slug: c.slug, label: c.label, name: c.name, title: c.title, company: c.company, accent: c.theme?.accent2 }));
  out.sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));
  return Response.json(out);
}
