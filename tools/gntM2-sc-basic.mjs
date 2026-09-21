// Basic in-page bring-up: the save service exists, a camp round trip holds,
// a save/load cycle works, the slot list shows it. (dev sanity scenario)
export default async function (h) {
  await h.waitFor(() => window.__echoes.tick > 120 && window.__echoes.save);
  const info = await h.ev(() => {
    const s = window.__echoes.save;
    return { keys: Object.keys(s), list: s.list(), canSave: s.canSave(), tracker: s.tracker(), boot: s.bootHash(), recovery: s.recovery() };
  });
  h.log('info', info);
  const rt = await h.ev(() => window.__echoes.save.roundTrip({ ticks: 600, scriptSeed: 1 }));
  h.log('roundTrip.camp', { ...rt, hashes: rt.hashes.length });
  if (!rt.equal || !rt.continuationEqual) h.fail('camp round trip', rt.firstDivergence);
  const sv = await h.ev(async () => window.__echoes.save.save('manual-1', { name: 'Bring-up' }));
  h.log('save', sv);
  if (!sv.ok) h.fail('save manual-1', sv);
  const ld = await h.ev(async () => {
    const r = await window.__echoes.save.loadRaw('manual-1');
    return { ...r, hash: window.__echoes.save.hash() };
  });
  h.log('load', ld);
  if (!ld.ok) h.fail('load manual-1', ld);
  const list = await h.ev(() => window.__echoes.save.list().map((m) => ({ id: m.id, name: m.name, status: m.status, where: m.meta.mode, bytes: m.bytes, thumb: m.thumb })));
  h.log('list', list);
  const usage = await h.ev(() => window.__echoes.save.usage());
  h.log('usage', usage);
  await h.ev(() => window.__echoes.app.open('saves', { mode: 'load' }));
  await h.sleep(600);
  await h.shot('basic-saves');
}
