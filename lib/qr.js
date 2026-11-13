import qrcode from './qrcode.mjs';

// Returns an SVG string, or null if the text is too long for a QR code.
export function qrSvg(text, { ecc = 'M', fg = '#000000', bg = '#ffffff', margin = 4 } = {}) {
  let q;
  try {
    q = qrcode(0, ecc);
    q.addData(String(text), 'Byte');
    q.make();
  } catch {
    return null;
  }
  const n = q.getModuleCount();
  const size = n + margin * 2;
  let d = '';
  for (let r = 0; r < n; r++) {
    let run = -1;
    for (let c = 0; c <= n; c++) {
      const dark = c < n && q.isDark(r, c);
      if (dark && run < 0) run = c;
      if (!dark && run >= 0) { d += `M${run + margin} ${r + margin}h${c - run}v1h-${c - run}z`; run = -1; }
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="${bg}"/><path d="${d}" fill="${fg}"/></svg>`;
}
