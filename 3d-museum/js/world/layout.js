/* LAYOUT — decides where every room and every artwork goes (no 3D drawing here).

   The building is two parallel rows of rooms running along +x:
     left row (A)   z < 0
     right row (B)  z > 0
   Each "slot" along x holds a left room and, optionally, its partner on the right,
   joined by a side doorway. Rooms in the same row are joined end to end.

   Every room is first laid out in its own frame (local x along the room, the
   doorway from the previous room at x = 0, long walls at z = ±FACE), then placed
   in the world with toW(). */
import * as THREE from 'three';
import { S } from '../state.js';
import { clamp } from '../util.js';
import { texCache, artKey } from './textures.js';
import { FRAMES } from '../../config/look.js';
import { EYE, D, WALL_H, WALL_T, DOOR_W, GAP, MARGIN, MIN_ROOM_W, FACE, ROT_R, ROT_RC, ROT_Y1, ROT_Y3, BENCHES, THEATRE_SEATS } from './constants.js';

/* ---------------- sizes ---------------- */
export function frameSpec(a, room) { return FRAMES[a.frame] || FRAMES[room.frame] || FRAMES.black; }
// Picture size on the wall: about 4.2 m² of picture, fitted within 4.3 × 3 m, then × scale.
export function sizeFor(aspect, scale = 1) {
  let h = Math.sqrt(4.2 / aspect), w = aspect * h;
  const k = Math.min(1, 4.3 / w, 3.0 / h); w *= k; h *= k;
  const s = clamp(+scale || 1, .3, 2.2); return { w: w * s, h: h * s };
}
export function isSculpture(a) { return !!a.sculpture; }
export function standSize(a, entry) {
  const asp = entry?.aspect || 1; let H = clamp((+a.sculpture.height || 2.6) * (+a.scale || 1), 1.2, 3.4), w = H * asp;
  if (w > 3.4) { w = 3.4; H = w / asp; }
  return { w, H };
}

/* ---------------- room frame ⇄ world ---------------- */
export function toW(r, lx, lz) { return { x: r.ox + lx * r.cos + lz * r.sin, z: r.oz - lx * r.sin + lz * r.cos }; }
export function toL(r, wx, wz) { const dx = wx - r.ox, dz = wz - r.oz; return { x: dx * r.cos - dz * r.sin, z: dx * r.sin + dz * r.cos }; }
export function rotV(r, x, z) { return { x: x * r.cos + z * r.sin, z: -x * r.sin + z * r.cos }; }

// Doorways of a round room, as directions in degrees from its centre (local frame: x = cos, z = sin).
export function rotDoors(inRow) {
  const cx = WALL_T / 2 + ROT_R, dx = D / 2 - cx, zE = Math.sqrt(ROT_R * ROT_R - dx * dx), phiE = THREE.MathUtils.radToDeg(Math.atan2(zE, dx));
  return { list: inRow ? [180, phiE, -phiE] : [180], zE, lineX: D / 2 };
}
export function groupsOf(list) { const out = []; for (const it of list) { const g = it.a.group; if (out.length && g !== undefined && out[out.length - 1][0].a.group === g) out[out.length - 1].push(it); else out.push([it]); } return out; }

/* Stacked pages (a room's `stack` setting in config/rooms.js): within each group, the
   stacked pictures hang in columns two-high (three if one would be left alone), every
   column exactly stackHeight tall; the group's other pictures are enlarged to that height. */
function resizeTo(it, k) { const f = it.spec.fw + it.spec.mat; it.w *= k; it.h *= k; it.ow = it.w + 2 * f; it.oh = it.h + 2 * f; }
function stackColumns(items, room) {
  const H = +room.stackHeight || 3.2, VG = .28, MAXW = 5.6, out = [];
  for (const gr of groupsOf(items)) {
    const pages = gr.filter(it => it.a.stack), rest = gr.filter(it => !it.a.stack);
    if (!pages.length) { out.push(...gr); continue; }
    for (const it of rest) { const f = it.spec.fw + it.spec.mat; resizeTo(it, Math.min((H - 2 * f) / it.h, (MAXW - 2 * f) / it.w)); }
    const cols = []; for (let i = 0; i < pages.length; i += 2) cols.push(pages.slice(i, i + 2));
    if (cols.length > 1 && cols[cols.length - 1].length === 1) cols[cols.length - 2].push(cols.pop()[0]);
    const colItems = cols.map(c => {
      const frames = c.reduce((t, it) => t + 2 * (it.spec.fw + it.spec.mat), 0), gaps = VG * (c.length - 1), hs = c.reduce((t, it) => t + it.h, 0);
      const k = c.length === 1 ? 1 : (H - gaps - frames) / hs; c.forEach(it => resizeTo(it, k));
      return { a: c[0].a, ai: c[0].ai, ri: c[0].ri, spec: c[0].spec, col: c, vg: VG, ow: Math.max(...c.map(it => it.ow)), oh: c.reduce((t, it) => t + it.oh, 0) + gaps };
    });
    out.push(...rest, ...colItems);                     // the drawing first, then its pages
  }
  items.splice(0, items.length, ...out);
}

