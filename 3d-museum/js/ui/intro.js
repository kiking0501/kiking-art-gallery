/* The entry card shown while the museum loads: picture, title, "Enter the museum"
   and a link to the original gallery. */
import { $, esc } from '../util.js';

export function fillIntro(site, avatarUrl) {
  // "Kiking's Art · Online Museum" → two lines, each kept whole
  const parts = String(site.title || '').split(/\s+·\s+/);
  $('introTitle').innerHTML = parts.length === 2 ? `<span class="l1">${esc(parts[0])}</span><span class="l2">${esc(parts[1])}</span>` : esc(site.title || '');
  $('introSub').textContent = site.subtitle || '';
  $('introCredit').textContent = site.credit || '';
  $('introGal').textContent = site.galleryLinkText || 'Visit the original gallery ↗';
  $('introGal').href = site.galleryUrl || '#'; $('introGal').classList.toggle('hidden', !site.galleryUrl);
  if (avatarUrl) { $('introAvatar').src = avatarUrl; $('introAvatar').classList.remove('hidden'); }
}
export function setLoading(text) { $('loadmsg').textContent = text; }
export function showError(text) { $('loadmsg').innerHTML = `<span style="color:#f1a08f">${text}</span>`; }
// Turn the button on; onEnter runs when the visitor clicks it.
export function ready(label, onEnter) {
  const enter = $('enter'); enter.disabled = false; enter.textContent = label;
  enter.onclick = () => { $('intro').classList.add('hidden'); onEnter(); };
}
