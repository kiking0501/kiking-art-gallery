/* The visitor walking around: where the floor is walkable, finding a path
   (grid A* around walls and stands), automatic walks to an artwork, and the
   per-frame movement from keys or an automatic walk. */
import * as THREE from 'three';
import { S, me, tour } from '../state.js';
import { clamp, lerpAngle } from '../util.js';
import { camera } from '../world/renderer.js';
import { toL, toW, sculptView } from '../world/layout.js';
import { showInfo, hideInfo } from '../ui/info-card.js';
import { stopTour, TOUR_PAUSE } from './tour.js';
import { keys } from './input.js';
import { EYE, HALF_D, WALL_T, DOOR_W, FACE, R, ROT_R } from '../world/constants.js';

/* ---------------- where you can walk ---------------- */
function inRoomLocal(r, lx, lz) {
  if ((r.rot || r.doorWest) && Math.abs(lx) < WALL_T / 2 + R + .1 && (r.westDoors?.length ? r.westDoors : [0]).some(dz => Math.abs(lz - dz) < DOOR_W / 2 - R)) return true;   // doorway(s) to the previous room
  if (r.rot && r.inRow && Math.abs(lx - r.doors.lineX) < DOOR_W / 2 - R && Math.abs(lz) > r.doors.zE - .9 && Math.abs(lz) < r.slotLen / 2 + WALL_T / 2 + R + .1) return true;   // round room's doorways along the row
  if (r.sideDoor && Math.abs(lz - r.sideDoor * HALF_D) < WALL_T / 2 + R + .1 && Math.abs(lx - r.cx) < DOOR_W / 2 - R) return true;   // doorway to the partner room
  if (lx < r.ix0 + R || lx > r.ix1 - R) return false;
  if (r.rot) return Math.hypot(lx - r.cx, lz) <= ROT_R - R - .05;
  if (r.open && lz * (r.row === 'A' ? 1 : -1) > 0) return Math.abs(lz) <= HALF_D + .05;   // open to the partner room: walk straight across
  return Math.abs(lz) <= (r.face ?? FACE) - R;
}
export function walkable(x, z) {
  let ok = false;
  for (const r of S.layout.rooms) { if (!r) continue; const l = toL(r, x, z); if (inRoomLocal(r, l.x, l.z)) { ok = true; break; } }
  if (!ok) return false;
  for (const b of S.layout.obstacles) if (Math.abs(x - b.x) < b.w / 2 + R && Math.abs(z - b.z) < b.d / 2 + R) return false;
  return true;
}
// The nearest walkable point.
export function clampWalkable(x, z) {
  if (walkable(x, z)) return { x, z };
  for (let rr = .1; rr < 5; rr += .1) for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2, px = x + rr * Math.cos(a), pz = z + rr * Math.sin(a); if (walkable(px, pz)) return { x: px, z: pz }; }
  return { x: me.x, z: me.z };
}
// Index of the room containing a point, or -1.
export function roomAt(x, z) {
  for (const r of S.layout.rooms) { if (!r) continue; const l = toL(r, x, z); if (l.x > r.ix0 - .05 && l.x < r.ix1 && (r.rot ? Math.hypot(l.x - r.cx, l.z) < ROT_R + .2 : Math.abs(l.z) < (r.halfD ?? HALF_D))) return r.ri; }
  return -1;
}

