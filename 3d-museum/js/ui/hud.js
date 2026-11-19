/* The museum title and current room (top left), the big banner shown on
   entering a room, and what changes when you walk into another room. */
import { S, me } from '../state.js';
import { $ } from '../util.js';
import { screens } from '../world/artworks.js';
import { placeSkyLights } from '../world/lighting.js';
import { roomAt } from '../visitor/movement.js';
import { isExhibit, exNo, exTotal, two, roomStats, annexLabel } from '../data/room-info.js';

let bannerTimer = 0;
function showBanner(ri) {
  if (!$('intro').classList.contains('hidden')) return;
  const r = S.layout.rooms[ri].data, ex = isExhibit(r);
  $('bannerN').textContent = ex ? `Exhibition ${exNo(ri)} of ${exTotal()}` : r.kind === 'intro' ? 'Welcome' : r.kind === 'annex' ? annexLabel(r) : 'Farewell';
  $('bannerT').textContent = r.name; $('bannerM').textContent = ex ? roomStats(r) : '';
  $('banner').classList.remove('off'); clearTimeout(bannerTimer); bannerTimer = setTimeout(() => $('banner').classList.add('off'), 2800);
}

// Called every frame; acts only when the visitor has moved into a different room.
const WATCH_NEAR = 10;    // metres: how close to a wall screen (not a theatre) before "Watch the film" shows
let watchArt = null;
function updateWatch() {
  const it = watchArt, near = !!it && $('intro').classList.contains('hidden') && (!it.monitor || Math.hypot(it.x - me.x, it.z - me.z) < WATCH_NEAR);
  $('watch').classList.toggle('hidden', !near); if (near) $('watch').dataset.art = it.index;
}
export function checkRoomChange() {
  const ri = roomAt(me.x, me.z);
  updateWatch();
  if (ri === S.curRoom) return;
  const first = S.curRoom === -2; S.curRoom = ri;
  const rd = ri >= 0 ? S.layout.rooms[ri].data : null;
  if (rd) $('hudRoom').textContent = isExhibit(rd) ? `${two(exNo(ri))} · ${rd.name}` : rd.name;
  if (rd && !first) showBanner(ri);
  $('farewell').classList.toggle('hidden', !rd || rd.kind !== 'closing' || !rd.link || !$('intro').classList.contains('hidden'));           // link back to the gallery in the last room
  watchArt = ri >= 0 ? S.layout.arts.find(a => a.kind === 'video' && a.ri === ri) : null;       // "Watch the film" in rooms with a film
  updateWatch();
  for (const sc of screens) sc.active(sc.ri === ri);                                             // silent clips play only in their room
  placeSkyLights();
}

export function setTitle(title) { $('hudTitle').textContent = title; document.title = title; }