// Where to stand to look at a freestanding display.
export function sculptView(it, fallbackNz) {
  const nx = it.nx || 0, nz = it.nz || fallbackNz, l = Math.hypot(nx, nz) || 1, dist = clamp(it.h * 1.35 + .8, 3, 5.2);
  it.view = { x: it.x + nx / l * dist, z: it.z + nz / l * dist, yaw: Math.atan2(nx, nz), pitch: Math.atan2(it.plinthH + .08 + it.h * .5 - EYE, dist) * .6 };
}

/* ---------------- one room ----------------
   sideDoor: +1 / -1 = which long wall has the doorway to the partner room (0 = none)
   outer:    -1 / +1 = which long wall faces outside (the left row's is -1)
   forceInner: make the room exactly this long (so partners match)
   inRow:    a round room that sits in the left row (doorways both ways along the row) */
function layoutRoomLocal(room, ri, sideDoor, outer, forceInner, inRow) {
  const items = [], sculpts = [], kiosks = [], monitors = [], local = [], rot = !!room.rotunda; let vid = null;
  room.artworks.forEach((a, ai) => {
    const e = texCache.get(artKey(a));
    if (a.video && a.monitor) { const mw = +a.monitor.w || 2.6, mh = mw * 9 / 16; monitors.push({ a, ai, ri, kind: 'video', monitor: true, w: mw, h: mh, ow: mw + .12, oh: mh + .12, entry: e }); return; }
    if (a.video) { vid = { a, ai, ri, kind: 'video', entry: e }; return; }
    if (a.kiosk) { kiosks.push({ a, ai, ri, kind: 'kiosk', w: 2.0, h: 1.25, ow: 2.0, oh: 2.4, y: 1.7, entry: e }); return; }
    if (isSculpture(a)) {
      const { w, H } = standSize(a, e), base = a.sculpture.base === 'photo' ? clamp(w * .45, .9, 1.4) : clamp(w * .55, 1.1, 1.8);
      sculpts.push({ a, ai, ri, kind: 'sculpture', w, h: H, base, plinthH: .42, ow: Math.max(w, base), oh: .48 + H, entry: e, mood: room.mood });
      return;
    }
    const asp = e?.aspect || 1, { w, h } = sizeFor(asp, a.scale), spec = frameSpec(a, room);
    const ow = w + 2 * (spec.fw + spec.mat), oh = h + 2 * (spec.fw + spec.mat);
    items.push({ a, ai, ri, w, h, ow, oh, spec, entry: e });
  });
  if (items.some(it => it.a.stack)) stackColumns(items, room);
  const slots = sculpts.map(it => it.ow + 1.4), tot = slots.reduce((t, v) => t + v, 0), ZOFF = 2.6;

  if (rot) return layoutRotunda(room, ri, items, sculpts, local, inRow);

  // which pictures go on which long wall
  const rows = { '-1': [], '1': [] };
  const G = +room.gap || GAP, rowW = row => row.reduce((t, it) => t + it.ow, 0) + G * Math.max(0, row.length - 1);
  const yearOf = it => { const m = `${it.a.title || ''} ${it.a.meta || ''}`.match(/\b(?:19|20)\d{2}\b/g); return m ? Math.max(...m.map(Number)) : -1; };
  // one picture may go on the wall facing the entrance, beside the far doorway
  let entryIt = null;
  if (!vid && !['intro', 'closing', 'annex'].includes(room.kind) && room.entryWall !== false && !room.keepOrder) {
    const fits = it => it.ow <= 4.1 && it.oh <= 4.4 && (+it.a.scale || 1) <= 1.3;
    entryIt = items.find(it => it.a.entryWall && it.ow <= 4.3) || (items.length >= 3 ? items.filter(fits).sort((p, q) => yearOf(p) - yearOf(q) || q.ai - p.ai)[0] : null) || null;
    if (entryIt) items.splice(items.indexOf(entryIt), 1);
  }
  if (vid) rows[sideDoor || -outer] = items;             // screening room: the outer wall is for the screen
  else if (sideDoor && room.keepOrder) {                 // in the given order, whole groups at a time: outer wall first, then the side-door wall
    const cap = Math.max(22, (forceInner || 0) - 2 * MARGIN), out = [], rest = []; let full = false;
    for (const gr of groupsOf(items)) { if (!full && (rowW([...out, ...gr]) <= cap || !out.length)) out.push(...gr); else { full = true; rest.push(...gr); } }
    rows[outer] = out; rows[sideDoor] = rest;
  } else if (sideDoor) {                                 // newest first, on the wall opposite the doorway to the partner room
    const sorted = items.map((it, i) => ({ it, i, y: yearOf(it) })).sort((a, b) => b.y - a.y || a.i - b.i).map(o => o.it);
    const cap = Math.max(22, (forceInner || 0) - 2 * MARGIN), out = [], rest = [];
    for (const it of sorted) (rowW([...out, it]) <= cap || !out.length ? out : rest).push(it);
    rows[outer] = out; rows[sideDoor] = rest;
  } else { const nN = Math.ceil(items.length / 2); rows['-1'] = items.slice(0, nN); rows['1'] = items.slice(nN); }
  // `swap` in config/rooms.js: pairs of pictures that trade places
  for (const [f1, f2] of room.swap || []) {
    const where = f => { if (entryIt?.a.file === f) return ['entry']; for (const sd of ['-1', '1']) { const i = rows[sd].findIndex(it => it.a.file === f); if (i >= 0) return [sd, i]; } return null; };
    const p = where(f1), q = where(f2); if (!p || !q) continue;
    const get = w => w[0] === 'entry' ? entryIt : rows[w[0]][w[1]], put = (w, v) => { if (w[0] === 'entry') entryIt = v; else rows[w[0]][w[1]] = v; };
    const A = get(p), B = get(q); put(p, B); put(q, A);
  }
  // a wall with a doorway in the middle holds two halves
  const halves = row => {
    if (!room.keepOrder) return [row.slice(0, Math.ceil(row.length / 2)), row.slice(Math.ceil(row.length / 2))];
    let best = 0, bd = Infinity, k = 0;                  // split at a group boundary, as evenly as possible
    for (const gr of groupsOf(row)) { k += gr.length; const d = Math.abs(rowW(row.slice(0, k)) - rowW(row.slice(k))); if (d < bd) { bd = d; best = k; } }
    return [row.slice(0, best), row.slice(best)];
  };
  const need = sd => { const row = rows[sd]; if (vid && sd === outer) return 10 + 2 * MARGIN; if (sd === sideDoor) { const [h1, h2] = halves(row); return 2 * Math.max(rowW(h1), rowW(h2)) + DOOR_W + 1.6 + 2 * MARGIN; } return rowW(row) + 2 * MARGIN; };
  const inner = Math.max(MIN_ROOM_W, need(-1), need(1), sculpts.length ? tot + 3 : 0, vid ? 14 : 0, forceInner || 0);
  const x1 = inner + WALL_T, ix0 = WALL_T / 2, ix1 = x1 - WALL_T / 2, cx = (ix0 + ix1) / 2;
  const hang = (row, side, from, to) => {                // centre a row of pictures between two x positions on one long wall
    const total = rowW(row), mid = (from + to) / 2; let px = side < 0 ? mid - total / 2 : mid + total / 2;
    for (const it of row) {
      const ax = side < 0 ? px + it.ow / 2 : px - it.ow / 2; px += side < 0 ? it.ow + G : -(it.ow + G);
      const y = Math.max(1.6, it.oh / 2 + 0.6), z = side * FACE, dist = clamp(Math.max(it.oh, it.ow * .8) * 1.25 + .6, 2.1, sculpts.length ? 2.15 : 5.2);
      if (it.col) {                                      // a stack of pages: one above the other, labels beside it in the same order
        let top = y + it.oh / 2; const n = it.col.length, d = clamp(Math.max(it.oh * .8, it.ow) * 1.25 + .6, 2.1, 5.2);
        it.col.forEach((c, j) => {
          const cy = top - c.oh / 2; top -= c.oh + it.vg;
          local.push({ ...c, x: ax, y: cy, z, side, nx: 0, nz: -side, rotY: side < 0 ? 0 : Math.PI, labelX: it.ow / 2 + .42, labelY: 1.32 + .24 * (n - 1 - j),
            view: { x: ax, z: z - side * d, yaw: side < 0 ? 0 : Math.PI, pitch: Math.atan2(cy - EYE, d) * .8 } });
        });
        continue;
      }
      local.push({ ...it, x: ax, y, z, side, nx: 0, nz: -side, rotY: side < 0 ? 0 : Math.PI, view: { x: ax, z: z - side * dist, yaw: side < 0 ? 0 : Math.PI, pitch: Math.atan2(y - EYE, dist) } });
    }
  };
  for (const sd of [-1, 1]) {
    const row = rows[sd]; if (!row.length) continue;
    if (sd === sideDoor) {                               // leave the side doorway clear
      const [h1, h2] = halves(row), gapL = cx - DOOR_W / 2 - .8, gapR = cx + DOOR_W / 2 + .8;
      if (room.keepOrder && sd < 0) { hang([...h1].reverse(), sd, gapR, ix1 - MARGIN); hang([...h2].reverse(), sd, ix0 + MARGIN, gapL); }   // continue back along the opposite wall
      else if (room.keepOrder) { hang([...h1].reverse(), sd, ix0 + MARGIN, gapL); hang([...h2].reverse(), sd, gapR, ix1 - MARGIN); }
      else if (sd < 0) { hang(h1, sd, ix0 + MARGIN, gapL); hang(h2, sd, gapR, ix1 - MARGIN); } else { hang(h1, sd, gapR, ix1 - MARGIN); hang(h2, sd, ix0 + MARGIN, gapL); }
    } else { let r2 = sd > 0 && sideDoor ? [...row].reverse() : row; if (room.hangReverse) r2 = [...r2].reverse(); hang(r2, sd, ix0 + MARGIN, ix1 - MARGIN); }   // newest nearest the entrance
  }
  if (entryIt) {                                         // on the wall facing you as you come in: beside the doorway, across from the gold title
    const it = entryIt, y = Math.max(1.6, it.oh / 2 + .6), z = DOOR_W / 2 + (D - DOOR_W) / 4, dist = clamp(Math.max(it.oh, it.ow * .8) * 1.25 + .6, 2.1, 4.6);
    local.push({ ...it, x: ix1, y, z, side: 0, nx: -1, nz: 0, rotY: -Math.PI / 2, entryWall: true, view: { x: ix1 - dist, z, yaw: -Math.PI / 2, pitch: Math.atan2(y - EYE, dist) } });
  }
  // freestanding displays
  const plinths = [];
  let sx0 = cx - tot / 2;
  const SCATTER = [[-.27, -2.7, .55], [.23, 2.6, -.6], [.03, -3.9, .2]];   // an informal grouping, clear of the walking lines
  sculpts.forEach((it, k) => {
    let sx = sx0 + slots[k] / 2, sz = sideDoor ? -sideDoor * ZOFF : (k % 2 ? 1 : -1) * ZOFF, nx = 0, nz = -Math.sign(sz); sx0 += slots[k];   // keep the way to a side doorway clear
    if (room.scatter && sculpts.length <= 3) {
      const [fx, zz, tw] = SCATTER[k], flip = sideDoor > 0 ? 1 : -1;
      sx = cx + fx * inner; sz = zz * (sideDoor ? flip : 1); const l = Math.hypot(tw, 1); nx = tw / l; nz = -Math.sign(sz) / l;
    }
    local.push({ ...it, x: sx, z: sz, y: it.plinthH, side: 0, nx, nz, view: null });
    plinths.push({ x: sx, z: sz, w: it.base, d: it.base });
  });
  monitors.forEach(it => {                               // a screen on the end wall: click to play
    const z = +(it.a.monitor.z ?? -(DOOR_W / 2 + (D - DOOR_W) / 4)), y = Math.max(2.15, it.h / 2 + 1.0), dist = clamp(it.w * 1.15, 3.6, 7.5);
    local.push({ ...it, x: ix0, y, z, side: 0, nx: 1, nz: 0, rotY: Math.PI / 2, view: { x: ix0 + dist, z, yaw: Math.PI / 2, pitch: Math.atan2(y - EYE, dist) * .8 } });
  });
  kiosks.forEach((it, k) => {                            // a freestanding screen past the side doorway, turned toward the entrance
    const intro = room.kind === 'intro', zs = sideDoor || 1;
    const kx = intro ? cx - .2 : cx + 3.6 + k * 3, kz = intro ? 3.9 : zs * 3.3, [ux, uz] = intro ? [-.6, -.8] : [-.8, -.6 * zs], l = Math.hypot(ux, uz), nx = ux / l, nz = uz / l, yaw = Math.atan2(nx, nz);
    local.push({ ...it, x: kx, z: kz, side: 0, nx, nz, rotY: yaw, fixY: WALL_H, view: { x: kx + nx * 2.6, z: kz + nz * 2.6, yaw, pitch: Math.atan2(it.y - EYE, 2.6) * .7 } });
    plinths.push({ x: kx, z: kz, w: 1.0, d: 1.0 });
  });
  // seating can be switched off in config/look.js (BUILDING.benches / BUILDING.theatreSeats)
  let benches = BENCHES && !sculpts.length && !vid && inner >= 13 ? [{ x: cx, z: sideDoor ? -sideDoor * 1.2 : 0, w: Math.min(3.4, inner * .2), d: .6 }] : [];
  if (vid) {                                             // screening room: big screen on the outer wall, benches facing it
    const th = !!room.theatre, sw = th ? 10 : 8, sh = th ? 5.6 : 4.5, sy = th ? 3.3 : 3.0, dist = th ? 10.2 : 7.2, sz = outer * (FACE - .04);
    local.push({ ...vid, x: cx, y: sy, z: sz, w: sw, h: sh, ow: sw, oh: sh, side: 0, nx: 0, nz: -outer, rotY: outer < 0 ? 0 : Math.PI, throw: D - 1.3,
      view: { x: cx, z: outer * (FACE - dist), yaw: outer < 0 ? 0 : Math.PI, pitch: Math.atan2(sy - EYE, dist) * .8 } });
    benches = [];
    if (THEATRE_SEATS) for (const d of th ? [5.0, 6.5, 8.0] : [5.3]) for (const s2 of [-1, 1]) benches.push({ x: cx + s2 * (th ? 2.4 : 2.05), z: outer * (FACE - d), w: th ? 3.4 : 2.5, d: .55 });
  }
  return { data: room, ri, x0: 0, x1, ix0, ix1, cx, inner, benches, plinths, local, width: D + WALL_T, len: x1, vid: !!vid, outer };
}

