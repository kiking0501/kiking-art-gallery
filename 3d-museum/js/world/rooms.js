/* Rectangular rooms: walls, doorways, ceiling and skylight, benches, and the
   gold lettering (exhibition titles, names over doorways). */
import * as THREE from 'three';
import { S } from '../state.js';
import { mk, lum, shade, inkFor, wrapText, spacing, SERIF, SANS } from '../util.js';
import { TEX } from './textures.js';
import { stdMat, wallMat, skyMat, skySunMat, sunPatchMat, shadowMat, box, plane, wbox, mplane, textPlane, goldMat } from './materials.js';
import { buildWallMap } from './wall-map.js';
import { canvasTex, MOBILE } from './renderer.js';
import { exNo, exTotal, two, roomStats, roomTag, annexLabel } from '../data/room-info.js';
import { D, HALF_D, WALL_H, WALL_T, DOOR_W, DOOR_H, FACE, PLASTER_TILE } from './constants.js';

const SIDE_Z = DOOR_W / 2 + (D - DOOR_W) / 4;   // centre of the wall beside a doorway

/* ---------------- lettering ---------------- */
// The name of the room you are about to enter, above a doorway.
export function sideLabel(text, sub, ink) {
  const k = MOBILE ? .5 : 1;                             // drawn in 1536-wide units; half size on phones (memory)
  return textPlane((g) => {
    const cw = 1536, ch = 200; g.scale(k, k);
    g.fillStyle = ink; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `400 88px ${SERIF}`;
    spacing(g, '4px'); g.fillText(text, cw / 2, ch / 2 - 8, cw - 40);
    g.globalAlpha = .55; g.font = `400 30px ${SANS}`; spacing(g, '8px'); g.fillText(sub, cw / 2, ch - 22, cw - 40);
  }, 1536 * k, 200 * k, 3.8, .495);
}
// The exhibition's title, statistics and description in gold leaf, straight on the wall.
export function exhibitionPanel(r) {
  const lightWall = lum(r.data.wall) > .32;
  const k = MOBILE ? .3 : .75, c = mk(Math.round(2048 * k), Math.round(1762 * k)), g = c.getContext('2d'), L = 40; g.scale(k, k);   // drawn in 2048-wide units on a lighter canvas (lighter still on phones)
  g.fillStyle = '#fff'; g.textAlign = 'left';
  g.font = `500 50px ${SANS}`; spacing(g, '16px'); g.globalAlpha = .85;
  const cat = r.cat ? r.cat.toUpperCase() + '  ·  ' : '';
  g.fillText(r.data.kind === 'intro' ? 'WELCOME' : r.data.kind === 'annex' ? `${cat}${annexLabel(r.data).toUpperCase()}` : `${cat}EXHIBITION ${two(exNo(r.ri))} / ${two(exTotal())}`, L, 150, 2048 - L * 2);
  g.globalAlpha = 1; spacing(g, '6px');
  // the room's name, as large as fits in three lines (smaller for long names, never cut short)
  const maxW = 2048 - L * 2, count = sz => { g.font = `400 ${sz}px ${SERIF}`; let n = 1, line = ''; for (const w of r.data.name.split(/\s+/)) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > maxW && line) { n++; line = w; } else line = t; } return n; };
  let size = 236; while (size > 120 && count(size) > 3) size -= 8;
  const lh = Math.round(size * .94), top = 400 - Math.round((236 - size) * .45);
  const lines = wrapText(g, r.data.name, L - 6, top, maxW, lh, 3);
  let y = top + (lines - 1) * lh + 96;
  g.fillRect(L, y, 240, 6); y += 116;
  if (r.data.kind !== 'intro' && r.data.kind !== 'annex') { g.font = `400 46px ${SANS}`; spacing(g, '10px'); g.globalAlpha = .85; g.fillText(roomStats(r.data).toUpperCase(), L, y); y += 122; }
  if (r.data.description) { g.font = `400 78px ${SERIF}`; spacing(g, '1px'); g.globalAlpha = .95; wrapText(g, r.data.description, L, y, 2048 - L * 2.5, 96, Math.max(1, Math.floor((1762 - 60 - y) / 96) + 1)); }
  const gold = lightWall ? '#b8913f' : '#dcb86a';
  const mat = goldMat(c, gold, lightWall ? .16 : .24); mat.envMapIntensity = 2.2;
  const pn = plane(4.3, 3.7, mat); pn.userData.kind = 'wall';
  pn.userData.stop = { label: r.data.name, d: 4.4 };   // a viewing point in front of it (not part of the tour)
  return pn;
}

