import { IMG_SIZES, EMPTY_CARD, ICON_KEYS, BANNERS, FIELD_TYPES, normalizeSection, normCollapse, SEP_STYLES, SEP_SIZES } from './render.js';

const s = (v, n) => String(v ?? '').slice(0, n);
const b = (v, d = true) => (v === undefined ? d : !!v);
const hex = (c, d) => (/^#[0-9a-f]{6}$/i.test(c || '') ? c : d);
const imgId = (v) => (/^[a-z0-9]{8,40}$/.test(v || '') ? v : '');
const isoDate = (v) => (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(v || '') && !Number.isNaN(Date.parse(v)) ? v : '');
export const SLUG_RE = /^[a-z0-9-]{2,32}$/;

function uniqIds(secs) {
  const seen = new Set();
  return secs.map((x, n) => { let id = x.id; if (seen.has(id)) id = 's' + n + 'x'; seen.add(id); return { ...x, id }; });
}

const month = (v) => (/^\d{4}-(0[1-9]|1[0-2])$/.test(v || '') ? v : '');
const fileId = imgId;
const isz = (v) => (Object.hasOwn(IMG_SIZES, v) ? v : 'auto');
const iw = (v) => { const n = parseInt(v, 10); return n >= 16 && n <= 600 ? n : 0; };
function cleanField(f, depth = 0) {
  if (!f || !FIELD_TYPES[f.type]) return null;
  const out = { type: f.type, descriptor: s(f.descriptor, f.type === 'group' ? 80 : 40) || FIELD_TYPES[f.type].desc };
  switch (f.type) {
    case 'group': out.fields = depth === 0 ? (Array.isArray(f.fields) ? f.fields.slice(0, 20) : []).map((k) => cleanField(k, 1)).filter((k) => k && k.type !== 'group') : []; break;
    case 'daterange': out.from = month(f.from); out.present = !!f.present; out.to = out.present ? '' : month(f.to); break;
    case 'image': out.image = imgId(f.image); out.size = isz(f.size); out.width = iw(f.width); break;
    case 'text': out.text = s(f.text, 600); break;
    case 'label': out.text = s(f.text, 120); break;
    case 'url': out.url = s(f.url, 600); break;
    case 'address': out.street = s(f.street, 120); out.city = s(f.city, 80); out.state = s(f.state, 40); out.zip = s(f.zip, 12); break;
    case 'phone': out.value = s(f.value, 30); break;
    case 'email': out.value = s(f.value, 120); break;
    case 'list': case 'checklist': out.text = s(f.text, 1500); break;
    case 'tags': out.text = s(f.text, 400); break;
    case 'metric': out.value = s(f.value, 30); out.caption = s(f.caption, 120); break;
    case 'quote': out.text = s(f.text, 600); out.by = s(f.by, 120); break;
    case 'video': out.url = s(f.url, 600); out.title = s(f.title, 120); break;
    case 'date': out.date = /^\d{4}-\d{2}-\d{2}$/.test(f.date || '') ? f.date : ''; break;
    case 'rating': out.value = Math.max(0, Math.min(5, parseInt(f.value, 10) || 0)); break;
    case 'location': out.text = s(f.text, 120); break;
    case 'attachment': out.file = fileId(f.file); out.name = s(f.name, 80).replace(/[^\w .()\-]/g, '_'); break;
  }
  return out;
}
const fields = (a) => (Array.isArray(a) ? a.slice(0, 30) : []).map((x) => cleanField(x, 0)).filter(Boolean);
function cleanItem(it, depth) {
  return {
    id: /^[a-z0-9]{2,12}$/.test(it?.id || '') ? it.id : '', show: b(it?.show), style: it?.style === 'boxed' ? 'boxed' : 'plain',
    label: s(it?.label, 120), text: s(it?.text, 600), url: s(it?.url, 600), image: imgId(it?.image), imageSize: isz(it?.imageSize), imageWidth: iw(it?.imageWidth), fields: fields(it?.fields),
    items: depth === 0 && Array.isArray(it?.items) ? it.items.slice(0, 40).map((j) => cleanItem(j, 1)) : [],
  };
}
function cleanSection(raw, n) {
  const x = normalizeSection(raw) || {};
  return {
    v: 2,
    id: /^[a-z0-9]{2,12}$/.test(x.id || '') ? x.id : 's' + n,
    title: s(x.title, 120), text: s(x.text, 600), url: s(x.url, 600), image: imgId(x.image), imageSize: isz(x.imageSize), imageWidth: iw(x.imageWidth),
    layout: x.layout === 'grid' ? 'grid' : 'list', collapse: normCollapse(x.collapse), show: b(x.show), fields: fields(x.fields),
    items: (Array.isArray(x.items) ? x.items : []).slice(0, 60).map((it) => cleanItem(it, 0)),
  };
}

function cleanSeparators(arr, taken) {
  const seen = new Set(['contact', 'links', ...taken]);
  return (Array.isArray(arr) ? arr.slice(0, 20) : []).map((x, n) => {
    let id = /^[a-z0-9]{2,12}$/.test(x?.id || '') ? x.id : 'sep' + n;
    while (seen.has(id)) id = ('sep' + n + id).slice(0, 12) + 'x';
    seen.add(id);
    return {
      id, style: Object.hasOwn(SEP_STYLES, x?.style) ? x.style : 'line', text: s(x?.text, 60), image: imgId(x?.image),
      size: Object.hasOwn(SEP_SIZES, x?.size) ? x.size : 'm', show: b(x?.show),
    };
  });
}

export function sanitizeCard(input, slug) {
  const d = EMPTY_CARD();
  const i = input && typeof input === 'object' ? input : {};
  const arr = (a, n) => (Array.isArray(a) ? a.slice(0, n) : []);
  const bn = i.banner || {};
  const th = i.theme || {};
  const sections = uniqIds(arr(i.sections, 12).map(cleanSection));
  return {
    slug,
    label: s(i.label, 40) || slug,
    isDefault: i.isDefault === true,
    published: b(i.published),
    listed: b(i.listed),
    secretKey: /^[a-z0-9]{8,32}$/.test(i.secretKey || '') ? i.secretKey : '',
    expires: isoDate(i.expires),
    exchange: { enabled: i.exchange?.enabled === true, title: s(i.exchange?.title, 80) || d.exchange.title, askPhone: i.exchange?.askPhone === true, askNote: b(i.exchange?.askNote) },
    name: s(i.name, 80), title: s(i.title, 120), department: s(i.department, 80), company: s(i.company, 80),
    location: s(i.location, 80), pronouns: s(i.pronouns, 30), bio: s(i.bio, 600),
    photo: imgId(i.photo), photoVcard: imgId(i.photoVcard), logo: imgId(i.logo),
    banner: {
      type: bn.type === 'image' ? 'image' : 'preset',
      preset: Object.hasOwn(BANNERS, bn.preset) ? bn.preset : 'sky',
      image: imgId(bn.image),
    },
    phones: arr(i.phones, 12).map((p) => ({ label: s(p?.label, 30), value: s(p?.value, 40), show: b(p?.show), inVcard: b(p?.inVcard) })),
    emails: arr(i.emails, 12).map((p) => ({ label: s(p?.label, 30), value: s(p?.value, 120), show: b(p?.show), inVcard: b(p?.inVcard) })),
    links: arr(i.links, 40).map((l) => ({
      label: s(l?.label, 60), url: s(l?.url, 600), icon: ICON_KEYS.includes(l?.icon) ? l.icon : 'link', iconImage: imgId(l?.iconImage),
      show: b(l?.show), inVcard: b(l?.inVcard, false),
    })),
    sections,
    collapse: { contact: normCollapse(i.collapse?.contact), links: normCollapse(i.collapse?.links) },
    blockTitles: { contact: s(i.blockTitles?.contact, 60) || 'Contact', links: s(i.blockTitles?.links, 60) || 'Links' },
    separators: cleanSeparators(i.separators, sections.map((x) => x.id)),
    order: arr(i.order, 50).filter((k) => typeof k === 'string' && /^[a-z0-9]{2,12}$/.test(k)),
    theme: {
      accent: hex(th.accent, d.theme.accent), accent2: hex(th.accent2, d.theme.accent2), cloud: hex(th.cloud, d.theme.cloud),
      mode: th.mode === 'dark' ? 'dark' : 'light',
    },
    vcardNote: s(i.vcardNote, 400),
  };
}
