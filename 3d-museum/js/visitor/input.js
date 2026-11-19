/* Mouse, touch and keyboard.
     drag            look around (two fingers: zoom)
     click floor     walk there          click a wall   walk up to it
     click artwork   walk up to it; click again once there to see it in full
     click a ring    stand at that viewing point
   While the mouse moves, a glow on the floor shows where a click would take you. */
import * as THREE from 'three';
import { S, me } from '../state.js';
import { $, clamp } from '../util.js';
import { canvas, camera } from '../world/renderer.js';
import { pickables } from '../world/scene.js';
import { highlightSpot, showGlow } from '../world/floor-marks.js';
import { walkTo, viewArt, goToRoom, arrivedAt, clampWalkable } from './movement.js';
import { stopTour, toggleTour } from './tour.js';
import { hideInfo } from '../ui/info-card.js';
import { openTheater } from '../ui/theater.js';
import { toggleMap } from '../ui/map-panel.js';
import { openLightbox, openKiosk, openFarewell, closeAll, lightboxKey } from '../ui/overlays.js';

export const keys = {};
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), pointers = new Map();
let drag = null, pinch = 0, mouse = null;

// The meaningful object hit: an artwork (userData.art) or something with a kind (floor, wall, spot…).
function hitTarget(hit) { let o = hit?.object; while (o && o.userData.art === undefined && !o.userData.kind) o = o.parent; return o; }
// Light effects (sunbeams, projector beams, glows) are seen through, so clicks go through them too.
function seeThrough(hit) {
  const o = hit.object, m = o.material;
  if (!o.visible) return true;
  if (hitTarget(hit)) return false;
  return !!m && !Array.isArray(m) && m.transparent && (m.opacity < .3 || m.blending === THREE.AdditiveBlending);
}
export function pickAt(cx, cy, list = pickables) {
  const r = canvas.getBoundingClientRect(); ndc.set((cx - r.left) / r.width * 2 - 1, -(cy - r.top) / r.height * 2 + 1);
  ray.setFromCamera(ndc, camera);
  return ray.intersectObjects(list, true).find(h => !seeThrough(h)) || null;
}
// Where to stand in front of a wall that was clicked.
function wallStandPoint(hit) {
  const p = hit.point, rc = hit.object.userData.rotC, n = rc ? new THREE.Vector3(rc.x - p.x, 0, rc.z - p.z).normalize() : hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
  return { x: p.x + n.x * 2.2, z: p.z + n.z * 2.2, yaw: Math.atan2(n.x, n.z) };
}

function handleClick(cx, cy) {
  if (!S.layout || !$('intro').classList.contains('hidden')) return;
  if (performance.now() - (S.enteredAt || 0) < 900) return;   // a double-click on "Enter the museum" lands here: ignore it
  const hit = pickAt(cx, cy); if (!hit) return;
  stopTour(); $('linkbox').classList.add('hidden');
  const o = hitTarget(hit), kind = o?.userData.kind;
  if (o && o.userData.art !== undefined) {
    const i = o.userData.art, it = S.layout.arts[i];
    if (arrivedAt(i)) { if (it.kind === 'video') openTheater(it); else if (it.kind === 'kiosk') openKiosk(it); else openLightbox(it); return; }
    viewArt(i); if (it.kind === 'video') openTheater(it); return;
  }
  if (kind === 'spot') { viewArt(o.userData.spot); return; }
  if (kind === 'mapboard' && hit.uv) {                   // the map on the welcome-room wall
    const u = hit.uv.x, v = hit.uv.y, hitR = (o.userData.rects || []).find(q => u >= q.u0 && u <= q.u1 && v >= q.v0 && v <= q.v1);
    if (hitR && S.layout.rooms[hitR.ri]) { hideInfo(); goToRoom(S.layout.rooms[hitR.ri]); return; }
  }
  if (kind === 'link') { openFarewell(true); return; }   // the sign in the last room
  hideInfo();
  if (kind === 'floor' || kind === 'bench') walkTo(hit.point.x, hit.point.z);
  else if (kind === 'wall' && hit.face) { const w = wallStandPoint(hit); walkTo(w.x, w.z, { yaw: w.yaw, pitch: 0 }); }
}

