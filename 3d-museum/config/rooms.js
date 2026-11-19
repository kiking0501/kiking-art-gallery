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

   ── Settings for single pictures ─────────────────────────────────────
     pictureDefaults: { ... }   applied to every picture of the room
     pictures: { 'file.jpg': { ... } }   for one picture. Keys:
        title, meta, description, link, linkLabel   (override the gallery's text)
        frame, scale (1 = normal size, 1.5 = half as big again)
        entryWall: true    hang it on the wall you face as you enter, next to the doorway
        upperAngle: 30     rotunda only: hang it in the upper gallery, at this angle
        sculpture: { type: 'stand', focus: [x, y, w, h], base: 'photo', ground: 0.1 }
                   show the photo as a freestanding display. `focus` is the part of
                   the photo that stays sharp (fractions of its width/height);
                   base: 'photo' uses the stand inside the photo; `ground` is how far
                   up the photo the floor line is.

   ── Things that are not in album_items.json ──────────────────────────
     extras: [ { src, title, meta, ... } ]   added after the room's pictures.
        src is relative to the gallery root, e.g. 'album/never_forget/kiking_201309_NeverForget.jpg'
        video:   { kind: 'youtube', id }  |  { kind: 'facebook', href }  |  { kind: 'file', src: [...] }
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
        video: { kind: 'file', src: [1, 2, 3].map(n => `album/polyhedramatics_the_dance/kiking_polyhedramatics_dance_cut${n}.mov`) },
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
    // Ground floor: the boards follow the sculptures round the room, starting by the entrance.
    order: [
      'kiking_201606_intro.jpg', 'kiking_201606_explain_blue_yellow_sculpture.jpg', 'kiking_201606_explain_pyramid.jpg',
      'kiking_201606_explain_tessellation.jpg', 'kiking_201606_explain_purple_green_sculpture.jpg',
      'kiking_201606_blue_yellow_sculpture.jpg', 'kiking_201606_pyramid.jpg', 'kiking_201603_lamp.jpg', 'kiking_201606_purple_green_sculpture.jpg',
    ],
    pictures: {
      'kiking_201606_blue_yellow_sculpture.jpg':  { sculpture: { type: 'stand', base: 'photo', ground: .03, focus: [.5, .45, .44, .47] } },
      'kiking_201606_pyramid.jpg':                { sculpture: { type: 'stand', base: 'photo', ground: 0, focus: [.5, .5, .5, .53] } },
      'kiking_201603_lamp.jpg':                   { sculpture: { type: 'stand', focus: [.52, .5, .38, .4] } },
      'kiking_201606_purple_green_sculpture.jpg': { sculpture: { type: 'stand', base: 'photo', ground: .15, focus: [.5, .56, .42, .47] } },
      // Upper gallery: the exhibition in photos (the press is added below, under extras).
      'kiking_201606_night_view.jpg': { upperAngle: -150 },
      'kiking_201606_day_view.jpg':   { upperAngle: -120 },
      'kiking_201606_top_view.jpg':   { upperAngle: -60 },
      'kiking_201606_back_view.jpg':  { upperAngle: -30 },
    },
    extras: [   // media coverage, from the album page's "Media Coverage" section
      { src: SB + 'MingPao.jpg', title: 'Newsreport, Ming Pao', meta: 'Media coverage · 2016', frame: 'black', upperAngle: 30 },
      { src: SB + 'ShingDao.jpg', title: 'Newsreport, Shing Dao', meta: 'Media coverage · 2016', frame: 'black', upperAngle: 60 },
      { src: SB + 'cuhk_newsletter_484_2016oct.png', title: 'Newsletter No. 484, CUHK', meta: 'Media coverage · October 2016', frame: 'black', upperAngle: 120,
        link: 'https://www.iso.cuhk.edu.hk/english/publications/CUHKUPDates/article.aspx?articleid=1795' },
      { src: SB + 'math_cuhk_201617_newsletter_report_cover.png', title: 'Newsletter 2016-17, Department of Mathematics, CUHK', meta: 'Media coverage', frame: 'black', upperAngle: 150,
        link: 'https://www.math.cuhk.edu.hk/sites/default/files/about-us/newsletter/newsletter1617.pdf' },
    ],
  },

  /* ---------------- Publications ---------------- */
  cuhk_math_website_revamp: {
    wall: '#ece7dd', frame: 'black',
    description: 'Graphic design for the website of the Department of Mathematics, The Chinese University of Hong Kong.',
    pictures: {
      'kiking_201508_KleinBottle.jpg': { frame: 'white', scale: 1.85 },
      '201508_MathWebsite.jpg': { scale: 1.2 },
    },
    extras: [
      { src: 'album/cuhk_math_website_revamp/MathNewsletter1516.png', title: 'Newsletter 2015-16, Department of Mathematics, CUHK', meta: 'Publication',
        entryWall: true, link: 'https://www.math.cuhk.edu.hk/sites/default/files/about-us/newsletter/newsletter1516.pdf' },
      { src: 'album/cuhk_math_website_revamp/201508_MathWebsite.jpg', title: 'Department of Mathematics, CUHK', meta: 'Website · www.math.cuhk.edu.hk',
        description: 'Visit the website of the Department of Mathematics, The Chinese University of Hong Kong.',
        kiosk: { href: 'https://www.math.cuhk.edu.hk/' }, link: 'https://www.math.cuhk.edu.hk/', linkLabel: 'Visit the website' },
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
    swap: [['kiking_201311_MobiusTrip.jpg', 'kiking_201306_WhyMathIsFun.jpg']],   // these two trade places
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
  // all on the outer wall, each picture a third larger than the standard size
  if_pusheen_is_my_cat: { wall: '#e6e1d6', frame: 'black', description: 'Pen and pencil drawings, 2014.', fillInner: false, pictureDefaults: { scale: 1.35 } },
  because_its_cute: { wall: '#d9cdb8', frame: 'black', description: 'Pen drawings, 2014.', fillInner: false, pictureDefaults: { scale: 1.35 } },
  love_of_miyazaki: {
    wall: '#34493f', frame: 'white', description: 'Watercolor & fineliner on paper.',
    pictureDefaults: { meta: 'Watercolor & Fineliner on Paper' },   // album_items.json has no medium for these
  },
  moments_of_delight: {
    wall: '#d9cdb8', frame: 'gold',
    description: 'Early drawings and paintings in pen, coloured pencil, fineliner and acrylic.',
    pictures: { 'kiking_201204PCMS.jpg': { frame: 'none' } },
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
  link: site.galleryUrl, linkLabel: "Continue to Kiking's Art Gallery",
  artworks: [
    { src: 'resource/og_image_preview.png', title: "Kiking's Art Gallery", meta: 'The original online gallery · kiking0501.github.io/kiking-art-gallery',
      frame: 'black', scale: 1.3, link: site.galleryUrl },
  ],
};
