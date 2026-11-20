/* =====================================================================
   ROOMS — how each exhibition of the gallery becomes a room
   =====================================================================

   WHERE THE ROOMS COME FROM (nothing to do here)
   - The list of exhibitions, their order, names and categories are read from
     the gallery's own ../main.js (CATEGORY_MENU and CATEGORY_NAME).
   - The pictures of each exhibition, with their titles, details and links, are
     read from ../album/album_items.json, in the order they appear there.
   So: add a picture to album_items.json, or a new exhibition to main.js, and
   the museum shows it automatically, with default settings.

   WHAT THIS FILE IS FOR
   Everything below is optional fine-tuning, keyed by the exhibition's id
   (the same id as in main.js and album_items.json, e.g. 'major_ugf').

   ── Room settings (all optional) ─────────────────────────────────────
     name:          room name, if different from the gallery's
     description:   text in gold on the wall. If left out, the museum uses any
                    heading text found on the album's page, e.g. album/major_ugf.html
     wall:          wall colour, e.g. '#2d3a4f'
     frame:         default frame: 'black' | 'gold' | 'wood' | 'white' | 'none'
     mood:          lighting: 'standard' | 'dark' | 'sunny'     (see config/look.js)
     ceiling:       'dark' for a black ceiling (lighting stays as `mood` says)
     layout:        'rotunda' for the big round room, 'theatre' for a cinema
     gap:           space between pictures in metres (default 1.8)

   ── Where the room goes on the map ───────────────────────────────────
     Rooms are placed in two parallel rows, in the gallery's order: the first
     room of a category goes in the left row, the next one in the same
     category sits beside it in the right row, joined by a doorway, and so on.
     pairWithPrev:  true  = sit beside the previous room even if it's in another category
     newRow:        true  = don't sit beside the previous room, start a new pair
     moveAfter:     'exhibition_id' = place this room right after that one (changing the gallery's order here only)
     span:          true  = a room as wide as both rows together (standing alone, with a doorway from each row)
     openToPrev:    true  = no wall between this room and the one beside it: one hall, an exhibition at each side
     hidden:        true  = leave this exhibition out of the museum

   ── Which pictures, in what order ────────────────────────────────────
     alsoInclude:   other album_items.json lists to add, e.g. ['picturesque_world_reykjavík']
     exclude:       file names to leave out
     order:         file names in the order you want; any not listed follow after
     keepOrder:     true = hang strictly in order, never splitting a group across walls
     groupBy:       function(fileName) → group key, used with keepOrder
     hangReverse:   true = run the sequence the other way along the wall
     scatter:       true = stand the sculptures in an informal group (up to 3)
     fillInner:     false = keep everything on the outer wall (otherwise pictures of much the same size are
                    shared with the doorway wall and enlarged a little to use the space)
     walls:         { left: [files], right: [files], front: [file], back: [file] } — choose the wall for
                    each picture. Left and right are as you face along the row, from the welcome-room end
                    toward the far end; front is the end wall ahead (beside its doorway), back the one behind.
                    Pictures added under extras can be named by their file name too.
     nearHalf:      { from: 'other_exhibition_id', left: [files], right: [files], table: [files], gap,
                      leftRows: 2, rightRows: 2, tableAt: 'middle' | 'door' }
     table:         [files] — in a room with nearHalf, lay these of its own pictures in an archive case
                    in the middle of its (far) half
                    give the half of this room nearest the previous room to another exhibition's
                    pictures (they stay part of that exhibition): `left` and `right` are its walls,
                    `table` lays pictures flat in an archive case. This room's own pictures fill the far half.

   ── Settings for single pictures ─────────────────────────────────────
     pictureDefaults: { ... }   applied to every picture of the room
     pictures: { 'file.jpg': { ... } }   for one picture. Keys:
        title, meta, description, link, linkLabel   (override the gallery's text)
        frame, scale (1 = normal size, 1.5 = half as big again)
        entryWall: true    hang it on the wall you face as you enter, next to the doorway
        upperAngle: 30     rotunda only: hang it in the upper gallery, at this angle
        wallAngle: -58     rotunda only: hang it on the ground-floor wall at this angle (it may then be large)
        visit: { href, label }   a button with this link appears while you stand in front of the picture
        sculpture: { type: 'stand', focus: [x, y, w, h], base: 'photo', ground: 0.1 }
                   show the photo as a freestanding display. `focus` is the part of
                   the photo that stays sharp (fractions of its width/height);
                   base: 'photo' uses the stand inside the photo; `ground` is how far
                   up the photo the floor line is.
                   main: true makes it the centrepiece of a round room, on a marble drum in the middle:
                   height (metres the photo is shown). Any stand can also have soft: [x, y, w, h]
                   (a soft round edge) or tri: [[x, y] ×3] (a soft triangle) instead of the photo's
                   square edges, sit (how far up the photo the piece's base is) and lift (metres it floats).

   ── Things that are not in album_items.json ──────────────────────────
     extras: [ { src, title, meta, ... } ]   added after the room's pictures.
        src is relative to the gallery root, e.g. 'album/never_forget/kiking_201309_NeverForget.jpg'
        video:   { kind: 'youtube', id }  |  { kind: 'facebook', href }  |  { kind: 'file', src: [...] }
                 (a YouTube or Facebook film can add preview: [...video files] to loop silently on the room's screen)
                 (a YouTube film can add start: 77 to begin at that many seconds in)
                 (src is then the poster picture)
        monitor: { w: 6.8, z: -2.65 }   show the video on a wall screen instead of making
                                        the room a cinema (w = width, z = position along the end wall)
        kiosk:   { href } or { links: [{ label, handle, href }], tagline }   a freestanding
                                        screen that opens a website (or social accounts) when clicked
                 (src is then the picture shown on the screen)
*/
import site from './museum.js';