export function benchMesh(b, floorGroup) {
  const g = new THREE.Group(); g.position.set(b.x, 0, b.z);
  const seat = box(b.w, .09, b.d, stdMat('#4a3326', .55)); seat.position.y = .44;
  const cush = box(b.w - .06, .05, b.d - .06, stdMat('#2a2420', .8)); cush.position.y = .51;
  g.add(seat, cush);
  const along = b.w >= b.d;
  for (const sx of [-1, 1]) { const leg = along ? box(.06, .4, b.d - .12, stdMat('#151515', .4, .6)) : box(b.w - .12, .4, .06, stdMat('#151515', .4, .6)); if (along) leg.position.set(sx * (b.w / 2 - .25), .2, 0); else leg.position.set(0, .2, sx * (b.d / 2 - .25)); g.add(leg); }
  g.traverse(o => o.userData.kind = 'bench');
  const sh = plane(b.w + .5, b.d + .5, new THREE.MeshBasicMaterial({ map: TEX.wash, color: 0x000000, transparent: true, opacity: .35, depthWrite: false })); sh.rotation.x = -Math.PI / 2; sh.position.set(b.x, .004, b.z); floorGroup.add(sh);
  return g;
}

/* ---------------- long walls, ceiling, skylight ----------------
   rg = the room's group for walls (in the room's own frame), rfg = its floor group */
