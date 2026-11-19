/* Rectangular rooms: walls, doorways, ceiling and skylight, benches, and the
   gold lettering (exhibition titles, names over doorways). */
import * as THREE from 'three';
import { S } from '../state.js';
import { mk, lum, shade, inkFor, wrapText, spacing } from '../util.js';
import { TEX } from './textures.js';
import { stdMat, wallMat, skyMat, skySunMat, sunPatchMat, shadowMat, box, plane, wbox, mplane, textPlane, goldMat } from './materials.js';
import { buildWallMap } from './wall-map.js';
import { exNo, exTotal, two, roomStats, roomTag, annexLabel } from '../data/room-info.js';
import { D, HALF_D, WALL_H, WALL_T, DOOR_W, DOOR_H, FACE, PLASTER_TILE } from './constants.js';

const SIDE_Z = DOOR_W / 2 + (D - DOOR_W) / 4;   // centre of the wall beside a doorway

/* ---------------- lettering ---------------- */
// The name of the room you are about to enter, above a doorway.
export function sideLabel(text, sub, ink) {
  return textPlane((g, cw, ch) => {
    g.fillStyle = ink; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '600 88px "Cormorant Garamond", Georgia, serif';
    spacing(g, '4px'); g.fillText(text, cw / 2, ch / 2 - 8, cw - 40);
    g.globalAlpha = .55; g.font = '400 30px Inter, sans-serif'; spacing(g, '8px'); g.fillText(sub, cw / 2, ch - 22, cw - 40);
  }, 1536, 200, 3.8, .495);
}
// The exhibition's title, statistics and description in gold leaf, straight on the wall.
export function exhibitionPanel(r) {
  const lightWall = lum(r.data.wall) > .32;
  const c = mk(2048, 1762), g = c.getContext('2d'), L = 40;
  g.fillStyle = '#fff'; g.textAlign = 'left';
  g.font = '500 50px Inter, sans-serif'; spacing(g, '16px'); g.globalAlpha = .85;
  const cat = r.cat ? r.cat.toUpperCase() + '  ·  ' : '';
  g.fillText(r.data.kind === 'intro' ? 'WELCOME' : r.data.kind === 'annex' ? `${cat}${annexLabel(r.data).toUpperCase()}` : `${cat}EXHIBITION ${two(exNo(r.ri))} / ${two(exTotal())}`, L, 150, 2048 - L * 2);
  g.globalAlpha = 1; g.font = '600 236px "Cormorant Garamond", Georgia, serif'; spacing(g, '6px');
  const lines = wrapText(g, r.data.name, L - 6, 400, 2048 - L * 2, 222, 3);
  let y = 400 + (lines - 1) * 222 + 96;
  g.fillRect(L, y, 240, 6); y += 116;
  if (r.data.kind !== 'intro' && r.data.kind !== 'annex') { g.font = '400 46px Inter, sans-serif'; spacing(g, '10px'); g.globalAlpha = .85; g.fillText(roomStats(r.data).toUpperCase(), L, y); y += 122; }
  if (r.data.description) { g.font = '500 78px "Cormorant Garamond", Georgia, serif'; spacing(g, '1px'); g.globalAlpha = .95; wrapText(g, r.data.description, L, y, 2048 - L * 2.5, 96, Math.max(1, Math.floor((1762 - 60 - y) / 96) + 1)); }
  const gold = lightWall ? '#b8913f' : '#dcb86a';
  const mat = goldMat(c, gold, lightWall ? .16 : .24); mat.envMapIntensity = 2.2;
  const pn = plane(4.3, 3.7, mat); pn.userData.kind = 'wall';
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
  const mood = r.data.mood, darkCeil = mood === 'dark' || r.data.ceiling === 'dark';
  const ceil = mplane(r.inner + WALL_T, D, darkCeil ? stdMat('#0d0d0f', .95) : wallMat('#eeebe5', .97), PLASTER_TILE);
  ceil.rotation.x = Math.PI / 2; ceil.position.set(r.cx, WALL_H, 0); rg.add(ceil);
  const wall = r.data.wall, wm = wallMat(wall), base = stdMat(shade(wall, lum(wall) > .3 ? -.18 : -.3), .45);
  const cornice = stdMat(lum(wall) > .3 ? shade(wall, .25) : shade(wall, .06), .6), trim = stdMat('#2b2622', .4), dz = DOOR_W / 2;
  const sharedSide = r.row === 'A' ? 1 : -1;
  for (const sd of [-1, 1]) {
    const c1 = box(r.inner, .17, .09, cornice); c1.position.set(r.cx, WALL_H - .085, sd * (FACE - .045)); rg.add(c1);
    const c2 = box(r.inner, .05, .035, cornice); c2.position.set(r.cx, WALL_H - .195, sd * (FACE - .0175)); rg.add(c2);
    const ex = sd < 0 ? r.ix0 : r.ix1, c3 = box(.09, .17, D - WALL_T, cornice); c3.position.set(ex - sd * .045, WALL_H - .085, 0); rg.add(c3);
    const c4 = box(.035, .05, D - WALL_T, cornice); c4.position.set(ex - sd * .0175, WALL_H - .195, 0); rg.add(c4);
    const door = sd === r.sideDoor, segs = door ? [[0, r.cx - dz], [r.cx + dz, r.x1]] : [[0, r.x1]];
    const builds = !(r.row === 'B' && sd === sharedSide);   // the left-row room builds the wall it shares with its partner
    if (builds) {
      const other = sd === sharedSide && r.pair ? wallMat(r.pair.data.wall) : wm;
      const mats = sd > 0 ? [wm, wm, wm, wm, other, wm] : [wm, wm, wm, wm, wm, other];
      for (const [a, b] of segs) { const wl = wbox(b - a, WALL_H, WALL_T, mats); wl.position.set((a + b) / 2, WALL_H / 2, sd * HALF_D); wl.userData.kind = 'wall'; rg.add(wl); }
      if (door) { const lin = wbox(DOOR_W, WALL_H - DOOR_H, WALL_T, mats); lin.position.set(r.cx, DOOR_H + (WALL_H - DOOR_H) / 2, sd * HALF_D); lin.userData.kind = 'wall'; rg.add(lin); }
    }
    for (const [a, b] of segs) {                         // skirting board and a soft shadow along the floor
      const a2 = Math.max(a, r.ix0), b2 = Math.min(b, r.ix1); if (b2 - a2 < .05) continue;
      const bb = box(b2 - a2, .14, .02, base); bb.position.set((a2 + b2) / 2, .07, sd * (FACE - .012)); rg.add(bb);
      const sh = plane(b2 - a2, .7, shadowMat); sh.rotation.x = -Math.PI / 2; sh.rotation.z = sd > 0 ? Math.PI : 0; sh.position.set((a2 + b2) / 2, .003, sd * (FACE - .35)); rfg.add(sh);
    }
    if (door) {                                          // casing, and the partner room's name above the side doorway
      const z = sd * (FACE - .015);
      const top = box(DOOR_W + .28, .14, .03, trim); top.position.set(r.cx, DOOR_H + .07, z); rg.add(top);
      for (const s2 of [-1, 1]) { const j = box(.14, DOOR_H, .03, trim); j.position.set(r.cx + s2 * (dz + .07), DOOR_H / 2, z); rg.add(j); }
      if (r.pair) { const lb = sideLabel(r.pair.data.name, roomTag(r.pair) + '  →', inkFor(wall)); lb.position.set(r.cx, DOOR_H + .8, sd * (FACE - .012)); lb.rotation.y = sd > 0 ? Math.PI : 0; lb.userData.kind = 'wall'; rg.add(lb); }
    }
    const tr = box(r.inner - 1.2, .045, .06, stdMat('#1e1e1e', .5, .4)); tr.position.set(r.cx, WALL_H - .35, sd * (FACE - 1.5)); rg.add(tr);   // lighting track
    for (const dx of [-r.inner / 2 + 1, r.inner / 2 - 1]) { const rod = box(.02, .33, .02, stdMat('#1e1e1e', .5, .4)); rod.position.set(r.cx + dx, WALL_H - .17, sd * (FACE - 1.5)); rg.add(rod); }
  }
  const sw = r.inner - 3.6, sdp = D - 5.6;
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
}

