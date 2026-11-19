/* Things that pop up: the full-picture view, the website/social box, the
   farewell box, the "Getting around" help, and short messages (toasts). */
import { $, esc } from '../util.js';
import { closeTheater } from './theater.js';
import { hideInfo } from './info-card.js';
import { stopTour } from '../visitor/tour.js';

/* full picture */
// Clicking the picture opens its original post (Instagram first, when there is one);
// clicking anywhere else, ✕ or Esc closes the view.
export function siteName(href) { return /instagram/.test(href) ? 'Instagram' : /facebook|fb\./.test(href) ? 'Facebook' : /youtu/.test(href) ? 'YouTube' : ''; }
export function openLightbox(it) {
  const a = it.a, link = a.link && /^https?:\/\//i.test(a.link) ? a.link : '', site = siteName(link);
  $('lbImg').src = a.src || ''; $('lbT').textContent = a.title || 'Untitled'; $('lbM').textContent = a.meta || '';
  $('lbImg').classList.toggle('linked', !!link); $('lbImg').title = link ? `Open the original post${site ? ' on ' + site : ''}` : '';
  $('lbGo').classList.toggle('hidden', !link);
  if (link) { $('lbGo').href = link; $('lbGo').textContent = `Click the picture to open the original post${site ? ' on ' + site : ''} ↗`; }
  $('lightbox').classList.remove('hidden');
}
export function closeLightbox() { $('lightbox').classList.add('hidden'); $('lbImg').removeAttribute('src'); zoomTo(1); }

/* zoom and pan in the full picture: wheel, pinch, drag, the − Fit + buttons, keys + − 0 */
const Z = { s: 1, x: 0, y: 0, moved: false };
function applyZoom() {
  if (Z.s <= 1.001) { Z.s = 1; Z.x = Z.y = 0; }
  else {                                                   // keep part of the picture on screen
    const im = $('lbImg'), mx = im.offsetWidth * Z.s / 2, my = im.offsetHeight * Z.s / 2;
    Z.x = Math.max(-mx, Math.min(mx, Z.x)); Z.y = Math.max(-my, Math.min(my, Z.y));
  }
  $('lbImg').style.transform = Z.s === 1 ? '' : `translate(${Z.x}px, ${Z.y}px) scale(${Z.s})`;
  $('lightbox').classList.toggle('zoomed', Z.s > 1);
}
// zoom to scale s, keeping the screen point (px, py) still (default: the picture's centre)
function zoomTo(s, px, py) {
  const im = $('lbImg'), r = im.getBoundingClientRect(), cx = r.left + r.width / 2 - Z.x, cy = r.top + r.height / 2 - Z.y;
  const maxS = Math.max(2, 2 * (im.naturalWidth || 1) / (im.offsetWidth || 1));   // up to twice the file's own pixel size (beyond that it only blurs)
  s = Math.max(1, Math.min(maxS, s));
  if (px === undefined) { px = cx + Z.x; py = cy + Z.y; }
  const qx = (px - cx - Z.x) / Z.s, qy = (py - cy - Z.y) / Z.s;
  Z.x = px - cx - s * qx; Z.y = py - cy - s * qy; Z.s = s; applyZoom();
}
export function lightboxKey(k) {
  if ($('lightbox').classList.contains('hidden')) return false;
  if (k === '+' || k === '=') zoomTo(Z.s * 1.4); else if (k === '-' || k === '_') zoomTo(Z.s / 1.4); else if (k === '0') zoomTo(1); else return false;
  return true;
}
function initZoom() {
  const lb = $('lightbox'), im = $('lbImg'), pts = new Map(); let last = null, pinch = 0;
  lb.addEventListener('contextmenu', e => e.preventDefault());           // no "Save image as…"
  lb.addEventListener('dragstart', e => e.preventDefault());
  lb.addEventListener('wheel', e => { e.preventDefault(); zoomTo(Z.s * Math.exp(-e.deltaY * .0016), e.clientX, e.clientY); }, { passive: false });
  im.addEventListener('pointerdown', e => {
    im.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); Z.moved = false;
    if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); }
    last = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY };
  });
  im.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2) {
      const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch) zoomTo(Z.s * d / pinch, (a.x + b.x) / 2, (a.y + b.y) / 2); pinch = d; Z.moved = true; return;
    }
    if (Math.hypot(e.clientX - last.sx, e.clientY - last.sy) > 5) Z.moved = true;
    if (Z.s > 1 && Z.moved) { Z.x += e.clientX - last.x; Z.y += e.clientY - last.y; applyZoom(); lb.classList.add('panning'); }
    last.x = e.clientX; last.y = e.clientY;
  });
  const up = e => { pts.delete(e.pointerId); if (pts.size < 2) pinch = 0; if (!pts.size) lb.classList.remove('panning'); };
  im.addEventListener('pointerup', up); im.addEventListener('pointercancel', up);
  $('lbIn').onclick = () => zoomTo(Z.s * 1.4); $('lbOut').onclick = () => zoomTo(Z.s / 1.4); $('lbFit').onclick = () => zoomTo(1);
}

