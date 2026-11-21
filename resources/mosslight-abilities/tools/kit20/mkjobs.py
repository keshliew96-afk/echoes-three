# Kesh 18 Nov: seed 5 s, then flower 5 s; turret leaves 2 seeds. Jobs recorded on the kit 2.0 copy (port 5200).
import json, copy, shutil
K = '/tmp/claude-0/-home-user/32a8741f-483c-523d-bcd7-a3da532d6a06/scratchpad/tools/kit'
def load(n): return json.load(open(f'{K}/K{n}.json'))[0]
def save(n, j, qs_from):
    j.setdefault('earlyHp', 400) if False else None
    json.dump([j], open(f'{K}/KZ_{n}.json', 'w'), indent=1)
    shutil.copy(f'{K}/K{qs_from}.qs', f'{K}/KZ_{n}.qs')
LIVE = "(()=>{const w=window.__echoes.content.world();return 'flowers '+((globalThis.__reviewSpitters||[]).length)+' · dummies '+w.entities().filter(e=>e.kind==='dummy').sort((a,b)=>a.id-b.id).map(e=>Math.round(e.maxHp-e.hp)).join(' · ')+' damage';})()"
# new card clip: the seed's whole life
j = copy.deepcopy(load('S54'))
j.update(name='kit_SEED', slots=[], secs=11.0, live=LIVE,
         cap='Seed · 5 s as a seed (a hurt ally walks on it: heal 11), then a flower that shoots for 5 s',
         allies=[[-2.6, 1.4, 0.4], [-1.6, -2.8, 1], [-3.2, -1.0, 1]],
         dummies=[[4.4, -0.6], [4.6, 1.3]])
seq = [[0.2, 'eval', 'for(const [x,z] of [[0.2, 1.4], [1.6, -0.4], [2.2, 0.9]]) globalThis.__reviewSeedAt(x,z);']]
for k in range(13):
    seq.append([round(1.5 + k * 0.1, 2), 'move', 0, [round(-2.6 + (2.8 * (k + 1) / 13), 2), 1.4, 0.4]])
j['seq'] = seq
save('SEED', j, 'S54')
# retakes with the new timing
j = load('20'); j.update(secs=11.2, live=LIVE, cap='S20 Scatter Seeds · the seeds wait 5 s, then turn into flowers that shoot for 5 s'); save('S20', j, '20')
j = load('S54'); j.update(secs=12.0, live=LIVE, cap='S54 Sower · the turret runs its 5 s and leaves 2 seeds; 5 s later they open as flowers'); save('S54', j, 'S54')
j = load('C24'); j.update(secs=11.0, live=LIVE, cap='C24 · Dew Wave wakes the seeds in its lane as watered Spitters; the others open at 5 s'); save('C24', j, 'C24')
j = load('C23'); j['cap'] = 'C23 · Sower in a 20 s fight, no skills: a pouch seed every 8 s and 2 turret seeds'; save('C23', j, 'C23')
j = load('C21'); j['cap'] = 'C21 · Sower seeds, then Oakling: three Oaklings'; save('C21', j, 'C21')
for n in ('C22', 'C37', 'C20', 'C35'): save(n, load(n), n)
j = load('C35'); j['secs'] = 8.6; save('C35', j, 'C35')
for n, add in (('C42', 2.0), ('C49', 2.0)):  # the Spitters now open at 5 s, not 3 s: the clip runs 2 s longer
    j = load(n); s = j['seq']
    drops = [q for q in s if 'reviewSeedAt' in str(q[2:])]
    rest = [[round(q[0] + add, 2)] + q[1:] for q in s if q not in drops]
    hold = [q for q in s if q not in drops and q[1] == 'eval'][0]
    fill = [[round(0.1 + 0.1 * k, 2)] + hold[1:] for k in range(int(add * 10))]
    j['seq'] = sorted(drops + fill + rest, key=lambda q: q[0]); j['secs'] = round(j['secs'] + add, 1)
    save(n, j, n)
shutil.copy(f'{K}/K20_8.json', f'{K}/KZ_k20S8.json'); shutil.copy(f'{K}/K20_8.qs', f'{K}/KZ_k20S8.qs')
print('ok')
# Kesh 18 Nov 00:23: every seed bursts out on a low arc, never at a hero's feet
j = json.load(open(f'{K}/KZ_SEED.json'))[0]
j['seq'][0] = [0.2, 'eval', 'const P=w.entities().find(e=>e.partyIndex===0)||{x:0,z:0};for(const [x,z] of [[0.2, 1.4], [1.6, -0.4], [2.2, 0.9]]) globalThis.__reviewSeedDrop(x,z,{x:P.x,z:P.z});']
j['cap'] = 'Seed · it bursts out on a low arc; 5 s as a seed (a hurt ally walks on it: heal 11), then a flower that shoots for 5 s'
save('SEED', j, 'S54')
for n, cap in (('C16', 'C16 · Mercy Bell: a fading wisp bursts out a seed, never at the ally\'s feet'),
               ('C19', 'C19 · Mending Sapling ends and bursts out a seed'),
               ('C48', 'C48 · A dusted foe falls and bursts out a seed'),
               ('C15', None)):
    j = load(n)
    if cap: j['cap'] = cap
    save(n, j, n)
for n in ('15', '19', '64'):
    shutil.copy(f'{K}/K20_{n}.json', f'{K}/KZ_k20S{n}.json'); shutil.copy(f'{K}/K20_{n}.qs', f'{K}/KZ_k20S{n}.qs')
print('ok2')
