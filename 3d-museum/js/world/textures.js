/* Textures: the pictures themselves (loaded once, shown sharp only when near),
   and the generated surfaces — stone floor, plaster, skylight, soft shadows. */
import * as THREE from 'three';
import { renderer, canvasTex, MAX_ANISO, MOBILE, LOWTEX } from './renderer.js';
import { mk, wrapText, SERIF, SANS } from '../util.js';

/* ---------------- Artwork pictures ---------------- */
export const texCache = new Map();          // src → { tex, full, small, aspect, ok, loaded }
export function artKey(a) { return 'src:' + (a.src || ''); }

function paintMissing(a, why) {
  const c = mk(800, 600), g = c.getContext('2d');
  g.fillStyle = '#d8d2c6'; g.fillRect(0, 0, 800, 600); g.strokeStyle = '#a49c8f'; g.lineWidth = 3; g.setLineDash([14, 10]); g.strokeRect(30, 30, 740, 540);
  g.fillStyle = '#4b453c'; g.textAlign = 'center'; g.font = `400 46px ${SERIF}`; g.fillText('Picture unavailable', 400, 260);
  g.font = `24px ${SANS}`; g.fillStyle = '#6b6357'; wrapText(g, why, 400, 320, 640, 34, 3);
  g.font = `18px ${SANS}`; g.fillText(decodeURI(String(a.src || '')).slice(-60), 400, 470);
  return c;
}

// Loads one picture in full. Resolves with { tex, full, small, aspect, ok }.
function loadFull(a) {
  return new Promise(resolve => {
    const finish = (source, ok) => {
      const w = source.naturalWidth || source.width, h = source.naturalHeight || source.height;
      const tex = new THREE.Texture(source); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = MAX_ANISO; tex.needsUpdate = true; tex.userData.keep = true;
      // a 320px copy for works far away (keeps graphics memory low)
      const sc = mk(Math.max(1, Math.round(w >= h ? 320 : 320 * w / h)), Math.max(1, Math.round(h >= w ? 320 : 320 * h / w))); sc.getContext('2d').drawImage(source, 0, 0, sc.width, sc.height);
      resolve({ tex, full: tex, small: canvasTex(sc, true), aspect: w / h, ok });
    };
    if (!a.src) { finish(paintMissing(a, 'No picture given.'), false); return; }
    const img = new Image();
    if (!/^(data|blob):/.test(a.src)) img.crossOrigin = 'anonymous';
    img.onload = () => {
      const big = Math.max(img.naturalWidth, img.naturalHeight), lim = Math.min(MOBILE ? 2048 : 4096, renderer.capabilities.maxTextureSize);   // phones: at most 2048 px (graphics memory)
      if (big > lim) { const s = lim / big, c = mk(Math.round(img.naturalWidth * s), Math.round(img.naturalHeight * s)); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); finish(c, true); }
      else finish(img, true);
    };
    img.onerror = () => finish(paintMissing(a, location.protocol === 'file:' ? 'Open the museum through a web server (see README.md), not as a file.' : 'Could not load this image.'), false);
    img.src = a.src;
  });
}

/* Picture sizes without downloading the pictures: only the first few kilobytes of
   each file are read (JPEG, PNG, GIF, WebP headers). The layout needs nothing else,
   so the doors open quickly and the pictures stream in afterwards. */
