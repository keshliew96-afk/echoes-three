const D = await import('/home/claude/echoes-three/src/save/describe.js');
for (const [name, fn] of Object.entries(D)) if (typeof fn === 'function') {
  for (const arg of [{}, { meta: {} }, { meta: null }, null, { meta: { mode: 'run', phase: 'combat', campaign: { card: { kind: 'clear' } } } }]) {
    try { const r = fn(arg); console.log(name, JSON.stringify(arg), '->', JSON.stringify(r)?.slice(0, 80)); } catch (e) { console.log(name, JSON.stringify(arg), 'THROWS', e.message); }
  }
}
