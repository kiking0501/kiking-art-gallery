/* The guided tour: walks from one artwork to the next, pausing at each.
   The Tour button shows ❙❙ while the tour runs, and fills up during each stop. */
import { S, tour } from '../state.js';
import { $ } from '../util.js';
import { viewArt } from './movement.js';
import { toast } from '../ui/overlays.js';
import site from '../../config/museum.js';

export const TOUR_PAUSE = site.tourSecondsPerStop || 6;   // seconds spent at each work

function setButton(on) {
  const b = $('bTour'); b.classList.toggle('touring', on);
  b.title = on ? 'Pause the guided tour (T)' : 'Start the guided tour (T)';
  setProgress(0); setCountdown(0);
}
let shown = 0, shownSec = '';
function setProgress(p) { if (Math.abs(p - shown) > .002 || p === 0) { shown = p; $('bTour').style.setProperty('--progress', p.toFixed(3)); } }
function setCountdown(sec) { const t = sec > 0 ? String(Math.ceil(sec)) : ''; if (t !== shownSec) { shownSec = t; $('tourCd').textContent = t; } }

export function stopTour() { if (tour.on) { tour.on = false; setButton(false); } }
export function toggleTour() {
  if (tour.on) { stopTour(); return; }
  if (!S.layout.arts.length) { toast('There are no works to visit yet.'); return; }
  tour.on = true; tour.wait = 0; setButton(true); viewArt(S.viewing + 1, true);
}
// Every frame: how far through the current stop we are, and the seconds left (empty while walking).
export function updateTourProgress() {
  const waiting = tour.on && !S.walk && tour.wait > 0;
  setProgress(waiting ? 1 - tour.wait / TOUR_PAUSE : 0); setCountdown(waiting ? tour.wait : 0);
}
