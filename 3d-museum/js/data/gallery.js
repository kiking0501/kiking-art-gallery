/* Reads the original gallery's own files, so the museum never keeps a copy of them:
     ../main.js                 → the exhibitions (CATEGORY_MENU) and category names (CATEGORY_NAME)
     ../album/album_items.json  → every picture's file name, title, medium and link
     ../album/<id>.html         → heading text on an album page (used when a room has no description)
*/

// Runs the gallery's main.js in isolation and returns its two menus.
async function readMenus(root) {
  const res = await fetch(`${root}/main.js`);
  if (!res.ok) throw new Error(`Could not read ${root}/main.js (${res.status})`);
  const src = await res.text();
  const quiet = { addEventListener() {}, ready() {} };   // main.js also wires page events; they're not needed here
  const run = new Function('document', 'window', '$', 'jQuery', `${src}\n;return { CATEGORY_NAME, CATEGORY_MENU };`);
  return run(quiet, quiet, () => quiet, () => quiet);
}

async function readItems(root) {
  const res = await fetch(`${root}/album/album_items.json`);
  if (!res.ok) throw new Error(`Could not read ${root}/album/album_items.json (${res.status})`);
  return res.json();
}

/* The gallery as plain data:
   { categories: [{ id, name, albums: [{ id, name }] }], items: { albumId: [{ file, title, meta, link }] } } */
export async function loadGallery(root) {
  const [{ CATEGORY_NAME, CATEGORY_MENU }, rawItems] = await Promise.all([readMenus(root), readItems(root)]);
  const categories = Object.keys(CATEGORY_MENU).map(cat => ({
    id: cat,
    name: CATEGORY_NAME[cat] || cat,
    albums: CATEGORY_MENU[cat].map(entry => { const id = Object.keys(entry)[0]; return { id, name: entry[id].name || id }; }),
  }));
  const items = {};
  for (const [album, list] of Object.entries(rawItems)) {
    items[album] = list.map(entry => { const file = Object.keys(entry)[0]; return { file, ...entry[file] }; });
  }
  return { categories, items };
}

// Best-effort: heading lines written on an album page (not the picture captions).
export async function albumPageText(root, albumId) {
  try {
    const res = await fetch(`${root}/album/${encodeURIComponent(albumId)}.html`);
    if (!res.ok) return '';
    const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
    const lines = [];
    for (const el of doc.querySelectorAll('#main_content h3, #main_content h4, #main_content h5')) {
      if (el.closest('.image-tile, #template_image_tile') || /imagetext|imagemeta/.test(el.className)) continue;
      const t = el.textContent.replace(/\s+/g, ' ').trim();
      if (!t || /δ/.test(t)) break;                                     // stop at section headings such as "δ Media Coverage δ"
      lines.push(t);
    }
    return lines.join(' · ');
  } catch (e) { return ''; }
}
