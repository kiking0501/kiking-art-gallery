/* Getting the graphics card ready while the entry card is up: the shaders are compiled in the background
   and the textures uploaded a few at a time, so that entering the museum doesn't stall on them all at once.
   It keeps looking for textures that arrive later (pictures still downloading) and uploads those too. */
import { renderer } from './renderer.js';

const KEYS = ['map', 'emissiveMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'alphaMap', 'aoMap', 'bumpMap'];
let world = null, queue = [], done = new WeakSet(), lastScan = 0;
function scan() {
  lastScan = performance.now();
  world.traverse(o => { for (const m of [o.material].flat()) if (m) for (const k of KEYS) { const t = m[k]; if (t && t.isTexture && t.image && !done.has(t)) { done.add(t); queue.push(t); } } });
}
export function startWarmup(scene, camera) {
  world = scene; queue = []; done = new WeakSet(); scan();
  try { renderer.compileAsync(scene, camera).catch(() => {}); } catch (e) {}
}
// Every frame: upload textures for up to `budget` milliseconds (and look for new ones every second or so).
export function stepWarmup(budget) {
  if (!world) return;
  if (!queue.length) { if (performance.now() - lastScan > 1200) scan(); if (!queue.length) return; }
  const t0 = performance.now();
  while (queue.length && performance.now() - t0 < budget) { const t = queue.shift(); try { renderer.initTexture(t); } catch (e) {} }
}
