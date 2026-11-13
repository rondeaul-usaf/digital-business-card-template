const MAX = 700 * 1024;
function sniff(u) {
  if (u[0] === 0xff && u[1] === 0xd8 && u[2] === 0xff) return 'image/jpeg';
  if (u[0] === 0x89 && u[1] === 0x50 && u[2] === 0x4e && u[3] === 0x47) return 'image/png';
  if (u[0] === 0x52 && u[1] === 0x49 && u[2] === 0x46 && u[3] === 0x46 && u[8] === 0x57 && u[9] === 0x45 && u[10] === 0x42 && u[11] === 0x50) return 'image/webp';
  return null;
}
const BAD_SVG = /<script|<foreignObject|<iframe|<embed|<object|<audio|<video|<animate|<set\b|\son[a-z]+\s*=|javascript:|data:text\/html|<!ENTITY|<!DOCTYPE[^>]*\[/i;
function svgOk(u) {
  let t;
  try { t = new TextDecoder('utf-8', { fatal: true }).decode(u).replace(/^\uFEFF/, ''); } catch { return false; }
  if (!/^\s*(<\?xml[^>]*\?>\s*)?(<!--[\s\S]*?-->\s*)*(<!DOCTYPE[^>]*>\s*)?<svg[\s>]/i.test(t)) return false;
  return !BAD_SVG.test(t);
}
const FILE_MAX = 10 * 1024 * 1024;
const DOC_TYPES = {
  pdf: 'application/pdf', doc: 'application/msword', xls: 'application/vnd.ms-excel', ppt: 'application/vnd.ms-powerpoint',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  odt: 'application/vnd.oasis.opendocument.text', ods: 'application/vnd.oasis.opendocument.spreadsheet', odp: 'application/vnd.oasis.opendocument.presentation',
  rtf: 'application/rtf', txt: 'text/plain', csv: 'text/csv', md: 'text/markdown', json: 'application/json',
  zip: 'application/zip', '7z': 'application/x-7z-compressed', rar: 'application/vnd.rar',
};
const ZIPLIKE = ['docx', 'xlsx', 'pptx', 'odt', 'ods', 'odp', 'zip'];
const OLE = ['doc', 'xls', 'ppt'];
const TEXT = ['txt', 'csv', 'md', 'json'];
function isText(u) {
  const head = u.subarray(0, 8192);
  if (head.includes(0)) return false;
  try { new TextDecoder('utf-8', { fatal: true }).decode(head); return true; } catch { return head.length >= 8192; } // a cut multibyte char at the window edge is fine
}
export const ATTACH_EXT = Object.keys(DOC_TYPES);
async function uploadFile(request, env) {
  const buf = await request.arrayBuffer();
  if (!buf.byteLength) return Response.json({ error: 'empty' }, { status: 400 });
  if (buf.byteLength > FILE_MAX) return Response.json({ error: 'File too large (max 10 MB)' }, { status: 413 });
  let name = 'file';
  try { name = decodeURIComponent(request.headers.get('X-Filename') || 'file'); } catch {}
  name = name.replace(/[^\w .()\-]/g, '_').slice(0, 80) || 'file';
  const ext = (name.split('.').pop() || '').toLowerCase();
  const u = new Uint8Array(buf);
  const at = (...b) => b.every((x, i) => u[i] === x);
  const ok =
    (ext === 'pdf' && at(0x25, 0x50, 0x44, 0x46)) ||
    (ZIPLIKE.includes(ext) && at(0x50, 0x4b, 0x03, 0x04)) ||
    (OLE.includes(ext) && at(0xd0, 0xcf, 0x11, 0xe0)) ||
    (ext === 'rtf' && at(0x7b, 0x5c, 0x72, 0x74, 0x66)) ||
    (ext === '7z' && at(0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c)) ||
    (ext === 'rar' && at(0x52, 0x61, 0x72, 0x21, 0x1a, 0x07)) ||
    (TEXT.includes(ext) && isText(u));
  if (!ok) return Response.json({ error: 'Allowed attachments: PDF, Word, Excel, PowerPoint, OpenDocument, RTF, TXT, CSV, MD, JSON, ZIP, 7Z or RAR (and the file must match its extension)' }, { status: 415 });
  const id = crypto.randomUUID().replace(/-/g, '').slice(0, 20);
  await env.CARDS.put(`file:${id}`, buf, { metadata: { type: DOC_TYPES[ext], name } });
  return Response.json({ id, name });
}

export async function onRequestPost({ request, env }) {
  if (new URL(request.url).searchParams.get('kind') === 'file') return uploadFile(request, env);
  const buf = await request.arrayBuffer();
  if (!buf.byteLength) return Response.json({ error: 'empty' }, { status: 400 });
  if (buf.byteLength > MAX) return Response.json({ error: 'Image too large (max 700 KB)' }, { status: 413 });
  const u8 = new Uint8Array(buf);
  let type = sniff(u8);
  if (!type && svgOk(u8)) type = 'image/svg+xml';
  if (!type) return Response.json({ error: 'Only JPEG, PNG, WebP or a clean SVG (no scripts) are allowed' }, { status: 415 });
  const id = crypto.randomUUID().replace(/-/g, '').slice(0, 20);
  await env.CARDS.put(`img:${id}`, buf, { metadata: { type } });
  return Response.json({ id });
}
