/* The museum map on the wall of the welcome room: a small true floor plan,
   drawn as the visitor sees it (forward = up), with room names beside it and
   leader lines to each room. Clicking a room or a name walks you there. */
import * as THREE from 'three';
import { S } from '../state.js';
import { mk, spacing, SERIF, SANS } from '../util.js';
import { canvasTex, MOBILE } from './renderer.js';
import { stdMat, box, plane } from './materials.js';
import { toW } from './layout.js';
import { exNo, two, annexLabel } from '../data/room-info.js';
import { DOOR_W, HALF_D, FACE, ROT_R } from './constants.js';

export function buildWallMap(hereL) {
  const layout = S.layout;
  const W = 2048, H = 2100, mk2 = MOBILE ? .5 : 1, c = mk(Math.round(W * mk2), Math.round(H * mk2)), g = c.getContext('2d'); g.scale(mk2, mk2);   // drawn in 2048-wide units (half size on phones)
  const gold = '#d9b871', ink = '#f1ebe0', dim = 'rgba(241,235,224,.62)';
  g.fillStyle = '#10151f'; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(217,184,113,.6)'; g.lineWidth = 4; g.strokeRect(24, 24, W - 48, H - 48);
  g.textAlign = 'center'; g.fillStyle = gold; g.font = `400 92px ${SERIF}`; spacing(g, '6px');
  g.fillText('δ  Museum Map  δ', W / 2, 130);
  g.font = `400 28px ${SANS}`; g.fillStyle = dim; spacing(g, '6px');
  g.fillText('LEFT ROW  ·  ▲ AHEAD  ·  RIGHT ROW', W / 2, 184); spacing(g, '0px');
  const { x0, x1 } = layout.bbox, top = 250, bot = H - 120;
  let zMin = 0, zMax = 0;
  for (const r of layout.rooms) { if (!r) continue; const pts = r.rot ? [[r.cx - ROT_R, 0], [r.cx + ROT_R, 0], [r.cx, ROT_R], [r.cx, -ROT_R]] : [[r.ix0, -(r.face ?? FACE)], [r.ix1, r.face ?? FACE]]; for (const [lx, lz] of pts) { const q = toW(r, lx, lz); zMin = Math.min(zMin, q.z); zMax = Math.max(zMax, q.z); } }
  const sc = Math.min((bot - top) / (x1 - x0), 520 / Math.max(1, zMax - zMin)), y0 = bot - ((bot - top) - (x1 - x0) * sc) / 2;
  const P = (x, z) => [W / 2 + z * sc, y0 - (x - x0) * sc], PL = (r, lx, lz) => { const q = toW(r, lx, lz); return P(q.x, q.z); };
  const rects = [], uvRect = (bx0, by0, bx1, by1, ri) => rects.push({ u0: bx0 / W, u1: bx1 / W, v0: 1 - by1 / H, v1: 1 - by0 / H, ri });
  const poly = pts => { g.beginPath(); g.moveTo(...pts[0]); for (const q of pts.slice(1)) g.lineTo(...q); g.closePath(); };
  // rooms
  const centres = [];
  for (const r of layout.rooms) {
    if (!r) continue;
    const here = r.data.kind === 'intro';
    g.fillStyle = here ? 'rgba(217,184,113,.2)' : 'rgba(241,235,224,.09)'; g.strokeStyle = here ? gold : 'rgba(241,235,224,.55)'; g.lineWidth = here ? 3 : 2;
    let ctr, bb;
    if (r.rot) {
      ctr = PL(r, r.cx, 0); const rad = ROT_R * sc;
      if (r.inRow) for (const sd of [-1, 1]) {   // short passages out to the row's doorways
        const lx = r.doors.lineX; poly([PL(r, lx - DOOR_W / 2, sd * (r.doors.zE - .5)), PL(r, lx + DOOR_W / 2, sd * (r.doors.zE - .5)), PL(r, lx + DOOR_W / 2, sd * r.slotLen / 2), PL(r, lx - DOOR_W / 2, sd * r.slotLen / 2)]); g.fill(); g.stroke();
      }
      g.beginPath(); g.arc(ctr[0], ctr[1], rad, 0, 7); g.fill(); g.stroke();
      bb = [ctr[0] - rad, ctr[1] - rad, ctr[0] + rad, ctr[1] + rad];
    } else {
      const F = r.face ?? FACE, pts = [[r.ix0, -F], [r.ix1, -F], [r.ix1, F], [r.ix0, F]].map(([lx, lz]) => PL(r, lx, lz));
      poly(pts); g.fill(); g.stroke(); ctr = PL(r, r.cx, 0);
      bb = [Math.min(...pts.map(q => q[0])), Math.min(...pts.map(q => q[1])), Math.max(...pts.map(q => q[0])), Math.max(...pts.map(q => q[1]))];
    }
    uvRect(...bb, r.ri);
    centres.push({ r, ctr, left: r.row !== 'B' });
  }
  // works, in the same marks as the Map panel
  for (const it of layout.arts) {
    g.fillStyle = g.strokeStyle = it.kind === 'video' ? '#9fc3ff' : '#cfae6c';
    if (it.kind === 'sculpture') { const [px, py] = P(it.x, it.z), sz = Math.max(5, it.base * sc); g.fillRect(px - sz / 2, py - sz / 2, sz, sz); }
    else { const tx = -(it.nz || 0), tz = it.nx || 0, A = P(it.x - tx * it.ow / 2, it.z - tz * it.ow / 2), B = P(it.x + tx * it.ow / 2, it.z + tz * it.ow / 2); g.lineWidth = 4; g.beginPath(); g.moveTo(...A); g.lineTo(...B); g.stroke(); }
  }
  // doorways
  const doorBar = (r, lx, lz, alongX) => { const A = PL(r, lx - (alongX ? DOOR_W / 2 : 0), lz - (alongX ? 0 : DOOR_W / 2)), B = PL(r, lx + (alongX ? DOOR_W / 2 : 0), lz + (alongX ? 0 : DOOR_W / 2)); g.strokeStyle = gold; g.lineWidth = 5; g.beginPath(); g.moveTo(...A); g.lineTo(...B); g.stroke(); };
  for (const r of layout.rooms) {
    if (!r) continue;
    if (r.doorWest || r.rot) for (const dz of r.westDoors?.length ? r.westDoors : [0]) doorBar(r, 0, dz, false);
    if (r.sideDoor && !r.open) doorBar(r, r.cx, r.sideDoor * HALF_D, true);
    if (r.rot && r.inRow) for (const sd of [-1, 1]) doorBar(r, r.doors.lineX, sd * r.slotLen / 2, true);
  }
  // you are here
  const ir = layout.intro;
  if (ir && hereL) {
    const [hx, hy] = PL(ir, hereL.x, hereL.z);
    g.fillStyle = 'rgba(217,184,113,.28)'; g.beginPath(); g.arc(hx, hy, 22, 0, 7); g.fill();
    g.fillStyle = gold; g.beginPath(); g.moveTo(hx, hy - 16); g.lineTo(hx + 11, hy + 10); g.lineTo(hx, hy + 5); g.lineTo(hx - 11, hy + 10); g.closePath(); g.fill();
  }
  // names beside the plan, with leader lines to each room
  const planL = W / 2 + zMin * sc, planR = W / 2 + zMax * sc, gapL = 70, minGap = 104;
  for (const left of [true, false]) {
    const list = centres.filter(o => o.left === left).sort((p1, p2) => p1.ctr[1] - p2.ctr[1]);
    const ys = list.map(o => o.ctr[1] + 8);
    for (let i = 1; i < ys.length; i++) ys[i] = Math.max(ys[i], ys[i - 1] + minGap);
    const over = ys.length ? ys[ys.length - 1] - (H - 70) : 0; if (over > 0) for (let i = ys.length - 1; i >= 0; i--) { ys[i] -= over; if (i > 0) ys[i - 1] = Math.min(ys[i - 1], ys[i] - minGap); }
    list.forEach((o, i) => {
      const r = o.r, kind = r.data.kind, items = r.data.artworks, hasVid = items.some(q => q.video), y = ys[i];
      const tag = kind === 'intro' ? 'YOU ARE HERE' : kind === 'closing' ? 'FAREWELL' : kind === 'annex' ? `${(r.cat || '').toUpperCase()} · ${annexLabel(r.data).toUpperCase()}` : `${(r.cat || '').toUpperCase()} · ${two(exNo(r.ri))}`;
      const info = kind === 'intro' ? '' : kind === 'closing' ? 'to the original gallery' : hasVid && items.length === 1 ? 'film' : `${items.length} work${items.length === 1 ? '' : 's'}${hasVid ? ' + film' : ''}${r.rot ? ' · rotunda' : ''}`;
      const line1 = tag + (info ? '  ·  ' + info.toUpperCase() : '');
      const tx = left ? planL - gapL : planR + gapL, maxW = left ? tx - 70 : W - 70 - tx;
      g.textAlign = left ? 'right' : 'left';
      g.font = `500 24px ${SANS}`; spacing(g, '4px'); g.fillStyle = gold; g.fillText(line1, tx, y - 44, maxW); spacing(g, '0px');
      g.font = `400 ${kind === 'intro' ? 50 : 46}px ${SERIF}`; g.fillStyle = ink;
      g.fillText(r.data.name, tx, y, maxW);
      const nameW = g.measureText(r.data.name).width; g.font = `500 24px ${SANS}`;
      const tw = Math.min(maxW, Math.max(nameW, g.measureText(line1).width * 1.15));
      uvRect(left ? tx - tw - 10 : tx - 10, y - 74, left ? tx + 10 : tx + tw + 10, y + 18, r.ri);
      const ly = y - 14, sx = tx + (left ? 18 : -18), ex = left ? planL - 18 : planR + 18;
      g.strokeStyle = 'rgba(217,184,113,.75)'; g.lineWidth = 2; g.beginPath(); g.moveTo(sx, ly); g.lineTo(ex, ly); g.lineTo(o.ctr[0], o.ctr[1]); g.stroke();
      g.fillStyle = gold; g.beginPath(); g.arc(o.ctr[0], o.ctr[1], 7, 0, 7); g.fill();
      g.beginPath(); g.arc(sx, ly, 4, 0, 7); g.fill();
    });
  }
  g.fillStyle = dim; g.font = `400 24px ${SANS}`; spacing(g, '4px'); g.textAlign = 'center';
  g.fillText('YOU ARE HERE: THE WELCOME ROOM', W / 2, H - 56); spacing(g, '0px');
  const grp = new THREE.Group(), bw = 3.7, bh = bw * H / W;
  const frame = box(bw + .15, bh + .15, .06, stdMat('#1b1712', .45, .3)); frame.position.z = .03; grp.add(frame);
  const pl = plane(bw, bh, new THREE.MeshStandardMaterial({ map: canvasTex(c), roughness: .6, envMapIntensity: .4 }));
  pl.position.z = .062; pl.userData.kind = 'mapboard'; pl.userData.rects = rects; pl.userData.stop = { label: 'Map of the museum', d: 4.4 }; pl.userData.canvas = c; grp.add(pl);
  return grp;
}
