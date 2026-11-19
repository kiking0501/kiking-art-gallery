/* The white card that describes the artwork you are looking at (bottom left). */
import { S } from '../state.js';
import { $ } from '../util.js';
import { stopTour } from '../visitor/tour.js';

export function showInfo(it) {
  const a = it.a, n = S.layout.arts.length;
  $('infoCount').textContent = `${S.layout.rooms[it.ri].data.name} · ${it.index + 1} / ${n}`;
  $('infoTitle').textContent = a.title || 'Untitled';
  $('infoMeta').textContent = a.meta || '';
  $('infoDesc').textContent = a.description || ''; $('infoDesc').classList.toggle('hidden', !a.description);
  const ok = a.link && /^https?:\/\//i.test(a.link);
  $('infoLink').classList.toggle('hidden', !ok); if (ok) { $('infoLink').href = a.link; $('infoLink').textContent = (a.linkLabel || 'View original post') + ' ↗'; }
  $('info').classList.remove('off');
}
// (keeps S.viewing, so Next / Previous carry on from the last work seen)
export function hideInfo() { $('info').classList.add('off'); }

export function initInfoCard(credit) {
  $('infoCredit').textContent = String(credit || '').replace(/\s*\(.*\)\s*$/, '');   // "Artwork © Kiking", without the web address
  $('infoX').onclick = () => { stopTour(); hideInfo(); };
}