export function buildRoomShell(r, rg, rfg) {
  const RD = r.D || D, HD = RD / 2, F = HD - WALL_T / 2;  // a room spanning both rows is twice as deep
  const mood = r.data.mood, darkCeil = mood === 'dark' || r.data.ceiling === 'dark';
  const ceil = mplane(r.inner + WALL_T, RD, darkCeil ? stdMat('#0d0d0f', .95) : wallMat('#eeebe5', .97), PLASTER_TILE);
  ceil.rotation.x = Math.PI / 2; ceil.position.set(r.cx, WALL_H, 0); rg.add(ceil);
  const wall = r.data.wall, wm = wallMat(wall), base = stdMat(shade(wall, lum(wall) > .3 ? -.18 : -.3), .45);
  const cornice = stdMat(lum(wall) > .3 ? shade(wall, .25) : shade(wall, .06), .6), trim = stdMat('#2b2622', .4), dz = DOOR_W / 2;
  const sharedSide = r.row === 'A' ? 1 : -1;
  for (const sd of [-1, 1]) {
    const openSide = r.open && sd === sharedSide;       // open to the partner room: no wall here, one hall
    if (!openSide) {
    const c1 = box(r.inner, .17, .09, cornice); c1.position.set(r.cx, WALL_H - .085, sd * (F - .045)); rg.add(c1);
    const c2 = box(r.inner, .05, .035, cornice); c2.position.set(r.cx, WALL_H - .195, sd * (F - .0175)); rg.add(c2);
    }
    const ex = sd < 0 ? r.ix0 : r.ix1, c3 = box(.09, .17, RD - WALL_T, cornice); c3.position.set(ex - sd * .045, WALL_H - .085, 0); rg.add(c3);
    const c4 = box(.035, .05, RD - WALL_T, cornice); c4.position.set(ex - sd * .0175, WALL_H - .195, 0); rg.add(c4);
    const door = sd === r.sideDoor && !openSide, segs = openSide ? [] : door ? [[0, r.cx - dz], [r.cx + dz, r.x1]] : [[0, r.x1]];
    const builds = !openSide && !(r.row === 'B' && sd === sharedSide);   // the left-row room builds the wall it shares with its partner
    if (builds) {
      const other = sd === sharedSide && r.pair ? wallMat(r.pair.data.wall) : wm;
      const mats = sd > 0 ? [wm, wm, wm, wm, other, wm] : [wm, wm, wm, wm, wm, other];
      for (const [a, b] of segs) { const wl = wbox(b - a, WALL_H, WALL_T, mats); wl.position.set((a + b) / 2, WALL_H / 2, sd * HD); wl.userData.kind = 'wall'; rg.add(wl); }
      if (door) { const lin = wbox(DOOR_W, WALL_H - DOOR_H, WALL_T, mats); lin.position.set(r.cx, DOOR_H + (WALL_H - DOOR_H) / 2, sd * HD); lin.userData.kind = 'wall'; rg.add(lin); }
    }
    for (const [a, b] of segs) {                         // skirting board and a soft shadow along the floor
      const a2 = Math.max(a, r.ix0), b2 = Math.min(b, r.ix1); if (b2 - a2 < .05) continue;
      const bb = box(b2 - a2, .14, .02, base); bb.position.set((a2 + b2) / 2, .07, sd * (F - .012)); rg.add(bb);
      const sh = plane(b2 - a2, .7, shadowMat); sh.rotation.x = -Math.PI / 2; sh.rotation.z = sd > 0 ? Math.PI : 0; sh.position.set((a2 + b2) / 2, .003, sd * (F - .35)); rfg.add(sh);
    }
    if (door) {                                          // casing, and the partner room's name above the side doorway
      const z = sd * (F - .015);
      const top = box(DOOR_W + .28, .14, .03, trim); top.position.set(r.cx, DOOR_H + .07, z); rg.add(top);
      for (const s2 of [-1, 1]) { const j = box(.14, DOOR_H, .03, trim); j.position.set(r.cx + s2 * (dz + .07), DOOR_H / 2, z); rg.add(j); }
      if (r.pair) { const lb = sideLabel(r.pair.data.name, roomTag(r.pair) + '  →', inkFor(wall)); lb.position.set(r.cx, DOOR_H + .8, sd * (F - .012)); lb.rotation.y = sd > 0 ? Math.PI : 0; lb.userData.kind = 'wall'; rg.add(lb); }
    }
    if (openSide) continue;
    const tr = box(r.inner - 1.2, .045, .06, stdMat('#1e1e1e', .5, .4)); tr.position.set(r.cx, WALL_H - .35, sd * (F - 1.5)); rg.add(tr);   // lighting track
    for (const dx of [-r.inner / 2 + 1, r.inner / 2 - 1]) { const rod = box(.02, .33, .02, stdMat('#1e1e1e', .5, .4)); rod.position.set(r.cx + dx, WALL_H - .17, sd * (F - 1.5)); rg.add(rod); }
  }
  const sw = r.inner - 3.6, sdp = RD - 5.6;
  if (mood !== 'dark') {                                 // skylight
    const sky = plane(sw, sdp, mood === 'sunny' ? skySunMat : skyMat); sky.rotation.x = Math.PI / 2; sky.position.set(r.cx, WALL_H - .002, 0); rg.add(sky);
    if (mood === 'sunny') { const sp = plane(sw, sdp, sunPatchMat); sp.rotation.x = -Math.PI / 2; sp.position.set(r.cx + 1.6, .006, .9); rfg.add(sp); }
    const well = darkCeil ? stdMat('#141417', .9) : wallMat('#ebe7df', .95);
    for (const sd of [-1, 1]) {
      const a = wbox(sw + .5, .5, .25, well); a.position.set(r.cx, WALL_H - .25, sd * (sdp / 2 + .125)); rg.add(a);
      const b = wbox(.25, .5, sdp, well); b.position.set(r.cx + sd * (sw / 2 + .125), WALL_H - .25, 0); rg.add(b);
    }
  }
  for (const b of r.benches) rg.add(benchMesh(b, rfg));
  for (const t of r.tables || []) rg.add(archiveTable(t, rfg));
}

