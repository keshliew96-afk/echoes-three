// Certification block D round 5 — layout-probe reducer: component rects, viewport overflow,
// CROSS overlaps (parent/child containment listed separately), from captures/<name>.console.txt.
import { readFileSync } from 'fs';
for (const f of process.argv.slice(2)) {
  let txt;
  try { txt = readFileSync(`captures/${f}.console.txt`, 'latin1'); } catch (e) { console.log(`\n### ${f}: MISSING`); continue; }
  for (const line of txt.split('\n')) {
    if (!line.startsWith('[EVAL] {"tag":"')) continue;
    let o; try { o = JSON.parse(line.slice(7)); } catch (e) { continue; }
    if (o.comps) {
      const vp = o.vp;
      console.log(`\n### ${f}  tag=${o.tag}  vp=${vp[0]}x${vp[1]}  scene=${o.scene}  uiScreen=${o.uiScreen}  version=${o.version}  enemies=${o.enemies}  banner=${o.banner && o.banner.text}`);
      console.log('components (name | x,y,w,h | inside-viewport | text):');
      for (const [n, r, t] of o.comps) {
        const inside = r[0] >= -0.5 && r[1] >= -0.5 && r[0] + r[2] <= vp[0] + 0.5 && r[1] + r[3] <= vp[1] + 0.5;
        console.log(`  ${n.slice(0, 44).padEnd(44)} ${String(r).padEnd(22)} ${inside ? 'IN ' : '*** OUT ***'} ${JSON.stringify(t).slice(0, 40)}`);
      }
      const cross = (o.overlaps || []).filter((h) => h[5] === 'CROSS');
      const cont = (o.overlaps || []).filter((h) => h[5] !== 'CROSS');
      console.log('CROSS overlaps:', cross.length ? JSON.stringify(cross) : 'NONE');
      console.log('containment (parent/child):', cont.map((h) => `${h[0]} ${h[5]} ${h[2]}`).join(' ; ') || 'none');
      console.log('same-class sub-overlaps:', JSON.stringify(o.subOverlaps));
      console.log('components out of viewport:', JSON.stringify(o.outOfViewport));
      console.log('any-element viewport overflow:', JSON.stringify(o.overflow));
    } else if (o.samples !== undefined) {
      console.log(`\n### ${f}  tag=${o.tag}  MONITOR samples=${o.samples} distinctLayouts=${o.distinctLayouts} bannerFrames=${o.bannerFrames} bossFrames=${o.bossFrames}`);
      console.log(`  crossIncidents=${o.crossIncidents} outOfViewportIncidents=${o.outOfViewportIncidents} overflowIncidents=${o.overflowIncidents}`);
      console.log('  crossSample:', JSON.stringify(o.crossSample));
      console.log('  overflowSample:', JSON.stringify(o.overflowSample));
      for (const L of o.layouts || []) {
        console.log(`  -- layout @tick ${L.tick} banner=${L.banner} boss=${JSON.stringify(L.boss)}`);
        for (const [n, r, t] of L.comps) console.log(`     ${n.slice(0, 44).padEnd(44)} ${String(r).padEnd(22)} ${JSON.stringify(t).slice(0, 40)}`);
      }
    }
  }
}
