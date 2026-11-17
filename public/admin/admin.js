import { renderCardHTML, EMPTY_CARD, BANNERS, ICON_KEYS, esc, layoutKeys, sectionKey, FIELD_TYPES, newField, newItem, newSection, normalizeSection, SEP_STYLES, SEP_SIZES, newSeparator, normCollapse, IMG_SIZES } from '/shared/render.js';

const $ = (s, r = document) => r.querySelector(s);
const app = $('#app');
const S = { cards: [], slug: null, draft: null, dirty: false, view: 'edit', savedAt: null, open: new Set(), itemClosed: new Set(), act: null, trk: '' };
let previewTimer;

/* ---------- helpers ---------- */
async function api(path, opts = {}) {
  const r = await fetch(path, { credentials: 'same-origin', ...opts, headers: { ...(opts.json ? { 'Content-Type': 'application/json' } : {}), ...(opts.headers || {}) }, body: opts.json ? JSON.stringify(opts.json) : opts.body });
  let data = null;
  try { data = await r.json(); } catch {}
  if (!r.ok) { const e = new Error(data?.error || r.statusText); e.status = r.status; throw e; }
  return data;
}
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2400);
}
const getPath = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
function setPath(o, p, v) {
  const ks = p.split('.'); const last = ks.pop();
  const t = ks.reduce((a, k) => a[k], o); t[last] = v;
}
const dirty = () => { S.dirty = true; updateSaveBar(); schedulePreview(); };
const current = () => S.cards.find((c) => c.slug === S.slug);

// Which side panels are collapsed (desktop). Remembered in this browser only; harmless if storage is unavailable.
let RAIL = new Set();
try { RAIL = new Set(JSON.parse(localStorage.getItem('bc_rail') || '[]')); } catch (e) { /* default: all open */ }
const railClosed = (k) => (RAIL.has(k) ? ' closed' : '');
const randKey = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]).join('');
const cleanSrc = (v) => String(v || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 20);
const cardUrl = (d, src) => { const q = [d.secretKey ? 'k=' + d.secretKey : '', src ? 'src=' + src : ''].filter(Boolean).join('&'); return `${location.origin}/c/${d.slug}${q ? '?' + q : ''}`; };
const vcfUrl = (d) => `${location.origin}/c/${d.slug}/contact.vcf${d.secretKey ? '?k=' + d.secretKey : ''}`;
const qrPath = (d, src) => { const q = [d.secretKey ? 'k=' + d.secretKey : '', src ? 'src=' + src : ''].filter(Boolean).join('&'); return `/c/${d.slug}/qr.svg${q ? '?' + q : ''}`; };
const localDate = (iso) => (iso ? new Date(iso).toLocaleDateString('en-CA') : '');
const expired = (d) => !!d.expires && Date.parse(d.expires) < Date.now();
const withIds = (c) => { c.listed = c.listed !== false; c.secretKey = c.secretKey || ''; c.expires = c.expires || ''; c.exchange = { ...EMPTY_CARD().exchange, ...(c.exchange || {}) }; c.separators = c.separators || []; c.collapse = { contact: normCollapse((c.collapse || {}).contact), links: normCollapse((c.collapse || {}).links) }; c.blockTitles = { contact: 'Contact', links: 'Links', ...(c.blockTitles || {}) }; c.sections = (c.sections || []).map((x, i) => { const n = normalizeSection(x); if (!n.id) n.id = 's' + i; const rid = () => Math.random().toString(36).slice(2, 8); n.items.forEach((it) => { if (!it.id) it.id = rid(); it.items = it.items || []; it.items.forEach((j) => { if (!j.id) j.id = rid(); }); }); return n; }); return c; };

/* ---------- boot / login ---------- */
let FEEDBACK = '';
async function loadFeedback() {
  try {
    const r = await fetch('/admin/feedback.json', { cache: 'no-store' });
    const u = r.ok ? (await r.json()).url : '';
    if (/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/issues\/new$/.test(u || '')) {
      FEEDBACK = u + '?title=' + encodeURIComponent('Feedback: ') + '&body=' + encodeURIComponent('**What happened, or what would help?**\n\n\n---\nThis page is public on GitHub. Please do not paste your passcode, phone number or email.');
    }
  } catch (e) { /* feedback link stays hidden */ }
}
async function boot() {
  await loadFeedback();
  try { await api('/api/admin/me'); await load(); }
  catch (e) { if (e.status === 401) showLogin(); else app.innerHTML = `<p class="boot">${esc(e.message)}</p>`; }
}
function showLogin(msg = '') {
  app.innerHTML = `<form class="login" id="login"><h1>Card editor</h1><p>Enter your passcode.</p>
  <input type="password" id="pc" autocomplete="current-password" placeholder="Passcode" autofocus>
  <p class="err" id="lerr">${esc(msg)}</p><button class="btn" style="width:100%">Sign in</button></form>`;
  $('#login').onsubmit = async (e) => {
    e.preventDefault();
    try { await api('/api/login', { method: 'POST', json: { passcode: $('#pc').value } }); await load(); }
    catch (er) { $('#lerr').textContent = er.message; }
  };
}
async function load(keepSlug) {
  S.cards = await api('/api/admin/cards');
  S.slug = keepSlug || S.slug || S.cards[0]?.slug || null;
  if (!current()) S.slug = S.cards[0]?.slug || null;
  S.draft = current() ? withIds(structuredClone(current())) : null;
  S.dirty = false;
  render();
}

/* ---------- main render ---------- */
function render() {
  const d = S.draft;
  const tabs = `<label class="cardpick"><span>Card</span><select id="admcard" aria-label="Choose a card">${S.cards.map((c) => `<option value="${esc(c.slug)}" ${c.slug === S.slug ? 'selected' : ''}>${c.isDefault ? '★ ' : ''}${esc(c.label || c.slug)}</option>`).join('')}</select></label>`;
  app.innerHTML = `
  <header class="top"><div class="tabs">${tabs}</div>
    <button class="btn sm" data-act="new">+ New</button>${d ? '<button class="btn sm ghost" data-act="dupcard" title="Make a copy of this card">Duplicate</button>' : ''}${FEEDBACK ? `<a class="btn sm ghost" href="${esc(FEEDBACK)}" target="_blank" rel="noopener noreferrer" title="Opens a public GitHub page. Do not include your passcode or personal details.">Feedback</a>` : ''}<button class="btn sm ghost" data-act="logout">Sign out</button></header>
  <nav class="views">${['edit', 'preview', 'share', 'activity'].map((v) => `<button data-act="view" data-v="${v}" class="${S.view === v ? 'on' : ''}">${v[0].toUpperCase() + v.slice(1)}</button>`).join('')}</nav>
  ${d ? `<main data-view="${S.view}">
    <div class="pane-edit" id="form">${formHTML(d)}</div>
    <aside class="rail">
      <section class="rp${railClosed('prev')}"><button class="rail-h" data-act="rail" data-k="prev" aria-expanded="${railClosed('prev') ? 'false' : 'true'}"><span>Preview</span><i aria-hidden="true"></i></button><div class="pane-prev"><iframe class="frame" id="frame" sandbox title="Card preview"></iframe></div></section>
      <section class="rp${railClosed('share')}"><button class="rail-h" data-act="rail" data-k="share" aria-expanded="${railClosed('share') ? 'false' : 'true'}"><span>Share this card</span><i aria-hidden="true"></i></button><div class="pane-share" id="share">${shareHTML(d)}</div></section>
      <section class="rp${railClosed('act')}"><button class="rail-h" data-act="rail" data-k="act" aria-expanded="${railClosed('act') ? 'false' : 'true'}"><span>Activity</span><i aria-hidden="true"></i></button><div class="pane-act" id="act">${actHTML(d)}</div></section>
    </aside>
  </main>
  <div class="savebar"><span class="st" id="st"></span><button class="btn" data-act="save" id="savebtn">Save</button></div>` : '<p class="boot">No cards yet. Tap “+ New”.</p>'}`;
  if (d) { updatePreview(); updateSaveBar(); applyFs(); if (!S.act || S.act.slug !== d.slug) loadActivity(); }
}

