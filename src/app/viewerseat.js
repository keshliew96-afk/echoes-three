// The local viewer's seat (party index): a network guest's class seat, a
// host's seat, or the class chosen for single-player (CLASS SELECT,
// app/playclass.js) — all read off the session / solo presentation seam
// world.netView. 0 = the Healer (single-player default).
import { service } from './registry.js';

export function viewerSeat() {
  try {
    const n = service('net');
    if (n && typeof n.isGuest === 'function' && n.isGuest()) return Number.isInteger(n.seat) ? n.seat : 0;
    const c = service('content');
    const w = c && typeof c.world === 'function' ? c.world() : null;
    const nv = w && w.netView;
    return nv && Number.isInteger(nv.seat) ? nv.seat : 0;
  } catch {
    return 0;
  }
}
