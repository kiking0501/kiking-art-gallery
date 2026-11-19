/* Facts about rooms used in labels, the banner and the map: exhibition numbers and counts. */
import { S } from '../state.js';
import { isSculpture } from '../world/layout.js';

// The welcome room, the closing room and annexes (e.g. a theatre) are not numbered exhibitions.
export function isExhibit(room) { return room.kind !== 'intro' && room.kind !== 'closing' && room.kind !== 'annex'; }
export function exNo(ri) { let n = 0; for (let i = 0; i <= ri; i++) if (isExhibit(S.museum.rooms[i] || {})) n++; return n; }
export function exTotal() { return S.museum.rooms.filter(isExhibit).length; }
export const two = n => String(n).padStart(2, '0');

// "3 works · 1 sculpture   ·   2013 – 2016"
export function roomStats(room) {
  const n = room.artworks.length, sc = room.artworks.filter(isSculpture).length;
  const ys = room.artworks.flatMap(a => (`${a.title || ''} ${a.meta || ''}`.match(/\b(?:19|20)\d{2}\b/g) || []).map(Number));
  const lo = Math.min(...ys), hi = Math.max(...ys), yr = ys.length ? (lo === hi ? `${lo}` : `${lo} – ${hi}`) : '';
  const pl = (k, w) => `${k} ${w}${k === 1 ? '' : 's'}`;
  const kinds = !n ? 'Coming soon' : sc && sc < n ? `${pl(n - sc, 'work')} · ${pl(sc, 'sculpture')}` : sc ? pl(sc, 'sculpture') : pl(n, 'work');
  return [kinds, yr].filter(Boolean).join('   ·   ');
}

// The word used for an annex room such as the film room (config/rooms.js → label), e.g. 'Finale'.
export function annexLabel(room) { return room.label || 'Theatre'; }

// Small capitals line above a room's name, e.g. "LATEST  ·  EXHIBITION 03".
export function roomTag(r) {
  const k = r.data.kind, cat = r.cat ? r.cat.toUpperCase() + '  ·  ' : '';
  return k === 'intro' ? 'WELCOME' : k === 'closing' ? 'FAREWELL' : k === 'annex' ? `${cat}${annexLabel(r.data).toUpperCase()}` : `${cat}EXHIBITION ${two(exNo(r.ri))}`;
}
