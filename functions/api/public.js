import { listCards } from '../../lib/store.js';
import { verifySession } from '../../lib/auth.js';
import { isExpired } from '../../lib/access.js';

// The phone app's card list. Anyone can read it, so unlisted, secret-link and expired cards
// are left out unless the editor's sign-in cookie is present (i.e. it is you).
export async function onRequestGet({ env, request }) {
  const owner = request ? await verifySession(env, request.headers.get('Cookie')) : false;
  const cards = (await listCards(env)).filter((c) => c.published !== false && (owner || (c.listed !== false && !c.secretKey && !isExpired(c))));
  const out = cards.map((c) => ({
    isDefault: c.isDefault === true, slug: c.slug, label: c.label, name: c.name, title: c.title, company: c.company, accent: c.theme?.accent2,
    ...(owner && c.secretKey ? { key: c.secretKey } : {}), ...(owner && isExpired(c) ? { expired: true } : {}),
  }));
  out.sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));
  return Response.json(out, { headers: { 'Cache-Control': 'no-store' } });
}
