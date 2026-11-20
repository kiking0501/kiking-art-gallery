/* The exhibits themselves:
     buildArtwork   framed picture on a wall, with its label and spotlight
     buildSculpture photo of a 3D piece shown as a freestanding display that turns to face you
     buildScreen    projection screen of a screening room (theatre)
     buildMonitor   flat screen on a wall (a video that isn't in a theatre)
     buildKiosk     freestanding screen that opens a website or social media
     buildDocument  a page laid flat on an archive table
     buildCentrepiece  the large piece in the middle of a round room, on a marble drum */
import * as THREE from 'three';
import { clamp, mk, wrapText, spacing, SERIF, SANS } from '../util.js';
import { canvasTex, renderer, MOBILE } from './renderer.js';
import { TEX, SURF, contactShadow } from './textures.js';
import { stdMat, lensMat, box, plane, textPlane } from './materials.js';
import { isTheaterOpen } from '../ui/theater.js';
import { WALL_H } from './constants.js';

export const stands = [];    // freestanding displays (turned toward the visitor every frame)
export const screens = [];   // video screens that can play on their own

/* ---------------- labels ----------------
   The small white card beside each work, as in a real museum: title, medium and number, lit by the room.
   Far away it uses a small texture; within a few metres a sharp one is drawn (see updateLabelLOD), which
   keeps graphics memory low. (The details card on screen lines up with it while in view: it.labelObj.) */
const labels = [];
function drawLabel(c, a, it, cw, ch) {
  const u = cw * .5625;                                    // text in the proportions of a 16:9 card, whatever its shape
    c.fillStyle = '#fbf9f4'; c.fillRect(0, 0, cw, ch);
    c.strokeStyle = 'rgba(0,0,0,.07)'; c.lineWidth = 5; c.strokeRect(2, 2, cw - 4, ch - 4);
    const L = Math.round(cw * .055), R = cw - L, title = a.title || 'Untitled';
    const lines = sz => { c.font = `500 ${sz}px ${SERIF}`; let k = 1, ln = ''; for (const wd of title.split(/\s+/)) { const t = ln ? ln + ' ' + wd : wd; if (c.measureText(t).width > R - L && ln) { k++; ln = wd; } else ln = t; } return k; };
    let tl = Math.round(u * .139); while (tl > u * .1 && lines(tl) > 2) tl -= 4;   // a long title in smaller letters, never cut short
    c.fillStyle = '#100d0b'; c.font = `500 ${tl}px ${SERIF}`;
    const y0 = Math.round(u * .07) + tl, n = wrapText(c, title, L, y0, R - L, tl * 1.04, 2);
    c.fillStyle = '#48413a'; c.font = `400 ${Math.round(u * .069)}px ${SANS}`;
    wrapText(c, a.meta || '', L, y0 + (n - 1) * tl * 1.04 + Math.round(u * .11), R - L, Math.round(u * .09), 2);
    c.font = `600 ${Math.round(u * .05)}px ${SANS}`; spacing(c, '4px');
    c.fillStyle = '#958c80'; c.fillText(`NO. ${it.index + 1}`, L, ch - Math.round(u * .075)); spacing(c, '0px');
}
function labelCanvas(a, it, w, h, cw) { const ch = Math.round(cw * h / w), c = mk(cw, ch); drawLabel(c.getContext('2d'), a, it, cw, ch); return c; }
function label(a, it, w, h) {
  const lo = canvasTex(labelCanvas(a, it, w, h, MOBILE ? 384 : 512));
  const face = plane(w, h, new THREE.MeshStandardMaterial({ map: lo, roughness: .85, envMapIntensity: .3 }));
  labels.push({ face, a, it, w, h, lo, hi: null, pos: null });
  // a thin mounted card with a faint shadow, so its edges read crisply against the wall
  const g = new THREE.Group(), card = box(w, h, .006, stdMat('#efeae1', .8)); card.position.z = .003; g.add(card);
  const sh = plane(w + .1, h + .1, contactShadow(w, h)); sh.position.z = .0008; sh.material.opacity = .32; g.add(sh);
  face.position.z = .0065; g.add(face);
  g.traverse(o => { o.userData.kind = 'label'; });
  return g;
}
// Every quarter second: sharp textures for the labels near the visitor, small ones for the rest.
export function updateLabelLOD(me) {
  let made = 0;
  for (const L of labels) {
    if (!L.pos) { L.pos = new THREE.Vector3(); L.face.getWorldPosition(L.pos); }
    const d = Math.hypot(L.pos.x - me.x, L.pos.z - me.z);
    if (d < 7 && !L.hi && made < 3) {
      L.hi = canvasTex(labelCanvas(L.a, L.it, L.w, L.h, MOBILE ? 1024 : 1536)); L.face.material.map = L.hi; made++;
    } else if (d > 10 && L.hi) { L.face.material.map = L.lo; L.hi.dispose(); L.hi = null; }
  }
}

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
  // wall label, small as in a real museum (click it for the details)
  const pl = label(a, it, .34, .19125);
  pl.position.set((it.labelX ?? ow / 2) + .42, 1.32 + (it.labelRow || 0) * .24 - it.y, .012); if (it.upper) pl.traverse(o => { o.visible = false; }); else it.labelObj = pl; g.add(pl);
  g.traverse(o => { o.userData.art = it.index; });
  return g;
}