function f(label, path, val, extra = '', max = 0) {
  const cnt = max ? `<span class="cnt">${String(val ?? '').length}/${max}</span>` : '';
  return `<label class="f">${label}${cnt}<input data-p="${path}" value="${esc(val)}" ${max ? `maxlength="${max}"` : ''} ${extra}></label>`;
}
function imgThumb(id, wide) {
  return `<div class="thumb${wide ? ' wide' : ''}" style="${/^[a-z0-9]{8,40}$/.test(id || '') ? `background-image:url('/img/${id}')` : ''}"></div>`;
}
function toggles(path, x, vcardLabel = 'In contact file') {
  return `<label class="chk"><input type="checkbox" data-p="${path}.show" ${x.show !== false ? 'checked' : ''}> On card</label>
  <label class="chk"><input type="checkbox" data-p="${path}.inVcard" ${x.inVcard !== false ? 'checked' : ''}> ${vcardLabel}</label>`;
}
function ctrls(arr, i, n) {
  return `<span class="spacer"></span><button type="button" class="grip sm" data-arr="${arr}" data-i="${i}" aria-label="Drag to move. Arrow keys also work." title="Drag to move">⠿</button>
  <button class="btn sec sm" data-act="dup" data-arr="${arr}" data-i="${i}" title="Duplicate">Duplicate</button>
  <button class="btn danger sm" data-act="rm" data-arr="${arr}" data-i="${i}">Remove</button>`;
}