function readDims(b) {
  const n = b.length, u16 = i => (b[i] << 8) | b[i + 1], u32 = i => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
  if (n >= 24 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { w: u32(16), h: u32(20) };
  if (n >= 10 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return { w: b[6] | (b[7] << 8), h: b[8] | (b[9] << 8) };
  if (n >= 30 && b[0] === 0x52 && b[1] === 0x49 && b[8] === 0x57 && b[9] === 0x45) {          // RIFF....WEBP
    const t = String.fromCharCode(b[12], b[13], b[14], b[15]);
    if (t === 'VP8 ') return { w: (b[26] | (b[27] << 8)) & 0x3fff, h: (b[28] | (b[29] << 8)) & 0x3fff };
    if (t === 'VP8L') { const v = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24); return { w: (v & 0x3fff) + 1, h: ((v >> 14) & 0x3fff) + 1 }; }
    if (t === 'VP8X') return { w: 1 + (b[24] | (b[25] << 8) | (b[26] << 16)), h: 1 + (b[27] | (b[28] << 8) | (b[29] << 16)) };
    return null;
  }
  if (n >= 4 && b[0] === 0xff && b[1] === 0xd8) {                                              // JPEG: walk the segments to the frame header
    let i = 2, turn = false;
    while (i + 9 < n) {
      if (b[i] !== 0xff) return null;
      const m = b[i + 1]; if (m === 0xff) { i++; continue; }
      const len = u16(i + 2);
      if (m === 0xe1 && i + 4 + len <= n && b[i + 4] === 0x45 && b[i + 5] === 0x78) turn = exifTurned(b, i + 10);   // Exif: is the photo stored sideways?
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) { const h = u16(i + 5), w = u16(i + 7); return turn ? { w: h, h: w } : { w, h }; }
      i += 2 + len;
    }
  }
  return null;
}
function exifTurned(b, t) {          // Exif orientation 5–8 = rotated 90°, which browsers apply when showing the photo
  try {
    const le = b[t] === 0x49, r16 = i => le ? b[i] | (b[i + 1] << 8) : (b[i] << 8) | b[i + 1], r32 = i => le ? (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0 : ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
    const ifd = t + r32(t + 4), cnt = r16(ifd);
    for (let k = 0; k < cnt; k++) { const e = ifd + 2 + k * 12; if (r16(e) === 0x0112) return r16(e + 8) >= 5; }
  } catch (e) {}
  return false;
}
async function probeSize(src) {
  const res = await fetch(src, /^data:/.test(src) ? {} : { headers: { Range: 'bytes=0-131071' } });
  if (!res.ok || !res.body) return null;
  const reader = res.body.getReader(); let buf = new Uint8Array(0);
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (value) { const nb = new Uint8Array(buf.length + value.length); nb.set(buf); nb.set(value, buf.length); buf = nb; }
      const d = readDims(buf); if (d && d.w && d.h) return d;
      if (done || buf.length > 1 << 20) return null;
    }
  } finally { reader.cancel().catch(() => {}); }
}

// Shown on the wall until a picture arrives: a soft paper tone.
const PENDING = (() => {
  const c = mk(64, 64), g = c.getContext('2d'), grd = g.createRadialGradient(32, 28, 4, 32, 32, 46);
  grd.addColorStop(0, '#e2ddd3'); grd.addColorStop(1, '#cbc5b9'); g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  return canvasTex(c, true);
})();

// Size first, picture later. Films, screens and kiosks are loaded in full straight away
// (their posters are drawn from the picture when the room is built).
export function loadArt(a, full = false) {
  const key = artKey(a);
  if (texCache.has(key)) {                                   // the same file used twice (e.g. on a wall and on a screen):
    const e = texCache.get(key);                             // a screen still needs the whole picture before the room is built
    return full ? e.promise.then(() => e.loaded ? e : (e.fullPromise = e.fullPromise || e.loadNow())) : e.promise;
  }
  const entry = { a, loaded: false };
  const loadNow = entry.loadNow = () => { entry.loading = true; return loadFull(a).then(r => { Object.assign(entry, r, { loaded: true }); return entry; }); };
  entry.promise = full || !a.src ? loadNow() : probeSize(a.src).catch(() => null).then(d => {
    if (!d) return loadNow();                                // header not readable: load the whole picture now
    return Object.assign(entry, { aspect: d.w / d.h, ok: true, tex: PENDING, small: PENDING, full: null });
  });
  texCache.set(key, entry);
  return entry.promise;
}

// Load every picture's size (their shapes decide the layout).
export async function preloadAll(museum, onProgress) {
  const all = museum.rooms.flatMap(r => r.artworks); let done = 0;
  await Promise.all(all.map(a => loadArt(a, !!(a.video || a.kiosk)).then(() => onProgress && onProgress(++done, all.length))));
}

/* After the doors open: download the pictures, always the one nearest the visitor next.
   When one arrives, the works showing it switch from the paper tone to the picture. */