/* ---------------- the round room ----------------
   Boards on the ground-floor wall (kept clear of the doorways), sculptures on a
   ring off the walking lines, and works with `upperAngle` in the upper gallery. */
function layoutRotunda(room, ri, items, sculpts, local, inRow) {
  const inner = 2 * ROT_R, x1 = inner + WALL_T, ix0 = WALL_T / 2, ix1 = x1 - WALL_T / 2, cx = (ix0 + ix1) / 2;
  const doors = rotDoors(inRow);
  const near = (a, lim) => doors.list.some(d => Math.abs(((a - d + 540) % 360) - 180) < lim);
  const panels = inRow ? [-82, 82] : [-30, 30], nearPanel = a => panels.some(q => Math.abs(a - q) < 14);   // gold titles
  let cand = [-150, -120, -90, -60, 0, 60, 90, 120, 150].filter(a => !near(a, 24) && !nearPanel(a) && (inRow || a !== 0));
  const upper = items.filter(it => it.a.upperAngle !== undefined), lower = items.filter(it => it.a.upperAngle === undefined);
  if (lower.length > cand.length) { cand = []; for (let a = -170; a <= 170; a += 10) if (!near(a, 24) && !nearPanel(a)) cand.push(a); }
  upper.forEach(it => {                                  // above the balcony, seen from the floor below between the columns
    const phi = THREE.MathUtils.degToRad(+it.a.upperAngle), c = Math.cos(phi), sn = Math.sin(phi), k = Math.min(1, 1.95 / it.oh, 4.4 / it.ow);
    if (k < 1) { it.w *= k; it.h *= k; it.ow *= k; it.oh *= k; }
    const nx = -c, nz = -sn, ax = cx + (ROT_R - .02) * c, az = (ROT_R - .02) * sn, yaw = Math.atan2(nx, nz), y = Math.max(8.4, 7.45 + it.oh / 2), dist = 7.2;
    local.push({ ...it, x: ax, y, z: az, side: 0, nx, nz, rotY: yaw, fixY: ROT_Y3 - .1, noFix: true, upper: true, view: { x: ax + nx * dist, z: az + nz * dist, yaw, pitch: Math.atan2(y - EYE, dist) } });
  });
  const angs = lower.map((_, k) => cand[Math.min(cand.length - 1, Math.round((k + .5) * cand.length / lower.length - .5))]);
  lower.forEach((it, k) => {
    const phi = THREE.MathUtils.degToRad(angs[k]), c = Math.cos(phi), sn = Math.sin(phi);
    const nx = -c, nz = -sn, ax = cx + (ROT_R - .02) * c, az = (ROT_R - .02) * sn, yaw = Math.atan2(nx, nz);
    const y = Math.max(1.6, it.oh / 2 + .6), dist = clamp(Math.max(it.oh, it.ow * .8) * 1.25 + .6, 2.1, 2.3);
    local.push({ ...it, x: ax, y, z: az, side: 0, nx, nz, rotY: yaw, fixY: ROT_Y1 - .4, view: { x: ax + nx * dist, z: az + nz * dist, yaw, pitch: Math.atan2(y - EYE, dist) } });
  });
  const plinths = [];
  sculpts.forEach((it, k) => {
    const n = sculpts.length, phi = inRow ? THREE.MathUtils.degToRad(n === 1 ? 0 : n === 4 ? [-100, -40, 40, 100][k] : -100 + 200 * k / (n - 1)) : (k + .5) * Math.PI * 2 / n + (n % 2 ? Math.PI / 2 : 0);
    const sx = cx + 5.2 * Math.cos(phi), sz = 5.2 * Math.sin(phi);
    local.push({ ...it, x: sx, z: sz, y: it.plinthH, side: 0, nx: -Math.cos(phi), nz: -Math.sin(phi), rot: true, view: null });
    plinths.push({ x: sx, z: sz, w: it.base, d: it.base });
  });
  const columns = [];
  for (let i = 0; i < 12; i++) { const deg = (i + .5) * 30; if (near(deg, 12)) continue; columns.push(deg); const phi = THREE.MathUtils.degToRad(deg); plinths.push({ x: cx + ROT_RC * Math.cos(phi), z: ROT_RC * Math.sin(phi), w: .55, d: .55, column: true }); }
  return { data: room, ri, x0: 0, x1, ix0, ix1, cx, inner, benches: [], plinths, rot: true, local, width: 2 * (ROT_R + .3) + WALL_T, len: 2 * (ROT_R + .3) + WALL_T,
    doors, columns, inRow: !!inRow, panels, upperWins: upper.length ? [0, -90, 90] : null };
}