/* website / social media links of a kiosk */
export function openKiosk(it) {
  const k = it.a.kiosk || {}, list = k.links || (k.href || it.a.link ? [{ label: it.a.linkLabel || 'Visit the website', href: k.href || it.a.link }] : []); if (!list.length) return;
  $('lkT').textContent = it.a.title || 'Website';
  $('lkL').innerHTML = list.map(l => `<a class="btn" href="${esc(l.href)}" target="_blank" rel="noopener">${esc(l.label)} ↗</a>`).join('');
  $('lkU').textContent = list.map(l => l.handle || l.href.replace(/^https?:\/\//, '').replace(/\/$/, '')).join('   ·   ');
  $('linkbox').classList.remove('hidden');
  if (list.length === 1) $('lkL').querySelector('a').click();
}

/* the last room's box with the link back to the gallery */
export function setFarewell(room) {
  if (!room?.link) return;
  $('farewellLink').href = room.link; $('farewellLink').textContent = (room.linkLabel || 'Continue to the original gallery') + ' ↗';
  $('farewellUrl').textContent = room.link.replace(/^https?:\/\//, ''); $('farewell').querySelector('.t').textContent = room.name;
}
// From the last room straight back to the welcome room (a short fade instead of the long walk).
export function backToEntrance(spawn) {
  stopTour(); hideInfo(); $('fade').classList.add('on');
  setTimeout(() => { spawn(); $('fade').classList.remove('on'); }, 480);
}
export function openFarewell(follow) { $('farewell').classList.remove('hidden'); if (follow) $('farewellLink').click(); }

/* toast */
let toastTimer = 0;
export function toast(msg, ms = 4200) {
  $('toastMsg').textContent = msg;
  $('toast').classList.remove('hidden'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.add('hidden'), ms);
}

export function closeAll() {
  closeTheater(); closeLightbox(); stopTour(); hideInfo();
  for (const id of ['help', 'linkbox']) $(id).classList.add('hidden');
}

export function initOverlays() {
  $('lightbox').onclick = e => {
    const link = !$('lbGo').classList.contains('hidden') && $('lbGo').href;
    if (e.target.id === 'lbGo' || e.target.closest('.zoom')) return;      // the link opens by itself; zoom buttons
    if (e.target.id === 'lbImg' && Z.moved) { Z.moved = false; return; }  // that was a drag or a pinch, not a click
    if (e.target.id === 'lbImg' && link) { window.open(link, '_blank', 'noopener'); return; }
    closeLightbox();
  };
  initZoom();
  $('lkX').onclick = () => $('linkbox').classList.add('hidden');
  document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => b.closest('.overlay').classList.add('hidden'));
}