/* ---------------- freestanding photo display ---------------- */
// Photo material whose background softly blurs and fades with distance, keeping the focus area (the piece itself).
// `soft` [x, y, w, h]: fade the photo out to a soft oval round the piece instead of its square edges.
// `tri` [[x, y], [x, y], [x, y]] and the photo's aspect: fade it out to a soft-edged triangle instead.
function standPhotoMat(tex, focus, soft, tri, aspect = 1, cut = null, sharp = 0, key = null, keyEdge = null) {
  const t = Array.isArray(tri) && tri.length === 3 ? tri : null;
  const u = { uFocus: { value: new THREE.Vector4(...focus) }, uFade: { value: 0 }, uSoft: { value: new THREE.Vector4(...(soft || [0, 0, 0, 0])) },
    uTriA: { value: new THREE.Vector4(...(t ? [...t[0], ...t[1]] : [0, 0, 0, 0])) }, uTriB: { value: new THREE.Vector4(...(t ? [...t[2], .045, aspect] : [0, 0, 0, 0])) },
    uCut: { value: new THREE.Vector2(...(Array.isArray(cut) ? cut : [0, 0])) }, uSharp: { value: +sharp || 0 },
    uKey: { value: new THREE.Vector3(...(Array.isArray(key) ? key : [0, 0, 0])) }, uKeyEdge: { value: new THREE.Vector2(...(Array.isArray(keyEdge) ? keyEdge : [0, 0])) } };
  const m = new THREE.MeshBasicMaterial({ map: tex || null, transparent: true, depthWrite: false, toneMapped: false });   // true colours
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, u);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
uniform vec4 uFocus; uniform float uFade; uniform vec4 uSoft; uniform vec4 uTriA; uniform vec4 uTriB; uniform vec2 uCut; uniform float uSharp; uniform vec3 uKey; uniform vec2 uKeyEdge;
float sdTri(vec2 p, vec2 p0, vec2 p1, vec2 p2) {          // signed distance to a triangle (negative inside)
  vec2 e0 = p1 - p0, e1 = p2 - p1, e2 = p0 - p2, v0 = p - p0, v1 = p - p1, v2 = p - p2;
  vec2 q0 = v0 - e0 * clamp(dot(v0, e0) / dot(e0, e0), 0., 1.), q1 = v1 - e1 * clamp(dot(v1, e1) / dot(e1, e1), 0., 1.), q2 = v2 - e2 * clamp(dot(v2, e2) / dot(e2, e2), 0., 1.);
  float s = sign(e0.x * e2.y - e0.y * e2.x);
  vec2 d = min(min(vec2(dot(q0, q0), s * (v0.x * e0.y - v0.y * e0.x)), vec2(dot(q1, q1), s * (v1.x * e1.y - v1.y * e1.x))), vec2(dot(q2, q2), s * (v2.x * e2.y - v2.y * e2.x)));
  return -sqrt(d.x) * sign(d.y);
}`)
      .replace('#include <map_fragment>', `
        #ifdef USE_MAP
          float fd = length((vMapUv - uFocus.xy) / uFocus.zw);
          float bg = smoothstep(.78, 1.3, fd);
          vec4 sampledDiffuseColor = texture2D(map, vMapUv, bg * uFade * 4.5);
          if (uSharp > 0.) {                               // an enlarged photo: a light unsharp mask
            vec2 tx = 1. / vec2(textureSize(map, 0));
            vec3 nb = (texture2D(map, vMapUv + vec2(tx.x, 0.)).rgb + texture2D(map, vMapUv - vec2(tx.x, 0.)).rgb + texture2D(map, vMapUv + vec2(0., tx.y)).rgb + texture2D(map, vMapUv - vec2(0., tx.y)).rgb) * .25;
            sampledDiffuseColor.rgb = clamp(sampledDiffuseColor.rgb + (sampledDiffuseColor.rgb - nb) * uSharp, 0., 1.);
          }
          diffuseColor *= sampledDiffuseColor;
          vec2 e2 = min(vMapUv, 1. - vMapUv);
          diffuseColor.a *= smoothstep(0., .03, min(e2.x, e2.y)) * (1. - bg * uFade * .97);
          float sd = uSoft.z > 0. ? length((vMapUv - uSoft.xy) / uSoft.zw) : 0.;
          vec2 tk = vec2(uTriB.w, 1.); float td = uTriB.w > 0. ? sdTri(vMapUv * tk, uTriA.xy * tk, uTriA.zw * tk, uTriB.xy * tk) : 0.;
          if (uSoft.z > 0.) diffuseColor.a *= 1. - smoothstep(.75, 1.15, sd);
          if (uKey.y > 0.) {                               // the photo's dark background keyed out: dark, colourless pixels go, the piece stays
            vec3 kc = pow(max(sampledDiffuseColor.rgb, vec3(0.)), vec3(1. / 2.2));
            float kLum = dot(kc, vec3(.299, .587, .114)), kSat = max(kc.r, max(kc.g, kc.b)) - min(kc.r, min(kc.g, kc.b));
            float kKeep = smoothstep(uKey.x, uKey.y, max(kLum * .85, kSat * uKey.z));
            // only around the outside of the piece, never between its lines: the outer ring of a round outline,
            // or a band just inside the edges of a triangle
            float kEdge = uKeyEdge.y <= 0. ? 1. : uTriB.w > 0. ? smoothstep(-uKeyEdge.x, -uKeyEdge.x * .3, td) : smoothstep(uKeyEdge.x, uKeyEdge.y, sd);
            diffuseColor.a *= 1. - kEdge * (1. - kKeep);
          }
          if (uCut.y > 0.) diffuseColor.a *= 1. - smoothstep(uCut.x, uCut.y, vMapUv.y);   // the top of the photo trimmed away
          if (uTriB.w > 0.) diffuseColor.a *= 1. - smoothstep(-.012, uTriB.z, td);
        #endif`);
  };
  m.customProgramCacheKey = () => 'standPhoto6';
  return { m, u };
}
export function buildSculpture(it) {
  if (it.a.sculpture.main) return buildCentrepiece(it);
  const { a, w, h, plinthH, base } = it, sc = a.sculpture, dark = it.mood === 'dark', rb = base / 2, photoStand = sc.base === 'photo' && !sc.soft && !sc.tri;
  const focus = Array.isArray(a.sculpture.focus) && a.sculpture.focus.length === 4 ? a.sculpture.focus : [.5, .5, .44, .46];
  const holder = new THREE.Group(); holder.position.set(it.x, 0, it.z);
  const g = new THREE.Group(); holder.add(g);            // this part turns to face the visitor
  const fl = plane(base + 1.2, base + 1.2, new THREE.MeshBasicMaterial({ map: TEX.wash, color: 0x000000, transparent: true, opacity: .45, depthWrite: false })); fl.rotation.x = -Math.PI / 2; fl.position.y = .004; holder.add(fl);
  const { m, u } = standPhotoMat(it.entry?.small || it.entry?.tex, focus, sc.soft, sc.tri, it.entry?.aspect || w / h, sc.cut, sc.sharp, sc.key, sc.keyEdge); it.lodMats = [m];
  const photo = plane(w, h, m);
  if (photoStand) {                                      // the stand in the photograph stands on the museum floor
    photo.position.y = h / 2 - clamp(+a.sculpture.ground || 0, 0, .5) * h;
  } else {                                               // a white plinth with a label
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(rb, rb, plinthH - .04, 72), stdMat(dark ? '#161514' : '#efece6', .55)); plinth.position.y = .04 + (plinthH - .04) / 2; g.add(plinth);
    const reveal = new THREE.Mesh(new THREE.CylinderGeometry(rb - .035, rb - .035, .04, 72), stdMat('#0e0d0c', .6)); reveal.position.y = .02; g.add(reveal);
    photo.position.y = sc.sit !== undefined ? plinthH + (+sc.lift || 0) - sc.sit * h + h / 2   // the piece itself floats a little above the plinth
                                            : plinthH + .02 + h / 2;
    const lb = label(a, it, .44, .22);
    lb.position.set(0, plinthH * .55, rb + .004); g.add(lb); it.labelObj = lb;
  }
  photo.renderOrder = 1; g.add(photo);
  // ceiling spotlight fixture
  const fx = new THREE.Group(); fx.position.set((it.nx || 0) * 1.2, WALL_H, (it.nz || 0) * 1.2); fx.visible = !it.rot;
  const rod = box(.012, .3, .012, stdMat('#1c1c1c', .45, .5)); rod.position.y = -.15; fx.add(rod);
  const can = new THREE.Mesh(new THREE.CylinderGeometry(.055, .07, .2, 14), stdMat('#1c1c1c', .45, .5)); can.position.y = -.36; can.rotation.x = -.3 * (it.nz || 0); fx.add(can);
  holder.add(fx);
  holder.traverse(o => { o.userData.art = it.index; });
  g.userData.fadeU = u; g.userData.fadeMin = it.rot ? 1 : photoStand ? .4 : 0;   // in the round chamber: always the soft, ball-like look, near or far
  stands.push(g);
  return holder;
}
/* ---------------- the centrepiece of a round room ---------------- */
function plaque(a, it) { return label(a, it, .44, .22); }   // the label on the centrepiece's drum
export function buildCentrepiece(it) {
  const { a, w, h, plinthH, base } = it, sc = a.sculpture, rb = base / 2;
  const soft = Array.isArray(sc.soft) && sc.soft.length === 4 ? sc.soft : [.5, .55, .34, .3];
  const holder = new THREE.Group(); holder.position.set(it.x, 0, it.z);
  // a drum of white marble, with a dark reveal at the floor and a thin bronze band under its top
  const marble = new THREE.MeshStandardMaterial({ color: '#f2efe9', map: SURF.marbleV || null, roughness: .26, envMapIntensity: .6 });
  const bronze = stdMat('#5a4630', .35, .8);
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(rb, rb, plinthH - .1, 120), marble); drum.position.y = .06 + (plinthH - .1) / 2; holder.add(drum);
  const reveal = new THREE.Mesh(new THREE.CylinderGeometry(rb - .06, rb - .06, .06, 120), stdMat('#0e0d0c', .6)); reveal.position.y = .03; holder.add(reveal);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(rb + .006, rb + .006, .035, 120), bronze); band.position.y = plinthH - .1; holder.add(band);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(rb + .05, rb + .05, .08, 120), marble); cap.position.y = plinthH - .04; holder.add(cap);
  const fl = plane(base + 1.6, base + 1.6, new THREE.MeshBasicMaterial({ map: TEX.wash, color: 0x000000, transparent: true, opacity: .4, depthWrite: false })); fl.rotation.x = -Math.PI / 2; fl.position.y = .005; holder.add(fl);
  // its label, on the side facing the viewing point
  const lb = plaque(a, it), la = Math.atan2(it.nx || -1, it.nz || 0); lb.position.set(Math.sin(la) * (rb + .012), plinthH * .55, Math.cos(la) * (rb + .012)); lb.rotation.y = la; holder.add(lb); it.labelObj = lb;
  // the photo: large, turned toward the visitor, fading out to a soft oval round the piece
  const g = new THREE.Group(); holder.add(g);
  const { m, u } = standPhotoMat(it.entry?.small || it.entry?.tex, soft, soft, null, 1, sc.cut, sc.sharp ?? .55, sc.key, sc.keyEdge); it.lodMats = [m];
  const photo = plane(w, h, m); photo.position.y = plinthH + (+sc.lift || 0) - (+sc.sit || .4) * h + h / 2; photo.renderOrder = 1; g.add(photo);   // floating above the drum
  holder.traverse(o => { o.userData.art = it.index; });
  g.userData.fadeU = u; g.userData.fadeMin = 1;   // soft at any distance
  stands.push(g);
  return holder;
}

