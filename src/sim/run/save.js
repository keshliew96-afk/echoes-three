// THE RUN'S SAVE (docs/gauntlet/PLAN.md §3.4): the complete run frame and the
// expedition state written out and read back. A part of the run system
// (sim/run.js): the run's state is `rs`.
import { ACT_IDS } from '../../data/levels.js';
import { CHALLENGE } from '../../data/difficulty.js';
import { RUN, cloneData } from './rules.js';

export function createRunSave(ctx) {
  const { rs, autopilot, encounters, pages, relics, secrets, tonics, vaults } = ctx;

  // Persistence (PLAN §3.4) for the Gauntlet additions (the v0.4.63 run frame
  // members are captured by M2's world-level capture).
  const expeditionState = () => ({
    act: rs.act,
    challenge: rs.challenge,
    layout: rs.layout ? { ...rs.layout } : null,
    lastCombatLayout: rs.lastCombatLayout,
    roomPlan: rs.roomPlanView ? { ...rs.roomPlanView } : null,
    autopilot: autopilot.serialize(),
  });

  function restoreExpedition(d) {
    if (!d) return;
    rs.act = ACT_IDS.includes(d.act) ? d.act : 1;
    rs.challenge = CHALLENGE[d.challenge] ? d.challenge : 'standard';
    rs.layout = d.layout ? { ...d.layout } : null;
    rs.lastCombatLayout = d.lastCombatLayout ?? null;
    rs.roomPlanView = d.roomPlan ? { ...d.roomPlan } : null;
    autopilot.restore(d.autopilot);
  }

  // Save system (docs/gauntlet/PLAN.md §3.4, M2): the COMPLETE run frame —
  // the v0.4.63 members plus the expedition state and the autopilot (the
  // draft and status tracker are stateless; roomHooks are wiring, not state).
  function saveState() {
    return {
      active: rs.active,
      roomIndex: rs.roomIndex,
      phase: rs.phase,
      wallet: rs.wallet,
      frame: rs.frame,
      reward: rs.reward,
      path: rs.path,
      shop: rs.shop,
      summary: rs.summary,
      pendingRoom: rs.pendingRoom,
      fadeUntilTick: rs.fadeUntilTick,
      rewardFor: rs.rewardFor,
      clearedRooms: rs.clearedRooms,
      roomsDone: rs.roomsDone,
      startTick: rs.startTick,
      everStarted: rs.everStarted,
      act: rs.act,
      challenge: rs.challenge,
      layout: rs.layout,
      lastCombatLayout: rs.lastCombatLayout,
      roomPlan: rs.roomPlanView,
      autopilot: autopilot.serialize(),
      spoils: rs.spoils,
      spoilsTotal: rs.spoilsTotal,
      // CAMPAIGN (schema 3): the level director's whole state, the card included.
      campaign: cloneData(rs.campaign),
      autoReturnTick: rs.autoReturnTick,
      // PARTY (schema 4, PLAN §16.6): the party page, the shelves, the door
      // deadline — present only when something is open.
      ...(pages && (pages.isOpen() || pages.shopOpen() || pages.doorDeadline() !== null || pages.screensAny()) ? { partyPages: pages.saveState() } : {}),
      // RELICS: present only when the run rolls relics.
      ...(rs.active && relics.enabled() ? { relics: relics.saveState() } : {}),
      // EVENT ROOMS: present only when the run rolls "?" doors.
      ...(rs.active && encounters.enabled() ? { encounters: encounters.saveState() } : {}),
      // KEYS AND VAULTS: present only in a run with keys.
      ...(rs.active && vaults.enabled() ? { vaults: vaults.saveState() } : {}),
      ...(rs.active && tonics.enabled() ? { tonics: tonics.saveState() } : {}),
      ...(rs.active && secrets.enabled() ? { secrets: secrets.saveState() } : {}),
      ...(rs.active && rs.shrine ? { shrine: cloneData(rs.shrine) } : {}),
      ...(rs.bossPick ? { bossPick: rs.bossPick } : {}),
      ...(rs.thirdOpen.length ? { thirdBosses: rs.thirdOpen.slice() } : {}),
    };
  }

  function loadState(d) {
    if (!d || typeof d.phase !== 'string') throw new TypeError('run.loadState: missing phase');
    rs.active = !!d.active;
    rs.roomIndex = d.roomIndex ?? 0;
    rs.phase = d.phase;
    rs.wallet = d.wallet ?? RUN.startingGlint;
    rs.frame = d.frame ?? null;
    rs.reward = d.reward ?? null;
    rs.path = d.path ?? null;
    rs.shop = d.shop ?? null;
    rs.summary = d.summary ?? null;
    rs.pendingRoom = d.pendingRoom ?? 0;
    rs.fadeUntilTick = d.fadeUntilTick ?? 0;
    rs.rewardFor = d.rewardFor ?? {};
    rs.clearedRooms = d.clearedRooms ?? 0;
    rs.roomsDone = d.roomsDone ?? 0;
    rs.startTick = d.startTick ?? 0;
    rs.everStarted = !!d.everStarted;
    rs.act = ACT_IDS.includes(d.act) ? d.act : 1;
    rs.challenge = CHALLENGE[d.challenge] ? d.challenge : 'standard';
    rs.bossPick = typeof d.bossPick === 'string' ? d.bossPick : null;
    rs.thirdOpen = Array.isArray(d.thirdBosses) ? d.thirdBosses.filter((a) => ACT_IDS.includes(a)) : [];
    rs.layout = d.layout ?? null;
    rs.lastCombatLayout = d.lastCombatLayout ?? null;
    rs.roomPlanView = d.roomPlan ?? null;
    autopilot.restore(d.autopilot ?? null);
    // M4c additions — absent in a tree migrated from schema 1.
    rs.spoils = d.spoils ?? null;
    rs.spoilsTotal = Number.isFinite(d.spoilsTotal) ? d.spoilsTotal : 0;
    // CAMPAIGN additions (schema 3; save/codec.js MIGRATIONS[2] fills them
    // for an older act run). A live run with no campaign record is treated as
    // a campaign from its act, so an in-memory older payload still advances.
    rs.campaign = d.campaign ? cloneData(d.campaign) : null;
    if (!rs.campaign && rs.active) {
      rs.campaign = {
        mode: 'campaign',
        harness: false,
        startLevel: rs.act,
        level: rs.act,
        index: 1,
        levels: [{ level: rs.act, index: 1, startTick: rs.startTick, rooms: rs.roomsDone, cleared: false, ticks: 0 }],
        startTick: rs.startTick,
        levelStartTick: rs.startTick,
        clearedAt: 0,
        card: null,
        grant: null,
        transitions: 0,
      };
    }
    rs.autoReturnTick = Number.isFinite(d.autoReturnTick) ? d.autoReturnTick : null;
    if (pages) pages.loadState(d.partyPages ?? null);
    relics.loadState(d.relics ?? null);
    encounters.loadState(d.encounters ?? null);
    vaults.loadState(d.vaults ?? null);
    tonics.loadState(d.tonics ?? null);
    secrets.loadState(d.secrets ?? null);
    rs.shrine = d.shrine ? cloneData(d.shrine) : null;
  }

  return { expeditionState, restoreExpedition, saveState, loadState };
}