/* ---------------- finding a path: grid A*, then straightened ---------------- */
let nav = null; const NAV = .25;   // grid cell size (m)
export function buildNav() {
  const { x0, x1, z0, z1 } = S.layout.bbox, nx = Math.ceil((x1 - x0) / NAV) + 1, nz = Math.ceil((z1 - z0) / NAV) + 1, g = new Uint8Array(nx * nz);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) g[j * nx + i] = walkable(x0 + i * NAV, z0 + j * NAV) ? 1 : 0;
  nav = { nx, nz, g, x0, z0 };
}
export function navCell(x, z) {
  const { nx, nz, g } = nav, ci = clamp(Math.round((x - nav.x0) / NAV), 0, nx - 1), cj = clamp(Math.round((z - nav.z0) / NAV), 0, nz - 1);
  if (g[cj * nx + ci]) return cj * nx + ci;
  for (let r = 1; r < 14; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
    if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
    const i = ci + di, j = cj + dj; if (i >= 0 && j >= 0 && i < nx && j < nz && g[j * nx + i]) return j * nx + i;
  }
  return -1;
}
export function astar(s, t) {
  const { nx, nz, g } = nav, N = nx * nz, gs = new Float32Array(N).fill(Infinity), came = new Int32Array(N).fill(-1), closed = new Uint8Array(N), heap = [];
  const push = (f, n) => { heap.push([f, n]); let i = heap.length - 1; while (i > 0) { const q = (i - 1) >> 1; if (heap[q][0] <= heap[i][0]) break; [heap[q], heap[i]] = [heap[i], heap[q]]; i = q; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  const tx = t % nx, tz = (t / nx) | 0, hh = n => { const dx = Math.abs(n % nx - tx), dz = Math.abs(((n / nx) | 0) - tz); return Math.max(dx, dz) + .4142 * Math.min(dx, dz); };
  const DIRS = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.4142], [1, -1, 1.4142], [-1, 1, 1.4142], [-1, -1, 1.4142]];
  gs[s] = 0; push(hh(s), s);
  while (heap.length) {
    const n = pop()[1]; if (n === t) break; if (closed[n]) continue; closed[n] = 1;
    const x = n % nx, z = (n / nx) | 0;
    for (const [dx, dz, c] of DIRS) {
      const X = x + dx, Z = z + dz; if (X < 0 || Z < 0 || X >= nx || Z >= nz) continue;
      const m = Z * nx + X; if (!g[m] || closed[m]) continue;
      if (dx && dz && (!g[z * nx + X] || !g[Z * nx + x])) continue;
      const ng = gs[n] + c; if (ng < gs[m]) { gs[m] = ng; came[m] = n; push(ng + hh(m), m); }
    }
  }
  if (s !== t && came[t] < 0) return null;
  const path = []; for (let n = t; n !== -1 && n !== s; n = came[n]) path.push(n);
  return path.reverse().map(n => ({ x: nav.x0 + (n % nx) * NAV, z: nav.z0 + ((n / nx) | 0) * NAV }));
}
function lineClear(a, b) { const n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / .12); for (let k = 1; k <= n; k++) { const t = k / n; if (!walkable(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t)) return false; } return true; }
function planPath(to) {
  const from = { x: me.x, z: me.z };
  if (lineClear(from, to)) return [to];
  const s = navCell(from.x, from.z), t = navCell(to.x, to.z), cells = s >= 0 && t >= 0 ? astar(s, t) : null;
  if (!cells) return [to];
  cells.push(to);
  const out = []; let cur = from, k = 0;
  while (k < cells.length) { let m = k; while (m + 1 < cells.length && lineClear(cur, cells[m + 1])) m++; out.push(cells[m]); cur = cells[m]; k = m + 1; }
  return out;
}

/* ---------------- automatic walks ---------------- */
// Walk to a point; opts.yaw / opts.pitch = which way to face on arrival.
export function walkTo(x, z, opts = {}) {
  const p = clampWalkable(x, z), pts = planPath(p);
  let total = 0, c = me; for (const q of pts) { total += Math.hypot(q.x - c.x, q.z - c.z); c = q; }
  S.walk = { pts, v: 0, vmax: clamp(total / 3.5, 2.6, 14), yaw: opts.yaw, pitch: opts.pitch, autoYaw: true, onArrive: opts.onArrive };
  S.look = null;
}
// Walk up to artwork number i and show its card.
export function viewArt(i, fromTour = false) {
  const arts = S.layout.arts; if (!arts.length) return;
  i = ((i % arts.length) + arts.length) % arts.length;
  if (!fromTour) stopTour();
  const it = arts[i]; S.viewing = i; S.fovTarget = 60;
  if (camera.aspect < 1.2 && it.view) {                  // a tall, narrow screen (a phone held upright): widen the view so the whole work fits across
    const d = Math.hypot(it.view.x - it.x, it.view.z - it.z) || 3, half = Math.atan(((it.ow || it.w || 2) * .58) / d);
    S.fovTarget = clamp(THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(half) / camera.aspect)), 60, 100);
  }
  if (it.kind === 'sculpture' && !it.view) sculptView(it, me.z >= it.z ? 1 : -1);
  hideInfo();                                            // the details card opens only from the work's white label
  walkTo(it.view.x, it.view.z, { yaw: it.view.yaw, pitch: it.view.pitch, onArrive: () => { if (tour.on) tour.wait = TOUR_PAUSE; if (S.viewing === i) showInfo(it); } });
}
// Walk into a room through its doorway.
export function goToRoom(r) { const p = toW(r, r.ix0 + 2.4, 0); walkTo(p.x, p.z, { yaw: -Math.PI / 2 + r.theta, pitch: 0 }); }
// Standing at artwork i's viewing point, done walking?
export function arrivedAt(i) { const it = S.layout?.arts[i]; return !!it && S.viewing === i && !S.walk && !!it.view && Math.hypot(me.x - it.view.x, me.z - it.view.z) < .9; }
// Start in the welcome room, facing the doorway.
export function spawn() {
  const r0 = S.layout.intro || S.layout.rooms.find(Boolean);
  const p = toW(r0, r0.ix0 + 1.6, 0); me.x = p.x; me.z = p.z; me.yaw = -Math.PI / 2 + r0.theta;
  me.pitch = .02; S.curRoom = -2;
}

