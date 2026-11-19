/* The exhibits themselves:
     buildArtwork   framed picture on a wall, with its label and spotlight
     buildSculpture photo of a 3D piece shown as a freestanding display that turns to face you
     buildScreen    projection screen of a screening room (theatre)
     buildMonitor   flat screen on a wall (a video that isn't in a theatre)
     buildKiosk     freestanding screen that opens a website or social media */
import * as THREE from 'three';
import { clamp, mk, wrapText, spacing } from '../util.js';
import { canvasTex, renderer } from './renderer.js';
import { TEX, contactShadow } from './textures.js';
import { stdMat, lensMat, box, plane, textPlane } from './materials.js';
import { isTheaterOpen } from '../ui/theater.js';
import { WALL_H } from './constants.js';

export const stands = [];    // freestanding displays (turned toward the visitor every frame)
export const screens = [];   // video screens that can play on their own

/* ---------------- framed picture ---------------- */
export function buildArtwork(it) {
  const { w, h, ow, oh, spec, entry, a } = it;
  const g = new THREE.Group(); g.position.set(it.x, it.y, it.z); g.rotation.y = it.rotY ?? (it.side < 0 ? 0 : Math.PI);
  let artZ;
  if (spec.fw > 0) {                                     // frame
    const fm = stdMat(spec.color, spec.rough, spec.metal), matM = stdMat('#f6f3ec', .95);
    const back = box(w + 2 * spec.mat, h + 2 * spec.mat, spec.depth * .6, matM); back.position.z = spec.depth * .3; g.add(back);
    for (const s of [-1, 1]) {
      const tb = box(ow, spec.fw, spec.depth, fm); tb.position.set(0, s * (oh / 2 - spec.fw / 2), spec.depth / 2); g.add(tb);
      const lr = box(spec.fw, oh - 2 * spec.fw, spec.depth, fm); lr.position.set(s * (ow / 2 - spec.fw / 2), 0, spec.depth / 2); g.add(lr);
    }
    artZ = spec.depth * .6 + .002;
  } else {                                               // unframed canvas
    const cv = box(w, h, spec.depth, stdMat('#e9e3d6', .85)); cv.position.z = spec.depth / 2; g.add(cv);
    artZ = spec.depth + .002;
  }
  const t0 = entry?.small || entry?.tex || null;
  // the picture's own colours, exactly as in the file: not tinted by the room's warm lights or its mood
  const am = new THREE.MeshBasicMaterial({ map: t0, toneMapped: false }); it.lodMats = [am];
  const art = plane(w, h, am); art.position.z = artZ; g.add(art);
  const cs = plane(ow + .64, oh + .64, contactShadow(ow, oh)); cs.position.z = .003; g.add(cs);
  // spotlight fixture on the ceiling track
  const fix = new THREE.Group(); fix.position.set(0, (it.fixY ?? WALL_H) - .42 - it.y, 1.5); fix.visible = !it.noFix;
  const can = new THREE.Mesh(new THREE.CylinderGeometry(.055, .07, .2, 14), stdMat('#1c1c1c', .45, .5)); can.rotation.x = -0.75; fix.add(can);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(.05, 14), lensMat); lens.position.set(0, -.08, -.07); lens.rotation.x = Math.PI / 2 + .75; fix.add(lens);
  g.add(fix);
  // wall label
  const pl = textPlane((c, cw, ch) => {
    c.fillStyle = '#f8f5ef'; c.fillRect(0, 0, cw, ch);
    c.fillStyle = '#1f1b17'; c.font = '600 50px "Cormorant Garamond", Georgia, serif';
    const n = wrapText(c, a.title || 'Untitled', 34, 74, cw - 68, 50, 2);
    c.fillStyle = '#5e574d'; c.font = '400 25px Inter, sans-serif'; wrapText(c, a.meta || '', 34, 74 + n * 50 + 6, cw - 68, 32, 2);
    c.fillStyle = '#9b9286'; c.font = '500 20px Inter, sans-serif'; c.fillText(`No. ${it.index + 1}`, 34, ch - 28);
  }, 640, 360, .34, .19125, false);
  pl.position.set(it.labelX ?? ow / 2 + .42, (it.labelY ?? 1.32) - it.y, .012); pl.visible = !it.upper; g.add(pl);
  g.traverse(o => { o.userData.art = it.index; });
  return g;
}