const SB = 'album/shining_beauty_of_mathematics/';

export const ROOMS = {
  /* ---------------- Latest ---------------- */
  surrealistic_paintings: {
    wall: '#2d3a4f', frame: 'none',
    description: 'Paintings and drawings in acrylic, coloured pencil and line and wash.',
    // every wall in use, so each work can be large (see `walls` in the notes at the top)
    walls: {
      left: ['kiking_202412_BanffSpiral.jpeg', 'kiking_202506_CosmicPlatonic.jpg'],
      right: ['kiking_202410_LakeMoraine.jpeg', 'kiking_201711_Harbour.jpg'],     // one each side of the doorway to Picturesque World
      front: ['kiking_202603_EscapismI.jpg'],
      back: ['kiking_202607_CloisterIllusion.jpg'],
    },
    pictures: {
      'kiking_202607_CloisterIllusion.jpg': { frame: 'white', scale: 1.45 },   // about 3.4 m tall, like the museum's other large portraits
      'kiking_202603_EscapismI.jpg': { frame: 'white', scale: 1.45 },
      'kiking_202506_CosmicPlatonic.jpg': { scale: 1.8 },
      'kiking_202412_BanffSpiral.jpeg': { scale: 1.8 },
      'kiking_202410_LakeMoraine.jpeg': { frame: 'black', scale: 1.6 },
      'kiking_201711_Harbour.jpg': { frame: 'black', scale: 1.6 },
    },
  },

  picturesque_world: {
    wall: '#ece7dd', frame: 'white',
    alsoInclude: ['picturesque_world_reykjavík'],
    description: 'Places painted from life and memory: Niagara Falls, Reykjavík and more, in watercolour, line and wash, and acrylic.',
    pictures: {
      'kiking_202610_18_Experimental.jpg': { frame: 'none', scale: 1.8 },
      'kiking_202606_NiagaraFalls.jpg': { scale: 1.8 },
      'kiking_202609_ReykjavíkFjögur_I.jpg': { scale: 1.25 },
      'kiking_202609_ReykjavíkFjögur_II.jpg': { scale: 1.25 },
      'kiking_202609_ReykjavíkFjögur_III.jpg': { scale: 1.25 },
      'kiking_202609_ReykjavíkFjögur_IV.jpg': { scale: 1.25 },
    },
    walls: {
      right: ['kiking_202610_18_Experimental.jpg', 'kiking_202606_NiagaraFalls.jpg'],   // the outer wall
      left: ['kiking_202609_ReykjavíkFjögur_I.jpg', 'kiking_202609_ReykjavíkFjögur_II.jpg',   // the inner wall, two each side of the doorway
             'kiking_202609_ReykjavíkFjögur_III.jpg', 'kiking_202609_ReykjavíkFjögur_IV.jpg'],
    },
    extras: [
      { src: 'album/picturesque_world/kiking_202606_NiagaraFalls.jpg', title: 'How Great Thou Art', meta: 'Video · YouTube',
        video: { kind: 'youtube', id: 'z0ghBalMFKg' }, monitor: { w: 6.8, z: -2.65 },
        link: 'https://www.youtube.com/watch?v=z0ghBalMFKg', linkLabel: 'Watch on YouTube' },
    ],
  },

  topological_crochet: {
    wall: '#3b3e43', ceiling: 'dark', frame: 'black', scatter: true,
    description: 'Mathematical surfaces crocheted in wire: a Klein bottle, a Möbius strip and a hyperbolic plane.',
    pictures: {
      'kiking_202406_KleinBottle.jpg': { sculpture: { type: 'stand', focus: [.55, .5, .46, .48] } },
      'kiking_202405_MobiusStrip.jpg': { sculpture: { type: 'stand', focus: [.47, .49, .32, .29] } },
      'kiking_202405_Hyperbolic.png':  { sculpture: { type: 'stand', focus: [.52, .49, .33, .32] } },
    },
  },

  /* ---------------- Exhibitions ---------------- */
  polyhedramatics_the_dance: {
    pairWithPrev: true,             // sits beside Topological Crochet
    mood: 'dark', wall: '#15161a', frame: 'black',
    description: 'Music animation written in THREE.js, featured in the City Art Exhibition, 3–30 September 2018, at the Hong Kong Academy for Performing Arts.',
    extras: [
      { src: 'navigation/album_cover_polyhedramatics_the_dance.jpg', title: 'Polyhedramatics – The Dance, 2018', meta: 'Music Animation, written in THREE.js',
        // the film plays from YouTube; `preview` clips loop silently on the room's screen
        video: { kind: 'youtube', id: '1mBYV5Z2Qnw', start: 78 /* seconds: begins at 1:18 */, preview: [1, 2, 3].map(n => `album/polyhedramatics_the_dance/kiking_polyhedramatics_dance_cut${n}.mov`) },
        link: 'https://kiking0501.github.io/polyhedramatics-dance-2018/doc_html/doc/main.html', linkLabel: 'Artwork full details',
        description: 'Featured in the City Art Exhibition, from 3 to 30 September 2018, at the Hong Kong Academy for Performing Arts.' },
      { src: 'album/polyhedramatics_the_dance/cityscape_II_exhibition.webp', title: 'The City Art Exhibition, 2018', meta: 'Hong Kong Academy for Performing Arts',
        frame: 'black', scale: 1.1,
        link: 'https://www.hkapa.edu/tch/event/academy-creative-collaboration-project-school-of-music-the-city-art-exhibition' },
    ],
  },

  shining_beauty_of_mathematics: {
    layout: 'rotunda', mood: 'sunny', wall: '#f1ece2', frame: 'white',
    description: 'Sculptures and installations displayed from 22 to 30 June 2016 at the Chinese University of Hong Kong.',
    // The round chamber shows the sculptures: the Pentagonal Hexacontahedron towering in the
    // middle (`main`), the others around it, and the introduction board large beside the gold
    // wall text. The drawings, photos and press of this exhibition continue in the next room
    // (see `nearHalf` under cuhk_math_website_revamp).
    order: [
      'kiking_201606_blue_yellow_sculpture.jpg', 'kiking_201606_pyramid.jpg', 'kiking_201603_lamp.jpg', 'kiking_201606_purple_green_sculpture.jpg',
      'kiking_201606_intro.jpg', 'kiking_201606_explain_blue_yellow_sculpture.jpg', 'kiking_201606_explain_pyramid.jpg',
      'kiking_201606_explain_tessellation.jpg', 'kiking_201606_explain_purple_green_sculpture.jpg',
      'kiking_201606_night_view.jpg', 'kiking_201606_day_view.jpg', 'kiking_201606_top_view.jpg', 'kiking_201606_back_view.jpg',
    ],
    pictures: {
      // main: the centrepiece. height = how tall the photo is shown (metres); soft = where its soft round edge is
      // [centre x, centre y, half-width, half-height] as fractions of the photo (measured from the bottom);
      // sit = how far up the photo the piece's base is; lift = how high (metres) it floats above its drum or plinth.
      // tri: [[x, y], [x, y], [x, y]] fades the photo to a triangle instead (the Sierpinski piece).
      // cut: [from, to] fades away the top of the photo between these heights (where its background was dark).
      'kiking_201606_blue_yellow_sculpture.jpg':  { sculpture: { type: 'stand', main: true, height: 12.6, soft: [.47, .6, .3, .25], cut: [.8, .835], sit: .39, lift: .8, focus: [.47, .6, .3, .25] } },
      'kiking_201606_intro.jpg':                  { scale: 1.7, wallAngle: 147 },   // on the chamber wall, just to the right of the doorway out: in view as you come in
      'kiking_201606_pyramid.jpg':                { sculpture: { type: 'stand', height: 4.4, tri: [[.515, .77], [.2, .395], [.8, .395]], sit: .4, lift: .3, focus: [.5, .58, .36, .3] } },
      'kiking_201603_lamp.jpg':                   { sculpture: { type: 'stand', height: 3.8, focus: [.52, .5, .38, .4] } },
      'kiking_201606_purple_green_sculpture.jpg': { sculpture: { type: 'stand', height: 4.4, soft: [.48, .645, .37, .235], cut: [.86, .895], sit: .41, lift: .3, focus: [.48, .645, .37, .235] } },
    },
    extras: [   // media coverage, from the album page's "Media Coverage" section
      { src: SB + 'MingPao.jpg', title: 'Newsreport, Ming Pao', meta: 'Media coverage · 2016', frame: 'black' },
      { src: SB + 'ShingDao.jpg', title: 'Newsreport, Shing Dao', meta: 'Media coverage · 2016', frame: 'black' },
      { src: SB + 'cuhk_newsletter_484_2016oct.png', title: 'Newsletter No. 484, CUHK', meta: 'Media coverage · October 2016', frame: 'black',
        link: 'https://www.iso.cuhk.edu.hk/english/publications/CUHKUPDates/article.aspx?articleid=1795' },
      { src: SB + 'math_cuhk_201617_newsletter_report_cover.png', title: 'Newsletter 2016-17, Department of Mathematics, CUHK', meta: 'Media coverage', frame: 'black',
        link: 'https://www.math.cuhk.edu.hk/sites/default/files/about-us/newsletter/newsletter1617.pdf' },
    ],
  },

  /* ---------------- Publications ---------------- */
  cuhk_math_website_revamp: {
    wall: '#ece7dd', frame: 'black',
    description: 'Graphic design for the website of the Department of Mathematics, The Chinese University of Hong Kong.',
    // The half of this room nearest the round chamber continues the Shining Beauty of Mathematics
    // (the pictures stay part of that exhibition): its photos along the left wall and its drawings
    // on the right, each in two rows, and the press in an archive case beside the doorway. The far half is the website.
    nearHalf: {
      from: 'shining_beauty_of_mathematics',
      left:  ['kiking_201606_night_view.jpg', 'kiking_201606_day_view.jpg', 'kiking_201606_top_view.jpg', 'kiking_201606_back_view.jpg'],
      right: ['kiking_201606_explain_blue_yellow_sculpture.jpg', 'kiking_201606_explain_pyramid.jpg',
              'kiking_201606_explain_tessellation.jpg', 'kiking_201606_explain_purple_green_sculpture.jpg'],
      leftRows: 2, rightRows: 2,    // hang each wall's pictures two-high (in columns, top then bottom)
      table: ['MingPao.jpg', 'ShingDao.jpg', 'cuhk_newsletter_484_2016oct.png', 'math_cuhk_201617_newsletter_report_cover.png'],
      tableAt: 'middle',            // 'middle' = an archive case in the middle of the half; 'door' = beside the doorway you come in by
      gap: 1.1,                     // space between the pictures in this half
    },
    // The far half: the Klein Bottle large on the left, the website design on the right,
    // and the newsletter in its own archive case in the middle.
    walls: { left: ['kiking_201508_KleinBottle.jpg'], right: ['201508_MathWebsite.jpg'] },
    table: ['MathNewsletter1516.png'],
    pictures: {
      'kiking_201508_KleinBottle.jpg': { frame: 'white', scale: 2.1 },
      // visit: a "Visit the website" button appears while you stand in front of it
      '201508_MathWebsite.jpg': { scale: 2.2, visit: { href: 'https://www.math.cuhk.edu.hk/', label: 'Visit the website' } },   // 2.2 is the largest size
    },
    extras: [
      { src: 'album/cuhk_math_website_revamp/MathNewsletter1516.png', title: 'Newsletter 2015-16, Department of Mathematics, CUHK', meta: 'Publication',
        link: 'https://www.math.cuhk.edu.hk/sites/default/files/about-us/newsletter/newsletter1516.pdf' },
    ],
  },

  IMOment_newsletter_for_IMO_2016: {
    name: 'IMOment',
    wall: '#2d3a4f', frame: 'white', gap: .7,
    description: 'Graphic designs for IMOment, the newsletters published for the 57th International Mathematical Olympiad (IMO) 2016, Hong Kong.',
    pictureDefaults: { scale: .72 },
    keepOrder: true,                                                   // each issue's pages stay together
    groupBy: file => (file.match(/Issue0?(\d+)|IMOment-(\d+)/) || []).slice(1).find(Boolean),
    // covers and article pages hang two-high beside their issue's drawing;
    // the drawings are enlarged to the full height of that stack (stackHeight, in metres)
    stack: file => /^(Cover|Article)-IMOment/.test(file),
    stackHeight: 3.3,
  },

  /* ---------------- As a Math Student ---------------- */
  major_ugf: {
    wall: '#e6e1d6', frame: 'wood',
    description: 'Striving for survival. Maybe my major is University General Education, instead of Mathematics?',
    pictureDefaults: { scale: 1.35 },
    walls: {
      left: ['kiking_201312_SingK.jpg', 'kiking_201311_MobiusTrip.jpg', 'kiking_201410_Weiwei.jpg', 'kiking_201310_RiemannSurface.jpg'],
      right: ['kiking_201501_Waterloooo.jpg', 'kiking_201408_Angry.jpg'],       // one each side of the doorway
      front: ['kiking_201306_WhyMathIsFun.jpg'],
    },
  },

  purquoi_imaginary_in_my_week_of_finals: {
    wall: '#6e2f35', frame: 'white',
    description: 'Purquoi? Purquoi.',
    // exclude: ['kiking_purquoi_imaginary_empty.jpg'],                  // the empty tile on the album page
  },

  /* ---------------- Featured ---------------- */
  attack_on_minions: {
    mood: 'dark', wall: '#141414', frame: 'black',
    description: '進撃の巨人 x Minions = 進撃のMinions!',
    extras: [
      { src: 'navigation/album_cover_attack_on_minions.jpg', title: 'Attack on Minions!, 2013', meta: '進撃の巨人 x Minions = 進撃のMinions!',
        video: { kind: 'youtube', id: 'UP1fBwaLLNs' }, link: 'https://www.youtube.com/watch?v=UP1fBwaLLNs', linkLabel: 'Watch on YouTube' },
    ],
  },

  never_forget: {
    wall: '#34493f', frame: 'gold',
    description: 'Runner-up, Sketch (Open Category), the first International Outstanding Art Competition.',
    extras: [
      { src: 'album/never_forget/kiking_201309_NeverForget.jpg', title: 'Never Forget, 2013', meta: 'Colored Pencil on Paper', scale: 1.5,
        description: '中國當代藝術文化協會 首屆國際傑出藝術比賽 公開組 素描 亞軍' },
    ],
  },

  /* ---------------- Early Work ---------------- */
  lunch_time_escape: { wall: '#4a3f5c', frame: 'white', description: 'Drawings in marker and fineliner.' },
  // one hall for these two: If Pusheen Is My Cat along the left side, Because It's Cute along the right
  // (openToPrev takes the wall between them away), each picture a third larger than standard. On each end wall,
  // between the two doorways, a drawing from the exhibition whose title is on that wall: Pusheen ahead, Because It's Cute behind.
  if_pusheen_is_my_cat: { wall: '#e6e1d6', frame: 'black', description: 'Pen and pencil drawings, 2014.', fillInner: false, pictureDefaults: { scale: 1.35 },
    walls: { front: ['kiking_pusheen_cat_0.jpg'] }, pictures: { 'kiking_pusheen_cat_0.jpg': { scale: 1.6 } } },
  because_its_cute: { openToPrev: true, wall: '#e6e1d6', frame: 'black', description: 'Pen drawings, 2014.', fillInner: false, pictureDefaults: { scale: 1.35 },
    walls: { back: ['kiking_cute_III.jpg'] }, pictures: { 'kiking_cute_III.jpg': { scale: 1.6 } } },
  love_of_miyazaki: {
    moveAfter: 'lunch_time_escape',   // sits beside Lunch Time Escape; If Pusheen Is My Cat and Because It's Cute then pair up next
    wall: '#34493f', frame: 'white', description: 'Watercolor & fineliner on paper.',
    pictureDefaults: { meta: 'Watercolor & Fineliner on Paper', scale: 1.5 },   // album_items.json has no medium for these; half as big again
    // large, using every wall: four on the outer wall, one each side of the doorway, one on each end wall
    walls: { right: ['kiking_miyazaki_1.jpg', 'kiking_miyazaki_2.jpg', 'kiking_miyazaki_3.jpg', 'kiking_miyazaki_4.jpg'],
             left: ['kiking_miyazaki_5.jpg', 'kiking_miyazaki_6.jpg'], front: ['kiking_miyazaki_7.jpg'], back: ['kiking_miyazaki_8.jpg'] },
  },
  moments_of_delight: {
    span: true,                     // a large room as wide as both rows
    wall: '#d9cdb8', frame: 'gold', pictureDefaults: { scale: 1.4 },
    description: 'Early drawings and paintings in pen, coloured pencil, fineliner and acrylic.',
    // the CUHK painting large on the wall between the two doorways you come in by; Hong Kong on the wall ahead
    walls: { back: ['kiking_201304CUHK.jpg'], front: ['kiking_2007HK.jpg'] },
    pictures: { 'kiking_201204PCMS.jpg': { frame: 'none' }, 'kiking_201304CUHK.jpg': { scale: 2.2 } },
  },
};