export function streamPictures(arts, focus, parallel = 6) {   // focus() → points to load around
  const users = new Map();                                   // entry → works that show it
  for (const it of arts) if (it.entry && !it.entry.loaded) { if (!users.has(it.entry)) users.set(it.entry, []); users.get(it.entry).push(it); }
  const next = () => {
    let best = null, bd = Infinity; const pts = focus();
    for (const [e, list] of users) { if (e.loading) continue; for (const it of list) for (const p of pts) { const d = Math.hypot(it.x - p.x, it.z - p.z); if (d < bd) { bd = d; best = e; } } }
    if (!best) return;
    best.loading = true;
    loadFull(best.a).then(r => {
      Object.assign(best, r, { loaded: true });
      for (const it of users.get(best)) { it.near = false; for (const m of it.lodMats || []) m.map = best.small; }   // the LOD check upgrades it when near
      users.delete(best); next();
    });
  };
  for (let k = 0; k < parallel; k++) next();
}

// Full-resolution pictures only for works near the visitor; distant ones use the small copy.
export function updateLOD(arts, me) {
  const used = new Set();
  for (const it of arts) {
    if (!it.lodMats || !it.entry?.full) continue;
    const d = Math.hypot(it.x - me.x, it.z - me.z); it.near = it.near ? d < 24 : d < 18;
    const want = it.near ? it.entry.full : it.entry.small;
    for (const m of it.lodMats) if (m.map !== want) { m.map = want; if (m.emissiveMap) m.emissiveMap = want; }
    if (it.near) used.add(it.entry);
  }
  for (const e of texCache.values()) { if (e.full && e.onGPU && !used.has(e)) { e.full.dispose(); e.onGPU = false; } }
  for (const e of used) e.onGPU = true;
}

