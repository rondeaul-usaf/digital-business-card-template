import { getCard } from '../../../lib/store.js';
import { buildVcard } from '../../../lib/vcard.js';
import { qrSvg } from '../../../lib/qr.js';
import { gate } from '../../../lib/access.js';
import { record, looksLikeBot, cleanSrc } from '../../../lib/stats.js';

function b64(buf) {
  let s = ''; const u = new Uint8Array(buf);
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return btoa(s);
}

export async function onRequestGet({ params, env, request, waitUntil }) {
  const card = await getCard(env, params.slug);
  const g = await gate(card, env, request);
  if (g.res) return g.res;
  const url = new URL(request.url);
  const origin = url.origin;
  const cardUrl = `${origin}/c/${card.slug}`;

  if (params.file === 'contact.vcf') {
    if (!g.owner && request.method === 'GET' && !looksLikeBot(request.headers.get('User-Agent'))) {
      const p = record(env, card.slug, 's').catch(() => {});
      if (waitUntil) waitUntil(p); else await p;
    }
    let photo = '';
    const pid = card.photoVcard || card.photo;
    if (pid) {
      const buf = await env.CARDS.get(`img:${pid}`, 'arrayBuffer');
      if (buf && buf.byteLength < 200000) photo = b64(buf);
    }
    const fname = (card.name || card.slug).replace(/[^\w-]+/g, '_') + '.vcf';
    return new Response(buildVcard(card, { photo }), {
      headers: { 'Content-Type': 'text/vcard; charset=utf-8', 'Content-Disposition': `inline; filename="${fname}"`, 'Cache-Control': 'no-cache' },
    });
  }
  if (params.file === 'qr.svg' || params.file === 'vcard-qr.svg') {
    const compact = params.file === 'vcard-qr.svg';
    // The link QR carries ?src= so scans are counted separately (default "qr"); a secret link adds its key.
    const q = new URLSearchParams();
    if (card.secretKey) q.set('k', card.secretKey);
    q.set('src', cleanSrc(url.searchParams.get('src')) || 'qr');
    const text = compact ? buildVcard(card, { compact: true }) : `${cardUrl}?${q}`;
    const svg = qrSvg(text, { ecc: compact ? 'L' : 'M', fg: card.theme?.accent2 || '#000000' });
    if (!svg) return new Response('Too much data for a QR code. Hide some fields from the contact file.', { status: 413 });
    return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': card.secretKey ? 'private, no-store' : 'public, max-age=60' } });
  }
  return new Response('Not found', { status: 404 });
}
