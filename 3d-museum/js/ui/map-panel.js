/* The Map button's panel: the whole floor plan above the navigation bar, each
   room's name written inside it, a white dot for you. Click a room to go there,
   or a work to walk up to it. */
import * as THREE from 'three';
import { S, me } from '../state.js';
import { $, mk, spacing, SANS, SERIF } from '../util.js';
import { camera, onResize } from '../world/renderer.js';
import { toW } from '../world/layout.js';
import { exNo, two, annexLabel } from '../data/room-info.js';
import { viewArt, walkTo, goToRoom } from '../visitor/movement.js';
import { stopTour } from '../visitor/tour.js';
import { hideInfo } from './info-card.js';
import { DOOR_W, HALF_D, FACE, ROT_R } from '../world/constants.js';

const mapc = $('mapc'), mg = mapc.getContext('2d'), PAD = 10;
let base = null, scale = 1, hover = -1;
const isOpen = () => !$('map').classList.contains('hidden');

export function toggleMap() {
  const open = $('map').classList.toggle('hidden') === false;
  $('bMap').classList.toggle('on', open); document.body.classList.toggle('mapopen', open); drawMapBase();
}
function mapXY(x, z) { return [PAD + (x - S.layout.bbox.x0) * scale, PAD + (z - S.layout.bbox.z0) * scale]; }
function mapToWorld(px, py) { return { x: (px - PAD) / scale + S.layout.bbox.x0, z: (py - PAD) / scale + S.layout.bbox.z0 }; }
function roomShape(g, r) {
  g.beginPath();
  if (r.rot) { const c = toW(r, r.cx, 0), [px, py] = mapXY(c.x, c.z); g.arc(px, py, ROT_R * scale, 0, 7); return; }
  const pts = [[r.ix0, -FACE], [r.ix1, -FACE], [r.ix1, FACE], [r.ix0, FACE]].map(([lx, lz]) => { const p = toW(r, lx, lz); return mapXY(p.x, p.z); });
  g.moveTo(...pts[0]); for (const q of pts.slice(1)) g.lineTo(...q); g.closePath();
}
function labelBox(r) {
  if (r.rot) { const c = toW(r, r.cx, 0), [px, py] = mapXY(c.x, c.z), h = ROT_R * scale * .68; return [px - h, py - h, px + h, py + h]; }
  const ps = [[r.ix0, -FACE], [r.ix1, FACE]].map(([lx, lz]) => { const p = toW(r, lx, lz); return mapXY(p.x, p.z); });
  return [Math.min(ps[0][0], ps[1][0]), Math.min(ps[0][1], ps[1][1]), Math.max(ps[0][0], ps[1][0]), Math.max(ps[0][1], ps[1][1])];
}

