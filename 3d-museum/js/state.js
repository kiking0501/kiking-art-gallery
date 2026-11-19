/* What is going on right now — shared by the 3D world, the visitor and the panels. */

export const S = {
  museum: null,     // the rooms and artworks (built by js/data/museum-data.js)
  layout: null,     // where every room and artwork is (built by js/world/layout.js)
  viewing: -1,      // index of the artwork being looked at (or last looked at)
  walk: null,       // an automatic walk in progress
  look: null,       // an automatic turn of the head in progress
  fov: 60, fovTarget: 60,   // camera zoom
  curRoom: -2,      // index of the room the visitor is in (-1 = none, -2 = not yet known)
};

// The visitor: position on the floor (x, z), where they face (yaw, pitch), walking speed.
export const me = { x: 2.6, z: 0, yaw: -Math.PI / 2, pitch: -.02, vx: 0, vz: 0, bob: 0 };

// The guided tour.
export const tour = { on: false, wait: 0 };
