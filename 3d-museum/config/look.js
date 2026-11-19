/* =====================================================================
   3D LOOK — sizes of the building, picture frames, room lighting
   =====================================================================
   All sizes are in metres. Changing them reshapes every room at once.
*/

// The rooms: two parallel rows of galleries joined by doorways.
export const BUILDING = {
  eyeHeight: 1.62,        // how high the visitor's eyes are
  roomWidth: 13,          // distance between a room's two long walls
  wallHeight: 6.4,        // ceiling height
  wallThickness: 0.3,
  doorWidth: 3.2,
  doorHeight: 3.9,
  pictureGap: 1.8,        // space between two pictures on a wall (a room can override it with `gap`)
  wallMargin: 2,          // free wall kept at each end of a long wall
  minRoomLength: 12,      // a room is at least this long, however few pictures it has
  visitorRadius: 0.35,    // how close the visitor can get to walls and stands
  benches: false,         // true = a bench in the middle of ordinary rooms (large rooms without sculptures)
  theatreSeats: false,    // true = rows of benches facing the screen in the screening rooms
};

// The round room (any room with layout: 'rotunda' in config/rooms.js).
export const ROTUNDA = {
  radius: 11,             // floor radius
  columnRing: 9.6,        // the columns stand on this circle, just inside the wall
  height: 10.4,           // top of the wall, where the dome starts
  balconyBottom: 5.3,     // top of the lower columns
  balconyFloor: 6.02,     // the upper gallery's floor
  upperTop: 9.75,         // top of the upper columns
};

// Picture frames. A room picks one with `frame`, a single picture can override it.
//   fw = frame moulding width, depth = how far it stands off the wall
export const FRAMES = {
  black: { fw: .045, mat: 0, depth: .055, color: '#141414', metal: .1, rough: .45 },
  gold:  { fw: .085, mat: 0, depth: .07,  color: '#b38b45', metal: .9, rough: .32 },
  wood:  { fw: .06,  mat: 0, depth: .06,  color: '#5b3b23', metal: 0,  rough: .6 },
  white: { fw: .04,  mat: 0, depth: .05,  color: '#efebe3', metal: 0,  rough: .5 },
  none:  { fw: 0,    mat: 0, depth: .045, color: '#e9e3d6', metal: 0,  rough: .8 },   // unframed canvas
};

// Room lighting. A room picks one with `mood`.
//   sky = daylight through the skylight, hemi/env = general fill light, spot = picture spotlights
export const MOODS = {
  standard: { sky: 1,   hemi: .6,  env: .32, spot: 1 },
  dark:     { sky: 0,   hemi: .04, env: .04, spot: 1.7 },   // a dark room, only the works lit (screening rooms)
  sunny:    { sky: 1.7, hemi: .82, env: .45, spot: .8 },
};

// Wall colours used, in turn, by rooms that don't choose their own `wall`.
export const DEFAULT_WALLS = ['#ece7dd', '#34493f', '#6e2f35', '#2d3a4f', '#d9cdb8', '#4a3f5c'];

// Lights and rendering.
export const RENDER = {
  maxPixelRatio: 1.25,    // higher = sharper but slower
  skylightIntensity: 3,
  spotlights: 8,          // how many works are spotlit at once (the nearest ones)
  spotIntensity: 30,
  background: '#141210',
};
