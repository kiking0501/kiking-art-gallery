/* The navigation bar at the bottom: ‹ Tour ›, Map, help, Art Gallery, full screen. */
import { S } from '../state.js';
import { $ } from '../util.js';
import { viewArt } from '../visitor/movement.js';
import { toggleTour } from '../visitor/tour.js';
import { openTheater } from './theater.js';
import { toast } from './overlays.js';

export function initNavbar(galleryUrl) {
  $('bPrev').onclick = () => viewArt(S.viewing < 0 ? -1 : S.viewing - 1);
  $('bNext').onclick = () => viewArt(S.viewing + 1);
  $('bTour').onclick = toggleTour;
  // (the Map button is wired in map-panel.js)
  $('bHelp').onclick = () => $('help').classList.remove('hidden');
  $('bGal').href = galleryUrl || '#'; $('bGal').classList.toggle('hidden', !galleryUrl);
  if (!document.fullscreenEnabled || !document.documentElement.requestFullscreen) $('bFull').style.display = 'none';   // e.g. iPhone Safari
  $('bFull').onclick = async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); }
    catch (e) { toast('Full screen is not available here.'); }
  };
  // floating "Watch the film" button, shown in rooms that have a film
  $('watch').onclick = () => { const it = S.layout.arts[+$('watch').dataset.art]; if (it) { viewArt(it.index); openTheater(it); } };
}
