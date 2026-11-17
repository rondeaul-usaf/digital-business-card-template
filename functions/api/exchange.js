import { getCard } from '../../lib/store.js';
import { isExpired } from '../../lib/access.js';
import { safeEqual } from '../../lib/auth.js';
import { record } from '../../lib/stats.js';

const TTL = 60 * 60 * 24 * 180; // received details are deleted automatically after 180 days
const clip = (v, n) => String(v ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, n);
const json = (o, status = 200) => Response.json(o, { status });

// Public: a visitor sends their details to the card owner (only when the card has this switched on).
export async function onRequestPost({ env, request }) {
  let b;
  try { b = await request.json(); } catch { return json({ error: 'Bad request' }, 400); }
  const card = await getCard(env, clip(b?.slug, 40));
  if (!card || card.published === false || !card.exchange?.enabled || isExpired(card)) return json({ error: 'Not available' }, 404);
  if (card.secretKey && !safeEqual(clip(b.k, 40), card.secretKey)) return json({ error: 'Not available' }, 404);
  if (b.hp) return json({ ok: true }); // honeypot: bots fill hidden fields; pretend it worked

  const ip = request.headers.get('CF-Connecting-IP') || 'local';
  const rk = `rlx:${ip}`;
  const n = Number((await env.CARDS.get(rk)) || 0);
  if (n >= 5) return json({ error: 'Too many submissions. Please try again later.' }, 429);

  const name = clip(b.name, 80), email = clip(b.email, 120), phone = clip(b.phone, 30), note = clip(b.note, 500);
  if (!name || (!email && !phone)) return json({ error: 'Please add your name and an email or phone.' }, 400);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return json({ error: 'That email address does not look right.' }, 400);

  await env.CARDS.put(rk, String(n + 1), { expirationTtl: 3600 });
  const id = `${String(Date.now()).padStart(13, '0')}-${crypto.randomUUID().slice(0, 6)}`;
  await env.CARDS.put(`xc:${card.slug}:${id}`, JSON.stringify({ t: new Date().toISOString(), name, email, phone: card.exchange.askPhone ? phone : '', note: card.exchange.askNote !== false ? note : '' }), { expirationTtl: TTL });
  await record(env, card.slug, 'x').catch(() => {});
  return json({ ok: true });
}
