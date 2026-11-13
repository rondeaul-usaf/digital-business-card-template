// Pure rendering helpers shared by the server (Pages Functions) and the admin preview.
// No dependencies, no DOM access.

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function safeUrl(u) {
  u = String(u ?? '').trim();
  if (!u) return '';
  if (/^(https?:|mailto:|tel:)/i.test(u)) return u;
  if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return ''; // block javascript:, data:, etc.
  if (/^[^\s/]+\.[^\s/]{2,}/.test(u)) return 'https://' + u;
  return '';
}

export const telHref = (v) => 'tel:' + String(v ?? '').replace(/[^\d+]/g, '');

export function hostOf(u) {
  try { return new URL(safeUrl(u)).host.replace(/^www\./, ''); } catch { return ''; }
}

export const BANNERS = {
  sky: 'linear-gradient(135deg,#0176D3 0%,#1B96FF 55%,#90D0FE 100%)',
  deep: 'linear-gradient(160deg,#032D60 0%,#0B5CAB 55%,#0176D3 100%)',
  cloud: 'linear-gradient(135deg,#00A1E0 0%,#78B0FD 60%,#EAF5FE 100%)',
  slate: 'linear-gradient(135deg,#1B2430 0%,#3A4A5E 60%,#6B7F96 100%)',
  sunset: 'linear-gradient(135deg,#6A1B9A 0%,#D84315 60%,#FFB300 100%)',
  royal: 'linear-gradient(135deg,#0A1F5C 0%,#1E40AF 55%,#4F7DF3 100%)',
  forest: 'linear-gradient(135deg,#0B3D2E 0%,#1E7A5A 60%,#8FD3B6 100%)',
};

export const ICON_KEYS = ['link', 'globe', 'linkedin', 'calendar', 'star', 'chat', 'pin', 'user', 'facebook', 'instagram', 'money', 'file'];

const P = {
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  linkedin: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 10v7M8 7v.01M12 17v-4a2 2 0 0 1 4 0v4M12 10v7"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/>',
  pin: '<path d="M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  facebook: '<path d="M14 21v-8h3l.5-3.5H14V7.3c0-1 .4-1.8 1.9-1.8H18V2.4A22 22 0 0 0 15.3 2C12.9 2 11 3.5 11 6.3v3.2H8V13h3v8z"/>',
  instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5v.01"/>',
  money: '<circle cx="12" cy="12" r="9"/><path d="M14.5 9.2C14 8.4 13.2 8 12 8c-1.4 0-2.5.7-2.5 1.8 0 2.7 5 1.2 5 4 0 1.1-1.1 1.9-2.5 1.9-1.300 0-2.200-.5-2.700-1.400M12 6.500V8m0 8v1.500"/>',
  file: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
  download: '<path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14"/>',
  share: '<circle cx="6" cy="12" r="2.500"/><circle cx="18" cy="6" r="2.500"/><circle cx="18" cy="18" r="2.500"/><path d="m8.200 11 7.600-4M8.200 13l7.600 4"/>',
  play: '<path d="M8 5v14l11-7z"/>',
  qr: '<rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><path d="M14 14h3v3m3 0v3h-3m-3 0v-3"/>',
};