/* ---------------------------------------------------------------------
   Rooms that are not exhibitions in main.js. `after` = the exhibition they
   follow; they share its category. Same settings as above, plus `artworks`.
   --------------------------------------------------------------------- */
export const EXTRA_ROOMS = [
  {
    id: 'shining_beauty_theatre', after: 'shining_beauty_of_mathematics',
    name: 'Shining Beauty of Mathematics · Finale', label: 'Finale', kind: 'annex',   // label: the word shown with it on maps and signs
    layout: 'theatre', mood: 'dark', wall: '#121316', frame: 'black',
    description: 'The exhibition on film: the Shining Beauty of Mathematics, 22 to 30 June 2016, at the Chinese University of Hong Kong.',
    artworks: [
      { src: 'navigation/album_cover_shining_beauty_of_mathematics.jpg', title: 'The Shining Beauty of Mathematics Exhibition, 2016', meta: 'Sculptures and Installations · Video',
        video: { kind: 'facebook', href: 'https://www.facebook.com/ShiningBeautyofMaths/videos/147890912284231/' },
        link: 'https://www.facebook.com/ShiningBeautyofMaths', linkLabel: '璀璨數學之美 Shining Beauty of Mathematics' },
    ],
  },
];

/* ---------------------------------------------------------------------
   The first room (where visitors arrive) and the last one.
   --------------------------------------------------------------------- */
