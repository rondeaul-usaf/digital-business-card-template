// Privacy-friendly activity counters: only counts per day and per source label. No IPs, no browser details.
const BOT = /bot|crawl|spider|preview|facebookexternalhit|slack|whatsapp|telegram|discord|skype|curl|wget|headless|monitor/i;
export const looksLikeBot = (ua) => !ua || BOT.test(ua);
export const cleanSrc = (v) => (/^[a-z0-9_-]{1,20}$/i.test(v || '') ? v.toLowerCase() : '');

const ym = (d) => d.toISOString().slice(0, 7);
const key = (slug, d) => `stats:${slug}:${ym(d)}`;

// kind: 'v' page view, 's' contact saved, 'x' details received. Counts are approximate (no atomic counters in KV).
export async function record(env, slug, kind, src = '', now = new Date()) {
  const k = key(slug, now);
  const data = (await env.CARDS.get(k, 'json')) || { d: {}, src: {} };
  const day = String(now.getUTCDate()).padStart(2, '0');
  const row = (data.d[day] = data.d[day] || { v: 0, s: 0, x: 0 });
  row[kind] = (row[kind] || 0) + 1;
  if (kind === 'v') {
    let name = cleanSrc(src) || 'direct';
    if (!data.src[name] && Object.keys(data.src).length >= 25) name = 'other';
    data.src[name] = (data.src[name] || 0) + 1;
  }
  await env.CARDS.put(k, JSON.stringify(data), { expirationTtl: 60 * 60 * 24 * 400 });
}

export async function getStats(env, slug, days = 30, now = new Date()) {
  const months = new Map();
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const k = key(slug, d);
    if (!months.has(k)) months.set(k, (await env.CARDS.get(k, 'json')) || { d: {}, src: {} });
    const row = months.get(k).d[String(d.getUTCDate()).padStart(2, '0')] || {};
    out.push({ date: d.toISOString().slice(0, 10), v: row.v || 0, s: row.s || 0, x: row.x || 0 });
  }
  const sources = {};
  for (const m of months.values()) for (const [n, c] of Object.entries(m.src || {})) sources[n] = (sources[n] || 0) + c;
  const totals = out.reduce((a, r) => ({ v: a.v + r.v, s: a.s + r.s, x: a.x + r.x }), { v: 0, s: 0, x: 0 });
  return { days: out, totals, sources: Object.entries(sources).map(([name, v]) => ({ name, v })).sort((a, b) => b.v - a.v).slice(0, 12) };
}