export const icon = (name, size = 20) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || P.link}</svg>`;

export const EMPTY_CARD = () => ({
  slug: '', label: '', published: true,
  name: '', title: '', department: '', company: '', location: '', pronouns: '', bio: '',
  photo: '', photoVcard: '', logo: '',
  banner: { type: 'preset', preset: 'sky', image: '' },
  phones: [], emails: [], links: [], sections: [], separators: [], order: [],
  collapse: { contact: 'open', links: 'open' }, blockTitles: { contact: 'Contact', links: 'Links' },
  theme: { accent: '#0176D3', accent2: '#032D60', cloud: '#00A1E0', mode: 'light' },
  vcardNote: '',
});


// ---- Sections (one unified type) -------------------------------------------------
export const FIELD_TYPES = {
  group: { name: 'Field group (several fields together)', desc: '', init: () => ({ fields: [] }) },
  daterange: { name: 'Date range', desc: 'Dates', init: () => ({ from: '', to: '', present: false }) },
  image: { name: 'Image', desc: 'Image', init: () => ({ image: '' }) },
  text: { name: 'Text', desc: 'Details', init: () => ({ text: '' }) },
  label: { name: 'Additional label', desc: 'Label', init: () => ({ text: '' }) },
  url: { name: 'URL', desc: 'Link', init: () => ({ url: '' }) },
  address: { name: 'Address', desc: 'Address', init: () => ({ street: '', city: '', state: '', zip: '' }) },
  phone: { name: 'Phone number', desc: 'Phone', init: () => ({ value: '' }) },
  email: { name: 'Email', desc: 'Email', init: () => ({ value: '' }) },
  attachment: { name: 'Attachment', desc: 'Attachment', init: () => ({ file: '', name: '' }) },
  list: { name: 'Bulleted list', desc: 'Highlights', init: () => ({ text: '' }) },
  tags: { name: 'Tags / skills', desc: 'Skills', init: () => ({ text: '' }) },
  metric: { name: 'Metric', desc: 'Result', init: () => ({ value: '', caption: '' }) },
  quote: { name: 'Quote / testimonial', desc: 'Quote', init: () => ({ text: '', by: '' }) },
  video: { name: 'Video link', desc: 'Video', init: () => ({ url: '', title: '' }) },
  date: { name: 'Single date', desc: 'Date', init: () => ({ date: '' }) },
  rating: { name: 'Rating (1-5)', desc: 'Rating', init: () => ({ value: 0 }) },
  location: { name: 'Location', desc: 'Location', init: () => ({ text: '' }) },
  checklist: { name: 'Checklist', desc: 'Checklist', init: () => ({ text: '' }) },
};
export const newField = (type) => ({ type, descriptor: FIELD_TYPES[type].desc, ...FIELD_TYPES[type].init() });
export const IMG_SIZES = { auto: 'Default', s: 'Small (48 px)', m: 'Medium (96 px)', l: 'Large (160 px)', xl: 'Extra large (260 px)', full: 'Full width' };
const IMG_PX = { s: 48, m: 96, l: 160, xl: 260 };
// Inline style for a user-chosen image size; '' keeps the built-in default look.
export function imgSizeStyle(size, width) {
  const w = parseInt(width, 10);
  if (w >= 16 && w <= 600) return `width:${w}px;max-width:100%;height:auto;max-height:none;`;
  if (size === 'full') return 'width:100%;height:auto;max-height:none;';
  if (IMG_PX[size]) return `width:${IMG_PX[size]}px;max-width:100%;height:auto;max-height:none;`;
  return '';
}
const sz = (size, width) => { const st = imgSizeStyle(size, width); return st ? ` style="${st}"` : ''; };
export const newItem = () => ({ id: Math.random().toString(36).slice(2, 8), label: '', text: '', url: '', image: '', show: true, style: 'plain', fields: [], items: [] });
export const COLLAPSE = ['none', 'open', 'closed'];
export const normCollapse = (v) => (v === 'closed' || v === 'none' ? v : 'open');
export const newSection = (id) => ({ v: 2, id, title: 'New section', text: '', url: '', image: '', layout: 'list', collapse: 'open', show: true, fields: [], items: [] });

// Old cards stored sections as badges/links/text. Convert them on the fly (saved in the new shape on next Save).
export function normalizeSection(s) {
  if (!s) return null;
  if (s.v === 2) return { ...s, fields: s.fields || [], items: (s.items || []).map((i) => ({ ...i, fields: i.fields || [], items: (i.items || []).map((j) => ({ ...j, fields: j.fields || [] })) })) };
  return {
    v: 2, id: s.id, title: s.title || '', text: s.text || '', url: '', image: '', show: s.show !== false,
    layout: s.type === 'badges' ? 'grid' : 'list', collapse: 'open', fields: [],
    items: (s.type === 'text' ? [] : s.items || []).map((i) => ({ label: i.label || '', text: i.note || i.text || '', url: i.url || '', image: i.image || '', fields: [] })),
  };
}

const fileUrl = (id, origin = '') => (/^[a-z0-9]{8,40}$/.test(id || '') ? `${origin}/file/${id}` : '');
const fmtMonth = (v) => (/^\d{4}-\d{2}$/.test(v || '') ? `${v.slice(5)}/${v.slice(0, 4)}` : '');
const lines = (t) => String(t || '').split(/\r?\n/).map((x) => x.trim()).filter(Boolean).slice(0, 30);
const nl = (t) => esc(t).replace(/\n/g, '<br>');

function fieldHTML(f, origin, depth = 0) {
  if (!f || !FIELD_TYPES[f.type]) return '';
  if (f.type === 'group') {
    if (depth > 0) return '';
    const kids = (f.fields || []).map((k) => fieldHTML(k, origin, 1)).join('');
    return kids ? `<div class="fgrp">${f.descriptor ? `<div class="fgt">${esc(f.descriptor)}</div>` : ''}${kids}</div>` : '';
  }
  const desc = esc(f.descriptor || FIELD_TYPES[f.type].desc);
  let v = '';
  switch (f.type) {
    case 'daterange': {
      const a = fmtMonth(f.from), b = f.present ? 'Present' : fmtMonth(f.to);
      v = a && b ? `${a} – ${b}` : a || b;
      break;
    }
    case 'image': { const u = imgUrl(f.image, origin); v = u ? `<img class="fimg"${sz(f.size, f.width)} src="${esc(u)}" alt="${desc}" loading="lazy">` : ''; break; }
    case 'text': v = f.text ? nl(f.text) : ''; break;
    case 'label': v = f.text ? `<b>${esc(f.text)}</b>` : ''; break;
    case 'url': { const h = safeUrl(f.url); v = h ? `<a href="${esc(h)}" target="_blank" rel="noopener noreferrer">${esc(hostOf(h) || h)}</a>` : ''; break; }
    case 'address': {
      const l2 = [f.city, [f.state, f.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ');
      const lines = [f.street, l2].filter(Boolean);
      v = lines.length ? `<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lines.join(', '))}" target="_blank" rel="noopener noreferrer">${lines.map(esc).join('<br>')}</a>` : '';
      break;
    }
    case 'phone': v = f.value ? `<a href="${esc(telHref(f.value))}">${esc(f.value)}</a>` : ''; break;
    case 'email': v = /^[^\s@]+@[^\s@]+$/.test(f.value || '') ? `<a href="mailto:${esc(f.value)}">${esc(f.value)}</a>` : ''; break;
    case 'list': { const L = lines(f.text); v = L.length ? `<ul class="blt">${L.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''; break; }
    case 'tags': { const T = String(f.text || '').split(/[,\n]/).map((x) => x.trim()).filter(Boolean).slice(0, 30); v = T.length ? `<div class="tags">${T.map((x) => `<span class="tag">${esc(x)}</span>`).join('')}</div>` : ''; break; }
    case 'metric': v = f.value ? `<div class="metric"><b>${esc(f.value)}</b>${f.caption ? `<span>${esc(f.caption)}</span>` : ''}</div>` : ''; break;
    case 'quote': v = f.text ? `<blockquote class="qt">${nl(f.text)}${f.by ? `<cite>— ${esc(f.by)}</cite>` : ''}</blockquote>` : ''; break;
    case 'video': { const h = safeUrl(f.url); v = h ? `<a href="${esc(h)}" target="_blank" rel="noopener noreferrer">${icon('play', 16)} ${esc(f.title || hostOf(h))}</a>` : ''; break; }
    case 'date': { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(f.date || ''); v = m ? `${m[2]}/${m[3]}/${m[1]}` : ''; break; }
    case 'rating': { const n = Math.max(0, Math.min(5, parseInt(f.value, 10) || 0)); v = n ? `<span class="stars" role="img" aria-label="${n} out of 5">${'★'.repeat(n)}${'☆'.repeat(5 - n)}</span>` : ''; break; }
    case 'location': v = f.text ? `<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(f.text)}" target="_blank" rel="noopener noreferrer">${esc(f.text)}</a>` : ''; break;
    case 'checklist': {
      const L = lines(f.text).map((x) => { const m = /^\[( |x|X)\]\s*(.*)$/.exec(x); return m ? { done: m[1] !== ' ', t: m[2] } : { done: false, t: x }; }).filter((x) => x.t);
      v = L.length ? `<ul class="cl">${L.map((x) => `<li>${x.done ? '☑' : '☐'} ${esc(x.t)}</li>`).join('')}</ul>` : '';
      break;
    }
    case 'attachment': { const u = fileUrl(f.file, origin); v = u ? `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${icon('file', 16)} ${esc(f.name || 'Download')}</a>` : ''; break; }
  }
  return v ? `<div class="fld">${depth > 0 ? '' : `<small>${desc}</small>`}<div>${v}</div></div>` : '';
}

