// Records screen layout at the driver's window size with a full top-10 table
// (11 runs recorded through the service's real recordRun() — the call the
// run_end listener makes).
//   node tools/gntM2-drive.mjs tools/gntM2-sc-records.mjs --w 1024 --h 576
import { auditTop } from './gntM2-audit.mjs';
const ORIGIN = 'http://127.0.0.1:5199/';
export default async function (h) {
  const { ev, key, sleep, shot, waitFor, log, fail, W, H } = h;
  await h.open(`${ORIGIN}?menu=0&seed=4&fresh=1`);
  await waitFor(() => window.__echoes.tick > 60 && window.__echoes.save);
  await ev(() => {
    const s = window.__echoes.app.service('save');
    const acts = [1, 2, 3];
    const ch = ['relaxed', 'standard', 'harrowing'];
    for (let i = 0; i < 11; i++) {
      s.recordRun({ act: acts[i % 3], victory: i % 2 === 0, roomsCleared: 3 + (i % 6), kills: 20 + i * 3, timeSec: 400 + i * 17, seed: 1000 + i, challenge: ch[i % 3], lastRoom: 3 + (i % 6) });
    }
  });
  await h.open(ORIGIN);
  await waitFor(() => window.__echoes.app.state === 'title' || document.querySelector('.ap-press.ap-on'), { timeout: 90000 });
  if (await ev(() => window.__echoes.app.state !== 'title')) await key('Enter');
  await waitFor(() => window.__echoes.app.state === 'title', { timeout: 10000 });
  await ev(() => window.__echoes.app.open('records'));
  await sleep(500);
  const a = await ev(auditTop, { floor: W <= 1024 ? 14 : 18, minHit: 40 });
  const rows = await ev(() => document.querySelectorAll('.sv-scores tbody tr').length);
  log(`records-${W}x${H}`, { rows, audit: a.issueCount, issues: a.issues, minFont: a.minFont, ring: a.ring });
  if (a.issueCount) fail(`records layout at ${W}x${H}`, a.issues);
  if (rows !== 10) fail('top 10 only', rows);
  await shot(`records-${W}x${H}`);
}