/* ---------------- Small painted textures ---------------- */
function makeSkylightTexture() {
  const c = mk(512, 512), g = c.getContext('2d');
  const grd = g.createRadialGradient(256, 256, 20, 256, 256, 360); grd.addColorStop(0, '#ffffff'); grd.addColorStop(1, '#f1ece2');
  g.fillStyle = grd; g.fillRect(0, 0, 512, 512);
  g.fillStyle = '#cfc9be'; for (let i = 0; i <= 4; i++) { g.fillRect(i * 128 - 4, 0, 8, 512); g.fillRect(0, i * 128 - 4, 512, 8); }
  const t = canvasTex(c, true); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function makeShadowTexture() {
  const c = mk(4, 128), g = c.getContext('2d'), grd = g.createLinearGradient(0, 0, 0, 128);
  grd.addColorStop(0, 'rgba(0,0,0,0.38)'); grd.addColorStop(0.35, 'rgba(0,0,0,0.12)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 4, 128); return canvasTex(c, true);
}
function makeWashTexture() {
  const c = mk(256, 256), g = c.getContext('2d'), grd = g.createRadialGradient(128, 105, 4, 128, 128, 128);
  grd.addColorStop(0, 'rgba(255,238,205,1)'); grd.addColorStop(0.55, 'rgba(255,232,195,.45)'); grd.addColorStop(1, 'rgba(255,230,190,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 256, 256); return canvasTex(c, true);
}
export const TEX = { sky: makeSkylightTexture(), shadow: makeShadowTexture(), wash: makeWashTexture() };

// Soft drop shadow a frame casts on the wall.
export function contactShadow(ow, oh) {
  const pad = .32, W = ow + pad * 2, H = oh + pad * 2, ppm = 160 / Math.max(W, H), c = mk(Math.ceil(W * ppm), Math.ceil(H * ppm)), g = c.getContext('2d');
  g.shadowColor = 'rgba(0,0,0,1)'; g.shadowBlur = .07 * ppm; g.shadowOffsetY = .035 * ppm; g.fillStyle = '#000';
  g.fillRect(pad * ppm, pad * ppm, ow * ppm, oh * ppm);
  return new THREE.MeshBasicMaterial({ map: canvasTex(c), transparent: true, opacity: .55, depthWrite: false });
}

/* ---------------- Stone floor and plaster, generated on the graphics card ---------------- */
const GLSL_NOISE = `
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p, vec2 per){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.-2.*f);
  float a = hash12(mod(i, per)), b = hash12(mod(i + vec2(1.,0.), per)), c = hash12(mod(i + vec2(0.,1.), per)), d = hash12(mod(i + vec2(1.,1.), per));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y); }
float fbm(vec2 p, vec2 per){ float s = 0., a = .5; for (int i = 0; i < 5; i++){ s += a * vnoise(p, per); p *= 2.; per *= 2.; a *= .5; } return s; }
`;
const FLOOR_FS = `
uniform int uMode; uniform float uTexel; uniform float uStrength; varying vec2 vUv;
${GLSL_NOISE}
const float TILE = 4.0; const float TS = 1.0;   // 1 m grey stone slabs
struct P { vec3 col; float h; float r; };
P floorAt(vec2 uv){
  vec2 m = uv * TILE, id = mod(floor(m / TS), TILE / TS), f = fract(m / TS);
  float h1 = hash12(id + 3.1), h2 = hash12(id + 7.7), h3 = hash12(id + 1.3);
  vec2 NP = vec2(1e4), q = m + vec2(h1 * 40., h2 * 40.);
  float ang = h3 * 3.1416; vec2 pr = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * q;
  float cloud = fbm(q * 2.2, NP), fine = fbm(q * 18., NP);
  // long, gently curving veins that taper and fade (not the tight squiggles of a water stain)
  float w = fbm(pr * .35, NP) * 3.2 + fbm(pr * 1.4, NP) * .35;
  float s = abs(sin(pr.x * .9 + w)), wid = .025 + .06 * fbm(pr * .8 + 3., NP);
  float along = smoothstep(.35, .65, fbm(pr * .5 + 9., NP));
  float vein = ((1. - smoothstep(0., wid, s)) + (1. - smoothstep(0., wid * 6., s)) * .3) * along;
  float s2 = abs(sin(pr.y * 1.6 + fbm(pr * .6 + 5., NP) * 3.));
  float vein2 = (1. - smoothstep(0., .015, s2)) * smoothstep(.5, .7, fbm(pr * .7 + 2., NP));
  float speck = smoothstep(.72, .96, vnoise(q * 120., NP));
  vec3 base = mix(vec3(.55, .55, .545), vec3(.47, .47, .465), clamp(h2 * .6 + (cloud - .5) * .5, 0., 1.));
  base *= .985 + (fine - .5) * .05;
  vec3 col = base * (1. - vein * .17 * (.5 + h1)) * (1. - vein2 * .07) * (1. - speck * .1);
  float e = min(min(f.x, 1. - f.x), min(f.y, 1. - f.y)) * TS;
  float grout = 1. - smoothstep(.0008, .0022, e);
  col = mix(col, vec3(.3, .3, .295), grout);
  col = pow(col, vec3(2.2));
  float h = smoothstep(0., .0025, e) * .5 + (cloud - .5) * .006;
  float r = .12 + cloud * .1 + (fine - .5) * .05 + grout * .55 + speck * .04;
  return P(col, h, r);
}
void main(){
  P p = floorAt(vUv);
  if (uMode == 0) gl_FragColor = vec4(p.col, 1.);
  else if (uMode == 2) gl_FragColor = vec4(vec3(clamp(p.r, .05, 1.)), 1.);
  else {
    float hx = floorAt(vUv + vec2(uTexel, 0.)).h - floorAt(vUv - vec2(uTexel, 0.)).h;
    float hy = floorAt(vUv + vec2(0., uTexel)).h - floorAt(vUv - vec2(0., uTexel)).h;
    vec3 n = normalize(vec3(-hx * uStrength, -hy * uStrength, 1.));
    gl_FragColor = vec4(n * .5 + .5, 1.);
  }
}`;
const PLASTER_FS = `
uniform int uMode; uniform float uTexel; uniform float uStrength; varying vec2 vUv;
${GLSL_NOISE}
float H(vec2 uv){ return fbm(uv * 4., vec2(4.)) * .5 + fbm(uv * 36., vec2(36.)) * .3 + fbm(uv * 180., vec2(180.)) * .2 + smoothstep(.55, .75, fbm(uv * vec2(9., 3.), vec2(9., 3.))) * .12; }
void main(){
  if (uMode == 0) {
    float a = .955 + (fbm(vUv * 3., vec2(3.)) - .5) * .06 + (fbm(vUv * 48., vec2(48.)) - .5) * .035;
    gl_FragColor = vec4(vec3(a), 1.);
  } else {
    float hx = H(vUv + vec2(uTexel, 0.)) - H(vUv - vec2(uTexel, 0.));
    float hy = H(vUv + vec2(0., uTexel)) - H(vUv - vec2(0., uTexel));
    vec3 n = normalize(vec3(-hx * uStrength, -hy * uStrength, 1.));
    gl_FragColor = vec4(n * .5 + .5, 1.);
  }
}`;
/* White marble for the round room. KIND 0: veined marble; 3: the same for a floor, finer veins, one repeat = 8 m; 1: wall laid in stone blocks
   (one repeat = 3 m: 2 blocks of 1.5 m x 5 courses of 0.6 m, running bond); 2: floor of 1 m
   squares, white and pale grey (one repeat = 4 m). The veins repeat seamlessly. */
const MARBLE_FS = kind => `
uniform int uMode; uniform float uTexel; uniform float uStrength; varying vec2 vUv;
${GLSL_NOISE}
const int KIND = ${kind};
float veins(vec2 uv, float s, float k){                // k: whole number, more and finer veins per repeat
  vec2 o = vec2(floor(s * 61.), floor(s * 17.));
  float w1 = fbm(uv * 4. * k + o, vec2(4. * k)), w2 = fbm(uv * 8. * k + o.yx, vec2(8. * k));
  float v1 = 1. - smoothstep(0., .06, abs(sin(6.2832 * k * (1. * uv.x + 2. * uv.y) + w1 * 7. + s * 6.28)));
  float v2 = 1. - smoothstep(0., .03, abs(sin(6.2832 * k * (3. * uv.x - 1. * uv.y) + w2 * 9. + s * 3.1)));
  float v3 = 1. - smoothstep(0., .015, abs(sin(6.2832 * k * (5. * uv.x + 3. * uv.y) + w2 * 12. + s)));
  return v1 * .7 + v2 * .32 + v3 * .14;
}
struct P { vec3 col; float h; };
P marbleAt(vec2 uv){
  vec2 cells = KIND == 1 ? vec2(2., 5.) : (KIND == 2 ? vec2(4., 4.) : vec2(1.));
  float R = KIND == 2 ? 4. : 3.;
  vec2 m = uv * cells;
  if (KIND == 1) m.x += mod(floor(m.y), 2.) * .5;
  vec2 id = mod(floor(m), cells), f = fract(m);
  float h1 = (KIND == 0 || KIND == 3) ? .37 : hash12(id + 2.3), h2 = (KIND == 0 || KIND == 3) ? .5 : hash12(id + 9.1);
  vec2 o = vec2(floor(h1 * 40.), floor(h2 * 40.));
  float cloud = fbm(uv * 3. + o, vec2(3.)), fine = fbm(uv * 40. + o, vec2(40.));
  float v = veins(uv, h1, 1.);
  if (KIND == 3) {                                       // floor: a clean white with a few long, flowing veins (Calacatta-like)
    float t = fbm(uv * 2. + vec2(3., 1.), vec2(2.)) * 1.5 + fbm(uv * 5. + vec2(8., 4.), vec2(5.)) * .3;
    float s1 = sin(6.2832 * (uv.x + uv.y) + t * 6.2832);                            // the main veins, on a diagonal
    float s1b = sin(6.2832 * (2. * uv.x + uv.y) + t * 5.5 + 2.1);                    // a second, fainter family
    float wid = .015 + .06 * pow(fbm(uv * 4. + vec2(2., 7.), vec2(4.)), 2.);         // they thicken and taper
    float along = smoothstep(.42, .6, fbm(uv * 2. + vec2(5., 5.), vec2(2.)));        // and come and go along their length
    float alongB = smoothstep(.5, .66, fbm(uv * 3. + vec2(4., 1.), vec2(3.)));
    float core = (1. - smoothstep(0., wid, abs(s1))) * along + (1. - smoothstep(0., wid * .7, abs(s1b))) * alongB * .6;
    float halo = (1. - smoothstep(0., wid * 8., abs(s1))) * along + (1. - smoothstep(0., wid * 6., abs(s1b))) * alongB * .5;
    float t2 = fbm(uv * 4. + vec2(1., 6.), vec2(4.)) * 1.2;
    float s2 = sin(6.2832 * (3. * uv.x - 1. * uv.y) + t2 * 6.2832);                 // fine branching veins across them
    float fineV = (1. - smoothstep(0., .012, abs(s2))) * smoothstep(.5, .7, fbm(uv * 3. + vec2(9., 3.), vec2(3.)));
    v = core * .9 + halo * .22 + fineV * .4;
  }
  bool dark = KIND == 2 && mod(id.x + id.y, 2.) > .5;
  vec3 base = dark ? vec3(.83, .835, .84) : vec3(.965, .96, .95);
  base *= .99 + (cloud - .5) * (KIND == 3 ? .035 : .06) + (fine - .5) * .02 + (h2 - .5) * .025;
  vec3 col = mix(base, dark ? vec3(.55, .56, .58) : (KIND == 3 ? vec3(.52, .52, .54) : vec3(.64, .65, .67)), clamp(v, 0., 1.) * (dark ? .36 : (KIND == 3 ? .6 : .32)));
  float e = 1.;
  if (KIND == 1 || KIND == 2) e = min(min(f.x, 1. - f.x) * R / cells.x, min(f.y, 1. - f.y) * R / cells.y);
  float joint = 1. - smoothstep(.0015, .005, e);
  col = mix(col, vec3(.74, .73, .71), joint * .85);
  return P(pow(col, vec3(2.2)), smoothstep(0., .006, e) + (cloud - .5) * .002);
}
void main(){
  P p = marbleAt(vUv);
  if (uMode == 0) gl_FragColor = vec4(p.col, 1.);
  else {
    float hx = marbleAt(vUv + vec2(uTexel, 0.)).h - marbleAt(vUv - vec2(uTexel, 0.)).h;
    float hy = marbleAt(vUv + vec2(0., uTexel)).h - marbleAt(vUv - vec2(0., uTexel)).h;
    vec3 n = normalize(vec3(-hx * uStrength, -hy * uStrength, 1.));
    gl_FragColor = vec4(n * .5 + .5, 1.);
  }
}`;
const genTexture = (() => {
  const sc = new THREE.Scene(), cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); quad.frustumCulled = false; sc.add(quad);
  return (frag, size, mode, srgb, strength = 1) => {
    const mat = new THREE.ShaderMaterial({ vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }', fragmentShader: frag,
      uniforms: { uMode: { value: mode }, uTexel: { value: 1 / size }, uStrength: { value: strength } }, depthTest: false, depthWrite: false });
    quad.material = mat;
    const rt = new THREE.WebGLRenderTarget(size, size, { depthBuffer: false, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter,
      wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping, anisotropy: MAX_ANISO, colorSpace: srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace });
    const prev = renderer.getRenderTarget(), strip = Math.min(size, 1024);
    rt.scissorTest = true;
    for (let y = 0; y < size; y += strip) { rt.scissor.set(0, y, size, strip); renderer.setRenderTarget(rt); renderer.render(sc, cam); }  // strips keep each GPU draw short
    rt.scissorTest = false; renderer.setRenderTarget(prev); mat.dispose();
    rt.texture.userData.keep = true; return rt.texture;
  };
})();

export const SURF = {};   // floorA/N/R (colour, bumps, roughness), plasterA/N; marble* (made when the round room is built)
export function generateMarble() {
  if (SURF.marbleV) return SURF;
  const big = !MOBILE && !LOWTEX && renderer.capabilities.maxTextureSize >= 8192, sz = big ? 2048 : 1024;
  SURF.marbleV = genTexture(MARBLE_FS(0), sz, 0, true);                 // veined, for columns and mouldings
  SURF.ashlarA = genTexture(MARBLE_FS(1), sz, 0, true);                 // the wall, in stone blocks
  SURF.ashlarN = genTexture(MARBLE_FS(1), sz, 1, false, 2.2 * sz / 2048);
  SURF.floorMS = genTexture(MARBLE_FS(3), sz, 0, true);                 // the floor: one continuous sheet of white marble, no tiles
  return SURF;
}
export function generateSurfaces() {
  const big = !MOBILE && !LOWTEX && renderer.capabilities.maxTextureSize >= 8192;
  const fs = big ? 4096 : (LOWTEX ? 1024 : 2048), ps = big ? 2048 : 1024;
  SURF.floorA = genTexture(FLOOR_FS, fs, 0, true);
  SURF.floorN = genTexture(FLOOR_FS, fs, 1, false, 3.2 * fs / 4096);
  SURF.floorR = genTexture(FLOOR_FS, fs / 2, 2, false);
  SURF.plasterA = genTexture(PLASTER_FS, ps, 0, true);
  SURF.plasterN = genTexture(PLASTER_FS, ps, 1, false, 1.4 * ps / 2048);
}
