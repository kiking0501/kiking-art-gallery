/* Builds the whole 3D museum from S.museum: works out the layout, then adds
   the floor, every room and every exhibit to the world. */
import * as THREE from 'three';
import { S } from '../state.js';
import { world, camera } from './renderer.js';
import { floorMat, mplane } from './materials.js';
import { computeLayout } from './layout.js';
import { buildRoomShell, buildCrossWalls } from './rooms.js';
import { buildRotunda } from './rotunda.js';
import { buildExhibit, clearExhibits } from './artworks.js';
import { buildSpots } from './floor-marks.js';
import { resetSpots } from './lighting.js';
import { FLOOR_TILE } from './constants.js';

export const pickables = [];   // what mouse clicks can hit

function clearWorld() {
  clearExhibits();
  world.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    for (const m of o.material ? [o.material].flat() : []) { if (m.userData.keep) continue; if (m.map && !m.map.userData.keep) m.map.dispose(); m.dispose(); }
  });
  world.clear(); pickables.length = 0;
}

export function buildScene() {
  clearWorld();
  S.layout = computeLayout();
  const { rooms, bbox, arts } = S.layout;
  const floorGroup = new THREE.Group(), wallGroup = new THREE.Group(), artGroup = new THREE.Group();
  world.add(floorGroup, wallGroup, artGroup);
  camera.far = Math.max(150, Math.hypot(bbox.x1 - bbox.x0, bbox.z1 - bbox.z0) + 30); camera.updateProjectionMatrix();
  resetSpots();
  // one stone floor under the whole building
  const floor = mplane(bbox.x1 - bbox.x0 + 2, bbox.z1 - bbox.z0 + 2, floorMat, FLOOR_TILE);
  floor.rotation.x = -Math.PI / 2; floor.position.set((bbox.x0 + bbox.x1) / 2, 0, (bbox.z0 + bbox.z1) / 2); floor.userData.kind = 'floor'; floorGroup.add(floor);
  // the rooms, each built in its own frame
  const extraPick = [];
  for (const r of rooms) {
    if (!r) continue;
    const rg = new THREE.Group(), rfg = new THREE.Group();
    for (const g of [rg, rfg]) { g.position.set(r.ox, 0, r.oz); g.rotation.y = r.theta; }
    wallGroup.add(rg); floorGroup.add(rfg);
    if (r.rot) buildRotunda(r, rg, rfg, extraPick); else { buildRoomShell(r, rg, rfg); buildCrossWalls(r, rg, rfg); }
  }
  // the exhibits and their viewing points
  for (const it of arts) artGroup.add(buildExhibit(it));
  const spotGroup = buildSpots(arts); world.add(spotGroup);
  pickables.push(floor, ...extraPick, wallGroup, artGroup, spotGroup);
}
