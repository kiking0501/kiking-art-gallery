/* Materials (how surfaces look) and small mesh-making helpers. */
import * as THREE from 'three';
import { canvasTex } from './renderer.js';
import { TEX, SURF } from './textures.js';
import { mk } from '../util.js';
import { PLASTER_TILE } from './constants.js';

const matCache = new Map();
// A plain material, shared by everything with the same colour.
export function stdMat(color, rough = .92, metal = 0) {
  const k = `${color}|${rough}|${metal}`;
  if (!matCache.has(k)) { const m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal }); m.userData.keep = true; matCache.set(k, m); }
  return matCache.get(k);
}
// Painted plaster wall in a colour.
export function wallMat(color, rough = .93) {
  const k = `plaster|${color}|${rough}`;
  if (!matCache.has(k)) {
    const m = new THREE.MeshStandardMaterial({ color, roughness: rough, map: SURF.plasterA || null, normalMap: SURF.plasterN || null, normalScale: new THREE.Vector2(.6, .6), envMapIntensity: .45 });
    m.userData.keep = true; m.userData.plaster = true; matCache.set(k, m);
  }
  return matCache.get(k);
}

export const floorMat = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0, envMapIntensity: .3 }); floorMat.userData.keep = true;
// Once the floor and plaster textures exist, put them on the materials that use them.
export function applySurfaces() {
  Object.assign(floorMat, { map: SURF.floorA, normalMap: SURF.floorN, roughnessMap: SURF.floorR }); floorMat.needsUpdate = true;
  for (const m of matCache.values()) if (m.userData.plaster) { m.map = SURF.plasterA; m.normalMap = SURF.plasterN; m.needsUpdate = true; }
}

const keep = m => { m.userData.keep = true; return m; };
export const skyMat = keep(new THREE.MeshBasicMaterial({ map: TEX.sky })); skyMat.color.setRGB(2.6, 2.52, 2.4);          // bright skylight diffuser
export const skySunMat = keep(new THREE.MeshBasicMaterial({ map: TEX.sky })); skySunMat.color.setRGB(2.5, 2.85, 3.4);    // sunny-room skylight
export const sunPatchMat = keep(new THREE.MeshBasicMaterial({ map: TEX.sky, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 }));
sunPatchMat.color.setRGB(.2, .18, .14);                                                                                   // patches of sun on the floor
export const lensMat = keep(new THREE.MeshBasicMaterial()); lensMat.color.setRGB(6, 5.4, 4.4);                            // glowing spotlight lens
export const shadowMat = keep(new THREE.MeshBasicMaterial({ map: TEX.shadow, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));

/* ---------------- mesh helpers ---------------- */
export function box(w, h, d, mat) { return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); }
export function plane(w, h, mat) { return new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); }
// Box with texture coordinates in metres, so the plaster keeps its scale on every wall.
export function wbox(w, h, d, mat, tile = PLASTER_TILE) {
  const m = box(w, h, d, mat), uv = m.geometry.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]], ox = Math.random() * 3, oy = Math.random() * 3;
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0] / tile + ox, uv.getY(i) * dims[f][1] / tile + oy); }
  return m;
}
export function mplane(w, h, mat, tile) { const m = plane(w, h, mat), uv = m.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / tile, uv.getY(i) * h / tile); return m; }
// A flat panel with text or drawing painted by drawFn(context, canvasWidth, canvasHeight).
export function textPlane(drawFn, cw, ch, w, h, transparent = true) {
  const c = mk(cw, ch), g = c.getContext('2d'); drawFn(g, cw, ch);
  const m = new THREE.MeshStandardMaterial({ map: canvasTex(c), transparent, depthWrite: !transparent, roughness: .75, envMapIntensity: .3 });
  return plane(w, h, m);
}
// Gold lettering material (titles on walls).
export function goldMat(canvas, color = '#dcb86a', glow = .3) {
  return new THREE.MeshStandardMaterial({ map: canvasTex(canvas), color, emissive: color, emissiveIntensity: glow, metalness: .5, roughness: .34, transparent: true, depthWrite: false });
}
