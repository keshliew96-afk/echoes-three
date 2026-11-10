// HERO RIG REGISTRY. The arena (the playable Healer and the party's rigs)
// and the ally layer (its own rigs, where no arena scene lends them)
// register each hero's live rig by class, so a render layer that needs a
// rig's named points (B8: 'hand', 'tip') can read them without plumbing the
// rigs through every constructor: the VFX templates trace a blade slash
// from the weapon tip (VFX_HIT_RULES T1, docs/HIT_FEEDBACK.md j).
//
// One rig per class at a time: the camp, the lab and the portraits build
// their own critters and never register them. Render only.
const rigs = new Map(); // classId -> critter (render/critters/index.js)

export function registerHeroRig(classId, rig) {
  if (!classId || !rig) return;
  rigs.set(classId, rig);
}
export function unregisterHeroRig(classId, rig = null) {
  if (rig && rigs.get(classId) !== rig) return;
  rigs.delete(classId);
}
export const heroRig = (classId) => rigs.get(classId) ?? null;
// A named point of the class's live rig in world space, or null when the
// class has no registered rig or the rig no such point.
export function heroRigPoint(classId, name, out) {
  const r = rigs.get(classId);
  return r && r.pointWorld ? r.pointWorld(name, out) : null;
}
// The rig's feet in world space (the hero's centre), or null.
export function heroRigCenter(classId, out) {
  const r = rigs.get(classId);
  return r && r.group ? r.group.getWorldPosition(out) : null;
}
// Whether the class's rig is mid-move (a swing or a cast before its
// contact), so a trace fed from its tip will have a path to draw.
export function heroRigMoving(classId) {
  const r = rigs.get(classId);
  return !!(r && r.moveLive && r.moveLive());
}