/* ---------------- hover: glow, tooltip, cursor ---------------- */
let hoverKey = '', hoverCache = null;
function floorDest(x, z) { const k = `${Math.round(x * 8)},${Math.round(z * 8)}`; if (k !== hoverKey) { hoverKey = k; hoverCache = clampWalkable(x, z); } return hoverCache; }
export function updateHover(t = 0) {
  const tip = $('tip'), st = $('stage');
  let dest = null, text = '', zoom = false, pointer = false, spot = -1;
  if (mouse && !drag && mouse.type === 'mouse' && S.layout) {
    const hit = pickAt(mouse.x, mouse.y), o = hitTarget(hit), ai = o?.userData.art, kind = o?.userData.kind;
    if (ai !== undefined && hit.distance < 40) {
      const it = S.layout.arts[ai];
      if (arrivedAt(ai)) {
        zoom = it.kind !== 'video' && it.kind !== 'kiosk'; pointer = !zoom;
        text = it.kind === 'video' ? '▶  Click to watch' : it.kind === 'kiosk' ? (it.a.kiosk?.links ? 'Click to open ' + it.a.kiosk.links.map(l => l.label).join(' / ') + '  ↗' : 'Click to visit the website  ↗') : '⤢  Click to see the full picture';
      } else { pointer = true; text = (it.a.title || 'Untitled') + (it.a.meta ? ' · ' + it.a.meta : ''); dest = it.view; spot = ai; }
    } else if (kind === 'spot') { const it = S.layout.arts[o.userData.spot]; pointer = true; spot = o.userData.spot; dest = it.view; text = 'Viewing point · ' + (it.a.title || 'Untitled'); }
    else if (hit && (kind === 'floor' || kind === 'bench')) { pointer = true; dest = floorDest(hit.point.x, hit.point.z); }
    else if (hit && kind === 'wall' && hit.face) { const w = wallStandPoint(hit); pointer = true; dest = floorDest(w.x, w.z); }
    else if (kind === 'mapboard' || kind === 'link') pointer = true;
  }
  if (text) {
    tip.textContent = text; tip.style.left = mouse.x + 'px'; tip.style.top = mouse.y + 'px'; tip.classList.remove('hidden');
    tip.style.transform = mouse.x > innerWidth - tip.offsetWidth - 30 ? 'translate(calc(-100% - 14px), 14px)' : '';
  } else tip.classList.add('hidden');
  st.classList.toggle('zoomable', zoom); st.classList.toggle('hovering', pointer && !zoom);
  highlightSpot(spot);
  showGlow(dest, t);
}

/* ---------------- wiring ---------------- */
export function initInput() {
  addEventListener('keydown', e => {
    if (e.target.closest('input,textarea,select,[contenteditable]')) return;
    if (!$('intro').classList.contains('hidden')) return;   // the entry card is up: keys belong to its button
    const k = e.key.toLowerCase();
    if (!$('lightbox').classList.contains('hidden') && k !== 'escape') { lightboxKey(k); return; }   // full picture open: only zoom keys
    keys[k] = true;
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    if (k === ' ' || k === ']' || k === '.') viewArt(S.viewing + 1);
    else if (k === '[' || k === ',') viewArt(S.viewing < 0 ? -1 : S.viewing - 1);
    else if (k === 'm') toggleMap();
    else if (k === 't') toggleTour();
    else if (k === 'escape') closeAll();
  });
  addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
  addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

  canvas.addEventListener('pointerdown', e => {
    canvas.setPointerCapture(e.pointerId); pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); if (drag) drag.moved = true; }
    else drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false, touch: e.pointerType !== 'mouse' };
  });
  canvas.addEventListener('pointermove', e => {
    mouse = { x: e.clientX, y: e.clientY, type: e.pointerType };
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {                           // pinch to zoom
      const [a, b] = [...pointers.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch) S.fovTarget = clamp(S.fovTarget * pinch / d, 20, 75); pinch = d; return;
    }
    if (!drag) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 6) { drag.moved = true; S.look = null; if (S.walk) S.walk.autoYaw = false; stopTour(); $('stage').classList.add('dragging'); }
    if (drag.moved) {                                    // drag to look around
      const s = (drag.touch ? .0042 : .0032) * (S.fov / 60);
      me.yaw += (e.clientX - drag.x) * s; me.pitch = clamp(me.pitch + (e.clientY - drag.y) * s, -1.15, 1.15);
    }
    drag.x = e.clientX; drag.y = e.clientY;
  });
  const endPointer = e => {
    pointers.delete(e.pointerId); if (pointers.size < 2) pinch = 0;
    if (drag && pointers.size === 0) { if (!drag.moved && e.type === 'pointerup') handleClick(e.clientX, e.clientY); drag = null; $('stage').classList.remove('dragging'); }
  };
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  canvas.addEventListener('pointerleave', () => { mouse = null; });
  canvas.addEventListener('wheel', e => { e.preventDefault(); S.fovTarget = clamp(S.fovTarget + e.deltaY * .03, 20, 75); }, { passive: false });
  canvas.addEventListener('contextmenu', e => e.preventDefault());
}
