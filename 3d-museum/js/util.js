/* Small helpers used everywhere. */

export const $ = id => document.getElementById(id);

export function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
export function lerpAngle(a, b, t) { const d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; return a + d * t; }
export function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

// colours
export function hexToRgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
export function lum(h) { const [r, g, b] = hexToRgb(h).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * r + .7152 * g + .0722 * b; }
export function mix(a, b, t) { const A = hexToRgb(a), B = hexToRgb(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`; }
export function shade(h, t) { return mix(h, t < 0 ? '#000000' : '#ffffff', Math.abs(t)); }
export function inkFor(wall) { return lum(wall) > .32 ? '#2b251f' : '#f1ebe0'; }   // dark text on light walls, light on dark

// canvas drawing
export function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
export function spacing(g, px) { if ('letterSpacing' in g) g.letterSpacing = px; }
export function wrapText(g, text, x, y, maxW, lh, maxLines) {
  const words = String(text || '').split(/\s+/); let line = '', lines = [];
  for (const w of words) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
  if (line) lines.push(line);
  if (lines.length > maxLines) { lines = lines.slice(0, maxLines); let l = lines[maxLines - 1]; while (g.measureText(l + '…').width > maxW && l.length) l = l.slice(0, -1); lines[maxLines - 1] = l + '…'; }
  lines.forEach((l, i) => g.fillText(l, x, y + i * lh));
  return lines.length;
}
