/* Marks on the floor: a gold ring at each artwork's viewing point, and the soft
   glow that follows the mouse to show where a click will take you. */
import * as THREE from 'three';
import { mk } from '../util.js';
import { canvasTex, scene } from './renderer.js';

function ringTex(kind) {
  const c = mk(256, 256), g = c.getContext('2d'), m = 128;
  if (kind === 'spot') {   // a gold ring with a dot
    const rg = g.createRadialGradient(m, m, 50, m, m, 127); rg.addColorStop(0, 'rgba(0,0,0,0)'); rg.addColorStop(.5, 'rgba(0,0,0,.34)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rg; g.fillRect(0, 0, 256, 256);
    const ig = g.createRadialGradient(m, m, 0, m, m, 80); ig.addColorStop(0, 'rgba(255,226,160,.45)'); ig.addColorStop(1, 'rgba(255,226,160,0)');
    g.fillStyle = ig; g.beginPath(); g.arc(m, m, 80, 0, 7); g.fill();
    g.strokeStyle = 'rgba(236,190,96,1)'; g.lineWidth = 14; g.beginPath(); g.arc(m, m, 82, 0, 7); g.stroke();
    g.strokeStyle = 'rgba(255,236,190,.75)'; g.lineWidth = 4; g.beginPath(); g.arc(m, m, 104, 0, 7); g.stroke();
    g.fillStyle = 'rgba(246,206,120,1)'; g.beginPath(); g.arc(m, m, 20, 0, 7); g.fill();
  } else {                 // a pool of light with a shadowed rim
    const rg = g.createRadialGradient(m, m, 0, m, m, 128);
    rg.addColorStop(0, 'rgba(255,246,222,.95)'); rg.addColorStop(.32, 'rgba(255,232,180,.55)'); rg.addColorStop(.62, 'rgba(255,220,160,.12)'); rg.addColorStop(.8, 'rgba(0,0,0,.3)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rg; g.fillRect(0, 0, 256, 256);
    g.strokeStyle = 'rgba(255,240,205,.95)'; g.lineWidth = 8; g.beginPath(); g.arc(m, m, 66, 0, 7); g.stroke();
  }
  return canvasTex(c, true);
}

const SPOT_SIZE = .52, GLOW_SIZE = .5;   // metres across
const spotMat = new THREE.MeshBasicMaterial({ map: ringTex('spot'), transparent: true, depthWrite: false, toneMapped: false, opacity: .95, polygonOffset: true, polygonOffsetFactor: -4 });
const spotMatHi = spotMat.clone(); spotMatHi.opacity = 1; spotMatHi.color.setRGB(1.35, 1.2, 1);
spotMat.userData.keep = spotMatHi.userData.keep = true;
const spotGeo = new THREE.PlaneGeometry(SPOT_SIZE, SPOT_SIZE);
const spotMeshes = [];

// One ring per artwork that has a viewing point.
export function buildSpots(arts, stops = []) {
  const group = new THREE.Group(); spotMeshes.length = 0;
  stops.forEach((st, k) => {                             // the wall texts' and the map's viewing points
    const m = new THREE.Mesh(spotGeo, spotMat); m.rotation.x = -Math.PI / 2; m.position.set(st.x, .016, st.z); m.renderOrder = 2;
    m.userData.kind = 'stopspot'; m.userData.stopIdx = k; group.add(m);
  });
  for (const it of arts) {
    if (!it.view) continue;
    const m = new THREE.Mesh(spotGeo, spotMat); m.rotation.x = -Math.PI / 2; m.position.set(it.view.x, .016, it.view.z); m.renderOrder = 2;
    m.userData.kind = 'spot'; m.userData.spot = it.index; group.add(m); spotMeshes[it.index] = m;
  }
  return group;
}
let lit = -1;
export function highlightSpot(i) {
  if (i === lit) return;
  if (spotMeshes[lit]) { spotMeshes[lit].material = spotMat; spotMeshes[lit].scale.setScalar(1); }
  lit = i;
  if (spotMeshes[i]) { spotMeshes[i].material = spotMatHi; spotMeshes[i].scale.setScalar(1.18); }
}

const glow = new THREE.Mesh(new THREE.PlaneGeometry(GLOW_SIZE, GLOW_SIZE), new THREE.MeshBasicMaterial({ map: ringTex('glow'), transparent: true, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -6 }));
glow.rotation.x = -Math.PI / 2; glow.visible = false; glow.renderOrder = 3; scene.add(glow);
// dest = {x, z} or null; t = time in ms (for a gentle pulse)
export function showGlow(dest, t) {
  if (!dest) { glow.visible = false; return; }
  if (!glow.visible) glow.position.set(dest.x, .02, dest.z);
  glow.visible = true; glow.position.x += (dest.x - glow.position.x) * .45; glow.position.z += (dest.z - glow.position.z) * .45;
  glow.scale.setScalar(1 + .08 * Math.sin(t * .005)); glow.material.opacity = .9;
}
