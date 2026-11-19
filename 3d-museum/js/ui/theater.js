/* Full-screen film player: video files play here; YouTube and Facebook films play
   in their own players, or — where a page can't embed them — open on their site. */
import { S } from '../state.js';
import { $, esc } from '../util.js';
import { screens } from '../world/artworks.js';
import { stopTour } from '../visitor/tour.js';

let open = false, showExternal = null;
export function isTheaterOpen() { return open; }

// Inside a hosted frame (e.g. a preview site), other sites' players are usually blocked.
let embedBlocked = (() => { try { return window.top !== window.self; } catch (e) { return true; } })();
document.addEventListener('securitypolicyviolation', e => { if (/youtube|facebook/.test(e.blockedURI || '')) { embedBlocked = true; if (open && showExternal) showExternal(); } });

function externalFilm(fr, it, href, site) {
  fr.innerHTML = `<div class="ext"><img alt="" src="${esc(it.a.src || '')}"><div class="ov"><a class="btn" href="${esc(href)}" target="_blank" rel="noopener">▶&nbsp; Watch on ${site} ↗</a><div class="note">${site}'s player can't run inside this page, so the film opens on ${site} in a new tab.</div></div></div>`;
}
function embed(fr, src) {
  const ifr = document.createElement('iframe');
  ifr.src = src; ifr.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen'; ifr.allowFullscreen = true; ifr.referrerPolicy = 'strict-origin-when-cross-origin';
  fr.appendChild(ifr);
}

export function openTheater(it) {
  const a = it.a, v = a.video; if (!v) return;
  stopTour(); open = true; for (const sc of screens) sc.video && sc.video.pause();
  const fr = $('thFrame'); fr.innerHTML = '';
  $('thTitle').textContent = a.title || ''; $('thMeta').textContent = a.meta || '';
  const links = [];
  if (v.kind === 'youtube') {
    const href = `https://www.youtube.com/watch?v=${encodeURIComponent(v.id)}`;
    showExternal = () => externalFilm(fr, it, href, 'YouTube');
    if (embedBlocked) showExternal();
    else { embed(fr, `https://www.youtube-nocookie.com/embed/${encodeURIComponent(v.id)}?autoplay=1&rel=0&modestbranding=1`); links.push(`<a href="${href}" target="_blank" rel="noopener">Watch on YouTube ↗</a>`); }
  } else if (v.kind === 'facebook') {
    showExternal = () => externalFilm(fr, it, v.href, 'Facebook');
    if (embedBlocked) showExternal();
    else { embed(fr, `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(v.href)}&show_text=false&autoplay=true&width=1280&height=720`); links.push(`<a href="${esc(v.href)}" target="_blank" rel="noopener">Watch on Facebook ↗</a>`); }
  } else {                                               // video files, played one after another
    showExternal = null;
    const vid = document.createElement('video'); vid.controls = true; vid.autoplay = true; vid.playsInline = true; fr.appendChild(vid);
    const srcs = v.src || []; let k = 0;
    const play = i => { k = i; vid.src = srcs[i]; vid.play().catch(() => {}); [...$('thLinks').querySelectorAll('button')].forEach((b, j) => b.classList.toggle('on', j === i)); };
    vid.addEventListener('ended', () => { if (k + 1 < srcs.length) play(k + 1); });
    if (srcs.length > 1) links.push(srcs.map((_, i) => `<button data-clip="${i}">Part ${i + 1}</button>`).join(''));
    setTimeout(() => { $('thLinks').querySelectorAll('button[data-clip]').forEach(b => b.onclick = () => play(+b.dataset.clip)); play(0); }, 0);
  }
  if (a.link && /^https?:\/\//.test(a.link) && !(v.kind === 'youtube' && /youtu/.test(a.link)) && !(v.kind === 'facebook' && /facebook/.test(a.link))) links.push(`<a href="${esc(a.link)}" target="_blank" rel="noopener">${esc(a.linkLabel || 'More about this work')} ↗</a>`);
  $('thLinks').innerHTML = links.join('');
  $('theater').classList.remove('hidden');
}
export function closeTheater() {
  if (!open) return; open = false; $('thFrame').innerHTML = ''; $('theater').classList.add('hidden');
  for (const sc of screens) sc.active(sc.ri === S.curRoom);
}
export function initTheater() {
  $('thX').onclick = closeTheater;
  $('theater').addEventListener('click', e => { if (e.target.id === 'theater') closeTheater(); });
}