/* Walnut with its grain: long wavy lines along the board, a few darker figures and pores (drawn once). */
let WOOD = null;
function woodTexture() {
  if (WOOD) return WOOD;
  const W = 1024, H = 512, c = mk(W, H), g = c.getContext('2d');
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const base = g.createLinearGradient(0, 0, 0, H); base.addColorStop(0, '#6b4a30'); base.addColorStop(.5, '#5e4029'); base.addColorStop(1, '#6f4d33');
  g.fillStyle = base; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 26; i++) {                         // broad bands of lighter and darker wood
    const y = rnd() * H, h = 8 + rnd() * 40; g.fillStyle = rnd() < .5 ? `rgba(30,18,10,${.05 + rnd() * .1})` : `rgba(150,105,70,${.04 + rnd() * .08})`; g.fillRect(0, y, W, h);
  }
  for (let i = 0; i < 240; i++) {                        // the grain lines, gently waving along the board
    const y0 = rnd() * H, amp = 2 + rnd() * 9, f = .004 + rnd() * .012, ph = rnd() * 6.3, dark = rnd() < .75;
    g.strokeStyle = dark ? `rgba(28,16,8,${.12 + rnd() * .28})` : `rgba(170,125,85,${.08 + rnd() * .14})`; g.lineWidth = .6 + rnd() * 1.8;
    g.beginPath(); for (let x = 0; x <= W; x += 8) { const y = y0 + Math.sin(x * f + ph) * amp + Math.sin(x * f * 3.7 + ph * 2) * amp * .25; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
  }
  for (let k = 0; k < 5; k++) {                          // a few cathedral figures (pointed arches in the grain)
    const cx = rnd() * W, cy = rnd() * H, len = 120 + rnd() * 220;
    for (let j = 0; j < 9; j++) { const s = 6 + j * 7; g.strokeStyle = `rgba(30,17,9,${.18 - j * .015})`; g.lineWidth = 1.2; g.beginPath(); g.moveTo(cx - len, cy + s); g.quadraticCurveTo(cx, cy - s * .6, cx + len, cy + s); g.stroke(); }
  }
  const im = g.getImageData(0, 0, W, H), d = im.data;    // fine pores and noise
  for (let p = 0; p < d.length; p += 4) { const n = (rnd() - .5) * 14; d[p] += n; d[p + 1] += n * .8; d[p + 2] += n * .6; }
  g.putImageData(im, 0, 0);
  WOOD = canvasTex(c, true); WOOD.wrapS = WOOD.wrapT = THREE.RepeatWrapping; WOOD.userData.keep = true;
  return WOOD;
}
function woodMat(rx, ry, tint = '#ffffff', rough = .5) {
  const t = woodTexture().clone(); t.repeat.set(rx, ry); t.needsUpdate = true;
  return new THREE.MeshStandardMaterial({ map: t, color: tint, roughness: rough, metalness: 0, envMapIntensity: .6 });
}

/* An archive display case, as in a museum: a plain walnut cabinet (with its grain) under a glass-topped case;
   the pages lie on dark felt under the glass. */