function itemHTML(it, layout, origin, depth = 0) {
  if (it.show === false) return '';
  const im = imgUrl(it.image, origin);
  const href = safeUrl(it.url);
  const label = it.label ? (href ? `<a class="lbl" href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(it.label)}</a>` : `<span class="lbl">${esc(it.label)}</span>`) : '';
  const flds = (it.fields || []).map((f) => fieldHTML(f, origin)).join('');
  const subs = depth === 0 ? (it.items || []).map((j) => itemHTML(j, layout, origin, 1)).join('') : '';
  const subBox = subs.trim() ? `<div class="items sub ${layout === 'grid' ? 'grid' : 'ilist'}">${subs}</div>` : '';
  const body = `${label}${it.text ? `<p class="itx">${nl(it.text)}</p>` : ''}${flds}`;
  if (!body && !im && !subBox) return '';
  if (layout === 'grid') {
    const pill = !im && !it.text && !flds && !subBox;
    return `<div class="tile${im ? ' has-img' : ''}${pill ? ' pill' : ''}">${im ? `<img${sz(it.imageSize, it.imageWidth)} src="${esc(im)}" alt="${esc(it.label)}" loading="lazy">` : ''}${body}${subBox}</div>`;
  }
  const big = it.imageSize === 'full' || parseInt(it.imageWidth, 10) > 120;
  return `<div class="it${it.style === 'boxed' ? ' boxed' : ''}${big ? ' imgbig' : ''}">${im ? `<img class="ithumb"${sz(it.imageSize, it.imageWidth)} src="${esc(im)}" alt="" loading="lazy">` : ''}<div class="ibody">${body}${subBox}</div></div>`;
}