/* ---------------- a page on an archive table ---------------- */
export function buildDocument(it) {
  const g = new THREE.Group(); g.position.set(it.x, it.y, it.z); g.rotation.y = it.rotY || 0;
  const am = new THREE.MeshBasicMaterial({ map: it.entry?.small || it.entry?.tex || null, toneMapped: false }); am.color.setScalar(.94); it.lodMats = [am];
  const pg = plane(it.w, it.h, am); pg.rotation.x = -Math.PI / 2; pg.position.y = .004; g.add(pg);   // top of the page away from the reader
  const cs = plane(it.w + .22, it.h + .22, contactShadow(it.w, it.h)); cs.rotation.x = -Math.PI / 2; cs.position.y = .001; g.add(cs);
  g.traverse(o => { o.userData.art = it.index; });
  return g;
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
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = `400 64px ${SERIF}`; g.fillText(title || '', 800, 620, 1400);
  g.font = `500 28px ${SANS}`; spacing(g, '8px'); g.globalAlpha = .8; g.fillText(external ? 'CLICK TO WATCH' : 'CLICK FOR THE FULL SCREENING', 800, 690);
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
  const clips = v.kind === 'file' ? v.src : v.preview;   // video files, or a YouTube/Facebook film's preview clips
  if (Array.isArray(clips) && clips.length) {            // the clips play silently on the screen itself
    const vid = document.createElement('video'); vid.muted = true; vid.playsInline = true; vid.preload = 'none'; vid.loop = clips.length === 1;
    let k = 0; vid.src = clips[0];
    vid.addEventListener('ended', () => { k = (k + 1) % clips.length; vid.src = clips[k]; vid.play().catch(() => {}); });
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
    x.fillStyle = '#dcb86a'; x.font = `400 74px ${SERIF}`; x.fillText(it.a.title || 'Follow', 800, 432, 1400);
    x.fillStyle = 'rgba(241,235,224,.7)'; x.font = `400 30px ${SANS}`; x.fillText(it.a.kiosk.tagline || 'Find new work online', 800, 492);
    links.forEach((ln, k) => {
      const y = 600 + k * 150, gx = 330;
      x.fillStyle = 'rgba(255,255,255,.07)'; pill(250, y - 58, 1100, 116, 58);
      x.strokeStyle = '#f1ebe0'; x.lineWidth = 7; x.lineJoin = 'round';
      if (/insta/i.test(ln.label)) { x.beginPath(); x.roundRect ? x.roundRect(gx - 34, y - 34, 68, 68, 20) : x.rect(gx - 34, y - 34, 68, 68); x.stroke(); x.beginPath(); x.arc(gx, y, 16, 0, 7); x.stroke(); x.fillStyle = '#f1ebe0'; x.beginPath(); x.arc(gx + 21, y - 21, 5, 0, 7); x.fill(); }
      else { x.beginPath(); x.arc(gx, y, 36, 0, 7); x.stroke(); x.fillStyle = '#f1ebe0'; x.font = `700 52px ${SANS}`; x.fillText('f', gx + 2, y + 4); }
      x.textAlign = 'left'; x.fillStyle = '#f1ebe0'; x.font = `600 44px ${SANS}`; x.fillText(ln.label, 410, y - 14);
      x.fillStyle = 'rgba(241,235,224,.7)'; x.font = `400 32px ${SANS}`; x.fillText(ln.handle || '', 410, y + 30);
      x.textAlign = 'right'; x.fillStyle = '#dcb86a'; x.font = `600 40px ${SANS}`; x.fillText('↗', 1300, y); x.textAlign = 'center';
    });
    x.textAlign = 'left';
  };
  const drawSite = img => {                              // the website in a browser window
    x.fillStyle = '#f4f4f2'; x.fillRect(0, 0, 1600, 1000);
    if (img) { const s = Math.max(1600 / img.width, 900 / img.height), w = img.width * s, h = img.height * s; try { x.drawImage(img, (1600 - w) / 2, 84, w, h); } catch (e) {} }
    x.fillStyle = '#26282c'; x.fillRect(0, 0, 1600, 84);
    ['#ff5f57', '#febc2e', '#28c840'].forEach((cl, k) => { x.fillStyle = cl; x.beginPath(); x.arc(40 + k * 34, 42, 11, 0, 7); x.fill(); });
    x.fillStyle = '#3a3d42'; pill(170, 20, 1260, 44, 22);
    x.fillStyle = '#e8e8e8'; x.font = `400 26px ${SANS}`; x.textBaseline = 'middle'; x.fillText('🔒  ' + host, 200, 43);
    const grd = x.createLinearGradient(0, 760, 0, 1000); grd.addColorStop(0, 'rgba(10,12,16,0)'); grd.addColorStop(1, 'rgba(10,12,16,.82)'); x.fillStyle = grd; x.fillRect(0, 700, 1600, 300);
    x.fillStyle = '#dcb86a'; pill(520, 860, 560, 92, 46);
    x.fillStyle = '#1c1710'; x.textAlign = 'center'; x.font = `600 38px ${SANS}`; x.fillText('Visit the website  ↗', 800, 907); x.textAlign = 'left';
    x.fillStyle = '#fff'; x.font = `400 50px ${SERIF}`; x.fillText(it.a.title || host, 60, 800, 1480);
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
  if (it.kind === 'doc') return buildDocument(it);
  return buildArtwork(it);
}
export function clearExhibits() {
  for (const sc of screens) if (sc.video) { sc.video.pause(); sc.video.removeAttribute('src'); sc.video.load(); }
  stands.length = 0; screens.length = 0;
  for (const L of labels) if (L.hi) L.hi.dispose(); labels.length = 0;
}