/* ---------------- end walls, doorways along the row, titles ---------------- */
export function buildCrossWalls(r, rg, rfg) {
  const trim = stdMat('#2b2622', .4), rw = wallMat(r.data.wall), pw = r.prev ? wallMat(r.prev.data.wall) : rw, kind = r.data.kind;
  const mats = [rw, pw, rw, rw, rw, rw], sideLen = (D - DOOR_W) / 2;
  if (r.doorWest) {                                      // doorway from the previous room in the row
    for (const sd of [-1, 1]) { const p = wbox(WALL_T, WALL_H, sideLen, mats); p.position.set(0, WALL_H / 2, sd * (DOOR_W / 2 + sideLen / 2)); p.userData.kind = 'wall'; rg.add(p); }
    const lin = wbox(WALL_T, WALL_H - DOOR_H, DOOR_W, mats); lin.position.set(0, DOOR_H + (WALL_H - DOOR_H) / 2, 0); lin.userData.kind = 'wall'; rg.add(lin);
    for (const f of [-1, 1]) {
      const x = f * (WALL_T / 2 + .015);
      const top = box(.03, .14, DOOR_W + .28, trim); top.position.set(x, DOOR_H + .07, 0); rg.add(top);
      for (const sd of [-1, 1]) { const j = box(.03, DOOR_H, .14, trim); j.position.set(x, DOOR_H / 2, sd * (DOOR_W / 2 + .07)); rg.add(j); }
      for (const sd of [-1, 1]) { const sh = plane(sideLen - .2, .6, shadowMat); sh.rotation.x = -Math.PI / 2; sh.rotation.z = f > 0 ? -Math.PI / 2 : Math.PI / 2; sh.position.set(f * (WALL_T / 2 + .3), .003, sd * (DOOR_W / 2 + sideLen / 2)); rfg.add(sh); }
      const lb = f < 0 ? sideLabel(r.data.name, roomTag(r) + '  →', inkFor(r.prev.data.wall)) : sideLabel(r.prev.data.name, '←  BACK', inkFor(r.data.wall));
      lb.position.set(f * (WALL_T / 2 + .012), DOOR_H + .8, 0); lb.rotation.y = f * Math.PI / 2; lb.userData.kind = 'wall'; rg.add(lb);
    }
  } else {
    const w = wbox(WALL_T, WALL_H, D, mats); w.position.set(0, WALL_H / 2, 0); w.userData.kind = 'wall'; rg.add(w);
    const sh = plane(D - WALL_T, .7, shadowMat); sh.rotation.x = -Math.PI / 2; sh.rotation.z = -Math.PI / 2; sh.position.set(WALL_T / 2 + .35, .003, 0); rfg.add(sh);
  }
  if (r.ownsEast) {                                      // last room of its row: close the far end
    const w = wbox(WALL_T, WALL_H, D, [rw, rw, rw, rw, rw, rw]); w.position.set(r.x1, WALL_H / 2, 0); w.userData.kind = 'wall'; rg.add(w);
    const sh = plane(D - WALL_T, .7, shadowMat); sh.rotation.x = -Math.PI / 2; sh.rotation.z = Math.PI / 2; sh.position.set(r.ix1 - .35, .003, 0); rfg.add(sh);
  }
  const wallInk = inkFor(r.data.wall);
  const bigText = (lines, x, rotY, y, size) => {
    const t = textPlane((g, cw) => {
      g.fillStyle = wallInk; g.textAlign = 'center';
      g.font = `600 ${size}px "Cormorant Garamond", Georgia, serif`; wrapText(g, lines[0], cw / 2, 210, cw - 120, size, 2);
      g.globalAlpha = .9; g.fillStyle = '#b8955a'; g.fillRect(cw / 2 - 70, 330, 140, 3);
      g.fillStyle = wallInk; g.globalAlpha = .75; g.font = '300 42px Inter, sans-serif'; spacing(g, '10px');
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
      tg.font = '600 128px "Cormorant Garamond", Georgia, serif'; tg.fillText(r.data.linkLabel || 'Continue to the gallery', 1024, 270, 1900);
      tg.font = '400 46px Inter, sans-serif'; spacing(tg, '8px'); tg.globalAlpha = .8; tg.fillText(String(r.data.link).replace(/^https?:\/\//, '').replace(/\/$/, '').toUpperCase() + '   →', 1024, 420, 1900);
      const tp = plane(3.9, 1.15, goldMat(tc, '#dcb86a', .35)); tp.position.z = .052; sg.add(tp);
      sg.traverse(o => { o.userData.kind = 'link'; }); rg.add(sg);
    }
  } else {                                               // exhibition lettering beside the doorways, facing you as you walk along the row
    const a = exhibitionPanel(r); a.position.set(r.ix1 - .012, 2.3, -SIDE_Z); a.rotation.y = -Math.PI / 2; rg.add(a);
    const b = exhibitionPanel(r); b.position.set(r.ix0 + .012, 2.3, SIDE_Z); b.rotation.y = Math.PI / 2; rg.add(b);
    if (r.vid && !r.data.theatre) {                      // screening room: the title in gold above the screen
      const c = mk(2048, 200), g = c.getContext('2d'); g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = '600 104px "Cormorant Garamond", Georgia, serif'; spacing(g, '4px'); g.fillText(r.data.name, 1024, 92, 1960);
      const t = plane(6.4, .625, goldMat(c)); t.position.set(r.cx, 5.75, r.outer * (FACE - .012)); t.rotation.y = r.outer < 0 ? 0 : Math.PI; rg.add(t);
    }
  }
}
