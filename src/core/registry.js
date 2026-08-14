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
  };
}
