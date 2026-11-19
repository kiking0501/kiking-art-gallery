# Kiking's Art · Online Museum

A walk-through 3D museum of the gallery, running in the browser.
It lives in this `online-museum/` folder of the **kiking-art-gallery** repository and
builds itself from the gallery's own files every time it opens.

- [1. Dependency on the Art Gallery](#1-dependency-on-the-art-gallery)
- [2. Where to make changes, and for what](#2-where-to-make-changes-and-for-what)
- [3. Running it](#3-running-it)
- [4. What each file does](#4-what-each-file-does)

---

## 1. Dependency on the Art Gallery

The museum keeps **no copy** of any picture or text from the gallery. It reads them
from the folder above it (`..`, set as `galleryRoot` in `config/museum.js`).

### Files it reads

| Gallery file | What the museum takes from it | Used for |
|---|---|---|
| `../main.js` | `CATEGORY_MENU` and `CATEGORY_NAME` | the list of rooms, their **order**, **names** and **categories** |
| `../album/album_items.json` | for each album: file name, `title`, `meta`, `link` | the **pictures** in each room, in the same order, with their labels and links |
| `../album/<album id>/<file>` | the image files listed in `album_items.json` | the pictures on the walls |
| `../album/<album id>.html` | heading text inside `#main_content` (not picture captions) | a room's wall text, **only** if `config/rooms.js` gives no `description` |
| `../navigation/album_cover_*.jpg` | album covers | posters on the film screens |
| `../album/self_portraits/…` | self-portrait, profile picture | welcome room and entry card |
| `../resource/og_image_preview.png`, `../resource/favicon.png` | gallery preview, tab icon | last room, browser tab |
| a few other files named in `config/rooms.js` → `extras` | e.g. `album/polyhedramatics_the_dance/*.mov`, the press cuttings in `album/shining_beauty_of_mathematics/` | things that are on album pages but not in `album_items.json` |

How `main.js` is read: the museum runs it in isolation and only keeps the two menus,
so the rest of `main.js` (jQuery, page functions) doesn't matter. **Keep the names
`CATEGORY_MENU` and `CATEGORY_NAME`** — the museum looks for them.

How a picture's label is made from `album_items.json`:
`"title": "Niagara Falls, 2026"` and `"meta": "Watercolor, 12\" x 9\""` become
**Niagara Falls** / *Watercolor, 12" x 9" · 2026* (a year at the end of the title moves
to the medium line). A picture with no title uses its `meta` as the title.

### What follows the gallery automatically

| You do this in the gallery… | …and the museum |
|---|---|
| add a picture to an album (`album_items.json` + image file) | hangs it in that room, in list order |
| reorder pictures in `album_items.json` | rehangs them in the new order |
| change a title / medium / link in `album_items.json` | shows the new text on the label and artwork card |
| add an exhibition to `CATEGORY_MENU` (+ its list in `album_items.json` + folder) | adds a room for it, at the same place in the order |
| rename an exhibition in `CATEGORY_MENU` | renames the room (unless `config/rooms.js` gives it a `name`) |
| move an exhibition in `CATEGORY_MENU` | moves the room |

### What needs a matching change here

The museum's settings in `config/rooms.js` refer to gallery things **by id and file name**:

| If you change in the gallery… | …update in `config/rooms.js` | otherwise |
|---|---|---|
| an album **id** (the key in `main.js` / `album_items.json`) | the same key under `ROOMS` | the room loses its custom look (falls back to defaults) |
| a picture's **file name** | its key under `pictures:` / `order:` / `exclude:` | that picture loses its custom size/frame/sculpture setting |
| a file used in `extras` (moved, renamed, deleted) | its `src` | a grey "Picture unavailable" card hangs in its place |

### Outside the repository
- **three.js** (the 3D library) and the **fonts** load from public CDNs, so viewers need internet access.
- **YouTube / Facebook** films play in those sites' players.

---

## 2. Where to make changes, and for what

Most changes are in the three files of `config/`. Every setting there is optional and
commented.

| To change… | Edit | Example |
|---|---|---|
| **Pictures in a room** (add, remove, reorder, retitle) | the gallery's `album/album_items.json` | see 2.1 |
| **A room's look**: wall colour, frame, lighting, wall text | `config/rooms.js` → `ROOMS` | see 2.2 |
| **One picture**: size, frame, show as a sculpture, hang by the doorway | `config/rooms.js` → `pictures` | see 2.3 |
| **Pictures that aren't in album_items.json**: films, extra photos, website screens | `config/rooms.js` → `extras` | see 2.4 |
| **A new exhibition's room** | the gallery's `main.js` + `album_items.json`, then optionally `config/rooms.js` | see 2.5 |
| **Where a room sits** on the map | the gallery's `main.js`, or `config/rooms.js` | see 2.6 |
| **The welcome room / last room** / extra rooms like the theatre | `config/rooms.js` → `WELCOME_ROOM`, `CLOSING_ROOM`, `EXTRA_ROOMS` | see 2.7 |
| **Site texts and links**: title, credit, gallery link, entry-card words | `config/museum.js` | see 2.8 |
| **The 3D look**: room size, ceiling height, doors, frames, lighting | `config/look.js` | see 2.9 |
| **Navigation bar, entry card, panels** | `index.html` + `css/museum.css` + `js/ui/…` | see 2.10 |
| **How rooms are laid out or built** (for programmers) | `js/world/…` | see section 4 |

### 2.1 Pictures in a room → `album/album_items.json` (gallery)
Nothing to do in the museum. Add the image to `album/major_ugf/` and its entry to the
`major_ugf` list, as for the gallery:
```json
{ "kiking_202701_NewDrawing.jpg": { "title": "New Drawing, 2027", "meta": "Fineliner on Paper", "link": "https://…" } }
```
It hangs in Major: UGF, at its position in the list.

### 2.2 A room's look → `config/rooms.js`, `ROOMS`
Keyed by the album id:
```js
major_ugf: {
  wall: '#e6e1d6',          // wall colour
  frame: 'wood',            // default frame: black | gold | wood | white | none
  mood: 'standard',         // lighting: standard | dark | sunny
  ceiling: 'dark',          // black ceiling (lighting stays the same)
  description: 'Striving for survival…',   // gold text on the wall
},
shining_beauty_of_mathematics: { layout: 'rotunda' },   // the big round room
```

### 2.3 One picture → `config/rooms.js`, `pictures`
Keyed by file name, inside the room's entry:
```js
cuhk_math_website_revamp: {
  pictures: {
    'kiking_201508_KleinBottle.jpg': { scale: 1.85, frame: 'white' },      // much bigger
  },
},
topological_crochet: {
  pictures: {   // a photo of a 3D piece, shown as a freestanding display
    'kiking_202406_KleinBottle.jpg': { sculpture: { type: 'stand', focus: [.55, .5, .46, .48] } },
  },
},
```
A picture's link ("View original post", and clicking the full picture) uses an Instagram link first when there is one:
`"instagram": "https://…"` in `album_items.json`, or `instagram: 'https://…'` in its `pictures` entry here.

Other per-room picture controls: `order: [files…]`, `exclude: [files…]`,
`pictureDefaults: { scale: .72 }` (all pictures of the room),
`keepOrder` + `groupBy` (keep groups such as a newsletter issue on one wall).

### 2.4 Things not in album_items.json → `config/rooms.js`, `extras`
Paths are relative to the gallery root:
```js
never_forget: {
  extras: [
    { src: 'album/never_forget/kiking_201309_NeverForget.jpg', title: 'Never Forget, 2013', meta: 'Colored Pencil on Paper', scale: 1.5 },
  ],
},
attack_on_minions: {
  mood: 'dark',
  extras: [   // a film: the room becomes a screening room (src = poster)
    { src: 'navigation/album_cover_attack_on_minions.jpg', title: 'Attack on Minions!, 2013',
      video: { kind: 'youtube', id: 'UP1fBwaLLNs' } },
  ],
},
picturesque_world: {
  extras: [   // a film on a big wall screen in a normal room
    { src: 'album/picturesque_world/kiking_202606_NiagaraFalls.jpg', title: 'How Great Thou Art',
      video: { kind: 'youtube', id: 'z0ghBalMFKg' }, monitor: { w: 6.8, z: -2.65 } },
  ],
},
```
Film kinds: `{ kind: 'youtube', id }`, `{ kind: 'facebook', href }`, `{ kind: 'file', src: [paths…] }`.
A website screen: `kiosk: { href: 'https://…' }`.

### 2.5 A new exhibition → gallery first, then optionally `config/rooms.js`
1. In the gallery: add it to `CATEGORY_MENU` in `main.js`, its list to `album_items.json`,
   its images to `album/<id>/` (and its page `album/<id>.html`, as usual).
2. The museum now has a room for it, with a default wall colour and black frames.
3. Optional — give it a look in `config/rooms.js`:
```js
sunset_sketches: { wall: '#34493f', frame: 'white', description: 'Pencil studies of evening skies.' },
```

### 2.6 Where a room sits → `main.js` (gallery) or `config/rooms.js`
The building has two parallel rows. In the gallery's order, the first room of a category
goes in the **left row**; the next room of the **same category** sits beside it in the
**right row**, joined by a doorway; and so on.
```js
polyhedramatics_the_dance: { pairWithPrev: true },   // sit beside the previous room, even across categories
some_album:                { newRow: true },         // don't pair with the previous room
another_album:             { hidden: true },         // leave it out of the museum
```
To change the order itself, move the exhibition in `CATEGORY_MENU` (the gallery changes too).

### 2.7 Welcome, last and extra rooms → `config/rooms.js`
```js
export const EXTRA_ROOMS = [
  { id: 'shining_beauty_theatre', after: 'shining_beauty_of_mathematics',   // placed right after that room
    name: 'Shining Beauty of Mathematics · Theatre', kind: 'annex', layout: 'theatre', mood: 'dark',
    artworks: [ { src: 'navigation/album_cover_shining_beauty_of_mathematics.jpg', title: '…',
                  video: { kind: 'facebook', href: 'https://www.facebook.com/…' } } ] },
];
export const WELCOME_ROOM = { name: 'About Kiking', wall: '#1b2333', artworks: [ /* self-portrait, social screen */ ] };
export const CLOSING_ROOM = { name: 'Thank you for your visit', link: site.galleryUrl, artworks: [ /* … */ ] };
```

### 2.8 Site texts and links → `config/museum.js`
```js
title: "Kiking's Art · Online Museum",
credit: 'Artwork © Kiking (kiking0501.github.io/kiking-art-gallery)',
galleryUrl: 'https://kiking0501.github.io/kiking-art-gallery/',   // Art Gallery button, entry card, last room
enterButton: 'Enter the museum',
tourSecondsPerStop: 6,                  // guided tour: time at each work (the Tour button fills up meanwhile)
textFixes: [['Arcylic', 'Acrylic']],    // spelling fixes applied to album_items.json text
```

### 2.9 The 3D look → `config/look.js`
```js
BUILDING: { roomWidth: 13, wallHeight: 6.4, doorWidth: 3.2, pictureGap: 1.8, … }   // metres
BUILDING: { …, benches: false, theatreSeats: false }                              // seating on/off (true = show)
ROTUNDA:  { radius: 11, … }                                                        // the round room
FRAMES:   { gold: { fw: .085, color: '#b38b45', metal: .9, … }, … }                // add or edit frame styles
MOODS:    { sunny: { sky: 1.7, hemi: .82, env: .45, spot: .8 }, … }               // lighting moods
DEFAULT_WALLS: ['#ece7dd', '#34493f', …]                                          // colours for rooms without `wall`
```

### 2.10 Navigation bar, entry card, panels → `index.html`, `css/museum.css`, `js/ui/`
- **What is on the page**: `index.html` (each block is labelled: navigation bar, entry card, map panel, …).
- **How it looks**: `css/museum.css` (sections in the same order).
- **What it does**: `js/ui/navbar.js` (bar buttons), `js/ui/intro.js` (entry card),
  `js/ui/info-card.js` (artwork card), `js/ui/map-panel.js` (Map), `js/ui/theater.js` (film player),
  `js/ui/overlays.js` (full picture, link boxes, help).

Example — an "About" link in the navigation bar, added inside `<div id="bar">` in `index.html`:
```html
<a class="barlink" href="../about.html" target="_blank" rel="noopener"><span class="lbl">About</span></a>
```
It is styled like the other buttons automatically.

---

## 3. Running it

Browsers only run the museum from a web server (not by double-clicking `index.html`).
From the **gallery's root folder** (`kiking-art-gallery/`):
```
python3 -m http.server 8000
```
then open <http://localhost:8000/online-museum/>.

On GitHub Pages it is at `https://kiking0501.github.io/kiking-art-gallery/online-museum/`.
The doors open as soon as every picture's size is known (only the first few kilobytes of each file are read).
The pictures then download in the background, nearest first, and appear on the walls as they arrive;
browsers cache them for the next visit.

---

## 4. What each file does

```
online-museum/
├── README.md           this file
├── index.html          the page: 3D view, navigation bar, panels, entry card
├── css/museum.css      styles of everything floating over the 3D view
├── config/             ← most changes happen here
│   ├── museum.js       title, credit, links, entry-card words, spelling fixes
│   ├── rooms.js        per-exhibition settings, extra rooms, welcome & last rooms
│   └── look.js         building sizes, frames, lighting moods, render settings
└── js/
    ├── main.js         start-up order and the frame loop
    ├── state.js        what's going on right now (current room, artwork viewed…)
    ├── util.js         small helpers
    ├── data/           gallery + config → list of rooms
    │   ├── gallery.js      reads ../main.js, ../album/album_items.json, album pages
    │   ├── museum-data.js  combines them with config/rooms.js
    │   └── room-info.js    exhibition numbers and counts used in labels
    ├── world/          the 3D museum
    │   ├── layout.js       where every room and artwork goes (the floor plan)
    │   ├── scene.js        builds everything from the layout
    │   ├── rooms.js        rectangular rooms: walls, doorways, skylights, gold titles
    │   ├── rotunda.js      the round room
    │   ├── artworks.js     frames, sculpture displays, screens, kiosks
    │   ├── wall-map.js     the map on the welcome-room wall
    │   ├── floor-marks.js  viewing-point rings and the cursor glow
    │   ├── lighting.js     skylights, spotlights, room moods
    │   ├── textures.js     loading pictures; generated stone and plaster
    │   ├── materials.js    surface materials and mesh helpers
    │   ├── renderer.js     WebGL renderer, camera, lights
    │   └── constants.js    short names for the sizes in config/look.js
    ├── visitor/        moving around
    │   ├── movement.js     walking, paths, walking up to an artwork
    │   ├── input.js        mouse, touch, keyboard, hover
    │   └── tour.js         the guided tour
    └── ui/             the panels
        ├── navbar.js       navigation bar
        ├── intro.js        entry card
        ├── hud.js          title, room name, room banner
        ├── info-card.js    the artwork card
        ├── map-panel.js    the Map panel
        ├── theater.js      the film player
        └── overlays.js     full-picture view, link boxes, help, messages
```

Start-up order (`js/main.js`): read the gallery and `config/` → generate textures and
load every picture (their shapes decide the layout) → `world/layout.js` works out the
floor plan → `world/scene.js` builds it → every frame: move the visitor, update lights, draw.
