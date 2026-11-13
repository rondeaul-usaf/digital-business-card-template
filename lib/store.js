import { sanitizeCard, SLUG_RE } from './schema.js';
import { SEEDS, LEGACY_SEEDED } from './seed.js';

const KV = (env) => {
  if (!env.CARDS) throw new Error('KV binding CARDS is missing. See README step 5.');
  return env.CARDS;
};

const seedChecked = new WeakSet();

export async function getIndex(env) {
  const kv = KV(env);
  let idx = await kv.get('index', 'json');
  const fresh = !Array.isArray(idx);
  if (fresh) idx = [];
  if (fresh || !seedChecked.has(kv)) {
    // Each built-in card is created once (tracked in 'seeded'), so deleting one never brings it back.
    let seeded = await kv.get('seeded', 'json');
    if (!Array.isArray(seeded)) seeded = fresh ? [] : [...LEGACY_SEEDED];
    let changed = fresh;
    for (const mk of SEEDS) {
      const c = mk();
      if (seeded.includes(c.slug)) continue;
      if (!idx.includes(c.slug)) {
        await kv.put(`card:${c.slug}`, JSON.stringify(sanitizeCard(c, c.slug)));
        idx.push(c.slug);
      }
      seeded.push(c.slug);
      changed = true;
    }
    if (changed) {
      await kv.put('index', JSON.stringify(idx));
      await kv.put('seeded', JSON.stringify(seeded));
    }
    seedChecked.add(kv);
  }
  return idx;
}

const withDefault = (c, def) => (c ? { ...c, isDefault: c.slug === def } : c);
export const getDefault = async (env) => (await KV(env).get('default')) || '';

export async function getCard(env, slug) {
  if (!SLUG_RE.test(slug || '')) return null;
  await getIndex(env);
  return withDefault(await KV(env).get(`card:${slug}`, 'json'), await getDefault(env));
}

export async function listCards(env) {
  const idx = await getIndex(env);
  const cards = await Promise.all(idx.map((s) => KV(env).get(`card:${s}`, 'json')));
  const def = await getDefault(env);
  return cards.filter(Boolean).map((c) => withDefault(c, def));
}

export async function putCard(env, slug, card) {
  if (!SLUG_RE.test(slug)) throw new Error('bad slug');
  const idx = await getIndex(env);
  const clean = sanitizeCard(card, slug);
  const wantDefault = card && card.isDefault === true;
  delete clean.isDefault; // the default lives in its own key so only one card can hold it
  await KV(env).put(`card:${slug}`, JSON.stringify(clean));
  if (wantDefault) await KV(env).put('default', slug);
  else if (card && card.isDefault === false && (await getDefault(env)) === slug) await KV(env).delete('default');
  if (!idx.includes(slug)) { idx.push(slug); await KV(env).put('index', JSON.stringify(idx)); }
}

export async function deleteCard(env, slug) {
  const idx = await getIndex(env);
  await KV(env).delete(`card:${slug}`);
  if ((await getDefault(env)) === slug) await KV(env).delete('default');
  await KV(env).put('index', JSON.stringify(idx.filter((s) => s !== slug)));
}