/* ---------------- every frame ---------------- */
export function updateMovement(dt) {
  if (!S.layout) return;
  // keys: W/S or ↑/↓ walk, A/D step sideways, ←/→ or Q/E turn, Shift = faster
  const f = (keys.w || keys.arrowup ? 1 : 0) - (keys.s || keys.arrowdown ? 1 : 0);
  const s = (keys.d ? 1 : 0) - (keys.a ? 1 : 0);
  const turn = (keys.arrowleft || keys.q ? 1 : 0) - (keys.arrowright || keys.e ? 1 : 0);
  if (turn) { me.yaw += turn * 1.9 * dt; S.look = null; if (S.walk) S.walk.autoYaw = false; stopTour(); }
  let tvx = 0, tvz = 0;
  if (f || s) {
    S.walk = null; S.look = null; stopTour();
    const sp = keys.shift ? 5.2 : 2.6, fx = -Math.sin(me.yaw), fz = -Math.cos(me.yaw), rx = Math.cos(me.yaw), rz = -Math.sin(me.yaw);
    const vx = fx * f + rx * s, vz = fz * f + rz * s, n = Math.hypot(vx, vz) || 1; tvx = vx / n * sp; tvz = vz / n * sp;
  }
  const k = 1 - Math.exp(-dt * 10); me.vx += (tvx - me.vx) * k; me.vz += (tvz - me.vz) * k;
  if (Math.abs(me.vx) + Math.abs(me.vz) > 1e-3 && !S.walk) {
    const nx = me.x + me.vx * dt, nz = me.z + me.vz * dt;
    if (walkable(nx, nz)) { me.x = nx; me.z = nz; } else if (walkable(nx, me.z)) me.x = nx; else if (walkable(me.x, nz)) me.z = nz;
    me.bob += Math.hypot(me.vx, me.vz) * dt * 2.2;
  }
  // automatic walk along the planned path
  const walk = S.walk;
  if (walk) {
    const p = walk.pts[0], dx = p.x - me.x, dz = p.z - me.z, d = Math.hypot(dx, dz);
    let rem = d, c = p; for (let i = 1; i < walk.pts.length; i++) { rem += Math.hypot(walk.pts[i].x - c.x, walk.pts[i].z - c.z); c = walk.pts[i]; }
    walk.v = Math.min(walk.v + 6 * dt, walk.vmax, Math.sqrt(2 * 3.5 * rem) + .15);
    const step = walk.v * dt;
    if (d <= step || d < 1e-3) { me.x = p.x; me.z = p.z; walk.pts.shift(); }
    else { me.x += dx / d * step; me.z += dz / d * step; }
    me.bob += step * 2.2;
    if (walk.autoYaw) {
      let ty = null, tp = 0;
      if (walk.pts.length <= 1 && walk.yaw !== undefined && rem < 2.5) { ty = walk.yaw; tp = walk.pitch || 0; }
      else if (d > .25) ty = Math.atan2(-dx, -dz);
      if (ty !== null) { const kk = 1 - Math.exp(-dt * 4); me.yaw = lerpAngle(me.yaw, ty, kk); me.pitch += (tp - me.pitch) * kk; }
    }
    if (!walk.pts.length) {
      S.walk = null;
      if (walk.yaw !== undefined && walk.autoYaw) S.look = { yaw: walk.yaw, pitch: walk.pitch || 0 };
      walk.onArrive && walk.onArrive();
    }
  }
  if (S.look) {
    const kk = 1 - Math.exp(-dt * 5); me.yaw = lerpAngle(me.yaw, S.look.yaw, kk); me.pitch += (S.look.pitch - me.pitch) * kk;
    if (Math.abs(lerpAngle(me.yaw, S.look.yaw, 1) - me.yaw) < 1e-3 && Math.abs(S.look.pitch - me.pitch) < 1e-3) S.look = null;
  }
  if (tour.on && !S.walk && tour.wait > 0) { tour.wait -= dt; if (tour.wait <= 0) viewArt(S.viewing + 1, true); }
  if (S.viewing >= 0 && !S.walk) { const v = S.layout.arts[S.viewing]?.view; if (!v || Math.hypot(v.x - me.x, v.z - me.z) > 2.2) hideInfo(); }
  // camera follows the visitor
  S.fov += (S.fovTarget - S.fov) * (1 - Math.exp(-dt * 8));
  if (Math.abs(camera.fov - S.fov) > 1e-3) { camera.fov = S.fov; camera.updateProjectionMatrix(); }
  camera.position.set(me.x, EYE + Math.sin(me.bob) * .012, me.z);
  camera.rotation.set(me.pitch, me.yaw, 0);
}
