/* Lighting that follows the visitor: skylights over the nearest rooms, spotlights
   on the nearest works, and the room's mood (see MOODS in config/look.js). */
import { S, me } from '../state.js';
import { clamp } from '../util.js';
import { scene, hemi, skyLights, spots } from './renderer.js';
import { toW } from './layout.js';
import { MOODS, RENDER } from '../../config/look.js';
import { D, WALL_H } from './constants.js';

export function moodOf(ri) { return MOODS[S.layout?.rooms[ri]?.data.mood] || MOODS.standard; }

export function placeSkyLights() {
  if (!S.layout) return;
  const near = S.layout.rooms.filter(Boolean).map(r => { const c = toW(r, r.cx, 0); return { r, c, d: Math.hypot(c.x - me.x, c.z - me.z) }; }).sort((a, b) => a.d - b.d);
  for (let k = 0; k < skyLights.length; k++) {
    const l = skyLights[k], e = near[k];
    if (!e) { l.intensity = 0; continue; }
    const { r, c } = e, md = MOODS[r.data.mood] || MOODS.standard, I = RENDER.skylightIntensity;
    if (r.rot) { l.intensity = I * md.sky * 13; l.width = l.height = 3.2; l.rotation.set(-Math.PI / 2, 0, 0); l.position.set(c.x, (r.rimY || 13.4) - .1, c.z); continue; }
    const swap = Math.abs(r.sin) > .5;
    l.intensity = I * md.sky; l.width = swap ? D - 5.6 : r.inner - 3.6; l.height = swap ? r.inner - 3.6 : D - 5.6; l.rotation.set(-Math.PI / 2, 0, 0); l.position.set(c.x, WALL_H - .03, c.z);
  }
}

function aimSpot(sp, ai) {
  const it = S.layout.arts[ai];
  const nx = it.nx ?? 0, nz = it.nz ?? -it.side;
  if (it.kind === 'sculpture') { sp.position.set(it.x + nx * 1.2, it.rot ? 7.6 : WALL_H - .42, it.z + nz * 1.2); sp.target.position.set(it.x, .3, it.z); }
  else { sp.position.set(it.x + nx * 1.5, (it.fixY ?? WALL_H) - .5, it.z + nz * 1.5); sp.target.position.set(it.x, it.y - .05, it.z); }
  sp.target.updateMatrixWorld();
  const dist = sp.position.distanceTo(sp.target.position);
  sp.angle = it.kind === 'sculpture' ? clamp(Math.atan((it.base / 2 + 1) / dist), .2, .6) : clamp(Math.atan((Math.max(it.ow, it.oh) * .62 + .4) / dist), .28, .8);
  sp.userData.scale = dist * dist / 11;                  // same brightness on the art whatever the throw
  if (it.upper) sp.userData.scale *= .5;                 // the upper gallery already has daylight
  sp.userData.art = ai;
}
export function resetSpots() { spots.forEach(sp => { sp.userData.art = -1; sp.userData.k = 0; sp.intensity = 0; }); }

export function updateSpots(dt) {
  const arts = S.layout.arts, n = spots.length;
  if (!arts.length) { spots.forEach(sp => sp.intensity = 0); return; }
  const d = arts.map(a => a.kind === 'video' ? 1e9 : Math.hypot(a.x - me.x, a.z - me.z)), order = arts.map((_, i) => i).sort((a, b) => d[a] - d[b]);
  const wanted = new Set(order.slice(0, n)), cut = order.length > n ? d[order[n]] : Infinity;
  const have = new Set(spots.map(sp => sp.userData.art));
  const free = spots.filter(sp => !wanted.has(sp.userData.art) && sp.userData.k < .04);
  for (const ai of wanted) if (!have.has(ai)) { const sp = free.shift(); if (!sp) break; aimSpot(sp, ai); sp.userData.k = 0; }
  const kk = 1 - Math.exp(-dt * 5);
  for (const sp of spots) {
    const ai = sp.userData.art, tgt = ai >= 0 && ai < arts.length && wanted.has(ai) ? clamp((cut - d[ai]) / 3, 0, 1) : 0;
    sp.userData.k += (tgt - sp.userData.k) * kk; sp.intensity = RENDER.spotIntensity * sp.userData.scale * sp.userData.k * (ai >= 0 && arts[ai] ? moodOf(arts[ai].ri).spot : 1);
  }
}

// Ease the general light toward the current room's mood.
export function updateMood(dt) {
  const md = moodOf(S.curRoom), km = 1 - Math.exp(-dt * 2.2);
  hemi.intensity += (md.hemi - hemi.intensity) * km; scene.environmentIntensity += (md.env - scene.environmentIntensity) * km;
}