/* ---------------- freestanding photo display ---------------- */
// Photo material whose background softly blurs and fades with distance, keeping the focus area (the piece itself).
function standPhotoMat(tex, focus) {
  const u = { uFocus: { value: new THREE.Vector4(...focus) }, uFade: { value: 0 } };
  const m = new THREE.MeshBasicMaterial({ map: tex || null, transparent: true, depthWrite: false, toneMapped: false });   // true colours
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, u);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec4 uFocus; uniform float uFade;')
      .replace('#include <map_fragment>', `
        #ifdef USE_MAP
          float fd = length((vMapUv - uFocus.xy) / uFocus.zw);
          float bg = smoothstep(.78, 1.3, fd);
          vec4 sampledDiffuseColor = texture2D(map, vMapUv, bg * uFade * 4.5);
          diffuseColor *= sampledDiffuseColor;
          vec2 e2 = min(vMapUv, 1. - vMapUv);
          diffuseColor.a *= smoothstep(0., .03, min(e2.x, e2.y)) * (1. - bg * uFade * .97);
        #endif`);
  };
  m.customProgramCacheKey = () => 'standPhoto';
  return { m, u };
}
export function buildSculpture(it) {
  const { a, w, h, plinthH, base } = it, dark = it.mood === 'dark', rb = base / 2, photoStand = a.sculpture.base === 'photo';
  const focus = Array.isArray(a.sculpture.focus) && a.sculpture.focus.length === 4 ? a.sculpture.focus : [.5, .5, .44, .46];
  const holder = new THREE.Group(); holder.position.set(it.x, 0, it.z);
  const g = new THREE.Group(); holder.add(g);            // this part turns to face the visitor
  const fl = plane(base + 1.2, base + 1.2, new THREE.MeshBasicMaterial({ map: TEX.wash, color: 0x000000, transparent: true, opacity: .45, depthWrite: false })); fl.rotation.x = -Math.PI / 2; fl.position.y = .004; holder.add(fl);
  const { m, u } = standPhotoMat(it.entry?.small || it.entry?.tex, focus); it.lodMats = [m];
  const photo = plane(w, h, m);
  if (photoStand) {                                      // the stand in the photograph stands on the museum floor
    photo.position.y = h / 2 - clamp(+a.sculpture.ground || 0, 0, .5) * h;
  } else {                                               // a white plinth with a label
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(rb, rb, plinthH - .04, 72), stdMat(dark ? '#161514' : '#efece6', .55)); plinth.position.y = .04 + (plinthH - .04) / 2; g.add(plinth);
    const reveal = new THREE.Mesh(new THREE.CylinderGeometry(rb - .035, rb - .035, .04, 72), stdMat('#0e0d0c', .6)); reveal.position.y = .02; g.add(reveal);
    photo.position.y = plinthH + .02 + h / 2;
    const lb = textPlane((c, cw, ch) => {
      c.fillStyle = '#f8f5ef'; c.fillRect(0, 0, cw, ch); c.fillStyle = '#1f1b17'; c.font = '600 46px "Cormorant Garamond", Georgia, serif';
      const n = wrapText(c, a.title || 'Untitled', 30, 66, cw - 60, 46, 2);
      c.fillStyle = '#5e574d'; c.font = '400 23px Inter, sans-serif'; wrapText(c, a.meta || '', 30, 66 + n * 46 + 4, cw - 60, 30, 2);
      c.fillStyle = '#9b9286'; c.font = '500 19px Inter, sans-serif'; c.fillText(`No. ${it.index + 1}`, 30, ch - 24);
    }, 640, 320, .44, .22, false);
    lb.position.set(0, plinthH * .55, rb + .004); g.add(lb);
  }
  photo.renderOrder = 1; g.add(photo);
  // ceiling spotlight fixture
  const fx = new THREE.Group(); fx.position.set((it.nx || 0) * 1.2, WALL_H, (it.nz || 0) * 1.2); fx.visible = !it.rot;
  const rod = box(.012, .3, .012, stdMat('#1c1c1c', .45, .5)); rod.position.y = -.15; fx.add(rod);
  const can = new THREE.Mesh(new THREE.CylinderGeometry(.055, .07, .2, 14), stdMat('#1c1c1c', .45, .5)); can.position.y = -.36; can.rotation.x = -.3 * (it.nz || 0); fx.add(can);
  holder.add(fx);
  holder.traverse(o => { o.userData.art = it.index; });
  g.userData.fadeU = u; g.userData.fadeMin = photoStand ? .4 : 0;
  stands.push(g);
  return holder;
}
// Every frame: turn the displays toward the visitor and soften their backgrounds with distance.
export function updateStands(me) {
  for (const st of stands) {
    const p = st.parent.position, d = Math.hypot(me.x - p.x, me.z - p.z), u = st.userData.fadeU;
    st.rotation.y = Math.atan2(me.x - p.x, me.z - p.z);
    if (u) u.uFade.value = Math.max(st.userData.fadeMin, THREE.MathUtils.smoothstep(d, 4.5, 13));
  }
}

