// gntM3 misc checks: ?audio=0 builds the engine force-muted (tab status says
// so, unmuting Master ends it); an external registerCue + registerEventCue +
// measureCue round trip; farewell -> silence is covered by M1's G1.10 probe.
import { openAudio, ev, sleep, out, BASE } from './gntM3-lib.mjs';
const res = {};
{
  const { browser, page, errors } = await openAudio(`${BASE}?menu=0&seed=7&audio=0`);
  await sleep(4000);
  res.audio0 = await ev(page, async () => {
    const A = window.__echoes.audio;
    const before = { master: A.buses().master, send: A.busGain('master').param, tap: null };
    A.meterReset();
    await new Promise((r) => setTimeout(r, 1200));
    before.tap = A.meter('master').rmsDb;
    window.__echoes.app.open('settings', { tab: 'audio' });
    await new Promise((r) => setTimeout(r, 600));
    const status = (document.querySelector('.au-status') || {}).textContent || null;
    const btn = document.getElementById('au-master-mute');
    const label = btn.textContent;
    btn.click(); // the player's route: Settings > Audio > Master > Muted
    await new Promise((r) => setTimeout(r, 500));
    A.meterReset();
    await new Promise((r) => setTimeout(r, 1200));
    return { before, status, buttonLabelBefore: label, after: { master: A.buses().master, send: A.busGain('master').param, tap: A.meter('master').rmsDb } };
  });
  res.audio0.errors = errors.length;
  await browser.close();
}
{
  const { browser, page, errors } = await openAudio(`${BASE}?menu=0&seed=7`);
  await sleep(4000);
  res.external = await ev(page, async () => {
    const svc = window.__echoes.audio;
    // the service object (not the debug view) exposes registerCue
    return null;
  });
  // registerCue lives on the service; reach it through the app registry probe seam.
  res.external = await ev(page, async () => {
    const A = window.__echoes.app.service ? window.__echoes.app.service('audio') : null;
    if (!A) return { error: 'no app.service seam' };
    A.registerCue('probe_blip', { bus: 'sfx', levelDb: -12, voice: (ctx, t, dest, p) => p.kit.tone(dest, t, { f0: 900, d: 0.2, gain: 0.5 }) });
    const m = await A.debug.measureCue('probe_blip');
    A.registerCue('probe_blip', { bus: 'sfx', levelDb: -12, calDb: m.designPeakDb, voice: (ctx, t, dest, p) => p.kit.tone(dest, t, { f0: 900, d: 0.2, gain: 0.5 }) });
    const m2 = await A.debug.measureCue('probe_blip');
    const off = A.registerEventCue('probe_event', (ev) => [{ cue: 'probe_blip', x: ev.x, z: ev.z }]);
    window.__echoes.on('sound', (e) => { if (e.cue === 'probe_blip') window.__m3probe = e; });
    return { first: m, calibrated: m2, subscribed: A.debug.eventTypes().includes('probe_event'), off: typeof off };
  });
  res.external.errors = errors.length;
  await browser.close();
}
res.pass = res.audio0.before.send === 0 && res.audio0.before.tap < -90 && /audio=0/.test(res.audio0.status || '') && res.audio0.after.send > 0.4 && res.audio0.after.tap > -60 && res.external.calibrated && Math.abs(res.external.calibrated.measuredPeakDb - -12) < 0.5;
out(res);
