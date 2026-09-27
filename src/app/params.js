// Boot parameters (docs/gauntlet/PLAN.md §6 harness contract). One parser for
// every module so the menu-skip rule and the harness params never drift.
//
// LEGACY HARNESS PARAMS (v0.4.63 regression suite — MUST keep working and MUST
// boot exactly as before, i.e. straight into the game with no title):
//   ?scene=  ?room=  ?run=1  ?seed=  ?variant=
// MENU RULE:
//   ?menu=0 -> never show the title (boot straight into camp, sim ticking from tick 1)
//   ?menu=1 -> always show the title (even with legacy params, e.g. ?seed=5&menu=1)
//   neither -> title iff NO legacy harness param is present (a player's plain URL)
// Other params are documented in PLAN.md §6 and docs/TESTING.md.

// ('layout' is the Gauntlet content-harness param; it skips the title like the rest.)
// ('level' — CAMPAIGN: a campaign AT that level on the first ticked frame.)
export const LEGACY_HARNESS_PARAMS = Object.freeze(['scene', 'room', 'run', 'seed', 'variant', 'layout', 'level']);

function flagOf(params, name, def) {
  const v = params.get(name);
  if (v === null) return def;
  return v !== '0' && v !== 'false';
}

export function parseBootParams(search = typeof window !== 'undefined' ? window.location.search : '') {
  const p = new URLSearchParams(search);
  const legacy = LEGACY_HARNESS_PARAMS.filter((k) => p.has(k));
  const menuParam = p.get('menu');
  let showTitle;
  if (menuParam === '0' || menuParam === 'false') showTitle = false;
  else if (menuParam === '1' || menuParam === 'true') showTitle = true;
  else showTitle = legacy.length === 0;
  const int = (k) => (p.has(k) ? parseInt(p.get(k), 10) : null);
  return Object.freeze({
    raw: p,
    legacy,
    showTitle,
    menuSkip: !showTitle,
    scene: p.get('scene'),
    room: p.get('room'),
    run: p.get('run') === '1',
    seed: p.has('seed') ? Number(p.get('seed')) >>> 0 : null,
    variant: int('variant'),
    act: int('act'), // M4a: expedition 1..3 for ?run=1 / cmd('startRun')
    level: int('level'), // CAMPAIGN (PLAN §12.11): ?level=N starts a campaign AT level N (harness)
    // M4b: ?layout=1..9 = that layout's dressing AND its hazards/interactables
    // spawned in the ?room= harness (content probes). ?variant=N stays
    // dressing-only (v0.4.63 sim content, goldens unchanged); for N >= 4 the
    // biome/palette/music follow the layout's act. Roster: ?act= if given,
    // else the legacy §11 roll in ?room=, the act's roster inside a run.
    layout: int('layout'),
    debug: flagOf(p, 'debug', false),
    fps: flagOf(p, 'fps', false), // INT: fps meter in player builds
    fresh: flagOf(p, 'fresh', false), // wipe echoes.* storage at boot (clean-profile tests)
    freeze: flagOf(p, 'freeze', false), // sim frozen at tick 0 until __echoes.sim.thaw() (golden traces)
    slot: p.get('slot'), // M2: auto-load a save slot at boot
    audio: flagOf(p, 'audio', true), // M3: ?audio=0 builds the engine muted
    net: p.get('net'), // M5: ws://host:port/echoes override
    netHost: flagOf(p, 'nethost', false), // M5b harness: auto-host a lobby
    netJoin: p.get('netjoin'), // M5b harness: auto-join room CODE
    netQuick: flagOf(p, 'netquick', false), // M5b harness: auto quick-match
    netName: p.get('netname'),
    netSeat: int('netseat'),
    netCond: p.get('netcond'), // client-side conditioner spec, e.g. lat75,jit10,loss10
    netRate: int('netrate'), // M5a: snapshot rate override 10..60 Hz (tests)
    // PARTY (PLAN §16.11): the Ally builds mode for this boot (not saved), and
    // a harness grant for every ally at run start (N = STARTER_GRANT[N].allies,
    // 'max' = the deterministic max-stress build of all four seats).
    party: ['suggest', 'manual', 'auto'].includes(p.get('party')) ? p.get('party') : null,
    partyGrant: p.get('partygrant') === 'max' ? 'max' : p.has('partygrant') && Number.isFinite(Number(p.get('partygrant'))) ? Number(p.get('partygrant')) : null,
  });
}

// Wipe every key this game owns (settings, saves, profile, net session) —
// used by ?fresh=1 so a critic starts from a clean profile without touching
// other origins' storage. Returns the number of keys removed.
export function wipeEchoesStorage(
  storage = (() => {
    try {
      return typeof window !== 'undefined' ? window.localStorage : null; // M2: the getter throws when site data is blocked
    } catch {
      return null;
    }
  })()
) {
  if (!storage) return 0;
  let n = 0;
  try {
    const keys = [];
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i);
      if (k && k.startsWith('echoes.')) keys.push(k);
    }
    for (const k of keys) {
      storage.removeItem(k);
      n += 1;
    }
  } catch {
    // storage unavailable (privacy mode) — nothing to wipe
  }
  return n;
}
