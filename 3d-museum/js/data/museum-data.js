/* Puts the gallery (what exists) and config/rooms.js (how to show it) together
   into the list of rooms the 3D museum builds. Nothing here needs editing to add
   pictures or exhibitions; see config/rooms.js. */
import { albumPageText } from './gallery.js';
import { DEFAULT_WALLS } from '../../config/look.js';

const ROOM_KEYS = ['name', 'kind', 'description', 'wall', 'frame', 'mood', 'ceiling', 'gap', 'pairWithPrev', 'newRow',
  'keepOrder', 'hangReverse', 'scatter', 'entryWall', 'link', 'linkLabel', 'label', 'stackHeight', 'swap', 'walls', 'fillInner'];

export async function buildMuseum(gallery, site, roomsConfig) {
  const { ROOMS = {}, EXTRA_ROOMS = [], WELCOME_ROOM, CLOSING_ROOM } = roomsConfig;
  const root = site.galleryRoot.replace(/\/$/, '');
  const fix = s => typeof s === 'string' ? (site.textFixes || []).reduce((t, [a, b]) => t.split(a).join(b), s) : s;
  const url = p => !p || /^(https?:|data:|blob:)/.test(p) ? p : encodeURI(`${root}/${p.replace(/^\/+/, '')}`);

  // One artwork, in the shape the 3D engine uses: { src, title, meta, link, frame, scale, ... }
  const artwork = (a) => {
    const out = { ...a, src: url(a.src) };
    if (out.instagram) out.link = out.instagram;           // config/rooms.js can give a picture `instagram: 'https://…'`
    if (a.video?.kind === 'file') out.video = { ...a.video, src: (a.video.src || []).map(url) };
    for (const k of ['title', 'meta', 'description']) if (out[k]) out[k] = fix(out[k]);
    return out;
  };
  // A picture from album_items.json: "Title, 2024" becomes title "Title" and the year goes on the medium line.
  const fromGallery = (albumId, item, cfg) => {
    let title = (item.title || '').trim(), meta = fix((item.meta || '').trim()), year = '';
    const m = title.match(/^(.*),\s*(\d{4})$/); if (m) { title = m[1].trim(); year = m[2]; }
    if (!title) { title = meta; meta = ''; }                            // photos with only a caption
    const base = { title: fix(title), meta: '', link: item.instagram || item.link || undefined };   // an Instagram link wins when the gallery has one
    const over = { ...(cfg.pictureDefaults || {}), ...((cfg.pictures || {})[item.file] || {}) };
    const metaLine = [over.meta ?? meta, year].filter(Boolean).join(' · ');
    const a = artwork({ ...base, ...over, meta: metaLine, src: `album/${albumId}/${item.file}` });
    a.file = item.file;                                                // (for `swap` in config/rooms.js)
    if (cfg.groupBy) a.group = cfg.groupBy(item.file);
    if (cfg.stack && cfg.stack(item.file)) a.stack = true;            // hung in a stack, two-high
    return a;
  };
  const roomFrom = (cfg, extra) => {
    const r = {};
    for (const k of ROOM_KEYS) if (cfg[k] !== undefined) r[k] = cfg[k];
    if (cfg.layout === 'rotunda') r.rotunda = true;
    if (cfg.layout === 'theatre') r.theatre = true;
    return Object.assign(r, extra);
  };

  const rooms = [];
  if (WELCOME_ROOM) rooms.push(roomFrom(WELCOME_ROOM, { kind: 'intro', artworks: (WELCOME_ROOM.artworks || []).map(artwork) }));
  for (const cat of gallery.categories) {
    for (const album of cat.albums) {
      const cfg = ROOMS[album.id] || {};
      if (!cfg.hidden) {
        // pictures: this album's list (+ any extra lists), minus exclusions, in the chosen order, then extras
        let items = [album.id, ...(cfg.alsoInclude || [])].flatMap(key => (gallery.items[key] || []).map(it => ({ it, key })));
        items = items.filter(({ it }) => !(cfg.exclude || []).includes(it.file));
        if (cfg.order) { const rank = f => { const i = cfg.order.indexOf(f); return i < 0 ? 1e6 : i; }; items = items.map((x, i) => ({ ...x, i })).sort((p, q) => rank(p.it.file) - rank(q.it.file) || p.i - q.i); }
        const folder = album.id;   // album_items lists added with alsoInclude keep their pictures in the album's own folder
        const artworks = [...items.map(({ it }) => fromGallery(folder, it, cfg)), ...(cfg.extras || []).map(artwork)];
        let description = cfg.description;
        if (description === undefined) description = await albumPageText(root, album.id);
        rooms.push(roomFrom(cfg, { id: album.id, name: cfg.name || album.name, category: cat.name, description: fix(description || ''), artworks }));
      }
      for (const ex of EXTRA_ROOMS.filter(e => e.after === album.id)) {
        rooms.push(roomFrom(ex, { id: ex.id, category: cat.name, artworks: (ex.artworks || []).map(artwork) }));
      }
    }
  }
  if (CLOSING_ROOM) rooms.push(roomFrom(CLOSING_ROOM, { kind: 'closing', artworks: (CLOSING_ROOM.artworks || []).map(artwork) }));

  rooms.forEach((r, i) => { r.wall = r.wall || DEFAULT_WALLS[i % DEFAULT_WALLS.length]; r.frame = r.frame || 'black'; r.artworks = r.artworks || []; });
  return {
    title: site.title, subtitle: site.subtitle, credit: site.credit, closing: site.closingText,
    gallery: site.galleryUrl, avatar: url(site.avatar), rooms,
  };
}
