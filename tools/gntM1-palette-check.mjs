#!/usr/bin/env node
// G1.12 checker: reads captures/gntM1-palette-frames.json (written by
// tools/gntM1-sc-palette.mjs) and runs tools/analyze.mjs --box on every plate
// rect; prints per-frame band counts and a verdict. Whole-frame Ember count of
// the title (the live camp backdrop) must be <= 952 * 1.1.
import { readFileSync } from 'fs';
import { execFileSync } from 'child_process';

const frames = JSON.parse(readFileSync('captures/gntM1-palette-frames.json', 'utf8'));
const hues = (png, box) => {
  const args = ['tools/analyze.mjs'];
  if (box) args.push('--box', box.join(','));
  args.push(png);
  const out = execFileSync('node', args, { encoding: 'utf8' });
  const m = out.match(/HUES\s+danger (\d+)\s+heal (\d+)\s+violet (\d+)\s+amber (\d+)/);
  return m ? { danger: +m[1], heal: +m[2], violet: +m[3], amber: +m[4] } : null;
};
const report = [];
let bad = 0;
for (const f of frames) {
  const offenders = [];
  let checked = 0;
  for (const r of f.rects) {
    const h = hues(f.path, r.box);
    checked++;
    if (!h) continue;
    if (h.danger || h.heal || h.violet) offenders.push({ ...r, ...h });
  }
  bad += offenders.length;
  const whole = hues(f.path, null);
  report.push({ frame: f.name, rects: checked, offenders, whole });
}
const title = report.find((r) => r.frame === 'title');
for (const r of report) console.log(JSON.stringify(r));
console.log(
  JSON.stringify({
    verdict: {
      platesClean: bad === 0,
      offenders: bad,
      titleBackdropEmber: title ? title.whole.danger : null,
      titleBackdropOk: title ? title.whole.danger <= 952 * 1.1 : null,
    },
  })
);
