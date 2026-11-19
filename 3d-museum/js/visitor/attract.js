/* While the entry card is up: the blurred museum behind it slowly drifts from room
   to room, like a visitor strolling up to different works. Entering stops it, and
   the visitor starts in the welcome room as usual. */
import { S, me } from '../state.js';
import { $, lerpAngle } from '../util.js';
import { walkable } from './movement.js';

export const attract = { on: false };
const SHOT = 7, FADE = .7;            // seconds per view, seconds of fade between views
let shots = [], k = -1, t = 0, cur = null;

const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
// One or two works from every room (not the welcome room), in a random order.
function pickWorks() {
  const L = S.layout, byRoom = new Map();
  for (const it of L.arts) {
    if (!it.view || it.kind === 'kiosk' || L.rooms[it.ri]?.data.kind === 'intro') continue;
    if (!byRoom.has(it.ri)) byRoom.set(it.ri, []); byRoom.get(it.ri).push(it);
  }
  return shuffle([...byRoom.values()].flatMap(list => shuffle(list).slice(0, 2)));
}
// A short glide toward a work, starting a few steps back and to one side.
function shotFor(it) {
  const v = it.view, fx = -Math.sin(v.yaw), fz = -Math.cos(v.yaw), rx = Math.cos(v.yaw), rz = -Math.sin(v.yaw), side = Math.random() < .5 ? -1 : 1;
  let a = { x: v.x, z: v.z };
  for (const [back, lat] of [[3.4, 1.8], [2.6, 1.2], [1.8, .6], [1, 0]]) {
    const p = { x: v.x - fx * back + rx * lat * side, z: v.z - fz * back + rz * lat * side };
    if (walkable(p.x, p.z)) { a = p; break; }
  }
  let b = { x: v.x + fx * .5 - rx * .3 * side, z: v.z + fz * .5 - rz * .3 * side }; if (!walkable(b.x, b.z)) b = { x: v.x, z: v.z };
  return { a, b, y0: v.yaw + .32 * side, y1: v.yaw - .12 * side, p: (v.pitch || 0) * .7 };
}

export function startAttract() { shots = pickWorks(); k = -1; cur = null; attract.on = shots.length > 0; }
export function stopAttract() { attract.on = false; $('stage').style.opacity = ''; }

// Every frame while the entry card is up.
export function updateAttract(dt) {
  if (!attract.on) return;
  t += dt;
  if (!cur || t > SHOT) { k = (k + 1) % shots.length; if (k === 0 && cur) shuffle(shots); cur = shotFor(shots[k]); t = 0; }
  const u = t / SHOT, e = u * u * (3 - 2 * u);
  me.x = cur.a.x + (cur.b.x - cur.a.x) * e; me.z = cur.a.z + (cur.b.z - cur.a.z) * e;
  me.yaw = lerpAngle(cur.y0, cur.y1, e); me.pitch = cur.p; me.vx = me.vz = 0; S.walk = null; S.look = null;
  $('stage').style.opacity = Math.max(0, Math.min(1, t / FADE, (SHOT - t) / FADE)).toFixed(3);   // soft cut between views
}