// Draw the parts that don't change (rooms, doorways, works, names) once into a layer.
export function drawMapBase() {
  if (!S.layout || !isOpen()) return;
  const { rooms, arts, bbox: { x0, x1, z0, z1 } } = S.layout, avail = Math.max(280, $('map').clientWidth - 24);
  scale = Math.max(3.4, (avail - PAD * 2) / (x1 - x0)); const maxH = innerHeight * .4;
  if ((z1 - z0) * scale + PAD * 2 > maxH) scale = Math.max(2.6, (maxH - PAD * 2) / (z1 - z0));
  const Wpx = Math.round((x1 - x0) * scale + PAD * 2), Hpx = Math.round((z1 - z0) * scale + PAD * 2), dpr = Math.min(devicePixelRatio, 2);
  mapc.width = Wpx * dpr; mapc.height = Hpx * dpr; mapc.style.width = Wpx + 'px'; mapc.style.height = Hpx + 'px';
  const L = mk(Wpx * dpr, Hpx * dpr), g = L.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  for (const r of rooms) {                               // floors
    if (!r) continue;
    roomShape(g, r); g.fillStyle = r.data.kind === 'intro' || r.data.kind === 'closing' ? 'rgba(217,184,113,.10)' : r.vid || r.data.theatre ? 'rgba(140,170,230,.08)' : 'rgba(255,255,255,.07)'; g.fill();
    g.strokeStyle = 'rgba(255,255,255,.42)'; g.lineWidth = 1.2; g.stroke();
  }
  const door = (r, lx, lz, alongX) => { const a = toW(r, lx - (alongX ? DOOR_W / 2 : 0), lz - (alongX ? 0 : DOOR_W / 2)), b = toW(r, lx + (alongX ? DOOR_W / 2 : 0), lz + (alongX ? 0 : DOOR_W / 2)), [ax, ay] = mapXY(a.x, a.z), [bx, by] = mapXY(b.x, b.z); g.strokeStyle = 'rgba(217,184,113,.9)'; g.lineWidth = 3; g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke(); };
  for (const r of rooms) {                               // doorways
    if (!r) continue;
    if (r.doorWest || r.rot) door(r, 0, 0, false);
    if (r.sideDoor) door(r, r.cx, r.sideDoor * HALF_D, true);
    if (r.rot && r.inRow) for (const sd of [-1, 1]) door(r, r.doors.lineX, sd * r.slotLen / 2, true);
  }
  g.globalAlpha = .55;                                   // works: gold lines, blue for screens, squares for displays
  for (const it of arts) {
    g.fillStyle = g.strokeStyle = it.kind === 'video' || it.kind === 'kiosk' ? '#9fc3ff' : '#cfae6c';
    if (it.kind === 'sculpture') { const [x, y] = mapXY(it.x, it.z), sz = Math.max(3, it.base * scale); g.fillRect(x - sz / 2, y - sz / 2, sz, sz); }
    else { const tx = -(it.nz || 0), tz = it.nx || 0, [ax, ay] = mapXY(it.x - tx * it.ow / 2, it.z - tz * it.ow / 2), [bx, by] = mapXY(it.x + tx * it.ow / 2, it.z + tz * it.ow / 2); g.lineWidth = 2.5; g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke(); }
  }
  g.globalAlpha = 1;
  for (const r of rooms) {                               // names inside the rooms
    if (!r) continue;
    const [bx0, by0, bx1, by1] = labelBox(r), w = bx1 - bx0 - 10, h = by1 - by0 - 8, cxp = (bx0 + bx1) / 2, cyp = (by0 + by1) / 2;
    const k = r.data.kind, tag = k === 'intro' ? 'WELCOME' : k === 'closing' ? 'FAREWELL' : k === 'annex' ? annexLabel(r.data).toUpperCase() : `NO. ${two(exNo(r.ri))}`;
    let fs = 14, lines = [];                           // room names in the serif (Georgia), the small tags in the sans-serif
    const wrap = size => { g.font = `400 ${size}px ${SERIF}`; const out = []; let cur = ''; for (const wd of r.data.name.split(/\s+/)) { const t = cur ? cur + ' ' + wd : wd; if (g.measureText(t).width <= w || !cur) cur = t; else { out.push(cur); cur = wd; } } if (cur) out.push(cur); return out; };
    for (; fs >= 8; fs--) { lines = wrap(fs); if (lines.length <= 4 && lines.length * fs * 1.18 + 13 <= h && lines.every(l => g.measureText(l).width <= w + 1)) break; }
    const tagH = 11, total = tagH + lines.length * fs * 1.18; let y = cyp - total / 2 + 8;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `600 8.5px ${SANS}`; spacing(g, '1.5px'); g.fillStyle = '#d9b871'; g.fillText(tag, cxp, y, w); spacing(g, '0px');
    y += tagH;
    g.font = `400 ${fs}px ${SERIF}`; g.fillStyle = '#f3ede2'; g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 3;
    for (const l of lines) { g.fillText(l, cxp, y + fs * .45, w + 2); y += fs * 1.18; }
    g.shadowBlur = 0;
  }
  base = { dpr, layer: L };
  document.body.style.setProperty('--mapH', $('map').offsetHeight + 'px');
}
// Every frame while open: your room, the room under the mouse, the work being viewed, and you.
export function drawMap() {
  if (!base || !isOpen()) return;
  const { dpr, layer } = base; mg.setTransform(1, 0, 0, 1, 0, 0); mg.clearRect(0, 0, mapc.width, mapc.height); mg.drawImage(layer, 0, 0);
  mg.setTransform(dpr, 0, 0, dpr, 0, 0);
  const cr = S.layout.rooms[S.curRoom], hr = S.layout.rooms[hover];
  if (hr && hr !== cr) { roomShape(mg, hr); mg.fillStyle = 'rgba(255,255,255,.08)'; mg.fill(); }
  if (cr) { roomShape(mg, cr); mg.strokeStyle = '#e2bf72'; mg.lineWidth = 2.2; mg.stroke(); }
  const va = S.layout.arts[S.viewing];
  if (va) { const [x, y] = mapXY(va.x, va.z); mg.fillStyle = '#ffe2a8'; mg.beginPath(); mg.arc(x, y, 3.5, 0, 7); mg.fill(); }
  const [px, py] = mapXY(me.x, me.z), dir = [-Math.sin(me.yaw), -Math.cos(me.yaw)], ang = Math.atan2(dir[1], dir[0]), half = THREE.MathUtils.degToRad(S.fov * camera.aspect / 2);
  mg.fillStyle = 'rgba(255,240,210,.25)'; mg.beginPath(); mg.moveTo(px, py); mg.arc(px, py, 26, ang - half, ang + half); mg.closePath(); mg.fill();
  mg.fillStyle = '#fff'; mg.strokeStyle = 'rgba(0,0,0,.5)'; mg.lineWidth = 1.5; mg.beginPath(); mg.arc(px, py, 4.5, 0, 7); mg.fill(); mg.stroke();
}
function roomUnder(e) {
  const b = mapc.getBoundingClientRect(), px = e.clientX - b.left, py = e.clientY - b.top, w = mapToWorld(px, py);
  mg.setTransform(base.dpr, 0, 0, base.dpr, 0, 0);
  for (const r of S.layout.rooms) { if (!r) continue; roomShape(mg, r); mg.setTransform(1, 0, 0, 1, 0, 0); const inside = mg.isPointInPath(px * base.dpr, py * base.dpr); mg.setTransform(base.dpr, 0, 0, base.dpr, 0, 0); if (inside) return { r, w }; }
  return { r: null, w };
}
export function initMap() {
  $('bMap').onclick = toggleMap;
  onResize(drawMapBase);
  mapc.addEventListener('mousemove', e => { if (!base) return; const { r } = roomUnder(e); hover = r ? r.ri : -1; mapc.style.cursor = r ? 'pointer' : 'default'; mapc.title = r ? r.data.name : ''; });
  mapc.addEventListener('mouseleave', () => { hover = -1; });
  mapc.addEventListener('click', e => {
    if (!base) return;
    const { r, w } = roomUnder(e); stopTour(); hideInfo();
    let best = -1, bd = 1.2;
    for (const it of S.layout.arts) { const d = Math.hypot(it.x - w.x, it.z - w.z) - (it.ow || 1) / 2; if (d < bd) { bd = d; best = it.index; } }
    if (best >= 0) viewArt(best);
    else if (r && r.ri !== S.curRoom) goToRoom(r);
    else walkTo(w.x, w.z);
  });
}