function archiveTable(t, floorGroup) {
  const g = new THREE.Group(); g.position.set(t.x, 0, t.z);
  const long = t.w >= t.d, L = Math.max(t.w, t.d), S2 = Math.min(t.w, t.d);   // its length and depth, whichever way it stands
  const wood = woodMat(L / 1.4, .6), woodS = woodMat(S2 / 1.4, .6), brass = stdMat('#8f7244', .32, .85), felt = stdMat('#2b3836', .95);
  const top = t.top, bodyH = top - .1;
  const toe = box(t.w - .16, .08, t.d - .16, stdMat('#141210', .6)); toe.position.y = .04; g.add(toe);
  const body = new THREE.Mesh(new THREE.BoxGeometry(t.w, bodyH - .08, t.d), long ? [woodS, woodS, wood, wood, wood, wood] : [wood, wood, woodS, woodS, woodS, woodS]);
  body.position.y = .08 + (bodyH - .08) / 2; g.add(body);
  const lip = box(t.w + .04, .03, t.d + .04, brass); lip.position.y = bodyH + .015; g.add(lip);
  const bed = box(t.w - .1, .07, t.d - .1, felt); bed.position.y = top - .035; g.add(bed);
  for (const s of [-1, 1]) {                             // the case's rim
    const a = new THREE.Mesh(new THREE.BoxGeometry(t.w, .14, .05), long ? wood : woodS); a.position.set(0, bodyH + .07 + .03, s * (t.d / 2 - .025)); g.add(a);
    const b = new THREE.Mesh(new THREE.BoxGeometry(.05, .14, t.d - .1), long ? woodS : wood); b.position.set(s * (t.w / 2 - .025), bodyH + .07 + .03, 0); g.add(b);
  }
  // the glass: a clear pane with a little reflection and a thin bright edge, so it reads as glass
  const gm = new THREE.MeshStandardMaterial({ color: '#eef6f6', transparent: true, opacity: .14, roughness: .03, metalness: .1, envMapIntensity: 2.2, depthWrite: false });
  const glass = new THREE.Mesh(new THREE.BoxGeometry(t.w - .09, .012, t.d - .09), gm); glass.position.y = bodyH + .172; glass.raycast = () => {}; /* clicks reach the pages under it */ g.add(glass);
  const edgeM = new THREE.MeshBasicMaterial({ color: '#dfeeed', transparent: true, opacity: .45, depthWrite: false });
  for (const s of [-1, 1]) {
    const e1 = box(t.w - .09, .004, .004, edgeM); e1.position.set(0, bodyH + .178, s * (t.d - .09) / 2); e1.raycast = () => {}; g.add(e1);
    const e2 = box(.004, .004, t.d - .09, edgeM); e2.position.set(s * (t.w - .09) / 2, bodyH + .178, 0); e2.raycast = () => {}; g.add(e2);
  }
  g.traverse(o => { if (o.raycast === THREE.Mesh.prototype.raycast) o.userData.kind = 'bench'; });
  const sh = plane(t.w + .8, t.d + .8, new THREE.MeshBasicMaterial({ map: TEX.wash, color: 0x000000, transparent: true, opacity: .4, depthWrite: false })); sh.rotation.x = -Math.PI / 2; sh.position.set(t.x, .004, t.z); floorGroup.add(sh);
  return g;
}

