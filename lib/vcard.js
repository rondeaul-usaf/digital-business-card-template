import { safeUrl } from './render.js';

const enc = new TextEncoder();
const esc = (s) => String(s ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

// RFC 2425 line folding, byte-aware (never splits a multibyte character).
function fold(line) {
  if (enc.encode(line).length <= 74) return line;
  const out = []; let cur = ''; let curBytes = 0; let limit = 74;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    if (curBytes + b > limit) { out.push(cur); cur = ''; curBytes = 0; limit = 73; }
    cur += ch; curBytes += b;
  }
  out.push(cur);
  return out.join('\r\n ');
}

const typeOf = (label) => {
  const l = String(label || '').toLowerCase();
  if (/mobile|cell/.test(l)) return 'CELL';
  if (/home|personal/.test(l)) return 'HOME';
  if (/fax/.test(l)) return 'FAX';
  return 'WORK';
};
const inCard = (x) => x && x.show !== false && x.inVcard !== false;

export function buildVcard(card, { photo, compact = false } = {}) {
  const name = String(card.name || '').trim();
  const parts = name.split(/\s+/);
  const family = parts.length > 1 ? parts.pop() : '';
  const given = parts.join(' ');
  const L = ['BEGIN:VCARD', 'VERSION:3.0', `N:${esc(family)};${esc(given)};;;`, `FN:${esc(name)}`];
  const org = [card.company, compact ? '' : card.department].filter(Boolean);
  if (org.length) L.push(`ORG:${org.map(esc).join(';')}`);
  if (card.title) L.push(`TITLE:${esc(card.title)}`);
  for (const p of (card.phones || []).filter(inCard)) if (p.value) L.push(`TEL;TYPE=${typeOf(p.label)},VOICE:${esc(p.value)}`);
  for (const e of (card.emails || []).filter(inCard)) if (e.value) L.push(`EMAIL;TYPE=INTERNET,${/home|personal/i.test(e.label || '') ? 'HOME' : 'WORK'}:${esc(e.value)}`);
  const links = (card.links || []).filter(inCard).map((l) => ({ ...l, url: safeUrl(l.url) })).filter((l) => /^https?:/i.test(l.url));
  if (compact) {
    if (links[0]) L.push(`URL:${links[0].url}`);
  } else {
    links.forEach((l, i) => {
      L.push(`item${i + 1}.URL:${l.url}`);
      L.push(`item${i + 1}.X-ABLabel:${esc(l.label || 'Link')}`);
    });
  }
  if (!compact) {
    const note = [card.location, card.vcardNote].filter(Boolean).join('\n');
    if (note) L.push(`NOTE:${esc(note)}`);
    if (photo) L.push(`PHOTO;ENCODING=b;TYPE=JPEG:${photo}`);
  }
  L.push(`REV:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')}`, 'END:VCARD');
  return L.map(fold).join('\r\n') + '\r\n';
}
