/* START-UP — the order things happen in:
     1. read the gallery's files and config/ → the list of rooms and works
     2. generate the floor and wall textures, load every picture
     3. build the 3D museum, put the visitor in the welcome room
     4. run the frame loop: move, light, draw */
import site from '../config/museum.js';
import * as roomsConfig from '../config/rooms.js';
import { S, me } from './state.js';
import { renderer, scene, camera } from './world/renderer.js';
import { generateSurfaces, preloadAll, updateLOD, streamPictures } from './world/textures.js';
import { applySurfaces } from './world/materials.js';
import { buildScene } from './world/scene.js';
import { updateStands } from './world/artworks.js';
import { placeSkyLights, updateSpots, updateMood } from './world/lighting.js';
import { loadGallery } from './data/gallery.js';
import { buildMuseum } from './data/museum-data.js';
import { buildNav, spawn, updateMovement, viewArt, walkTo, walkable, navCell, astar } from './visitor/movement.js';
import { initInput, updateHover } from './visitor/input.js';
import { updateTourProgress } from './visitor/tour.js';
import { attract, startAttract, stopAttract, updateAttract } from './visitor/attract.js';
import { checkRoomChange, setTitle } from './ui/hud.js';
import { initInfoCard } from './ui/info-card.js';
import { initTheater } from './ui/theater.js';
import { initOverlays, setFarewell, toast, backToEntrance } from './ui/overlays.js';
import { $ } from './util.js';
import { initMap, drawMapBase, drawMap, toggleMap } from './ui/map-panel.js';
import { initNavbar } from './ui/navbar.js';
import { fillIntro, setLoading, showError, ready } from './ui/intro.js';

async function start() {
  const root = site.galleryRoot.replace(/\/$/, '');
  fillIntro(site, encodeURI(`${root}/${site.avatar}`));
  setTitle(site.title);

  // 1. the rooms and works
  setLoading('Reading the gallery…');
  const gallery = await loadGallery(root);
  S.museum = await buildMuseum(gallery, site, roomsConfig);
  const n = S.museum.rooms.reduce((s, r) => s + r.artworks.length, 0);

  // 2. textures and pictures (wait briefly for the fonts used on the walls)
  try { await Promise.race([Promise.all([document.fonts.load('600 64px "Cormorant Garamond"'), document.fonts.load('400 20px Inter')]), new Promise(r => setTimeout(r, 2500))]); } catch (e) {}
  setLoading('Preparing floors and plaster…');
  await new Promise(r => setTimeout(r, 30));
  generateSurfaces(); applySurfaces();
  await preloadAll(S.museum, (d, t) => setLoading(`Hanging artwork ${d} of ${t}…`));

  // 3. the building
  buildScene(); buildNav(); spawn(); drawMapBase();
  const home = { x: me.x, z: me.z };
  // pictures arrive in the background, nearest first (to the welcome room and, meanwhile, to the drifting view)
  streamPictures(S.layout.arts, () => attract.on ? [home, me] : [me]);
  startAttract();
  initInput(); initInfoCard(site.credit); initTheater(); initOverlays(); initMap(); initNavbar(site.galleryUrl);
  setFarewell(S.layout.closing?.data);
  $('farewellBack').onclick = () => backToEntrance(() => { S.walk = null; S.look = null; me.vx = me.vz = 0; spawn(); });
  setLoading(`${n} works in ${S.museum.rooms.length} rooms`);
  ready(site.enterButton || 'Enter the museum', () => {
    stopAttract(); S.walk = null; S.look = null; spawn();               // back to the start
    if (site.enterHint) setTimeout(() => toast(site.enterHint), 400);
  });

  // 4. every frame
  let last = performance.now(), lodT = 0;
  renderer.setAnimationLoop(t => {
    const dt = Math.min(.05, (t - last) / 1000); last = t;
    updateAttract(dt);
    updateMovement(dt);
    checkRoomChange();
    lodT -= dt; if (lodT <= 0) { lodT = .25; updateLOD(S.layout.arts, me); placeSkyLights(); }
    updateStands(me); updateMood(dt); updateSpots(dt);
    updateHover(t); drawMap(); updateTourProgress();
    renderer.render(scene, camera);
  });

  // for testing from the browser console: __museum.viewArt(3) etc.
  window.__museum = { S, me, viewArt, walkTo, walkable, toggleMap, get layout() { return S.layout; },
    pathDbg: (a, b) => { const s0 = navCell(a.x, a.z), t0 = navCell(b.x, b.z); return s0 < 0 || t0 < 0 ? 'nocell' : (astar(s0, t0) || []).length; } };
}

start().catch(e => {
  console.error(e);
  showError(location.protocol === 'file:'
    ? 'Please open the museum through a web server — see online-museum/README.md.'
    : `The museum could not start: ${e.message}`);
});