function ta(label, path, val, max) {
  return `<label class="f">${label}<span class="cnt">${String(val ?? '').length}/${max}</span><textarea data-p="${path}" maxlength="${max}">${esc(val)}</textarea></label>`;
}
function sizeUI(sp, size, width) {
  return `<div class="grid2 szrow"><label class="f">Display size<select data-p="${sp.size}">${Object.entries(IMG_SIZES).map(([k, n]) => `<option value="${k}" ${(size || 'auto') === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
  <label class="f">Exact width in px (optional)<input type="number" min="16" max="600" step="1" inputmode="numeric" data-p="${sp.width}" value="${width ? esc(String(width)) : ''}" placeholder="e.g. 120"></label></div>`;
}
function imgField(path, id, what) {
  return `<div class="imgrow">${imgThumb(id)}<div><button class="btn sec sm" data-act="upload" data-kind="item" data-p="${path}">${id ? 'Replace' : 'Upload'} ${what}</button> ${id ? `<button class="btn danger sm" data-act="clear" data-p="${path}">Remove</button>` : ''}</div></div>`;
}
function addFieldUI(arrPath, noGroup) {
  return `<div class="row addf"><select class="fsel" aria-label="Field type">${Object.entries(FIELD_TYPES).filter(([k]) => !(noGroup && k === 'group')).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join('')}</select><button class="btn sec sm" data-act="addfield" data-arr="${arrPath}">+ Add field</button></div>`;
}
function fieldEditor(arrPath, i, fl, n, nested) {
  const p = `${arrPath}.${i}`;
  let inner = '';
  switch (fl.type) {
    case 'group':
      inner = `<div class="grp-ed"><p class="hint" style="margin:0 0 6px">Add the fields that belong together (for example Label, Date range, Text, URL, URL). Drag the ⠿ handles to reorder them, or Duplicate to repeat one.</p>${(fl.fields || []).map((c, ci) => fieldEditor(`${p}.fields`, ci, c, fl.fields.length, true)).join('')}${addFieldUI(`${p}.fields`, true)}</div>`;
      break;
    case 'daterange':
      inner = `<div class="grid2"><label class="f">From (MM/YYYY)<input type="month" data-p="${p}.from" value="${esc(fl.from)}"></label>
        <label class="f">To (MM/YYYY)<input type="month" data-p="${p}.to" value="${esc(fl.to)}" ${fl.present ? 'disabled' : ''}></label></div>
        <label class="chk"><input type="checkbox" data-p="${p}.present" data-rerender ${fl.present ? 'checked' : ''}> Present (current)</label>`;
      break;
    case 'image': inner = imgField(`${p}.image`, fl.image, 'image') + (fl.image ? sizeUI({ size: `${p}.size`, width: `${p}.width` }, fl.size, fl.width) : ''); break;
    case 'text': inner = ta('Text', `${p}.text`, fl.text, 600); break;
    case 'label': inner = f('Label text', `${p}.text`, fl.text, '', 120); break;
    case 'url': inner = f('URL', `${p}.url`, fl.url, 'type="url" inputmode="url" placeholder="https://"'); break;
    case 'address':
      inner = f('Street & number', `${p}.street`, fl.street, '', 120) + `<div class="grid2">${f('City', `${p}.city`, fl.city, '', 80)}${f('State', `${p}.state`, fl.state, '', 40)}</div>` + f('ZIP', `${p}.zip`, fl.zip, 'inputmode="numeric"', 12);
      break;
    case 'phone': inner = f('Phone (###-###-####)', `${p}.value`, fl.value, 'type="tel" inputmode="tel" placeholder="555-123-4567" data-fmt="phone"', 30); break;
    case 'email': inner = f('Email', `${p}.value`, fl.value, 'type="email" inputmode="email"', 120); break;
    case 'list': inner = ta('One bullet per line (up to 30)', `${p}.text`, fl.text, 1500); break;
    case 'tags': inner = f('Tags, separated by commas', `${p}.text`, fl.text, '', 400); break;
    case 'metric': inner = `<div class="grid2">${f('Value (e.g. 35%)', `${p}.value`, fl.value, '', 30)}${f('Caption', `${p}.caption`, fl.caption, '', 120)}</div>`; break;
    case 'quote': inner = ta('Quote', `${p}.text`, fl.text, 600) + f('Attribution (name, title)', `${p}.by`, fl.by, '', 120); break;
    case 'video': inner = f('Video URL', `${p}.url`, fl.url, 'type="url" inputmode="url" placeholder="https://"') + f('Title (optional)', `${p}.title`, fl.title, '', 120); break;
    case 'date': inner = `<label class="f">Date (MM/DD/YYYY)<input type="date" data-p="${p}.date" value="${esc(fl.date)}"></label>`; break;
    case 'rating': inner = `<label class="f">Stars<select data-p="${p}.value">${[0, 1, 2, 3, 4, 5].map((n) => `<option value="${n}" ${+fl.value === n ? 'selected' : ''}>${n ? '★'.repeat(n) + ' (' + n + ')' : 'None'}</option>`).join('')}</select></label>`; break;
    case 'location': inner = f('Place name or city (links to Maps)', `${p}.text`, fl.text, '', 120); break;
    case 'checklist': inner = ta('One item per line. Start a line with [x] for checked, [ ] for unchecked.', `${p}.text`, fl.text, 1500); break;
    case 'attachment':
      inner = `<div class="imgrow"><div class="thumb" style="display:flex;align-items:center;justify-content:center">${fl.file ? '📎' : ''}</div><div>${fl.file ? `<b>${esc(fl.name || 'Attached file')}</b><br>` : ''}<button class="btn sec sm" data-act="upload" data-kind="attach" data-p="${p}">${fl.file ? 'Replace file' : 'Upload file'}</button> ${fl.file ? `<button class="btn danger sm" data-act="clear" data-p="${p}.file">Remove</button>` : ''}<p class="hint">PDF, Word, Excel, PowerPoint, OpenDocument, RTF, TXT, CSV, MD, JSON, ZIP, 7Z or RAR. Up to 10 MB.</p></div></div>`;
      break;
  }
  return `<div class="item fld-ed"><div class="row" style="margin:0 0 6px"><b>${esc(FIELD_TYPES[fl.type].name)}</b>${ctrls(arrPath, i, n)}</div>${nested ? '' : fl.type === 'group' ? f('Group title (optional, shown above the group)', `${p}.descriptor`, fl.descriptor, '', 80) : f('Descriptor (label shown on the card)', `${p}.descriptor`, fl.descriptor, '', 40)}${inner}</div>`;
}
// A top-level item is a "group": it has its own fields and can hold several sub-items. gi is the group index (null for a top-level item).
function itemEditor(it, ii, s, sp, gi) {
  const sub = gi !== null, base = sub ? `${sp}.items.${gi}` : sp;
  const ip = `${base}.items.${ii}`, arr = `${base}.items`;
  const list = sub ? s.items[gi].items : s.items;
  const legacy = it.label || it.text || it.url || it.image;
  const closed = S.itemClosed.has(it.id);
  const groupOpts = sub ? s.items.map((g, k) => k === gi ? '' : `<option value="${k}">${esc('Group ' + (k + 1) + itemPreview(g))}</option>`).join('') : '';
  const others = sub ? [] : S.draft.sections.filter((x) => x.id !== s.id);
  const name = `Item ${ii + 1}`;
  return `<div class="item it-ed ${sub ? 'it-sub' : ''} ${closed ? 'it-closed' : ''}"><div class="it-head"><button type="button" class="it-tog" data-act="togitem" data-id="${esc(it.id)}" aria-expanded="${!closed}"><span class="car">▾</span> <b>${name}</b><span class="it-pv">${esc(itemPreview(it))}</span></button>${ctrls(arr, ii, list.length)}</div>
    <div class="it-body">
      ${legacy ? `${f('Label', `${ip}.label`, it.label, '', 120)}
      ${ta('Text (optional)', `${ip}.text`, it.text, 600)}
      ${f('URL (optional)', `${ip}.url`, it.url, 'type="url" inputmode="url" placeholder="https://"')}
      ${imgField(`${ip}.image`, it.image, 'image')}${it.image ? sizeUI({ size: `${ip}.imageSize`, width: `${ip}.imageWidth` }, it.imageSize, it.imageWidth) : ''}` : (it.fields.length ? '' : `<p class="hint">Empty. Choose each field you want below. You can add the same field type more than once and drag fields into any order.</p>`)}
      ${it.fields.map((fl, fi) => fieldEditor(`${ip}.fields`, fi, fl, it.fields.length)).join('')}${addFieldUI(`${ip}.fields`)}
      <div class="grid2" style="margin-top:10px"><label class="f">Look on the card<select data-p="${ip}.style"><option value="plain" ${it.style !== 'boxed' ? 'selected' : ''}>Plain</option><option value="boxed" ${it.style === 'boxed' ? 'selected' : ''}>Boxed</option></select></label>
      ${sub ? (groupOpts ? `<label class="f">Move to another group<select data-movesub="${base}.items|${ii}"><option value="">Choose a group…</option>${groupOpts}</select></label>` : '<span></span>')
        : (others.length ? `<label class="f">Move to another section<select data-moveitem="${sp}|${ii}"><option value="">Choose a section…</option>${others.map((o) => `<option value="${esc(o.id)}">${esc(o.title || 'Untitled')}</option>`).join('')}</select></label>` : '<span></span>')}</div>
      <label class="chk"><input type="checkbox" data-p="${ip}.show" ${it.show !== false ? 'checked' : ''}> Show this item</label>
    </div></div>`;
}
function itemPreview(it) {
  if (it.label) return ' – ' + it.label.slice(0, 40);
  for (const fl of it.fields || []) { const v = fl.text || fl.value || fl.street || fl.city || fl.url || fl.title || ''; if (v) return ' – ' + String(v).slice(0, 40); }
  return it.text ? ' – ' + it.text.slice(0, 40) : '';
}
function sectionEditor(s, si) {
  const sp = `sections.${si}`;
  const open = S.open.has(s.id) ? 'open' : '';
  return `<details class="sec-ed" data-sid="${esc(s.id)}" ${open}><summary>${gripBtn(s.title || 'section')}<span class="st">Section: ${esc(s.title || 'Untitled')}</span></summary>
    <p class="hint" style="margin:0 0 8px"><b>Section header</b></p>
    ${f('Title', `${sp}.title`, s.title, '', 120)}
    ${ta('Text (optional)', `${sp}.text`, s.text, 600)}
    ${f('URL (optional)', `${sp}.url`, s.url, 'type="url" inputmode="url" placeholder="https://"')}
    ${imgField(`${sp}.image`, s.image, 'header image')}${s.image ? sizeUI({ size: `${sp}.imageSize`, width: `${sp}.imageWidth` }, s.imageSize, s.imageWidth) : ''}
    <div class="grid2"><label class="f">Show items as<select data-p="${sp}.layout"><option value="list" ${s.layout !== 'grid' ? 'selected' : ''}>List</option><option value="grid" ${s.layout === 'grid' ? 'selected' : ''}>Badge grid</option></select></label>
    <label class="f">Viewers can collapse<select data-p="${sp}.collapse"><option value="open" ${s.collapse !== 'closed' && s.collapse !== 'none' ? 'selected' : ''}>Yes, starts open</option><option value="closed" ${s.collapse === 'closed' ? 'selected' : ''}>Yes, starts collapsed</option><option value="none" ${s.collapse === 'none' ? 'selected' : ''}>No</option></select></label></div>
    ${s.fields.map((fl, fi) => fieldEditor(`${sp}.fields`, fi, fl, s.fields.length)).join('')}${addFieldUI(`${sp}.fields`)}
    <p class="hint" style="margin:16px 0 8px"><b>Items</b></p>
    <div class="row" style="margin:0 0 8px"><span class="spacer"></span><button class="btn sec sm" data-act="itemsall" data-sid="${esc(s.id)}" data-v="1">Collapse all</button><button class="btn sec sm" data-act="itemsall" data-sid="${esc(s.id)}" data-v="0">Expand all</button></div>
    ${s.items.map((it, ii) => itemEditor(it, ii, s, sp, null)).join('')}
    <button class="btn sec sm" data-act="add" data-arr="${sp}.items">+ Add item</button>
    <div class="row" style="display:flex;gap:8px;margin-top:12px;align-items:center"><label class="chk"><input type="checkbox" data-p="${sp}.show" ${s.show !== false ? 'checked' : ''}> Show section</label><span class="spacer"></span><button class="btn danger sm" data-act="rm" data-arr="sections" data-i="${si}">Remove section</button></div>
  </details>`;
}

function formHTML(d) {
  const labelsPhone = ['Mobile', 'Work', 'Home', 'Office'];
  const dl = (id, arr) => `<datalist id="${id}">${arr.map((a) => `<option value="${a}">`).join('')}</datalist>`;
  const t = d.theme, b = d.banner;
  return `
  ${dl('pl', labelsPhone)}${dl('el', ['Work', 'Personal', 'Other'])}
  <fieldset><legend>Basics</legend>
    <div class="grid2">${f('Tab name', 'label', d.label, '', 40)}
    <label class="chk"><input type="checkbox" data-p="isDefault" ${d.isDefault ? 'checked' : ''}> Make this my default card (the phone app opens on it)</label>
    <label class="f">Visibility<select data-p="published" data-bool><option value="1" ${d.published !== false ? 'selected' : ''}>Published</option><option value="0" ${d.published === false ? 'selected' : ''}>Hidden (404)</option></select></label></div>
    ${f('Full name', 'name', d.name, '', 80)}${f('Job title / tagline', 'title', d.title, '', 120)}
    <div class="grid2">${f('Department', 'department', d.department, '', 80)}${f('Company / org', 'company', d.company, '', 80)}</div>
    <div class="grid2">${f('Location', 'location', d.location, '', 80)}${f('Pronouns (optional)', 'pronouns', d.pronouns, '', 30)}</div>
    <label class="f">Short bio (optional)<span class="cnt">${d.bio.length}/600</span><textarea data-p="bio" maxlength="600">${esc(d.bio)}</textarea></label>
  </fieldset>

  <fieldset><legend>Privacy &amp; access</legend>
    <label class="chk"><input type="checkbox" data-p="listed" ${d.listed !== false ? 'checked' : ''}> Show this card in the phone app's list</label>
    <p class="hint">Anyone who knows your address can open <b>/app/</b> and see the cards listed there. Turn this off for cards you only share privately. You still see it there while signed in to this editor.</p>
    ${d.secretKey ? `<p><b>Secret link is on.</b> Only links that include the secret code open this card, and the plain address stops working.</p><p class="urlbox">${esc(cardUrl(d))}</p>
      <div class="actions"><button class="btn sm sec" data-act="copy" data-t="${esc(cardUrl(d))}">Copy link</button><button class="btn sm sec" data-act="genkey">Make a new secret link</button><button class="btn sm sec" data-act="rmkey">Turn off</button></div>
      <p class="hint">Save, then use the Share tab: its links and QR codes include the secret automatically.</p>`
      : `<div class="actions"><button class="btn sm sec" data-act="genkey">Require a secret link</button></div>
      <p class="hint">Adds a long random code to this card's link, so only people you give the full link or QR code to can open it. Good for a recruiter or one event.</p>`}
    <label class="f">Card expires (optional)<input type="date" data-p="expires" data-expires value="${esc(localDate(d.expires))}"></label>
    <p class="hint">${d.expires ? (expired(d) ? 'This card has <b>expired</b>. Visitors see a short "no longer available" page. You can still open and preview it.' : 'After the end of that day, visitors see a short "no longer available" page.') : 'Leave empty for a card that never expires.'}</p>
  </fieldset>

  <fieldset><legend>Contact exchange</legend>
    <label class="chk"><input type="checkbox" data-p="exchange.enabled" data-rerender ${d.exchange.enabled ? 'checked' : ''}> Let visitors send me their details</label>
    ${d.exchange.enabled ? `${f('Heading', 'exchange.title', d.exchange.title, '', 80)}
      <label class="chk"><input type="checkbox" data-p="exchange.askPhone" ${d.exchange.askPhone ? 'checked' : ''}> Also ask for a phone number</label>
      <label class="chk"><input type="checkbox" data-p="exchange.askNote" ${d.exchange.askNote !== false ? 'checked' : ''}> Include a note box</label>` : ''}
    <p class="hint">Adds a short form to the bottom of the card. Details appear on the <b>Activity</b> tab, are kept only in your own Cloudflare storage, and are deleted automatically after 180 days. Only turn this on if you are comfortable holding other people's contact details.</p>
  </fieldset>

  <fieldset><legend>Images</legend>
    <div class="imgrow">${imgThumb(d.photo)}<div><button class="btn sec sm" data-act="upload" data-kind="photo">Upload photo</button> ${d.photo ? '<button class="btn danger sm" data-act="clear" data-p="photo">Remove</button>' : ''}<p class="hint">Square-ish works best. Also used in your contact file.</p></div></div>
    <div class="imgrow">${imgThumb(d.logo, true)}<div><button class="btn sec sm" data-act="upload" data-kind="logo">Upload company logo</button> ${d.logo ? '<button class="btn danger sm" data-act="clear" data-p="logo">Remove</button>' : ''}<p class="hint">Without a logo the company name shows as text.</p></div></div>
    <label class="f">Banner style<select data-p="banner.preset" data-banner>${Object.keys(BANNERS).map((k) => `<option value="${k}" ${b.type !== 'image' && b.preset === k ? 'selected' : ''}>${k}</option>`).join('')}<option value="__image" ${b.type === 'image' ? 'selected' : ''}>Uploaded image</option></select></label>
    <div class="imgrow">${imgThumb(b.image, true)}<div><button class="btn sec sm" data-act="upload" data-kind="banner">Upload banner image</button><p class="hint">Wide image, about 1200×400.</p></div></div>
  </fieldset>

  ${layoutHTML(d)}
  <div class="row addf" style="margin:0 0 16px"><button class="btn sec" data-act="add" data-arr="sections">+ Add section</button><button class="btn sec" data-act="addsep">+ Add separator</button></div>
  <fieldset><legend>Colors & mode</legend>
    <div class="colors"><label class="f">Accent<input type="color" data-p="theme.accent" value="${esc(t.accent)}"></label>
    <label class="f">Dark accent<input type="color" data-p="theme.accent2" value="${esc(t.accent2)}"></label>
    <label class="f">Highlight<input type="color" data-p="theme.cloud" value="${esc(t.cloud)}"></label></div>
    <label class="f">Page mode<select data-p="theme.mode"><option value="light" ${t.mode !== 'dark' ? 'selected' : ''}>Light</option><option value="dark" ${t.mode === 'dark' ? 'selected' : ''}>Dark</option></select></label>
  </fieldset>

  <fieldset><legend>Contact file extras</legend>
    <label class="f">Extra note saved with the contact (optional)<textarea data-p="vcardNote" maxlength="400">${esc(d.vcardNote)}</textarea></label>
  </fieldset>

  <fieldset><legend>Danger zone</legend><button class="btn danger" data-act="delete">Delete this card</button></fieldset>`;
}

function blockSet(d, k) {
  return `<div class="po-set"><div class="grid2"><label class="f">Viewers can collapse<select data-p="collapse.${k}"><option value="open" ${d.collapse[k] !== 'closed' && d.collapse[k] !== 'none' ? 'selected' : ''}>Yes, starts open</option><option value="closed" ${d.collapse[k] === 'closed' ? 'selected' : ''}>Yes, starts collapsed</option><option value="none" ${d.collapse[k] === 'none' ? 'selected' : ''}>No</option></select></label>${f('Heading on the card', `blockTitles.${k}`, d.blockTitles[k], '', 60)}</div></div>`;
}
const gripBtn = (name) => `<button type="button" class="grip" aria-label="Drag to move ${esc(name)}. Arrow keys also work." title="Drag to move">⠿</button>`;
function contactFs(d) {
  const labelsPhone = ['Mobile', 'Work', 'Home', 'Office'];
  return `
  <fieldset><legend>Phone numbers</legend>
    ${d.phones.map((p, i) => `<div class="item"><div class="grid2">${f('Label', `phones.${i}.label`, p.label, 'list="pl"')}${f('Number', `phones.${i}.value`, p.value, 'type="tel" inputmode="tel"')}</div>
      <div class="row">${toggles(`phones.${i}`, p)}${ctrls('phones', i, d.phones.length)}</div></div>`).join('')}
    <button class="btn sec sm" data-act="add" data-arr="phones">+ Add phone</button>
  </fieldset>

  <fieldset><legend>Emails</legend>
    ${d.emails.map((p, i) => `<div class="item"><div class="grid2">${f('Label', `emails.${i}.label`, p.label, 'list="el"')}${f('Email', `emails.${i}.value`, p.value, 'type="email" inputmode="email"')}</div>
      <div class="row">${toggles(`emails.${i}`, p)}${ctrls('emails', i, d.emails.length)}</div></div>`).join('')}
    <button class="btn sec sm" data-act="add" data-arr="emails">+ Add email</button>
  </fieldset>`;
}
function linksFs(d) {
  return `
  <fieldset><legend>Links</legend>
    ${d.links.map((l, i) => `<div class="item"><div class="grid2">${f('Label', `links.${i}.label`, l.label)}
      <label class="f">Icon<select data-p="links.${i}.icon">${ICON_KEYS.map((k) => `<option ${l.icon === k ? 'selected' : ''}>${k}</option>`).join('')}</select></label></div>
      <div class="imgrow">${imgThumb(l.iconImage)}<div><button class="btn sec sm" data-act="upload" data-kind="linkicon" data-p="links.${i}.iconImage">Upload custom icon</button> ${l.iconImage ? `<button class="btn danger sm" data-act="clear" data-p="links.${i}.iconImage">Remove</button>` : ''}<p class="hint">${l.iconImage ? 'Custom icon is used instead of the dropdown.' : 'Optional. Overrides the dropdown icon.'}</p></div></div>
      ${f('URL', `links.${i}.url`, l.url, 'type="url" inputmode="url" placeholder="https://"')}
      <div class="row">${toggles(`links.${i}`, { ...l, inVcard: l.inVcard === true })}${ctrls('links', i, d.links.length)}</div></div>`).join('')}
    <button class="btn sec sm" data-act="add" data-arr="links">+ Add link</button>
    <p class="hint">“In contact file” puts the link in the saved contact. Keep that for a few key links.</p>
  </fieldset>`;
}
function layoutHTML(d) {
  const keys = layoutKeys(d);
  const rows = keys.map((k) => {
    const si = (d.separators || []).findIndex((x) => x.id === k);
    if (si >= 0) {
      const sp = d.separators[si], p = `separators.${si}`;
      return `<div class="po-row sepr" data-key="${esc(k)}"><div class="po-head">${gripBtn('separator')}<b>Separator: ${esc(SEP_STYLES[sp.style] || 'Line')}</b><span class="spacer"></span><button class="btn danger sm" data-act="rmsep" data-id="${esc(k)}">Remove</button></div>
      <div class="po-set"><div class="grid2"><label class="f">Style<select data-p="${p}.style" data-rerender>${Object.entries(SEP_STYLES).map(([v, n]) => `<option value="${v}" ${sp.style === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <label class="f">Spacing<select data-p="${p}.size">${Object.entries(SEP_SIZES).map(([v, n]) => `<option value="${v}" ${sp.size === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label></div>
      ${sp.style === 'label' ? f('Label text', `${p}.text`, sp.text, '', 60) : ''}
      ${sp.style === 'image' ? imgField(`${p}.image`, sp.image, 'image or SVG') : ''}
      <label class="chk"><input type="checkbox" data-p="${p}.show" ${sp.show !== false ? 'checked' : ''}> Show</label></div></div>`;
    }
    if (k === 'contact') return `<div class="po-row bare" data-key="contact"><div class="po-head">${gripBtn('Phones & emails')}<b>Phones & emails</b><span class="hint">drag to move</span></div>${contactFs(d)}${blockSet(d, 'contact')}</div>`;
    if (k === 'links') return `<div class="po-row bare" data-key="links"><div class="po-head">${gripBtn('Links')}<b>Links</b><span class="hint">drag to move</span></div>${linksFs(d)}${blockSet(d, 'links')}</div>`;
    const i = d.sections.findIndex((x, n) => sectionKey(x, n) === k);
    return i < 0 ? '' : `<div class="po-row bare" data-key="${esc(k)}">${sectionEditor(d.sections[i], i)}</div>`;
  }).join('');
  return `<p class="hint" style="margin:0 0 8px">Drag the ⠿ handle on any block to move it (or focus it and use the arrow keys). The top block appears first under your name and Save contact button.</p><div class="po" id="po">${rows}</div>`;
}

function shareHTML(d) {
  const url = cardUrl(d), vcf = vcfUrl(d);
  const snippet = `<p><a href="${esc(cardUrl(d, 'email'))}">${esc(d.name)} – digital card</a> · <a href="${esc(vcf)}">Save my contact</a></p>`;
  const trk = cleanSrc(S.trk);
  return `<div class="share-box">
  ${S.dirty ? '<p class="hint">Unsaved changes. Save first so the shared card is up to date.</p>' : ''}
  ${d.published === false ? '<p class="hint" style="color:#c23934">This card is hidden. Set it to Published to share.</p>' : ''}
  ${d.secretKey ? '<p class="hint">Secret link is on, so every link and QR below includes the secret code.</p>' : ''}
  ${expired(d) ? '<p class="hint" style="color:#c23934">This card has expired, so visitors cannot open it.</p>' : ''}
  <p class="urlbox">${esc(url)}</p>
  <img class="qr" src="${esc(qrPath(d))}${qrPath(d).includes('?') ? '&' : '?'}t=${S.savedAt || 0}" alt="QR code" width="200" height="200">
  <div class="actions">
    <button class="btn sm" data-act="copy" data-t="${esc(url)}">Copy link</button>
    <a class="btn sm sec" href="${esc(url)}" target="_blank" rel="noopener">Open card</a>
    <a class="btn sm sec" href="${esc(qrPath(d))}" download="${esc(d.slug)}-qr.svg">Download QR (SVG)</a>
    <button class="btn sm sec" data-act="dlpng" data-src="">Download QR (PNG)</button>
    <a class="btn sm sec" href="${esc(vcf)}" download>Download .vcf</a>
    <a class="btn sm sec" href="/c/${esc(d.slug)}/vcard-qr.svg${d.secretKey ? '?k=' + esc(d.secretKey) : ''}" target="_blank" rel="noopener">Contact-only QR</a>
    <a class="btn sm sec" href="mailto:?subject=${encodeURIComponent(d.name + ' – digital card')}&body=${encodeURIComponent('Here is my digital card, with a button to save my contact:\n' + url)}">Email it</a>
  </div>
  <p class="hint">The PNG is large enough to print or drop into slides and video-call backgrounds.</p>
  <b>Tracked links</b><p class="hint">Make a link or QR code for one place, such as your resume, LinkedIn or an event badge. The Activity tab shows how many people used each one.</p>
  <div class="actions">${['linkedin', 'resume', 'email', 'event', 'nfc'].map((x) => `<button class="btn sm sec${trk === x ? ' on' : ''}" data-act="trkpick" data-v="${x}">${x}</button>`).join('')}</div>
  <label class="f">Label (letters and numbers)<input id="trksrc" maxlength="20" placeholder="for example: resume" value="${esc(trk)}"></label>
  <p class="urlbox" id="trkurl">${esc(cardUrl(d, trk || 'link'))}</p>
  <div class="actions"><button class="btn sm" data-act="trkcopy">Copy tracked link</button><button class="btn sm sec" data-act="dlpng" data-fromtrk="1">Download its QR (PNG)</button></div>
  <b>Email snippet</b><p class="hint">Paste into an email or signature. Recipients tap “Save my contact”.</p>
  <textarea class="snip" readonly>${esc(snippet)}</textarea>
  <div class="actions"><button class="btn sm sec" data-act="copyrich">Copy as formatted link</button></div></div>`;
}

/* ---------- activity: counters + details people sent you ---------- */
async function loadActivity() {
  const slug = S.slug; if (!slug) return;
  S.act = { slug, loading: true };
  try {
    const [stats, xc] = await Promise.all([api(`/api/admin/stats?slug=${encodeURIComponent(slug)}`), api(`/api/admin/exchanges?slug=${encodeURIComponent(slug)}`)]);
    S.act = { slug, stats, xc };
  } catch (e) { S.act = { slug, err: e.message || 'Could not load activity' }; }
  const box = $('#act'); if (box && S.draft && S.draft.slug === slug) box.innerHTML = actHTML(S.draft);
}
function actHTML(d) {
  const A = S.act;
  if (!A || A.slug !== d.slug || A.loading) return '<div class="share-box"><b>Activity</b><p class="hint">Loading…</p></div>';
  if (A.err) return `<div class="share-box"><b>Activity</b><p class="hint" style="color:#c23934">${esc(A.err)}</p><div class="actions"><button class="btn sm sec" data-act="actrefresh">Try again</button></div></div>`;
  const { stats, xc } = A, max = Math.max(1, ...stats.days.map((x) => x.v));
  const bars = stats.days.map((x) => `<i style="height:${Math.max(3, Math.round((x.v / max) * 100))}%" title="${esc(x.date)}: ${x.v} view${x.v === 1 ? '' : 's'}"></i>`).join('');
  const label = { direct: 'Direct link', qr: 'QR code', share: 'Share button', other: 'Other' };
  const src = stats.sources.map((x) => `<tr><td>${esc(label[x.name] || x.name)}</td><td>${x.v}</td></tr>`).join('');
  const rows = xc.map((r) => `<div class="xcrow"><div><b>${esc(r.name)}</b>${r.email ? ` · <a href="mailto:${esc(r.email)}">${esc(r.email)}</a>` : ''}${r.phone ? ` · ${esc(r.phone)}` : ''}<br><span class="hint">${esc(new Date(r.t).toLocaleString())}</span>${r.note ? `<br>${esc(r.note)}` : ''}</div><button class="btn sm sec" data-act="delxc" data-id="${esc(r.id)}">Delete</button></div>`).join('');
  return `<div class="share-box"><b>Activity, last 30 days</b>
  <div class="tiles"><div><span>${stats.totals.v}</span>card views</div><div><span>${stats.totals.s}</span>contacts saved</div><div><span>${stats.totals.x}</span>details received</div></div>
  <div class="bars" aria-label="Views per day">${bars}</div>
  ${src ? `<b>Where views came from</b><table class="srct">${src}</table><p class="hint">Sources cover this and last month. Use the Share tab to make tracked links for places like your resume or LinkedIn.</p>` : '<p class="hint">No views yet. Visits from you and from link-preview bots are not counted.</p>'}
  <b>Details people sent you</b>
  ${d.exchange.enabled ? '' : '<p class="hint">Contact exchange is off for this card. Turn it on under Contact exchange in the Edit tab.</p>'}
  ${rows || '<p class="hint">Nothing received yet.</p>'}
  <div class="actions">${xc.length ? '<button class="btn sm sec" data-act="csvxc">Download as CSV</button>' : ''}<button class="btn sm sec" data-act="actrefresh">Refresh</button></div>
  <p class="hint">Counts are approximate, use UTC days, and store no IP addresses or browser details. Received details are deleted after 180 days.</p></div>`;
}
function downloadText(name, text, type) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; document.body.appendChild(a); a.click(); a.remove();
}
const csvCell = (v) => { v = String(v ?? ''); if (/^[=+\-@\t\r]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; };

/* ---------- preview / save bar ---------- */
function schedulePreview() { clearTimeout(previewTimer); previewTimer = setTimeout(updatePreview, 250); }
function updatePreview() {
  const fr = $('#frame'); if (!fr || !S.draft) return;
  fr.srcdoc = renderCardHTML(S.draft, { origin: location.origin, preview: true });
}
function updateSaveBar() {
  const st = $('#st'), b = $('#savebtn'); if (!st) return;
  st.textContent = S.dirty ? 'Unsaved changes' : S.savedAt ? 'All changes saved' : '';
  b.disabled = !S.dirty;
}
addEventListener('beforeunload', (e) => { if (S.dirty) { e.preventDefault(); e.returnValue = ''; } });

/* ---------- events ---------- */
function onField(e) {
  const el = e.target;
  if (el.id === 'trksrc') { S.trk = cleanSrc(el.value); const u = $('#trkurl'); if (u && S.draft) u.textContent = cardUrl(S.draft, S.trk || 'link'); return; }
  const p = el.dataset?.p; if (!p || !S.draft) return;
  if (el.hasAttribute('data-expires')) { S.draft.expires = el.value ? new Date(el.value + 'T23:59:59').toISOString() : ''; dirty(); return keepScroll(render); }
  if (el.hasAttribute('data-banner')) {
    if (el.value === '__image') S.draft.banner.type = 'image'; else { S.draft.banner.type = 'preset'; S.draft.banner.preset = el.value; }
    return dirty();
  }
  let v = el.type === 'checkbox' ? el.checked : el.value;
  if (el.dataset.fmt === 'phone') { const dg = v.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, ''); if (dg.length === 10) { v = `${dg.slice(0, 3)}-${dg.slice(3, 6)}-${dg.slice(6)}`; el.value = v; } }
  if (el.hasAttribute('data-bool')) v = v === '1';
  setPath(S.draft, p, v);
  const cnt = el.closest('label')?.querySelector('.cnt');
  if (cnt && el.maxLength > 0) cnt.textContent = `${el.value.length}/${el.maxLength}`;
  dirty();
  if (el.hasAttribute('data-rerender')) keepScroll(render);
  if (/^sections\.\d+\.title$/.test(p)) { const st = el.closest('details.sec-ed')?.querySelector('summary .st'); if (st) st.textContent = 'Section: ' + (v || 'Untitled'); }
  if (p === 'label') { const t = document.querySelector(`.tab.on`); if (t) t.textContent = v || S.slug; }
}
function keepScroll(fn) { const y = scrollY; fn(); scrollTo(0, y); }

const defaults = {
  phones: () => ({ label: 'Mobile', value: '', show: true, inVcard: true }),
  emails: () => ({ label: 'Personal', value: '', show: true, inVcard: true }),
  links: () => ({ label: '', url: '', icon: 'link', show: true, inVcard: false }),
  sections: () => newSection(Math.random().toString(36).slice(2, 8)),
  items: () => newItem(),
};

async function onClick(e) {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const a = el.dataset.act;
  try {
    if (a === 'tab') return switchTo(el.dataset.slug);
    if (a === 'view') { S.view = el.dataset.v; return keepScroll(render); }
    if (a === 'logout') { await api('/api/logout', { method: 'POST' }); S.slug = null; return showLogin(); }
    if (a === 'save') return save();
    if (a === 'new') return newCard();
    if (a === 'dupcard') return dupCard();
    if (a === 'delete') return del();
    if (a === 'add') { const arr = getPath(S.draft, el.dataset.arr); const nw = defaults[el.dataset.arr.split('.').pop()](); arr.push(nw); if (el.dataset.arr === 'sections') S.open.add(nw.id); dirty(); return keepScroll(render); }
    if (a === 'addfield') { const sel = el.parentElement.querySelector('.fsel'); getPath(S.draft, el.dataset.arr).push(newField(sel.value)); dirty(); return keepScroll(render); }
    if (a === 'rm') { if (!confirm('Remove this item?')) return; getPath(S.draft, el.dataset.arr).splice(+el.dataset.i, 1); dirty(); return keepScroll(render); }
    if (a === 'dup') {
      const arr = getPath(S.draft, el.dataset.arr), i = +el.dataset.i, cp = structuredClone(arr[i]);
      const reid = (o) => { if (o && typeof o === 'object') { if ('id' in o) o.id = Math.random().toString(36).slice(2, 8); (o.items || []).forEach(reid); } }; reid(cp);
      arr.splice(i + 1, 0, cp); dirty(); return keepScroll(render);
    }
    if (a === 'togitem') { const id = el.dataset.id; if (S.itemClosed.has(id)) S.itemClosed.delete(id); else S.itemClosed.add(id); return keepScroll(render); }
    if (a === 'itemsall') { const sec = S.draft.sections.find((x) => x.id === el.dataset.sid); [...sec.items, ...sec.items.flatMap((g) => g.items || [])].forEach((it) => { if (el.dataset.v === '1') S.itemClosed.add(it.id); else S.itemClosed.delete(it.id); }); return keepScroll(render); }
    if (a === 'mv') {
      const arr = getPath(S.draft, el.dataset.arr); const i = +el.dataset.i, j = i + +el.dataset.dir;
      if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; dirty(); return keepScroll(render);
    }
    if (a === 'clear') { setPath(S.draft, el.dataset.p, ''); if (el.dataset.p === 'photo') S.draft.photoVcard = ''; dirty(); return keepScroll(render); }
    if (a === 'addsep') {
      const id = 'sep' + Math.random().toString(36).slice(2, 6);
      const keys = layoutKeys(S.draft); S.draft.separators = S.draft.separators || [];
      S.draft.separators.push(newSeparator(id)); S.draft.order = [...keys, id]; dirty(); return keepScroll(render);
    }
    if (a === 'rmsep') {
      S.draft.separators = (S.draft.separators || []).filter((x) => x.id !== el.dataset.id);
      S.draft.order = (S.draft.order || []).filter((k) => k !== el.dataset.id); dirty(); return keepScroll(render);
    }
    if (a === 'upload') return pickImage(el.dataset);
    if (a === 'copy') { await navigator.clipboard.writeText(el.dataset.t); return toast('Link copied'); }
    if (a === 'rail') {
      const k = el.dataset.k, sec = el.closest('.rp');
      RAIL.has(k) ? RAIL.delete(k) : RAIL.add(k);
      sec.classList.toggle('closed', RAIL.has(k)); el.setAttribute('aria-expanded', RAIL.has(k) ? 'false' : 'true');
      try { localStorage.setItem('bc_rail', JSON.stringify([...RAIL])); } catch (e) { /* ignore */ }
      return;
    }
    if (a === 'copyrich') return copyRich();
    if (a === 'genkey') { if (S.draft.secretKey && !confirm('Make a new secret link? Links and QR codes you already shared will stop working.')) return; S.draft.secretKey = randKey(); dirty(); return keepScroll(render); }
    if (a === 'rmkey') { if (!confirm('Turn off the secret link? Anyone who has the plain card address will be able to open it.')) return; S.draft.secretKey = ''; dirty(); return keepScroll(render); }
    if (a === 'trkpick') { S.trk = el.dataset.v; return keepScroll(render); }
    if (a === 'trkcopy') { await navigator.clipboard.writeText(cardUrl(S.draft, cleanSrc(S.trk) || 'link')); return toast('Tracked link copied'); }
    if (a === 'dlpng') { const src = el.dataset.fromtrk ? cleanSrc(S.trk) || 'link' : ''; await window.QRDL.download(qrPath(S.draft, src), `${S.draft.slug}-${src || 'qr'}.png`, 1024); return toast('QR image saved'); }
    if (a === 'actrefresh') { await loadActivity(); return; }
    if (a === 'delxc') { if (!confirm('Delete these details? This cannot be undone.')) return; await api(`/api/admin/exchanges?slug=${encodeURIComponent(S.slug)}&id=${encodeURIComponent(el.dataset.id)}`, { method: 'DELETE' }); await loadActivity(); return toast('Deleted'); }
    if (a === 'csvxc') { const rows = S.act?.xc || []; downloadText(`${S.slug}-contacts.csv`, ['Date,Name,Email,Phone,Note', ...rows.map((r) => [r.t, r.name, r.email, r.phone, r.note].map(csvCell).join(','))].join('\r\n'), 'text/csv'); return; }
  } catch (err) { toast(err.message || 'Something went wrong'); }
}

async function copyRich() {
  const url = cardUrl(S.draft, 'email'), vcf = vcfUrl(S.draft);
  const html = `<p><a href="${esc(url)}">${esc(S.draft.name)} – digital card</a> · <a href="${esc(vcf)}">Save my contact</a></p>`;
  const plain = `${S.draft.name} – digital card: ${url}\nSave my contact: ${vcf}`;
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([plain], { type: 'text/plain' }) })]);
  } catch { await navigator.clipboard.writeText(plain); }
  toast('Copied');
}

async function switchTo(slug) {
  if (slug === S.slug) return;
  if (S.dirty && !confirm('Discard unsaved changes on this card?')) return;
  S.slug = slug; S.draft = withIds(structuredClone(current())); S.dirty = false; render();
}
async function save() {
  const btn = $('#savebtn'); btn.disabled = true; btn.textContent = 'Saving…';
  try {
    const saved = await api(`/api/admin/cards/${S.slug}`, { method: 'PUT', json: S.draft });
    const i = S.cards.findIndex((c) => c.slug === S.slug); S.cards[i] = saved;
    if (saved.isDefault) S.cards.forEach((c) => { if (c.slug !== saved.slug) c.isDefault = false; });
    S.draft = structuredClone(saved); S.dirty = false; S.savedAt = Date.now();
    toast('Saved'); keepScroll(render);
  } catch (e) {
    if (e.status === 401) { showLogin('Session expired. Sign in again (your edits are still on this page until you reload).'); }
    else toast(e.message);
    btn.disabled = false; btn.textContent = 'Save';
  }
}
async function newCard() {
  if (S.dirty && !confirm('Discard unsaved changes?')) return;
  const label = prompt('Name for the new card (e.g. Job Search):'); if (!label) return;
  const slug = (prompt('Web address ending (letters, numbers, dashes):', label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32)) || '').toLowerCase();
  if (!slug) return;
  const copyFrom = S.slug && confirm('Start from a copy of the current card?\nOK = copy, Cancel = blank') ? S.slug : undefined;
  try { const c = await api('/api/admin/cards', { method: 'POST', json: { slug, label, copyFrom } }); await load(c.slug); toast('Card created'); }
  catch (e) { toast(e.message); }
}
async function dupCard() {
  if (!S.slug) return;
  if (S.dirty) { if (!confirm('You have unsaved changes. Save them first, then make the copy?')) return; await save(); if (S.dirty) return; }
  const src = current();
  const label = prompt('Name for the copy:', `${src.label || src.slug} copy`); if (!label) return;
  const base = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 28) || 'card';
  let slug = base, n = 2;
  while (S.cards.some((c) => c.slug === slug)) slug = `${base}-${n++}`;
  try { const c = await api('/api/admin/cards', { method: 'POST', json: { slug, label, copyFrom: S.slug } }); await load(c.slug); toast(`Copied to "${label}". It has its own address and no secret link yet.`); }
  catch (e) { toast(e.message); }
}
async function del() {
  const d = S.draft;
  if (prompt(`Delete "${d.label}" permanently? Its link and QR codes will stop working.\nType DELETE to confirm.`) !== 'DELETE') return;
  await api(`/api/admin/cards/${d.slug}`, { method: 'DELETE' }); S.slug = null; S.dirty = false; await load(); toast('Deleted');
}

/* ---------- image upload ---------- */
let pending = null, svgAllowed = true;
function pickImage(ds) { pending = ds; const fi = $('#file'); fi.value = ''; fi.accept = ds.kind === 'attach' ? '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp,.rtf,.txt,.csv,.md,.json,.zip,.7z,.rar' : 'image/jpeg,image/png,image/webp,image/svg+xml,.svg'; fi.click(); }
$('#file').addEventListener('change', async (e) => {
  const file = e.target.files[0]; if (!file || !pending) return;
  const ds = pending; pending = null; svgAllowed = ds.kind !== 'photo';
  try {
    toast('Uploading…');
    const k = ds.kind;
    if (k === 'attach') {
      if (file.size > 10 * 1024 * 1024) throw new Error('File too large (max 10 MB)');
      const r = await api('/api/admin/upload?kind=file', { method: 'POST', headers: { 'X-Filename': encodeURIComponent(file.name) }, body: file });
      const t = getPath(S.draft, ds.p); t.file = r.id; t.name = r.name;
    } else if (k === 'photo') {
      if (/svg/i.test(file.type) || /\.svg$/i.test(file.name)) throw new Error('SVG is not allowed for photos. Use JPG or PNG.');
      S.draft.photo = await upload(await shrink(file, { max: 640, type: 'image/jpeg' }));
      S.draft.photoVcard = await upload(await shrink(file, { max: 256, square: true, type: 'image/jpeg', q: 0.8 }));
    } else if (k === 'logo') S.draft.logo = await upload(await shrink(file, { max: 480, type: file.type === 'image/png' ? 'image/png' : 'image/jpeg' }));
    else if (k === 'banner') { S.draft.banner.image = await upload(await shrink(file, { max: 1400, type: 'image/jpeg' })); S.draft.banner.type = 'image'; }
    else if (k === 'linkicon') setPath(S.draft, ds.p, await upload(await shrink(file, { max: 128, square: true, type: file.type === 'image/png' ? 'image/png' : 'image/jpeg' })));
    else if (k === 'item') setPath(S.draft, ds.p, await upload(await shrink(file, { max: 900, type: file.type === 'image/png' ? 'image/png' : 'image/jpeg' })));
    dirty(); keepScroll(render); toast('Uploaded. Remember to Save.');
  } catch (er) { toast(er.message); }
});
async function upload(blob) { return (await api('/api/admin/upload', { method: 'POST', body: blob })).id; }
async function shrink(file, { max, type, q = 0.86, square = false }) {
  if (file.type === 'image/svg+xml' || /\.svg$/i.test(file.name)) {
    if (!svgAllowed) throw new Error('SVG is not allowed for photos. Use JPG or PNG.');
    if (file.size > 680 * 1024) throw new Error('SVG is too large (max 680 KB)');
    return new Blob([await file.arrayBuffer()], { type: 'image/svg+xml' });
  }
  const bmp = await createImageBitmap(file);
  let w = bmp.width, h = bmp.height, sx = 0, sy = 0, sw = w, sh = h;
  if (square) { const s = Math.min(w, h); sx = (w - s) / 2; sy = (h - s) / 2; sw = sh = s; w = h = s; }
  const sc = Math.min(1, max / Math.max(w, h)); const cw = Math.round(w * sc), ch = Math.round(h * sc);
  const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
  const ctx = cv.getContext('2d');
  if (type === 'image/jpeg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cw, ch); }
  ctx.drawImage(bmp, sx, sy, sw, sh, 0, 0, cw, ch);
  for (let quality = q; quality > 0.3; quality -= 0.12) {
    const blob = await new Promise((r) => cv.toBlob(r, type, quality));
    if (blob && blob.size < 680 * 1024) return blob;
    if (type === 'image/png') break;
  }
  const blob = await new Promise((r) => cv.toBlob(r, 'image/jpeg', 0.5));
  if (blob.size >= 680 * 1024) throw new Error('Image is too large even after shrinking');
  return blob;
}

/* ---------- drag to sort (blocks, items, fields, links, phones, emails) ---------- */
let drag = null;
// A grip belongs to a row; its siblings are the rows that share the same list.
function gripRow(g) {
  if (g.dataset.arr) {
    const row = g.closest('.item'), arr = g.dataset.arr;
    const rows = [...row.parentElement.children].filter((el) => el.matches('.item') && el.querySelector(`.grip[data-arr="${arr}"]`));
    return { row, rows, arr };
  }
  const row = g.closest('.po-row');
  return { row, rows: [...row.parentElement.querySelectorAll(':scope > .po-row')], arr: null };
}
function moveInList(arr, from, to) {
  if (arr) { const list = getPath(S.draft, arr); const [x] = list.splice(from, 1); list.splice(to, 0, x); }
  else { const keys = layoutKeys(S.draft); const [k] = keys.splice(from, 1); keys.splice(to, 0, k); S.draft.order = keys; }
  dirty(); keepScroll(render);
}
app.addEventListener('pointerdown', (e) => {
  const g = e.target.closest('.grip'); if (!g) return;
  e.preventDefault();
  const { row, rows, arr } = gripRow(g);
  drag = { row, rows, arr, rects: rows.map((r) => r.getBoundingClientRect()), from: rows.indexOf(row), to: rows.indexOf(row), y0: e.clientY };
  row.classList.add('dragging'); try { g.setPointerCapture(e.pointerId); } catch {}
});
app.addEventListener('pointermove', (e) => {
  if (!drag) return;
  drag.row.style.transform = `translateY(${e.clientY - drag.y0}px)`;
  let to = drag.from;
  drag.rects.forEach((r, i) => { if (e.clientY >= r.top && e.clientY <= r.bottom) to = i; });
  if (e.clientY < drag.rects[0].top) to = 0;
  if (e.clientY > drag.rects[drag.rects.length - 1].bottom) to = drag.rects.length - 1;
  drag.to = to;
  drag.rows.forEach((r, i) => { r.classList.toggle('drop-before', i === to && to < drag.from); r.classList.toggle('drop-after', i === to && to > drag.from); });
});
function endDrag(commit) {
  if (!drag) return; const d = drag; drag = null;
  d.rows.forEach((r) => r.classList.remove('dragging', 'drop-before', 'drop-after')); d.row.style.transform = '';
  if (commit && d.to !== d.from) moveInList(d.arr, d.from, d.to);
}
app.addEventListener('pointerup', () => endDrag(true));
app.addEventListener('pointercancel', () => endDrag(false));
app.addEventListener('keydown', (e) => {
  const g = e.target.closest?.('.grip'); if (!g || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
  e.preventDefault();
  const { row, rows, arr } = gripRow(g); const i = rows.indexOf(row), j = i + (e.key === 'ArrowUp' ? -1 : 1);
  if (j < 0 || j >= rows.length) return;
  const sel = arr ? `.grip[data-arr="${arr}"][data-i="${j}"]` : `.po-row[data-key="${row.dataset.key}"] .grip`;
  const sid = row.closest('[data-sid]')?.dataset.sid;
  moveInList(arr, i, j);
  setTimeout(() => { const root = sid ? document.querySelector(`[data-sid="${sid}"]`) : document; (root.querySelector(sel) || document.querySelector(sel))?.focus(); }, 0);
});

/* collapsible editor panels (click a heading) */
S.closedFs = new Set();
function applyFs() {
  document.querySelectorAll('#form fieldset').forEach((fs) => {
    const lg = fs.querySelector(':scope > legend'); if (!lg) return;
    lg.classList.add('fs-toggle'); lg.setAttribute('role', 'button'); lg.tabIndex = 0;
    fs.classList.toggle('fs-closed', S.closedFs.has(lg.textContent.trim()));
    lg.setAttribute('aria-expanded', String(!fs.classList.contains('fs-closed')));
  });
}
function toggleFs(lg) {
  const fs = lg.parentElement, key = lg.textContent.trim();
  if (S.closedFs.has(key)) S.closedFs.delete(key); else S.closedFs.add(key);
  applyFs();
}
app.addEventListener('click', (e) => { const lg = e.target.closest('legend.fs-toggle'); if (lg) toggleFs(lg); });
app.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('legend.fs-toggle')) { e.preventDefault(); toggleFs(e.target); } });

/* remember which section editors are expanded */
app.addEventListener('toggle', (e) => {
  const d = e.target; if (!d.matches?.('details.sec-ed')) return;
  if (d.open) S.open.add(d.dataset.sid); else S.open.delete(d.dataset.sid);
}, true);

app.addEventListener('input', onField);
app.addEventListener('change', async (e) => {
  if (e.target.id === 'admcard') { const before = S.slug; await switchTo(e.target.value); if (S.slug === before) render(); return; }
  const ms = e.target.dataset?.movesub;
  if (ms && e.target.value !== '') {
    const [pth, ii] = ms.split('|'); const src = getPath(S.draft, pth);
    const grp = getPath(S.draft, pth.replace(/\.\d+\.items$/, ''))[+e.target.value];
    if (grp) { const [it] = src.splice(+ii, 1); grp.items = grp.items || []; grp.items.push(it); S.itemClosed.delete(grp.id); dirty(); keepScroll(render); }
    return;
  }
  const mv = e.target.dataset?.moveitem;
  if (mv && e.target.value) {
    const [sp, ii] = mv.split('|'); const src = getPath(S.draft, sp + '.items'); const tgt = S.draft.sections.find((x) => x.id === e.target.value);
    if (tgt) { const [it] = src.splice(+ii, 1); tgt.items.push(it); S.open.add(tgt.id); dirty(); keepScroll(render); }
    return;
  } if (e.target.matches('select,input[type=checkbox],input[type=color]')) onField(e); });
app.addEventListener('click', onClick);
boot();
