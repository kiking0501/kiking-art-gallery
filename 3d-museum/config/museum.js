/* =====================================================================
   SITE SETTINGS — the things that are about the whole museum
   =====================================================================
   Edit the values on the right. Text in quotes can be anything.
   Paths are relative to the gallery's root folder (kiking-art-gallery/),
   e.g. 'album/self_portraits/kiking_profile.png'.
*/
export default {
  // Shown on the entry card, in the top-left corner and as the browser tab title.
  title: "Kiking's Art · Online Museum",
  subtitle: 'Mathematical art, paintings & drawings by Kiking',

  // Small line under the entry card and under every artwork's info card.
  credit: 'Artwork © Kiking (kiking0501.github.io/kiking-art-gallery)',

  // The original gallery. Used by the "Art Gallery" button, the entry card and the last room.
  galleryUrl: 'https://kiking0501.github.io/kiking-art-gallery/',

  // Where the gallery's files are, seen from this folder. Leave as '..' while
  // online-museum/ sits inside the kiking-art-gallery repository.
  galleryRoot: '..',

  // Round picture on the entry card.
  avatar: 'album/self_portraits/kiking_profile.png',

  // Entry card.
  enterButton: 'Enter the museum',
  galleryLinkText: 'or visit the original Art Gallery ↗',
  // One-line hint shown briefly after entering ('' for none).

  // Guided tour: seconds spent at each work before walking on (the Tour button fills up meanwhile).
  tourSecondsPerStop: 6,

  // Big lettering in the last room.
  closingText: 'Thank you for your visit',

  // Spelling fixes applied to titles and descriptions read from album/album_items.json.
  // (Better still: fix them in album_items.json, then delete the line here.)
  textFixes: [
    // ['Arcylic', 'Acrylic'], ['Arrylic', 'Acrylic'], ['Senerity', 'Serenity'],
  ],
};
