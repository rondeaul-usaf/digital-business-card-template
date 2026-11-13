import { getCard } from '../../../lib/store.js';
import { buildVcard } from '../../../lib/vcard.js';
import { qrSvg } from '../../../lib/qr.js';

function b64(buf) {
  let s = ''; const u = new Uint8Array(buf);
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return btoa(s);
}

export async function onRequestGet({ params, env, request }) {
  const card = await getCard(env, params.slug);
  if (!card || card.published === false) return new Response('Not found', { status: 404 });
  const origin = new URL(request.url).origin;
  const cardUrl = `${origin}/c/${card.slug}`;

  if (params.file === 'contact.vcf') {
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
    const text = compact ? buildVcard(card, { compact: true }) : cardUrl;
    const svg = qrSvg(text, { ecc: compact ? 'L' : 'M', fg: card.theme?.accent2 || '#000000' });
    if (!svg) return new Response('Too much data for a QR code. Hide some fields from the contact file.', { status: 413 });
    return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=60' } });
  }
  return new Response('Not found', { status: 404 });
}
