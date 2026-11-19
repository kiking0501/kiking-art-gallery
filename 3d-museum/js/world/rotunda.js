/* The round room (layout: 'rotunda'): curved wall with doorways, two storeys of
   slender columns, a balcony, a coffered dome with an open oculus, tall windows. */
import * as THREE from 'three';
import { mk, inkFor, spacing } from '../util.js';
import { canvasTex } from './renderer.js';
import { SURF } from './textures.js';
import { stdMat, wallMat, floorMat, skySunMat, sunPatchMat, box, plane, wbox } from './materials.js';
import { toW } from './layout.js';
import { sideLabel, exhibitionPanel } from './rooms.js';
import { exNo, two, roomTag } from '../data/room-info.js';
import { D, WALL_H, WALL_T, DOOR_W, DOOR_H, ROT_R, ROT_RC, ROT_H, ROT_Y1, ROT_Y2, ROT_Y3, FLOOR_TILE, PLASTER_TILE } from './constants.js';

function makeCofferTexture() {   // coffered dome, shaded as if lit from the oculus
  const W = 2048, H = 1024, c = mk(W, H), g = c.getContext('2d'), cols = 28, rows = 5, top = .1, bot = .86;
  g.fillStyle = '#efebe4'; g.fillRect(0, 0, W, H);
  for (let j = 0; j < rows; j++) {
    const y0 = H * (top + (bot - top) * j / rows), y1 = H * (top + (bot - top) * (j + 1) / rows), ch = y1 - y0, cw = W / cols;
    for (let i = 0; i < cols; i++) {
      const x0 = i * cw, rib = Math.min(cw, ch) * .14;
      for (let step = 0; step < 3; step++) {             // stepped recess
        const inset = rib + step * Math.min(cw, ch) * .085, x = x0 + inset, y = y0 + inset, w = cw - inset * 2, h = ch - inset * 2;
        const grd = g.createLinearGradient(0, y, 0, y + h); const d = .045 + step * .03;
        grd.addColorStop(0, `rgba(60,52,44,${.2 + d})`); grd.addColorStop(.25, `rgba(60,52,44,${d})`); grd.addColorStop(1, 'rgba(255,252,245,.05)');
        g.fillStyle = grd; g.fillRect(x, y, w, h);
      }
      g.fillStyle = 'rgba(255,255,250,.25)'; g.fillRect(x0 + rib, y1 - rib - 3, cw - rib * 2, 3);
    }
  }
  const t = canvasTex(c, true); t.wrapS = THREE.RepeatWrapping; return t;
}
let COFFER = null;
const rotMats = new Map();
function rotMat(key, make) { if (!rotMats.has(key)) { const m = make(); m.userData.keep = true; rotMats.set(key, m); } return rotMats.get(key); }
const skirtM = () => rotMat('sk', () => new THREE.MeshStandardMaterial({ color: '#bdb7ad', roughness: .5, side: THREE.BackSide }));

