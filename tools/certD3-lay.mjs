// Certification block D round 3 — layout-probe reducer: real overlaps + overflow, from console.txt.
import { readFileSync } from 'fs';
const LAYERS = new Set(['#app', '#dmg-num-layer', '#hud-threat', '#nd-fizzle-layer', '#run-screen', '#hud']);
const isLayer = (n, r, vp) => LAYERS.has(n) || (r[2] >= vp[0] - 1 && r[3] >= vp[1] - 1);
for (const f of process.argv.slice(2)) {
  const txt = readFileSync(`captures/${f}.console.txt`, 'latin1');
  for (const line of txt.split('\n')) {
    if (!line.startsWith('[EVAL] {"tag":"')) continue;
    let o; try { o = JSON.parse(line.slice(7)); } catch (e) { continue; }
    if (!o.comps) continue;
    const vp = o.vp;
    const comps = o.comps.filter((c) => !isLayer(c[0], c[1], vp));
    const overlaps = (o.compOverlaps || []).filter(([a, b]) => {
      const ca = o.comps.find((c) => c[0] === a), cb = o.comps.find((c) => c[0] === b);
      if (!ca || !cb) return false;
      if (isLayer(a, ca[1], vp) || isLayer(b, cb[1], vp)) return false;
      if (a.replace(/^VERSION/, '') === b.replace(/^VERSION/, '')) return false; // same node listed twice
      return true;
    });
    console.log(`\n### ${f}  tag=${o.tag}  vp=${vp[0]}x${vp[1]}  scene=${o.scene}  uiScreen=${o.uiScreen}`);
    console.log('components (name | x,y,w,h | inside-viewport):');
    for (const [n, r, t] of comps) {
      const inside = r[0] >= 0 && r[1] >= 0 && r[0] + r[2] <= vp[0] && r[1] + r[3] <= vp[1];
      console.log(`  ${n.padEnd(34)} ${String(r).padEnd(22)} ${inside ? 'IN ' : '*** OUT ***'} ${JSON.stringify(t).slice(0, 34)}`);
    }
    console.log('sub-element overlaps (same class):', JSON.stringify(o.subOverlaps));
    console.log('viewport overflow:', JSON.stringify(o.overflow));
    console.log('component overlaps (layers excluded):', overlaps.length ? JSON.stringify(overlaps) : 'NONE');
  }
}