/* ---------------- video ---------------- */
// Poster shown on a screen: the picture, a play button and the title.
function posterCanvas(entry, title, external) {
  const c = mk(1600, 900), g = c.getContext('2d'); g.fillStyle = '#0b0b0d'; g.fillRect(0, 0, 1600, 900);
  const img = entry?.full?.image;
  if (img) { const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height, s = Math.max(1600 / iw, 900 / ih); g.globalAlpha = .55; g.drawImage(img, (1600 - iw * s) / 2, (900 - ih * s) / 2, iw * s, ih * s); g.globalAlpha = 1; }
  const grd = g.createLinearGradient(0, 0, 0, 900); grd.addColorStop(0, 'rgba(0,0,0,.1)'); grd.addColorStop(1, 'rgba(0,0,0,.75)'); g.fillStyle = grd; g.fillRect(0, 0, 1600, 900);
  g.fillStyle = 'rgba(255,255,255,.92)'; g.beginPath(); g.arc(800, 400, 92, 0, 7); g.fill();
  g.fillStyle = '#111'; g.beginPath(); g.moveTo(772, 350); g.lineTo(772, 450); g.lineTo(852, 400); g.closePath(); g.fill();
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = '600 64px "Cormorant Garamond", Georgia, serif'; g.fillText(title || '', 800, 620, 1400);
  g.font = '500 28px Inter, sans-serif'; spacing(g, '8px'); g.globalAlpha = .8; g.fillText(external ? 'CLICK TO WATCH' : 'CLICK FOR THE FULL SCREENING', 800, 690);
  return c;
}
export function buildScreen(it) {
  const { a, w, h } = it, v = a.video, g = new THREE.Group(); g.position.set(it.x, it.y, it.z); g.rotation.y = it.rotY;
  const frame = box(w + .24, h + .24, .1, stdMat('#0c0c0c', .5)); frame.position.z = -.05; g.add(frame);
  const mat = new THREE.MeshBasicMaterial({ map: canvasTex(posterCanvas(it.entry, a.title, v.kind !== 'file')), toneMapped: false });   // the film's own colours
  const scr = plane(w, h, mat); scr.position.z = .006; g.add(scr);
  // projector at the back of the room and a faint beam of light
  const thr = it.throw || 10, apex = new THREE.Vector3(0, 5.6 - it.y, thr);
  const proj = box(.5, .28, .6, stdMat('#1a1a1a', .4, .4)); proj.position.copy(apex).add(new THREE.Vector3(0, .1, .2)); g.add(proj);
  const cs = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]], pos = [];
  for (let k = 0; k < 4; k++) { const [x1, y1] = cs[k], [x2, y2] = cs[(k + 1) % 4]; pos.push(apex.x, apex.y, apex.z, x1, y1, .02, x2, y2, .02); }
  const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.add(new THREE.Mesh(bg, new THREE.MeshBasicMaterial({ color: 0xfff1d8, transparent: true, opacity: .035, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })));
  const entry = { ri: it.ri, active() {} };
  if (v.kind === 'file' && Array.isArray(v.src) && v.src.length) {   // the clips play silently on the screen itself
    const vid = document.createElement('video'); vid.muted = true; vid.playsInline = true; vid.preload = 'none'; vid.loop = v.src.length === 1;
    let k = 0; vid.src = v.src[0];
    vid.addEventListener('ended', () => { k = (k + 1) % v.src.length; vid.src = v.src[k]; vid.play().catch(() => {}); });
    // sharp at any distance (mipmaps + anisotropic filtering), and shown at the film's own shape instead of stretched to 16:9
    const vt = new THREE.VideoTexture(vid); vt.colorSpace = THREE.SRGBColorSpace;
    vt.generateMipmaps = true; vt.minFilter = THREE.LinearMipmapLinearFilter; vt.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const fit = () => { if (vid.videoWidth) scr.scale.set(1, Math.min(1, (w * vid.videoHeight / vid.videoWidth) / h), 1); };
    let shown = false;
    vid.addEventListener('playing', () => { fit(); if (!shown) { mat.map = vt; mat.needsUpdate = true; shown = true; } });
    vid.addEventListener('loadedmetadata', () => { if (shown) fit(); });
    entry.video = vid;
    entry.active = on => { if (on && !isTheaterOpen()) vid.play().catch(() => {}); else vid.pause(); };
  }
  screens.push(entry);
  g.traverse(o => { o.userData.art = it.index; });
  return g;
}
export function buildMonitor(it) {
  const { a, w, h } = it, g = new THREE.Group(); g.position.set(it.x, it.y, it.z); g.rotation.y = it.rotY;
  const bez = box(w + .1, h + .1, .07, stdMat('#101113', .3, .5)); bez.position.z = .035; g.add(bez);
  const mat = new THREE.MeshBasicMaterial({ map: canvasTex(posterCanvas(it.entry, a.title, true)), toneMapped: false }); mat.color.setScalar(.9);
  const scr = plane(w, h, mat); scr.position.z = .071; g.add(scr);
  const led = new THREE.Mesh(new THREE.CircleGeometry(.012, 10), new THREE.MeshBasicMaterial({ color: 0x66ff99 })); led.position.set(w / 2 - .02, -h / 2 - .03, .071); g.add(led);
  const cs = plane(w + .7, h + .7, contactShadow(w + .1, h + .1)); cs.position.z = .003; g.add(cs);
  g.traverse(o => { o.userData.art = it.index; });
  return g;
}