/* ---------------- the whole building ---------------- */
export function computeLayout() {
  const R0 = S.museum.rooms;
  const intro = R0[0]?.kind === 'intro' ? 0 : -1, closing = R0.length > 1 && R0[R0.length - 1].kind === 'closing' ? R0.length - 1 : -1;
  // slots along x: each holds a room in the left row (A) and optionally its partner in the right row (B)
  const slots = [];
  if (intro >= 0) slots.push({ a: intro, b: -1 });
  let i = intro >= 0 ? 1 : 0; const end = closing >= 0 ? closing : R0.length;
  while (i < end) {                                      // pair rooms in order within a category; pairWithPrev joins the room before it
    const a = i++, cat = R0[a].category || '';
    let b = -1;
    if (i < end && (R0[i].pairWithPrev || ((R0[i].category || '') === cat && !R0[i].newRow))) b = i++;
    slots.push({ a, b });
  }
  if (closing >= 0) slots.push({ a: closing, b: -1 });
  // size each slot so the partner rooms share their side wall exactly
  const rooms = new Array(R0.length);
  for (const sl of slots) {
    const hasB = sl.b >= 0, bRot = hasB && !!R0[sl.b].rotunda, aRot = !!R0[sl.a].rotunda;
    let A = layoutRoomLocal(R0[sl.a], sl.a, hasB ? 1 : 0, -1, 0, aRot);
    let B = hasB ? layoutRoomLocal(R0[sl.b], sl.b, bRot ? 0 : -1, 1) : null;
    const len = Math.max(A.len, B ? B.len : 0);
    if (!aRot) A = layoutRoomLocal(R0[sl.a], sl.a, hasB ? 1 : 0, -1, len - WALL_T);
    if (B && !bRot) B = layoutRoomLocal(R0[sl.b], sl.b, -1, 1, len - WALL_T);
    Object.assign(sl, { len, A, B, bRot, aRot });
    A.row = 'A'; A.cat = R0[sl.a].category || ''; A.sideDoor = aRot ? 0 : hasB ? 1 : 0; A.pair = B; A.slotLen = len; rooms[sl.a] = A;
    if (B) { B.row = 'B'; B.cat = R0[sl.b].category || ''; B.sideDoor = bRot ? 0 : -1; B.pair = A; rooms[sl.b] = B; }
  }
  // place along x; link each row into an enfilade
  const place = (r, th, ox, oz) => Object.assign(r, { theta: th, ox, oz, cos: Math.cos(th), sin: Math.sin(th) });
  let x = 0;
  slots.forEach((sl, k) => {
    if (sl.aRot) place(sl.A, Math.PI / 2, x + sl.len / 2, 0); else place(sl.A, 0, x, -D / 2);
    if (sl.B) { if (sl.bRot) place(sl.B, -Math.PI / 2, x + sl.len / 2, 0); else place(sl.B, 0, x, D / 2); }
    const pA = slots[k - 1]?.A, nA = slots[k + 1]?.A;
    sl.A.prev = pA || null; sl.A.doorWest = !!pA; sl.A.ownsEast = !nA;
    if (sl.B && !sl.bRot) {
      const pb = slots[k - 1], nb = slots[k + 1];
      const pB = pb && pb.B && !pb.bRot ? pb.B : null, nB = nb && nb.B && !nb.bRot ? nb.B : null;
      sl.B.prev = pB; sl.B.doorWest = !!pB; sl.B.ownsEast = !nB;
    }
    x += sl.len;
  });
  // world coordinates of every artwork; obstacles; bounding box
  const arts = [], obstacles = [], list = rooms.filter(Boolean);
  let bx0 = -1, bx1 = x + 1, bz0 = -D - 1, bz1 = D + 1;
  for (const r of list) {
    for (const it of r.local) {
      const pp = toW(r, it.x, it.z), n = rotV(r, it.nx || 0, it.nz || 0);
      const o = { ...it, x: pp.x, z: pp.z, nx: n.x, nz: n.z, room: r };
      if (it.rotY !== undefined) o.rotY = it.rotY + r.theta;
      if (it.view) { const v = toW(r, it.view.x, it.view.z); o.view = { x: v.x, z: v.z, yaw: it.view.yaw + r.theta, pitch: it.view.pitch }; }
      arts.push(o);
    }
    const swap = Math.abs(r.sin) > .5;
    for (const b of [...r.benches, ...r.plinths]) { const pp = toW(r, b.x, b.z); obstacles.push({ x: pp.x, z: pp.z, w: swap ? b.d : b.w, d: swap ? b.w : b.d }); }
    const hw = r.width / 2;
    for (const [lx, lz] of [[-.3, -hw], [-.3, hw], [r.x1 + .3, -hw], [r.x1 + .3, hw]]) { const pp = toW(r, lx, lz); bx0 = Math.min(bx0, pp.x); bx1 = Math.max(bx1, pp.x); bz0 = Math.min(bz0, pp.z); bz1 = Math.max(bz1, pp.z); }
  }
  arts.sort((a, b) => a.ri - b.ri || a.ai - b.ai).forEach((a, k) => a.index = k);
  for (const it of arts) if (it.kind === 'sculpture' && !it.view) sculptView(it, 1);
  return { slots: slots.map(sl => ({ A: sl.A, B: sl.B, bRot: sl.bRot, aRot: sl.aRot })), rooms, arts, obstacles,
    bbox: { x0: bx0, x1: bx1, z0: bz0, z1: bz1 }, intro: intro >= 0 ? rooms[intro] : null, closing: closing >= 0 ? rooms[closing] : null };
}
