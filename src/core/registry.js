// §1 Entity registry + spawn ordinal: a per-run monotonic counter assigned to
// every spawned entity (actors, projectiles, zones). It is the universal
// deterministic tiebreak — never engine object ids. Iteration order is always
// ascending spawn ordinal (Map insertion order + a monotonic counter).

export function createRegistry() {
  let nextOrdinal = 0;
  const entities = new Map(); // ordinal -> entity

  return {
    // Assigns entity.id = next spawn ordinal and registers it.
    spawn(entity) {
      entity.id = nextOrdinal;
      nextOrdinal += 1;
      entities.set(entity.id, entity);
      return entity;
    },
    despawn(id) {
      return entities.delete(id);
    },
    byId(id) {
      return entities.get(id);
    },
    // Snapshot array in ascending spawn-ordinal order (safe to spawn/despawn
    // while iterating the snapshot).
    all() {
      return [...entities.values()];
    },
    get count() {
      return entities.size;
    },
    get nextOrdinal() {
      return nextOrdinal;
    },
    // Run boundary wipe (§13: everything wiped at run end).
    reset() {
      entities.clear();
      nextOrdinal = 0;
    },
    // Save system (docs/gauntlet/PLAN.md §3.4 rule 3, owner M2). serialize()
    // hands out the LIVE entity objects in ascending id order — the save layer
    // deep-clones the whole state tree once — and restore() patches them IN
    // PLACE by id, so every reference held elsewhere (world.player, the ally
    // and skill systems' player ref) stays valid:
    //   - an id present in both: keys absent from the save are deleted, every
    //     saved key assigned (the saved object's sub-objects are adopted —
    //     restore() receives a private clone);
    //   - an id only in the save: the saved object itself is registered;
    //   - an id only in the live registry: despawned.
    // The Map is then REBUILT in strictly ascending id order (Map iteration =
    // insertion order, and §1's ascending-ordinal rule is what every
    // order-dependent resolution relies on — gate G2.11), and nextOrdinal is
    // restored so the next spawn reuses exactly the id the save would have.
    serialize() {
      return { nextOrdinal, entities: [...entities.values()] };
    },
    restore(data) {
      if (!data || !Array.isArray(data.entities) || !Number.isFinite(data.nextOrdinal)) {
        throw new TypeError('registry.restore: expected { nextOrdinal, entities[] }');
      }
      const next = new Map();
      for (const saved of data.entities) {
        if (!saved || !Number.isFinite(saved.id)) throw new TypeError('registry.restore: entity without an id');
        if (next.has(saved.id)) throw new TypeError(`registry.restore: duplicate id ${saved.id}`);
        const live = entities.get(saved.id);
        if (live && live !== saved) {
          for (const k of Object.keys(live)) if (!(k in saved)) delete live[k];
          Object.assign(live, saved);
          next.set(saved.id, live);
        } else {
          next.set(saved.id, saved);
        }
      }
      const ids = [...next.keys()].sort((a, b) => a - b);
      entities.clear();
      for (const id of ids) entities.set(id, next.get(id));
      nextOrdinal = data.nextOrdinal;
      return entities.size;
    },
  };
}
