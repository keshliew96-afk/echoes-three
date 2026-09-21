// A load never replays run_start / layout_enter: the audio engine must re-read
// the act from the restored run (state_restored) — music theme + state follow
// the loaded save, both ways. Run with --autoplay 1.
//   node tools/gntM2-drive.mjs tools/gntM2-sc-audioresync.mjs --autoplay 1
export default async function (h) {
  const { ev, sleep, waitFor, log, fail } = h;
  await h.open('http://127.0.0.1:5199/?menu=0&seed=6&fresh=1');
  await waitFor(() => window.__echoes.tick > 120 && window.__echoes.save && window.__echoes.audio);
  await ev(() => window.__echoes.audio.unlock && window.__echoes.audio.unlock());
  const camp = await ev(async () => (await window.__echoes.save.save('manual-1', { name: 'camp' })).ok);
  await ev(() => window.__echoes.cmd('startRun', { act: 3 }));
  await waitFor(() => window.__echoes.state().run.phase === 'combat' && window.__echoes.state().enemies.length > 0, { timeout: 20000 });
  await sleep(2500);
  const inRun = await ev(() => window.__echoes.audio.music());
  const saved = await ev(async () => (await window.__echoes.save.save('manual-2', { name: 'barrow' })).ok);
  // Back to camp (music camp / wood), then load the Act III save.
  await ev(() => window.__echoes.cmd('endRun', 'defeat'));
  await sleep(500);
  await ev(() => window.__echoes.cmd('returnToCamp'));
  await sleep(3500);
  const atCamp = await ev(() => window.__echoes.audio.music());
  await ev(() => { window.__gntM2mark = 'same-page'; });
  const lr = await ev(async () => { const r = await window.__echoes.save.loadRaw('manual-2'); return { ok: r.ok, music: window.__echoes.audio.music().state }; });
  await sleep(3000);
  const afterLoad = await ev(() => ({ ...window.__echoes.audio.music(), samePage: window.__gntM2mark === 'same-page', audioState: window.__echoes.audio.state }));
  log('loadRaw', lr);
  // And back: load the camp save from inside the run.
  await ev(async () => window.__echoes.save.loadRaw('manual-1'));
  await sleep(3500);
  const afterCampLoad = await ev(() => window.__echoes.audio.music());
  log('music', { camp, saved, inRun, atCamp, afterLoad, afterCampLoad });
  if (inRun.theme !== 'barrow') fail('precondition: Act III plays the barrow theme', inRun);
  if (afterLoad.theme !== 'barrow' || !['combat', 'boss'].includes(afterLoad.state)) fail('after loading an Act III combat save: barrow combat music', afterLoad);
  if (afterCampLoad.state !== 'camp') fail('after loading a camp save: camp music', afterCampLoad);
}
