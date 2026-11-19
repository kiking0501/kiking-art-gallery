/* The WebGL renderer, the camera, the scene and its permanent lights. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { $ } from '../util.js';
import { RENDER } from '../../config/look.js';

export const MOBILE = matchMedia('(pointer: coarse)').matches;
export const LOWTEX = /lowtex/.test(location.search);          // testing aid: smaller generated textures

export const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, RENDER.maxPixelRatio));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.NeutralToneMapping;              // keeps artwork colours faithful
renderer.outputColorSpace = THREE.SRGBColorSpace;
$('stage').appendChild(renderer.domElement);
export const canvas = renderer.domElement;
export const MAX_ANISO = renderer.capabilities.getMaxAnisotropy();

export const scene = new THREE.Scene();
scene.background = new THREE.Color(RENDER.background);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.32;

export const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.05, 400);
camera.rotation.order = 'YXZ';

// General fill light; its strength follows the room's mood (js/world/lighting.js).
export const hemi = new THREE.HemisphereLight(0xfff6ea, 0x8f806e, 0.6); scene.add(hemi);
// Daylight from the skylights: soft area lights that follow the visitor from room to room.
RectAreaLightUniformsLib.init();
export const skyLights = [0, 1, 2, 3].map(() => { const l = new THREE.RectAreaLight(0xfff3e4, 0, 1, 1); l.rotation.x = -Math.PI / 2; scene.add(l); return l; });
// Picture spotlights: a small pool given to the works nearest the visitor.
export const spots = Array.from({ length: RENDER.spotlights }, () => {
  const sp = new THREE.SpotLight(0xffeed4, 0, 0, .45, .8, 2); sp.userData = { art: -1, k: 0, scale: 1 }; scene.add(sp, sp.target); return sp;
});

// Everything built from the museum data goes in here (rebuilt by js/world/scene.js).
export const world = new THREE.Group(); scene.add(world);

const resizeHooks = [];
export function onResize(fn) { resizeHooks.push(fn); }
addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  for (const fn of resizeHooks) fn();
});

export function canvasTex(c, keep = false) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = MAX_ANISO; t.userData.keep = keep; return t; }