export function buildRotunda(r, wallGroup, floorGroup, extraPick) {
  const cx = r.cx, gap = Math.asin((DOOR_W / 2) / ROT_R);
  const wallM = rotMat('w' + r.data.wall, () => { const m = wallMat(r.data.wall).clone(); m.side = THREE.BackSide; return m; });
  const plasterB = rotMat('pb', () => { const m = wallMat('#efebe4', .95).clone(); m.side = THREE.BackSide; return m; });
  const plasterD = rotMat('pd', () => { const m = wallMat('#efebe4', .95).clone(); m.side = THREE.DoubleSide; return m; });
  // columns in the same pale stone as the walls, so the exhibits stay the focus
  const stone = rotMat('st', () => new THREE.MeshStandardMaterial({ color: '#e6e1d8', roughness: .55, map: SURF.plasterA, normalMap: SURF.plasterN, normalScale: new THREE.Vector2(.4, .4), envMapIntensity: .6 }));
  const stoneD = rotMat('sd', () => new THREE.MeshStandardMaterial({ color: '#d9d3c8', roughness: .6, map: SURF.plasterA, envMapIntensity: .6 }));
  const bronze = rotMat('br', () => new THREE.MeshStandardMaterial({ color: '#2b2621', roughness: .45, metalness: .5 }));
  const cyl = (rad, h, y, t0, tl, mat, segs) => {
    const geo = new THREE.CylinderGeometry(rad, rad, h, segs || Math.max(8, Math.round(120 * tl / (Math.PI * 2))), 1, true, t0, tl), uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * rad * tl / PLASTER_TILE, uv.getY(i) * h / PLASTER_TILE);
    const m = new THREE.Mesh(geo, mat); m.position.set(cx, y + h / 2, 0); return m;
  };
  const ring = (r0, r1, y, up, mat) => { const m = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 120), mat); m.rotation.x = up ? -Math.PI / 2 : Math.PI / 2; m.position.set(cx, y, 0); return m; };

  // floor: stone disc with quiet inlays
  const disc = new THREE.Mesh(new THREE.CircleGeometry(ROT_R + .3, 120), floorMat), duv = disc.geometry.attributes.uv;
  for (let i = 0; i < duv.count; i++) duv.setXY(i, duv.getX(i) * 2 * (ROT_R + .3) / FLOOR_TILE, duv.getY(i) * 2 * (ROT_R + .3) / FLOOR_TILE);
  disc.rotation.x = -Math.PI / 2; disc.position.set(cx, .0015, 0); disc.userData.kind = 'floor'; floorGroup.add(disc); extraPick.push(disc);
  const inlay = stdMat('#55595a', .22);
  for (const [a, b] of [[ROT_R * .66 - .07, ROT_R * .66 + .06], [ROT_RC - .55, ROT_RC - .45]]) floorGroup.add(ring(a, b, .003, true, inlay));

  // curved wall, broken by the doorways
  const thetas = r.doors.list.map(dg => ((Math.PI / 2 - THREE.MathUtils.degToRad(dg)) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2)).sort((a, b) => a - b);
  thetas.forEach((t, k) => {
    const nxt = k + 1 < thetas.length ? thetas[k + 1] : thetas[0] + Math.PI * 2;
    const w = cyl(ROT_R + .15, ROT_H, 0, t + gap, nxt - t - 2 * gap, wallM); w.userData.kind = 'wall'; w.userData.rotC = toW(r, cx, 0); wallGroup.add(w);
    const l = cyl(ROT_R + .15, ROT_H - DOOR_H, DOOR_H, t - gap, 2 * gap, wallM); l.userData.kind = 'wall'; l.userData.rotC = toW(r, cx, 0); wallGroup.add(l);
    wallGroup.add(cyl(ROT_R + .13, .16, 0, t + gap, nxt - t - 2 * gap, skirtM()));
  });
  if (r.inRow) {   // straight walls: the shared side wall (doorway to the partner) and the wall toward the previous room
    const hl = r.slotLen / 2, rw = wallMat(r.data.wall), pw = r.pair ? wallMat(r.pair.data.wall) : rw, prevW = r.prev ? wallMat(r.prev.data.wall) : rw, sl = hl - DOOR_W / 2;
    const sm = [rw, pw, rw, rw, rw, rw];
    for (const sd of [-1, 1]) { const p = wbox(WALL_T, WALL_H, sl, sm); p.position.set(0, WALL_H / 2, sd * (DOOR_W / 2 + sl / 2)); p.userData.kind = 'wall'; wallGroup.add(p); }
    const lin = wbox(WALL_T, WALL_H - DOOR_H, DOOR_W, sm); lin.position.set(0, DOOR_H + (WALL_H - DOOR_H) / 2, 0); lin.userData.kind = 'wall'; wallGroup.add(lin);
    const lx = r.doors.lineX, wl = [rw, rw, rw, rw, rw, prevW];
    const seg = (a, b) => { const p = wbox(b - a, WALL_H, WALL_T, wl); p.position.set((a + b) / 2, WALL_H / 2, -hl); p.userData.kind = 'wall'; wallGroup.add(p); };
    seg(0, lx - DOOR_W / 2); seg(lx + DOOR_W / 2, D); { const p = wbox(DOOR_W, WALL_H - DOOR_H, WALL_T, wl); p.position.set(lx, DOOR_H + (WALL_H - DOOR_H) / 2, -hl); p.userData.kind = 'wall'; wallGroup.add(p); }
    const trimM = stdMat('#2b2622', .4), zf = -hl - WALL_T / 2 - .015;
    const top = box(DOOR_W + .28, .14, .03, trimM); top.position.set(lx, DOOR_H + .07, zf); wallGroup.add(top);
    for (const s2 of [-1, 1]) { const j = box(.14, DOOR_H, .03, trimM); j.position.set(lx + s2 * (DOOR_W / 2 + .07), DOOR_H / 2, zf); wallGroup.add(j); }
    if (r.prev) { const lb = sideLabel(r.data.name, roomTag(r) + '  →', inkFor(r.prev.data.wall)); lb.position.set(lx, DOOR_H + .8, -hl - WALL_T / 2 - .012); lb.rotation.y = Math.PI; lb.userData.kind = 'wall'; wallGroup.add(lb); }
    for (const sd of [-1, 1]) {   // short passages between the straight walls and the curved wall
      const zIn = sd * (r.doors.zE - .1), zOut = sd * (hl - .02), len2 = Math.abs(zOut - zIn), zc = (zIn + zOut) / 2;
      for (const s2 of [-1, 1]) { const pw2 = box(.2, WALL_H, len2, wallMat(r.data.wall)); pw2.position.set(lx + s2 * (DOOR_W / 2 + .1), WALL_H / 2, zc); wallGroup.add(pw2); }
      const cap = box(DOOR_W + .4, WALL_H - DOOR_H, len2, wallMat(r.data.wall)); cap.position.set(lx, DOOR_H + (WALL_H - DOOR_H) / 2, zc); wallGroup.add(cap);
    }
  }

  // slender columns close to the wall, in two storeys
  const shaft = new THREE.CylinderGeometry(.17, .2, ROT_Y1 - .5, 24), base = new THREE.CylinderGeometry(.27, .29, .2, 24), cap = new THREE.CylinderGeometry(.27, .17, .22, 24), ab = new THREE.BoxGeometry(.56, .08, .56);
  const shaftU = new THREE.CylinderGeometry(.13, .155, ROT_Y3 - ROT_Y2 - .42, 20), baseU = new THREE.CylinderGeometry(.21, .22, .14, 20), capU = new THREE.CylinderGeometry(.21, .13, .18, 20), abU = new THREE.BoxGeometry(.44, .06, .44);
  for (const deg of r.columns) {
    const phi = THREE.MathUtils.degToRad(deg), px = cx + ROT_RC * Math.cos(phi), pz = ROT_RC * Math.sin(phi);
    const add = (geo, mat, y, sq) => { const m = new THREE.Mesh(geo, mat); m.position.set(px, y, pz); if (sq) m.rotation.y = -phi; m.userData.kind = 'wall'; wallGroup.add(m); };
    add(base, stoneD, .1); add(shaft, stone, .2 + (ROT_Y1 - .5) / 2); add(cap, stoneD, ROT_Y1 - .3 + .11); add(ab, stoneD, ROT_Y1 - .04, true);
    add(baseU, stoneD, ROT_Y2 + .07); add(shaftU, stone, ROT_Y2 + .14 + (ROT_Y3 - ROT_Y2 - .42) / 2); add(capU, stoneD, ROT_Y3 - .28 + .09); add(abU, stoneD, ROT_Y3 - .03, true);
  }
  // entablature lettered with the exhibition's name, the balcony and a fine railing
  const eR = ROT_RC - .3;
  wallGroup.add(cyl(eR, ROT_Y2 - ROT_Y1, ROT_Y1, 0, Math.PI * 2, plasterB, 120));
  wallGroup.add(ring(eR, ROT_R + .15, ROT_Y1, false, plasterD));
  wallGroup.add(ring(eR, ROT_R + .15, ROT_Y2, true, stdMat('#d8d3ca', .5)));
  { const c = mk(4096, 128), g = c.getContext('2d'); g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '600 92px "Cormorant Garamond", Georgia, serif'; spacing(g, '26px');
    g.fillText(`${r.data.name.toUpperCase()}   ·   EXHIBITION ${two(exNo(r.ri))}`, 2048, 70, 4000);
    const tx = canvasTex(c); tx.wrapS = THREE.RepeatWrapping; tx.repeat.x = -2;
    const gm = new THREE.MeshStandardMaterial({ map: tx, color: '#b8954f', emissive: '#b8954f', emissiveIntensity: .15, metalness: .55, roughness: .32, transparent: true, depthWrite: false, side: THREE.BackSide });
    wallGroup.add(cyl(eR - .01, .46, ROT_Y1 + .13, 0, Math.PI * 2, gm, 120)); }
  const rail = new THREE.Mesh(new THREE.TorusGeometry(eR + .04, .022, 8, 180), bronze); rail.rotation.x = Math.PI / 2; rail.position.set(cx, ROT_Y2 + .95, 0); wallGroup.add(rail);
  const bal = new THREE.InstancedMesh(new THREE.BoxGeometry(.016, .95, .016), bronze, 160), M = new THREE.Matrix4();
  for (let i = 0; i < 160; i++) { const phi = i / 160 * Math.PI * 2; M.makeTranslation(cx + (eR + .04) * Math.cos(phi), ROT_Y2 + .475, (eR + .04) * Math.sin(phi)); bal.setMatrixAt(i, M); }
  wallGroup.add(bal);
  // upper ring, coffered dome, open oculus with a faint beam of sunlight
  wallGroup.add(cyl(eR, ROT_H - ROT_Y3, ROT_Y3, 0, Math.PI * 2, plasterB, 120));
  wallGroup.add(ring(eR, ROT_R + .15, ROT_H, false, plasterD));
  if (!COFFER) COFFER = makeCofferTexture();
  const domeM = rotMat('dome', () => new THREE.MeshStandardMaterial({ map: COFFER, normalMap: SURF.plasterN, normalScale: new THREE.Vector2(.4, .4), roughness: .95, side: THREE.BackSide, envMapIntensity: .5 }));
  const RD = eR, OC = 2.0, th0 = Math.asin(OC / RD);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(RD, 112, 32, 0, Math.PI * 2, th0, Math.PI / 2 - th0), domeM); dome.scale.y = .72; dome.position.set(cx, ROT_H, 0); wallGroup.add(dome);
  const rimY = ROT_H + .72 * RD * Math.cos(th0); r.rimY = rimY;
  wallGroup.add(cyl(OC, .8, rimY, 0, Math.PI * 2, plasterB, 48));
  const sky = new THREE.Mesh(new THREE.CircleGeometry(OC, 48), skySunMat); sky.rotation.x = Math.PI / 2; sky.position.set(cx, rimY + .79, 0); wallGroup.add(sky);
  { const c = mk(4, 256), g = c.getContext('2d'), grd = g.createLinearGradient(0, 0, 0, 256); grd.addColorStop(0, 'rgba(255,244,222,.9)'); grd.addColorStop(.7, 'rgba(255,240,215,.35)'); grd.addColorStop(1, 'rgba(255,240,215,0)'); g.fillStyle = grd; g.fillRect(0, 0, 4, 256);
    const bm = new THREE.MeshBasicMaterial({ map: canvasTex(c), transparent: true, opacity: .07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(OC * .95, 2.3, rimY, 48, 1, true), bm); beam.position.set(cx + 1.1, rimY / 2, .7); beam.rotation.z = -.09; beam.raycast = () => {} /* light only: clicks pass through it */; wallGroup.add(beam); }
  // tall windows on the upper storey, between the upper columns
  for (const deg of (r.upperWins || [-60, -90, -120, 60, 90, 120]).filter(dg => !r.doors.list.some(d => Math.abs(((dg - d + 540) % 360) - 180) < 14))) {
    const phi = THREE.MathUtils.degToRad(deg), ry = Math.atan2(-Math.cos(phi), -Math.sin(phi)), wy = (ROT_Y2 + ROT_Y3) / 2 + .1;
    const fr = box(1.36, 2.46, .05, bronze); fr.position.set(cx + (ROT_R + .13) * Math.cos(phi), wy, (ROT_R + .13) * Math.sin(phi)); fr.rotation.y = ry; wallGroup.add(fr);
    const win = plane(1.25, 2.35, skySunMat); win.position.set(cx + (ROT_R + .1) * Math.cos(phi), wy, (ROT_R + .1) * Math.sin(phi)); win.rotation.y = ry; wallGroup.add(win);
  }
  // sunlight on the floor
  for (const [dx, dz, w, h, ry] of [[2.3, 3.2, 2.2, 1.5, .5], [-3.1, -2.6, 2.4, 1.6, -.4], [1.1, .7, 3, 3, 0]]) {
    const sp = plane(w, h, sunPatchMat); sp.rotation.set(-Math.PI / 2, 0, ry); sp.position.set(cx + dx, .007, dz); floorGroup.add(sp);
  }
  // the exhibition's gold title on the curved wall
  for (const deg of r.panels || [-30, 30]) {
    const phi = THREE.MathUtils.degToRad(deg), pn = exhibitionPanel(r);
    pn.scale.setScalar(.62); pn.position.set(cx + (ROT_R - .12) * Math.cos(phi), 2.4, (ROT_R - .12) * Math.sin(phi)); pn.rotation.y = Math.atan2(-Math.cos(phi), -Math.sin(phi)); wallGroup.add(pn);
  }
}