/* ---------------- kiosk ---------------- */
export function buildKiosk(it) {
  const g = new THREE.Group(); g.position.set(it.x, 0, it.z); g.rotation.y = it.rotY;
  const dark = stdMat('#17181a', .32, .55), sw = it.w, sh = it.h, cy = it.y;
  const base = box(.95, .05, .62, dark); base.position.y = .025; g.add(base);
  const post = box(.11, cy - sh / 2 + .05, .09, dark); post.position.set(0, (cy - sh / 2 + .05) / 2, -.06); g.add(post);
  const sg = new THREE.Group(); sg.position.y = cy; sg.rotation.x = -.07; g.add(sg);
  const bez = box(sw + .1, sh + .1, .06, dark); bez.position.z = -.035; sg.add(bez);
  const c = mk(1600, 1000), x = c.getContext('2d'), links = it.a.kiosk.links;
  const host = (it.a.kiosk.href || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
  const pill = (px, py, pw, ph, r) => { x.beginPath(); x.roundRect ? x.roundRect(px, py, pw, ph, r) : x.rect(px, py, pw, ph); x.fill(); };
  const drawSocial = img => {                            // a card with the accounts and their icons
    const bg = x.createLinearGradient(0, 0, 1600, 1000); bg.addColorStop(0, '#1d2433'); bg.addColorStop(1, '#0f131b'); x.fillStyle = bg; x.fillRect(0, 0, 1600, 1000);
    x.strokeStyle = 'rgba(220,184,106,.6)'; x.lineWidth = 4; x.strokeRect(30, 30, 1540, 940);
    if (img) { x.save(); x.beginPath(); x.arc(800, 230, 130, 0, 7); x.clip(); try { x.drawImage(img, 670, 100, 260, 260); } catch (e) {} x.restore(); x.strokeStyle = '#dcb86a'; x.lineWidth = 6; x.beginPath(); x.arc(800, 230, 133, 0, 7); x.stroke(); }
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillStyle = '#dcb86a'; x.font = '600 74px "Cormorant Garamond", Georgia, serif'; x.fillText(it.a.title || 'Follow', 800, 432, 1400);
    x.fillStyle = 'rgba(241,235,224,.7)'; x.font = '400 30px Inter, sans-serif'; x.fillText(it.a.kiosk.tagline || 'Find new work online', 800, 492);
    links.forEach((ln, k) => {
      const y = 600 + k * 150, gx = 330;
      x.fillStyle = 'rgba(255,255,255,.07)'; pill(250, y - 58, 1100, 116, 58);
      x.strokeStyle = '#f1ebe0'; x.lineWidth = 7; x.lineJoin = 'round';
      if (/insta/i.test(ln.label)) { x.beginPath(); x.roundRect ? x.roundRect(gx - 34, y - 34, 68, 68, 20) : x.rect(gx - 34, y - 34, 68, 68); x.stroke(); x.beginPath(); x.arc(gx, y, 16, 0, 7); x.stroke(); x.fillStyle = '#f1ebe0'; x.beginPath(); x.arc(gx + 21, y - 21, 5, 0, 7); x.fill(); }
      else { x.beginPath(); x.arc(gx, y, 36, 0, 7); x.stroke(); x.fillStyle = '#f1ebe0'; x.font = '700 52px Inter, sans-serif'; x.fillText('f', gx + 2, y + 4); }
      x.textAlign = 'left'; x.fillStyle = '#f1ebe0'; x.font = '600 44px Inter, sans-serif'; x.fillText(ln.label, 410, y - 14);
      x.fillStyle = 'rgba(241,235,224,.7)'; x.font = '400 32px Inter, sans-serif'; x.fillText(ln.handle || '', 410, y + 30);
      x.textAlign = 'right'; x.fillStyle = '#dcb86a'; x.font = '600 40px Inter, sans-serif'; x.fillText('↗', 1300, y); x.textAlign = 'center';
    });
    x.textAlign = 'left';
  };
  const drawSite = img => {                              // the website in a browser window
    x.fillStyle = '#f4f4f2'; x.fillRect(0, 0, 1600, 1000);
    if (img) { const s = Math.max(1600 / img.width, 900 / img.height), w = img.width * s, h = img.height * s; try { x.drawImage(img, (1600 - w) / 2, 84, w, h); } catch (e) {} }
    x.fillStyle = '#26282c'; x.fillRect(0, 0, 1600, 84);
    ['#ff5f57', '#febc2e', '#28c840'].forEach((cl, k) => { x.fillStyle = cl; x.beginPath(); x.arc(40 + k * 34, 42, 11, 0, 7); x.fill(); });
    x.fillStyle = '#3a3d42'; pill(170, 20, 1260, 44, 22);
    x.fillStyle = '#e8e8e8'; x.font = '400 26px Inter, sans-serif'; x.textBaseline = 'middle'; x.fillText('🔒  ' + host, 200, 43);
    const grd = x.createLinearGradient(0, 760, 0, 1000); grd.addColorStop(0, 'rgba(10,12,16,0)'); grd.addColorStop(1, 'rgba(10,12,16,.82)'); x.fillStyle = grd; x.fillRect(0, 700, 1600, 300);
    x.fillStyle = '#dcb86a'; pill(520, 860, 560, 92, 46);
    x.fillStyle = '#1c1710'; x.textAlign = 'center'; x.font = '600 38px Inter, sans-serif'; x.fillText('Visit the website  ↗', 800, 907); x.textAlign = 'left';
    x.fillStyle = '#fff'; x.font = '600 50px "Cormorant Garamond", Georgia, serif'; x.fillText(it.a.title || host, 60, 800, 1480);
  };
  const draw = img => links ? drawSocial(img) : drawSite(img);
  draw(null);
  const tex = canvasTex(c), mat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }); mat.color.setScalar(.86);
  const scr = plane(sw, sh, mat); scr.position.z = .001; sg.add(scr);
  const img = it.entry?.full?.image; if (img) { draw(img); tex.needsUpdate = true; }
  const glow = plane(1.6, 1.0, new THREE.MeshBasicMaterial({ color: 0xbfd4ff, transparent: true, opacity: .08, depthWrite: false })); glow.rotation.x = -Math.PI / 2; glow.position.set(0, .008, .55); g.add(glow);
  g.traverse(o => { o.userData.art = it.index; });
  return g;
}

// Pick the right builder for an artwork.
export function buildExhibit(it) {
  if (it.kind === 'sculpture') return buildSculpture(it);
  if (it.kind === 'video') return it.monitor ? buildMonitor(it) : buildScreen(it);
  if (it.kind === 'kiosk') return buildKiosk(it);
  return buildArtwork(it);
}
export function clearExhibits() {
  for (const sc of screens) if (sc.video) { sc.video.pause(); sc.video.removeAttribute('src'); sc.video.load(); }
  stands.length = 0; screens.length = 0;
}