export const WELCOME_ROOM = {
  name: 'About Kiking', wall: '#1b2333', frame: 'gold',
  description: 'I create artworks for fun to bring my imagination to life, often inspired by the beauty of nature, mathematics, and cultural trends. Live in Canada / Hong Kong.',
  artworks: [
    { src: 'album/self_portraits/kiking_201707_sailing.jpg', title: 'A Girl sailing on Emptiness / Melting clock in the Hyperboloid Sea, seeking for delta δ',
      meta: 'Self Portrait · Marker on Paper, 11" x 17" · 2017', frame: 'gold', scale: 1.45 },
    { src: 'album/self_portraits/kiking_profile.png', title: 'Follow Kiking', meta: 'Instagram @kikingproduction · Facebook @ShiningBeautyofMaths',
      description: 'Follow Kiking on social media for new work.', link: 'https://www.instagram.com/kikingproduction/', linkLabel: 'Instagram @kikingproduction',
      kiosk: { tagline: 'Find Kiking’s new work online', links: [
        { label: 'Instagram', handle: '@kikingproduction', href: 'https://www.instagram.com/kikingproduction/' },
        { label: 'Facebook', handle: '@ShiningBeautyofMaths', href: 'https://www.facebook.com/ShiningBeautyofMaths' },
      ] } },
  ],
};

export const CLOSING_ROOM = {
  name: 'Thank you for your visit', wall: '#2d3a4f', frame: 'black',
  span: true,                       // as wide as both rows
  link: site.galleryUrl, linkLabel: "Continue to Kiking's Art Gallery",
  artworks: [
    { src: 'resource/og_image_preview.png', title: "Kiking's Art Gallery", meta: 'The original online gallery · kiking0501.github.io/kiking-art-gallery',
      frame: 'black', scale: 1.3, link: site.galleryUrl },
  ],
};
