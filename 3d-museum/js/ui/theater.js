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
  return ifr;
}

/* YouTube: start playing as soon as the film opens. The player is told to play once it has loaded;
   if the browser won't let it start with sound, it starts muted and a "Turn the sound on" button appears. */
let ytFrame = null, ytPlaying = false, ytTimers = [], session = 0;
function soundButton(onClick) {                          // shown when a film had to start muted
  const b = document.createElement('button'); b.className = 'sound'; b.textContent = '🔊  Turn the sound on';
  b.onclick = () => { onClick(); b.remove(); };
  $('thFrame').appendChild(b);
}
const ytSend = (func, args = []) => { try { ytFrame?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), '*'); } catch (e) {} };
window.addEventListener('message', e => {
  if (!ytFrame || e.source !== ytFrame.contentWindow || !/youtube/.test(e.origin)) return;
  let d; try { d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; } catch (er) { return; }
  const st = d?.info?.playerState ?? (d?.event === 'onStateChange' ? d.info : undefined);
  if (st === 1) ytPlaying = true;
});
function ytAutoplay(ifr) {
  ytFrame = ifr; ytPlaying = false; ytTimers.forEach(clearTimeout); ytTimers = [];
  const hello = () => { try { ifr.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), '*'); } catch (e) {} ytSend('playVideo'); };
  ifr.addEventListener('load', () => {
    hello(); ytTimers.push(setTimeout(hello, 600), setTimeout(hello, 1400));
    ytTimers.push(setTimeout(() => {                   // still not playing: the browser wants it muted
      if (ytPlaying || ytFrame !== ifr) return;
      ytSend('mute'); ytSend('playVideo');
      soundButton(() => { ytSend('unMute'); ytSend('setVolume', [100]); ytSend('playVideo'); });
    }, 2600));
  });
}

/* Facebook: its player script can be told to play once the film is ready (with the same muted fallback).
   If the script can't load, the film falls back to Facebook's embedded player, which is asked to autoplay. */
let fbSdk = null;
function loadFbSdk() {
  if (fbSdk) return fbSdk;
  fbSdk = new Promise((res, rej) => {
    if (window.FB?.XFBML) { res(window.FB); return; }
    window.fbAsyncInit = () => { try { window.FB.init({ xfbml: false, version: 'v19.0' }); res(window.FB); } catch (e) { rej(e); } };
    const s = document.createElement('script'); s.async = true; s.crossOrigin = 'anonymous'; s.src = 'https://connect.facebook.net/en_US/sdk.js';
    s.onerror = () => rej(new Error('fb sdk')); document.head.appendChild(s);
    setTimeout(() => rej(new Error('fb sdk timeout')), 6000);
  });
  fbSdk.catch(() => { fbSdk = null; });
  return fbSdk;
}
function fbFilm(fr, href) {
  const my = session, iframeUrl = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(href)}&show_text=false&autoplay=true&mute=0&width=1280&height=720`;
  const box = document.createElement('div'); box.className = 'fbbox'; fr.appendChild(box);
  let done = false;
  const fallback = () => { if (done || my !== session) return; done = true; box.remove(); embed(fr, iframeUrl); };
  loadFbSdk().then(FB => {
    if (my !== session || done) return;
    box.innerHTML = `<div class="fb-video" data-href="${esc(href)}" data-width="${Math.max(320, Math.round(fr.clientWidth))}" data-autoplay="true" data-allowfullscreen="true" data-show-text="false"></div>`;
    const onReady = msg => {
      if (msg.type !== 'video' || my !== session) return;
      try { FB.Event.unsubscribe('xfbml.ready', onReady); } catch (e) {}
      done = true; const p = msg.instance; let started = false;
      try { p.subscribe('startedPlaying', () => { started = true; }); p.unmute(); p.play(); } catch (e) {}
      setTimeout(() => {                               // not playing yet: start it muted, with a button for the sound
        if (started || my !== session) return;
        try { p.mute(); p.play(); } catch (e) {}
        soundButton(() => { try { p.unmute(); p.setVolume?.(1); p.play(); } catch (e) {} });
      }, 2500);
    };
    FB.Event.subscribe('xfbml.ready', onReady);
    FB.XFBML.parse(box);
    setTimeout(() => { if (!done && !box.querySelector('iframe')) fallback(); }, 5000);
  }).catch(fallback);
}

export function openTheater(it) {
  const a = it.a, v = a.video; if (!v) return;
  stopTour(); open = true; session++; for (const sc of screens) sc.video && sc.video.pause();
  const fr = $('thFrame'); fr.innerHTML = '';
  $('thTitle').textContent = a.title || ''; $('thMeta').textContent = a.meta || '';
  const links = [];
  if (v.kind === 'youtube') {
    const href = `https://www.youtube.com/watch?v=${encodeURIComponent(v.id)}${v.start ? `&t=${+v.start}s` : ''}`;
    showExternal = () => externalFilm(fr, it, href, 'YouTube');
    if (embedBlocked) showExternal();
    else {
      const q = `autoplay=1&playsinline=1&rel=0&modestbranding=1&enablejsapi=1&origin=${encodeURIComponent(location.origin)}${v.start ? `&start=${+v.start}` : ''}`;
      ytAutoplay(embed(fr, `https://www.youtube-nocookie.com/embed/${encodeURIComponent(v.id)}?${q}`));
      links.push(`<a href="${href}" target="_blank" rel="noopener">Watch on YouTube ↗</a>`);
    }
  } else if (v.kind === 'facebook') {
    showExternal = () => externalFilm(fr, it, v.href, 'Facebook');
    if (embedBlocked) showExternal();
    else { fbFilm(fr, v.href); links.push(`<a href="${esc(v.href)}" target="_blank" rel="noopener">Watch on Facebook ↗</a>`); }
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
  if (!open) return; open = false; session++; ytFrame = null; ytTimers.forEach(clearTimeout); ytTimers = []; $('thFrame').innerHTML = ''; $('theater').classList.add('hidden');
  for (const sc of screens) sc.active(sc.ri === S.curRoom);
}
export function initTheater() {
  $('thX').onclick = closeTheater;
  $('theater').addEventListener('click', e => { if (e.target.id === 'theater') closeTheater(); });
}