function sectionHTML(raw, origin) {
  const s = normalizeSection(raw);
  const im = imgUrl(s.image, origin);
  const href = safeUrl(s.url);
  const title = esc(s.title);
  const head = s.title || im || href
    ? `<h2>${im ? `<img class="shead"${sz(s.imageSize, s.imageWidth)} src="${esc(im)}" alt="">` : ''}${href ? `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${title || esc(hostOf(href))}</a>` : title}</h2>`
    : '';
  const text = s.text ? `<p class="txt">${nl(s.text)}</p>` : '';
  const flds = (s.fields || []).map((f) => fieldHTML(f, origin)).join('');
  const items = (s.items || []).map((i) => itemHTML(i, s.layout, origin)).join('');
  if (!text && !flds && !items.trim() && !im && !href) return '';
  const body = `${text}${flds}${items ? `<div class="items ${s.layout === 'grid' ? 'grid' : 'ilist'}">${items}</div>` : ''}`;
  if (normCollapse(s.collapse) !== 'none')
    return `<section><details class="fold"${normCollapse(s.collapse) === 'open' ? ' open' : ''}><summary>${head || '<h2>Details</h2>'}</summary>${body}</details></section>`;
  return `<section>${head}${body}</section>`;
}

// ---- Separators --------------------------------------------------------------------
export const SEP_STYLES = {
  line: 'Thin line', thick: 'Thick line', dashed: 'Dashed line', dotted: 'Dotted line', double: 'Double line',
  gradient: 'Fading line', dots: 'Three dots', diamond: 'Diamond ornament', wave: 'Wave', label: 'Line with label',
  image: 'Image / graphic', space: 'Blank space',
};
export const SEP_SIZES = { s: 'Small', m: 'Medium', l: 'Large' };
export const newSeparator = (id) => ({ id, style: 'line', text: '', image: '', size: 'm', show: true });

function separatorHTML(sp, origin) {
  if (!sp || sp.show === false) return '';
  const st = SEP_STYLES[sp.style] ? sp.style : 'line';
  const size = SEP_SIZES[sp.size] ? sp.size : 'm';
  let inner = '';
  if (st === 'label') inner = `<span class="sp-line"></span><span class="sp-text">${esc(sp.text)}</span><span class="sp-line"></span>`;
  else if (st === 'image') { const u = imgUrl(sp.image, origin); if (!u) return ''; inner = `<img src="${esc(u)}" alt="" loading="lazy">`; }
  else if (st === 'dots') inner = '<span class="sp-dots">• • •</span>';
  else if (st === 'diamond') inner = '<span class="sp-orn"><i></i><b>◆</b><i></i></span>';
  else if (st === 'wave') inner = '<svg viewBox="0 0 240 12" preserveAspectRatio="none" aria-hidden="true"><path d="M0 6 Q10 0 20 6 T40 6 T60 6 T80 6 T100 6 T120 6 T140 6 T160 6 T180 6 T200 6 T220 6 T240 6" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
  return `<div class="sep sep-${st} sz-${size}" role="separator" aria-hidden="true">${inner}</div>`;
}