/* ---------------- end walls, doorways along the row, titles ---------------- */
export function buildCrossWalls(r, rg, rfg) {
  const trim = stdMat('#2b2622', .4), rw = wallMat(r.data.wall), pw = r.prev ? wallMat(r.prev.data.wall) : rw, kind = r.data.kind;
  const RD = r.D || D, HD = RD / 2, SZ = r.sideZ ?? SIDE_Z, mats = [rw, pw, rw, rw, rw, rw];
  const doors = r.doorWest ? (r.westDoors?.length ? r.westDoors : [0]) : [];
  const prevAt = z => (r.span && z > 0 ? r.prevB || r.prev : r.prev);   // a wide room: the room beyond each doorway
  if (doors.length) {                                    // doorway(s) from the previous room(s) in the row
    const cuts = [-HD, ...doors.flatMap(z => [z - DOOR_W / 2, z + DOOR_W / 2]), HD], segs = [];
    for (let k = 0; k < cuts.length; k += 2) {
      const [a, b] = [cuts[k], cuts[k + 1]];
      if (r.span && a < 0 && b > 0) segs.push([a, 0], [0, b]); else segs.push([a, b]);   // split at the middle, so each side shows its own room's colour
    }
    for (const [a, b] of segs) {
      if (b - a < .02) continue;
      const m = (a + b) / 2, p = wbox(WALL_T, WALL_H, b - a, [rw, wallMat(prevAt(m).data.wall), rw, rw, rw, rw]); p.position.set(0, WALL_H / 2, m); p.userData.kind = 'wall'; rg.add(p);
      for (const f of [-1, 1]) { const sh = plane(Math.max(.1, b - a - .2), .6, shadowMat); sh.rotation.x = -Math.PI / 2; sh.rotation.z = f > 0 ? -Math.PI / 2 : Math.PI / 2; sh.position.set(f * (WALL_T / 2 + .3), .003, m); rfg.add(sh); }
    }
    for (const z of doors) {
      const pr = prevAt(z), lin = wbox(WALL_T, WALL_H - DOOR_H, DOOR_W, [rw, wallMat(pr.data.wall), rw, rw, rw, rw]); lin.position.set(0, DOOR_H + (WALL_H - DOOR_H) / 2, z); lin.userData.kind = 'wall'; rg.add(lin);
      for (const f of [-1, 1]) {
        const x = f * (WALL_T / 2 + .015);
        const top = box(.03, .14, DOOR_W + .28, trim); top.position.set(x, DOOR_H + .07, z); rg.add(top);
        for (const sd of [-1, 1]) { const j = box(.03, DOOR_H, .14, trim); j.position.set(x, DOOR_H / 2, z + sd * (DOOR_W / 2 + .07)); rg.add(j); }
        const lb = f < 0 ? sideLabel(r.data.name, roomTag(r) + '  →', inkFor(pr.data.wall)) : sideLabel(pr.data.name, '←  BACK', inkFor(r.data.wall));
        lb.position.set(f * (WALL_T / 2 + .012), DOOR_H + .8, z); lb.rotation.y = f * Math.PI / 2; lb.userData.kind = 'wall'; rg.add(lb);
      }
    }
  } else {
    const w = wbox(WALL_T, WALL_H, RD, mats); w.position.set(0, WALL_H / 2, 0); w.userData.kind = 'wall'; rg.add(w);
    const sh = plane(RD - WALL_T, .7, shadowMat); sh.rotation.x = -Math.PI / 2; sh.rotation.z = -Math.PI / 2; sh.position.set(WALL_T / 2 + .35, .003, 0); rfg.add(sh);
  }
  if (r.ownsEast) {                                      // last room of its row: close the far end
    const w = wbox(WALL_T, WALL_H, RD, [rw, rw, rw, rw, rw, rw]); w.position.set(r.x1, WALL_H / 2, 0); w.userData.kind = 'wall'; rg.add(w);
    const sh = plane(RD - WALL_T, .7, shadowMat); sh.rotation.x = -Math.PI / 2; sh.rotation.z = Math.PI / 2; sh.position.set(r.ix1 - .35, .003, 0); rfg.add(sh);
  }
  const wallInk = inkFor(r.data.wall);
  const bigText = (lines, x, rotY, y, size) => {
    const t = textPlane((g, cw) => {
      g.fillStyle = wallInk; g.textAlign = 'center';
      const parts = String(lines[0] || '').split(/\s+·\s+/);
      if (parts.length === 2) {                          // "Kiking's Art · Online Museum": two lines, each kept whole
        g.font = `400 ${size}px ${SERIF}`; g.fillText(parts[0], cw / 2, 175, cw - 120);
        g.font = `400 ${Math.round(size * .62)}px ${SERIF}`; spacing(g, '6px'); g.fillText(parts[1], cw / 2, 290, cw - 120); spacing(g, '0px');
      } else { g.font = `400 ${size}px ${SERIF}`; wrapText(g, lines[0], cw / 2, 210, cw - 120, size, 2); }
      g.globalAlpha = .9; g.fillStyle = '#b8955a'; g.fillRect(cw / 2 - 70, 336, 140, 3);
      g.fillStyle = wallInk; g.globalAlpha = .75; g.font = `300 42px ${SANS}`; spacing(g, '10px');
      wrapText(g, String(lines[1] || '').toUpperCase(), cw / 2, 420, cw - 120, 56, 2);
    }, 2048, 560, 8, 2.19);
    t.position.set(x, y, 0); t.rotation.y = rotY; t.userData.kind = 'wall'; rg.add(t);
  };
  if (kind === 'intro') {                                // museum title behind you; welcome text and map beside the doorway ahead
    bigText([S.museum.title, S.museum.subtitle], r.ix0 + .012, Math.PI / 2, 3.4, 150);
    const pn = exhibitionPanel(r); pn.scale.setScalar(.72); pn.position.set(r.ix1 - .012, 2.25, -SIDE_Z); pn.rotation.y = -Math.PI / 2; rg.add(pn);
    const mp = buildWallMap({ x: r.ix1 - 2.6, z: SIDE_Z }); mp.position.set(r.ix1 - .01, 2.55, SIDE_Z); mp.rotation.y = -Math.PI / 2; rg.add(mp);
  } else if (kind === 'closing') {                       // farewell lettering and a sign that links to the gallery
    const fx = r.ix1 - .012;
    bigText([S.museum.closing, S.museum.title], fx, -Math.PI / 2, 4.0, 120);
    if (r.data.link) {
      const sg = new THREE.Group(); sg.position.set(fx, 1.75, 0); sg.rotation.y = -Math.PI / 2;
      const bd = box(3.9, 1.15, .05, stdMat('#1a1714', .5)); bd.position.z = .025; sg.add(bd);
      const tc = mk(2048, 604), tg = tc.getContext('2d'); tg.fillStyle = '#fff'; tg.textAlign = 'center';
      tg.font = `400 128px ${SERIF}`; tg.fillText(r.data.linkLabel || 'Continue to the gallery', 1024, 270, 1900);
      tg.font = `400 46px ${SANS}`; spacing(tg, '8px'); tg.globalAlpha = .8; tg.fillText(String(r.data.link).replace(/^https?:\/\//, '').replace(/\/$/, '').toUpperCase() + '   →', 1024, 420, 1900);
      const tp = plane(3.9, 1.15, goldMat(tc, '#dcb86a', .35)); tp.position.z = .052; sg.add(tp);
      sg.traverse(o => { o.userData.kind = 'link'; }); rg.add(sg);
    }
  } else {                                               // exhibition lettering beside the doorways, facing you as you walk along the row
    const shared = r.open ? (r.row === 'A' ? 1 : -1) : 0;   // an open hall: the wall between the two doorways has a drawing, not a title
    if (shared !== -1) { const a = exhibitionPanel(r); a.position.set(r.ix1 - .012, 2.3, -SZ); a.rotation.y = -Math.PI / 2; rg.add(a); }
    if (shared !== 1) { const b = exhibitionPanel(r.split?.src || r); b.position.set(r.ix0 + .012, 2.3, SZ); b.rotation.y = Math.PI / 2; rg.add(b); }   // (a room in two halves: the near half's exhibition)
    if (r.split) {                                       // where this room's own half begins, its title on the wall
      const m = exhibitionPanel(r), sz = Math.sign(r.split.panelZ) || -1; m.scale.setScalar(.72);
      m.position.set(r.split.panelX, 2.3, r.split.panelZ - sz * .012); m.rotation.y = sz < 0 ? 0 : Math.PI; rg.add(m);
    }
    if (r.vid && !r.data.theatre) {                      // screening room: the title in gold above the screen
      const c = mk(2048, 200), g = c.getContext('2d'); g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = `400 104px ${SERIF}`; spacing(g, '4px'); g.fillText(r.data.name, 1024, 92, 1960);
      const t = plane(6.4, .625, goldMat(c)); t.position.set(r.cx, 5.75, r.outer * ((r.face ?? FACE) - .012)); t.rotation.y = r.outer < 0 ? 0 : Math.PI; rg.add(t);
    }
  }
}
