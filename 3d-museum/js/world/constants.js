/* Short names for the building sizes in config/look.js (metres). */
import { BUILDING as B, ROTUNDA as RT } from '../../config/look.js';

export const EYE = B.eyeHeight;
export const D = B.roomWidth, HALF_D = D / 2;
export const WALL_H = B.wallHeight, WALL_T = B.wallThickness;
export const DOOR_W = B.doorWidth, DOOR_H = B.doorHeight;
export const GAP = B.pictureGap, MARGIN = B.wallMargin, MIN_ROOM_W = B.minRoomLength;
export const R = B.visitorRadius;
export const BENCHES = B.benches !== false, THEATRE_SEATS = B.theatreSeats !== false;   // seating on/off
export const FACE = HALF_D - WALL_T / 2;          // distance from a room's centre line to the face of its long walls

export const ROT_R = RT.radius, ROT_RC = RT.columnRing, ROT_H = RT.height;
export const ROT_Y1 = RT.balconyBottom, ROT_Y2 = RT.balconyFloor, ROT_Y3 = RT.upperTop;

// Texture tiling (metres per repeat of the floor and plaster textures).
export const FLOOR_TILE = 4, PLASTER_TILE = 3;
