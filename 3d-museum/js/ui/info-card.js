/* The white card that describes an artwork. It slides in when you arrive in front of a work and stays at
   the bottom: at the right-hand end, or, while the work's wall label is in view, starting where the label
   starts, so it never covers the picture (on a phone it runs along the bottom). */
import * as THREE from 'three';
import { S } from '../state.js';
import { $ } from '../util.js';
import { camera, canvas } from '../world/renderer.js';
import { stopTour } from '../visitor/tour.js';

export function showInfo(it) {
  const a = it.a, n = S.layout.arts.length;
  $('infoCount').textContent = `${S.layout.rooms[it.ri].data.name} · ${it.index + 1} / ${n}`;
  $('infoTitle').textContent = a.title || 'Untitled';
  $('infoMeta').textContent = a.meta || '';
  $('infoDesc').textContent = a.description || ''; $('infoDesc').classList.toggle('hidden', !a.description);
  const ok = a.link && /^https?:\/\//i.test(a.link);
  $('infoLink').classList.toggle('hidden', !ok); if (ok) { $('infoLink').href = a.link; $('infoLink').textContent = (a.linkLabel || 'View original post') + ' ↗'; }
  $('info').classList.remove('off'); placeInfo();
}
// (keeps S.viewing, so Next / Previous carry on from the last work seen)
export function hideInfo() { $('info').classList.add('off'); }

export function initInfoCard(credit) {
  $('infoCredit').textContent = String(credit || '').replace(/\s*\(.*\)\s*$/, '');   // "Artwork © Kiking", without the web address
  $('infoX').onclick = () => { stopTour(); hideInfo(); };
}

// Every frame: line the card up with the wall label of the work being viewed while that label is on screen;
// otherwise keep it at the bottom right.
const box = new THREE.Box3(), v = new THREE.Vector3(); let placed = null;
export function placeInfo() {
  const el = $('info'); let left = null;
  if (!el.classList.contains('off') && innerWidth > 700) {
    const lab = S.layout?.arts[S.viewing]?.labelObj;
    if (lab) {
      box.setFromObject(lab); const r = canvas.getBoundingClientRect(); let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, front = true;
      for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
        v.set(x, y, z).project(camera); if (v.z >= 1) front = false;
        const px = r.left + (v.x + 1) / 2 * r.width, py = r.top + (1 - v.y) / 2 * r.height;
        x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py);
      }
      if (front && x1 > 0 && x0 < innerWidth - 60 && y1 > 0 && y0 < innerHeight) left = Math.max(12, x0);   // the label is in view
    }
  }
  if (left === null) { if (placed !== null) { el.style.left = el.style.right = el.style.width = ''; placed = null; } return; }   // the bottom right
  if (placed !== null && Math.abs(left - placed) < 2) return;
  placed = left;
  const w = Math.max(260, Math.min(380, innerWidth - left - 12));   // narrower if need be, rather than over the picture
  el.style.right = 'auto'; el.style.width = w + 'px'; el.style.left = Math.round(Math.min(innerWidth - w - 12, left)) + 'px';
}