export const sectionKey = (s, i) => (/^[a-z0-9]{2,12}$/.test(s?.id || '') ? s.id : 's' + i);
// Full, valid display order: saved order first, then anything not yet listed in default order.
export function layoutKeys(card) {
  const all = ['contact', 'links', ...(card.sections || []).map(sectionKey), ...(card.separators || []).map((x) => x.id)];
  const out = [];
  for (const k of card.order || []) if (all.includes(k) && !out.includes(k)) out.push(k);
  for (const k of all) if (!out.includes(k)) out.push(k);
  return out;
}

const hex = (c, d) => (/^#[0-9a-f]{6}$/i.test(c || '') ? c : d);
const imgUrl = (id, origin = '') => (/^[a-z0-9]{8,40}$/.test(id || '') ? `${origin}/img/${id}` : '');
const visible = (arr) => (arr || []).filter((x) => x && x.show !== false && (x.value || x.url || x.label));

function initials(name) {
  const p = String(name || '?').trim().split(/\s+/);
  return ((p[0] || '?')[0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
}

export function renderCardHTML(card, opts = {}) {
  const c = { ...EMPTY_CARD(), ...card };
  const origin = opts.origin || '';
  const preview = !!opts.preview;
  const t = { ...EMPTY_CARD().theme, ...(c.theme || {}) };
  const accent = hex(t.accent, '#0176D3');
  const accent2 = hex(t.accent2, '#032D60');
  const cloud = hex(t.cloud, '#00A1E0');
  const dark = t.mode === 'dark';
  const banner = c.banner || {};
  const bannerImg = banner.type === 'image' ? imgUrl(banner.image, origin) : '';
  const bannerBg = bannerImg ? `url('${bannerImg}') center/cover` : BANNERS[banner.preset] || BANNERS.sky;
  const photo = imgUrl(c.photo, origin);
  const logo = imgUrl(c.logo, origin);
  const saveHref = preview ? '#' : `${origin}/c/${esc(c.slug)}/contact.vcf`;
  const phones = visible(c.phones), emails = visible(c.emails), links = visible(c.links);

  const row = (ic, label, main, href, ext, img) =>
    `<a class="row" href="${esc(href)}"${ext ? ' target="_blank" rel="noopener noreferrer"' : ''}><span class="ic${img ? ' has-img' : ''}">${img ? `<img src="${esc(img)}" alt="" loading="lazy">` : icon(ic)}</span><span class="tx"><b>${esc(main)}</b>${label ? `<small>${esc(label)}</small>` : ''}</span></a>`;

  const contactRows = [
    ...phones.map((p) => row('phone', p.label, p.value, telHref(p.value), false, `${origin}/icons/phone.png`)),
    ...emails.map((e) => row('mail', e.label, e.value, 'mailto:' + e.value, false, `${origin}/icons/mail.png`)),
  ].join('');

  const linkRows = links
    .map((l) => {
      const href = safeUrl(l.url);
      if (!href) return '';
      return row(ICON_KEYS.includes(l.icon) ? l.icon : 'link', hostOf(href), l.label || hostOf(href), href, true, imgUrl(l.iconImage, origin));
    })
    .join('');

  const col = { ...EMPTY_CARD().collapse, ...(c.collapse || {}) };
  const bt = { ...EMPTY_CARD().blockTitles, ...(c.blockTitles || {}) };
  const block = (k, rows) =>
    normCollapse(col[k]) !== 'none'
      ? `<section><details class="fold"${normCollapse(col[k]) === 'open' ? ' open' : ''}><summary><h2>${esc(bt[k] || k)}</h2></summary><div class="list">${rows}</div></details></section>`
      : `<div class="list">${rows}</div>`;
  const secHTML = {};
  (c.sections || []).forEach((sec, si) => {
    if (!sec || sec.show === false) return;
    const h = sectionHTML(sec, origin);
    if (h) secHTML[sectionKey(sec, si)] = h;
  });
  const blocks = {
    contact: contactRows ? block('contact', contactRows) : '',
    links: linkRows ? block('links', linkRows) : '',
    ...secHTML,
  };
  for (const sp of c.separators || []) blocks[sp.id] = separatorHTML(sp, origin);
  const sections = layoutKeys(c).map((k) => blocks[k] || '').join('');

  const bg = dark ? '#0d1520' : '#f3f6fb', surf = dark ? '#16202e' : '#ffffff', ink = dark ? '#eaf1fb' : '#10233d', mute = dark ? '#9db0c8' : '#5a6b82', line = dark ? '#243246' : '#e1e8f2';
  const css = `
:root{--accent:${accent};--accent2:${accent2};--cloud:${cloud};--bg:${bg};--surf:${surf};--ink:${ink};--mute:${mute};--line:${line}}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
.wrap{max-width:520px;margin:0 auto;padding-bottom:40px}
.card{background:var(--surf);border-radius:0 0 22px 22px;box-shadow:0 2px 14px rgba(3,45,96,.12);overflow:hidden}
@media(min-width:560px){.wrap{padding-top:24px}.card{border-radius:22px}}
.banner{height:150px;background:${bannerBg}}
.head{padding:0 22px 20px;margin-top:-56px;text-align:left}
.avatar{width:112px;height:112px;border-radius:50%;border:4px solid var(--surf);background:var(--accent2);color:#fff;display:flex;align-items:center;justify-content:center;font-size:38px;font-weight:700;overflow:hidden}
.avatar img{width:100%;height:100%;object-fit:cover}
h1{margin:12px 0 2px;font-size:26px;line-height:1.15}
.pron{font-size:14px;color:var(--mute);font-weight:400}
.role{margin:0;color:var(--ink);font-size:16px;font-weight:600}
.org{margin:2px 0 0;color:var(--mute);font-size:15px}
.brand{margin:14px 0 0;display:flex;align-items:center;gap:8px}
.brand img{max-height:34px;max-width:160px;object-fit:contain}
.wordmark{font-weight:800;font-size:22px;color:var(--accent);letter-spacing:-.3px}
.loc{display:flex;align-items:center;gap:6px;margin:10px 0 0;color:var(--mute);font-size:14px}
.bio{margin:12px 0 0;color:var(--ink);font-size:15px}
.actions{display:flex;gap:10px;padding:0 22px 8px}
.btn{flex:1;display:flex;align-items:center;justify-content:center;gap:8px;padding:13px 14px;border-radius:12px;font-weight:700;font-size:15px;text-decoration:none;border:0;cursor:pointer;font-family:inherit}
.btn.primary{background:var(--accent);color:#fff}.btn.ghost{background:transparent;color:var(--accent);border:1.5px solid var(--accent)}
.list{padding:8px 14px 4px}
.row{display:flex;align-items:center;gap:14px;padding:11px 8px;border-radius:12px;color:inherit;text-decoration:none}
.row:hover,.row:focus-visible{background:color-mix(in srgb,var(--accent) 8%,transparent)}
.ic{flex:none;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb,var(--accent) 12%,transparent);color:var(--accent)}
.ic.has-img{background:transparent;overflow:hidden}.ic.has-img img{width:40px;height:40px;object-fit:contain;border-radius:50%}
.row.static:hover{background:none}.row.static{padding-top:6px;padding-bottom:6px}
.tx{display:flex;flex-direction:column;min-width:0}.tx b{font-weight:600;overflow-wrap:anywhere}.tx small{color:var(--mute);font-size:13px}
section{padding:6px 22px 14px}
section h2{font-size:15px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--ink);margin:16px 0 10px;padding-left:10px;border-left:4px solid var(--accent)}
section .row{padding-left:0;padding-right:0}
.txt{margin:0;color:var(--ink)}.after{margin-top:8px}
.items.grid{display:flex;flex-wrap:wrap;gap:8px}
.items.ilist .it{display:flex;gap:12px;padding:10px 0;border-top:1px solid var(--line)}.items.ilist .it:first-child{border-top:0}.fgrp{margin:10px 0;padding:10px 12px;border:1px solid var(--line);border-radius:12px}.fgrp .fld:first-of-type{margin-top:0}.fgt{font-weight:800;font-size:13px;margin-bottom:6px}.items.sub{margin-top:8px;padding-left:10px;border-left:2px solid var(--line)}.items.sub.ilist .it:first-child{border-top:0}.items.sub.grid{margin-top:8px}.items.ilist .it.boxed{border:1px solid var(--line);border-radius:12px;padding:12px;margin:8px 0;background:var(--bg)}.items.ilist .it.boxed:first-child{border:1px solid var(--line)}
.it.imgbig{flex-direction:column}.it.imgbig .ithumb{object-fit:contain}.ithumb{width:52px;height:52px;object-fit:contain;border-radius:10px;flex:none;background:#fff}
.ibody{min-width:0;flex:1}.lbl{font-weight:700;color:var(--ink);text-decoration:none;overflow-wrap:anywhere}a.lbl{color:var(--accent)}
.itx{margin:4px 0 0;font-size:14px;color:var(--ink)}
.fld{margin-top:6px;font-size:14px}.fld small{display:block;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--mute)}
.fld a{color:var(--accent);text-decoration:none;overflow-wrap:anywhere}.fld a svg{vertical-align:-3px}
.fold>summary{list-style:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between}.fold>summary::-webkit-details-marker{display:none}
.fold>summary h2{margin:16px 0 10px}.fold>summary::after{content:'';width:9px;height:9px;border-right:2px solid var(--mute);border-bottom:2px solid var(--mute);transform:rotate(45deg);transition:transform .15s;margin-right:4px}
.fold[open]>summary::after{transform:rotate(-135deg)}
.sep{margin:0 22px;color:var(--mute);display:flex;align-items:center;justify-content:center}
.sep.sz-s{padding:6px 0}.sep.sz-m{padding:14px 0}.sep.sz-l{padding:26px 0}
.sep-line,.sep-thick,.sep-dashed,.sep-dotted,.sep-double,.sep-gradient{height:0;padding:0!important;margin-top:var(--sepgap,14px);margin-bottom:var(--sepgap,14px)}
.sep.sz-s{--sepgap:6px}.sep.sz-l{--sepgap:26px}
.sep-line{border-top:1px solid var(--line)}.sep-thick{border-top:4px solid var(--accent);border-radius:4px}
.sep-dashed{border-top:2px dashed var(--line)}.sep-dotted{border-top:3px dotted var(--mute)}.sep-double{border-top:4px double var(--mute)}
.sep-gradient{height:2px;background:linear-gradient(90deg,transparent,var(--accent),transparent)}
.sep-dots .sp-dots{letter-spacing:6px;font-size:18px;color:var(--accent)}
.sp-orn{display:flex;align-items:center;gap:10px;width:100%;color:var(--accent)}.sp-orn i{flex:1;height:1px;background:var(--line)}.sp-orn b{font-size:12px}
.sep-wave{color:var(--accent)}.sep-wave svg{width:100%;height:12px}
.sep-label{gap:12px}.sep-label .sp-line{flex:1;height:1px;background:var(--line)}.sep-label .sp-text{font-size:12px;letter-spacing:.09em;text-transform:uppercase;color:var(--mute);font-weight:700}
.sep-image img{max-width:100%;max-height:90px;object-fit:contain}
.sep-space{}
.blt,.cl{margin:2px 0 0;padding-left:18px}.cl{list-style:none;padding-left:0}.blt li,.cl li{margin:2px 0}
.tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:2px}.tag{padding:3px 10px;border-radius:999px;background:color-mix(in srgb,var(--accent) 12%,transparent);color:var(--accent);font-size:13px;font-weight:600}
.metric b{display:block;font-size:28px;line-height:1.1;color:var(--accent)}.metric span{font-size:13px;color:var(--mute)}
.qt{margin:2px 0 0;padding:2px 0 2px 12px;border-left:3px solid var(--accent);font-style:italic}.qt cite{display:block;margin-top:4px;font-style:normal;font-size:13px;color:var(--mute)}
.stars{color:#e8a600;letter-spacing:2px;font-size:16px}
.fimg{max-width:100%;max-height:220px;border-radius:10px;display:block}
.shead{width:26px;height:26px;object-fit:contain;border-radius:6px;vertical-align:middle;margin-right:8px}
section h2 a{color:inherit;text-decoration:underline}
.tile{display:flex;flex-direction:column;align-items:center;text-align:center;gap:4px;padding:10px 8px;border:1px solid var(--line);border-radius:14px;background:var(--surf);font-size:12px;line-height:1.25}
.tile.has-img{width:calc(33.3% - 6px);min-width:104px}.tile img{width:72px;height:72px;object-fit:contain}
.tile.pill{flex-direction:row;border-radius:999px;padding:8px 14px}.tile.pill .lbl{font-size:13px;color:var(--accent)}
.tile .itx{font-size:11px;color:var(--mute)}.tile .fld{font-size:11px}
.chips{display:flex;flex-wrap:wrap;gap:8px}
.chip{display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center;padding:10px 6px;border:1px solid var(--line);border-radius:14px;font-size:12px;line-height:1.2;color:var(--ink);text-decoration:none;background:var(--surf)}
.chip.has-img{width:calc(33.3% - 6px);min-width:96px}.chip small{display:block;font-weight:400;font-size:11px;color:var(--mute)}.chip:not(.has-img){flex-direction:column;gap:2px;font-size:13px;font-weight:600;color:var(--accent);padding:8px 14px;border-radius:999px}
.chip img{width:72px;height:72px;object-fit:contain}
details.qr{margin:6px 22px 20px;border:1px solid var(--line);border-radius:14px;padding:4px 14px}
details.qr summary{cursor:pointer;padding:10px 0;font-weight:600;color:var(--accent);list-style:none;display:flex;align-items:center;gap:8px}
details.qr summary::-webkit-details-marker{display:none}
.qrbox{text-align:center;padding:6px 0 14px}.qrbox img{width:220px;height:220px;background:#fff;border-radius:12px;padding:6px}
.qrbox p{color:var(--mute);font-size:13px;margin:6px 0 0}

@media(min-width:760px){
.wrap{max-width:780px}.banner{height:200px}
.head{display:grid;grid-template-columns:140px 1fr;column-gap:26px;padding:0 32px 22px;margin-top:0;align-items:start}
.head>*{grid-column:2}.head>.avatar{grid-column:1;grid-row:1 / span 8;margin-top:-64px;width:132px;height:132px}
.head>h1{margin-top:18px;font-size:30px}
.actions{padding:0 32px 10px;max-width:520px}
section{padding:6px 32px 16px}.list{padding:8px 24px 4px;display:grid;grid-template-columns:1fr 1fr;column-gap:20px}
.tile.has-img{width:calc(25% - 6px)}
}
@media(min-width:1180px){.wrap{max-width:900px}}
`;

  const title = [c.name, c.title].filter(Boolean).join(' – ') || 'Digital card';
  const desc = [c.title, c.company].filter(Boolean).join(' · ');
  const pageUrl = `${origin}/c/${esc(c.slug)}`;
  const qr = preview
    ? ''
    : `<details class="qr"><summary>${icon('qr')} Show QR code</summary><div class="qrbox"><img src="${origin}/c/${esc(c.slug)}/qr.svg" alt="QR code for this card" width="220" height="220"><p>Scan to open this card</p><p><a href="${origin}/c/${esc(c.slug)}/vcard-qr.svg" style="color:var(--accent)">Contact-only QR (adds me directly)</a></p></div></details>`;

  const share = preview
    ? ''
    : `<script>(function(){var b=document.getElementById('share');if(!b)return;b.addEventListener('click',function(){var d={title:document.title,url:location.href};if(navigator.share){navigator.share(d).catch(function(){})}else if(navigator.clipboard){navigator.clipboard.writeText(location.href).then(function(){b.lastChild.textContent=' Link copied'})}});})();</script>`;

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="robots" content="noindex,nofollow"><meta name="description" content="${esc(desc)}">
<meta property="og:title" content="${esc(c.name)}"><meta property="og:description" content="${esc(desc)}">${photo ? `<meta property="og:image" content="${esc(photo)}">` : ''}<meta property="og:url" content="${pageUrl}">
<meta name="theme-color" content="${accent}"><style>${css}</style></head><body><div class="wrap"><div class="card">
<div class="banner"></div>
<div class="head"><div class="avatar">${photo ? `<img src="${esc(photo)}" alt="${esc(c.name)}">` : esc(initials(c.name))}</div>
<h1>${esc(c.name)}${c.pronouns ? ` <span class="pron">(${esc(c.pronouns)})</span>` : ''}</h1>
${c.title ? `<p class="role">${esc(c.title)}</p>` : ''}${[c.department, c.company].filter(Boolean).length ? `<p class="org">${[c.department, c.company].filter(Boolean).map(esc).join(' · ')}</p>` : ''}
${logo ? `<div class="brand"><img src="${esc(logo)}" alt="${esc(c.company)}"></div>` : ''}
${c.location ? `<p class="loc">${icon('pin', 16)} ${esc(c.location)}</p>` : ''}
${c.bio ? `<p class="bio">${esc(c.bio).replace(/\n/g, '<br>')}</p>` : ''}</div>
<div class="actions"><a class="btn primary" href="${saveHref}">${icon('download')} Save contact</a><button class="btn ghost" id="share" type="button">${icon('share')} Share</button></div>
${sections}${qr}</div></div>${share}</body></html>`;
}
