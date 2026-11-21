# Kit 2.0 clips: each skill clip shows its heal, what lasts and its damage (K12). Jobs go to
# tools/kit/K20_<id>.json, clips are named kit20_S<id>. Built from the 1.11 jobs where they fit.
import json, os, copy
K = '/tmp/claude-0/-home-user/32a8741f-483c-523d-bcd7-a3da532d6a06/scratchpad/tools/kit'
PARTY = "(()=>{const w=window.__echoes.content.world();return w.entities().filter(e=>e.partyIndex!==undefined).sort((a,b)=>a.partyIndex-b.partyIndex).map(e=>Math.round(e.hp)+'/'+Math.round(e.maxHp)).join(' · ');})()"
BOTH = ("(()=>{const w=window.__echoes.content.world();const p=w.entities().filter(e=>e.partyIndex!==undefined).sort((a,b)=>a.partyIndex-b.partyIndex).map(e=>Math.round(e.hp)+'/'+Math.round(e.maxHp)).join(' · ');"
        "const f=w.entities().filter(e=>e.faction==='hostile'&&e.hittable&&e.kind!=='eshot').sort((a,b)=>a.id-b.id);return p+' · foes '+(f.length?f.map(e=>Math.round(e.maxHp-e.hp)).join(' · ')+' damage':'none');})()")
HP = lambda n: "for(const e of w.entities()) if(e.faction==='hostile'&&e.hittable){e.maxHp=%d;e.hp=%d;}" % (n, n)
def old(i):
    return json.load(open(os.path.join(K, 'K%s.json' % i)))[0]
def spawnAt(t, pts, kind='boar'):
    return [t, 'eval', "for(const [x,z,h] of %s){const id=E.cmd('spawn','%s',x,z);const e=w.entities().find(q=>q.id===id);if(e){e.maxHp=h;e.hp=h;}}" % (json.dumps(pts), kind)]
def walk(i, a, b, t0, t1, hpv):
    n = int((t1 - t0) * 10)
    return [[round(t0 + (t1 - t0) * k / n, 2), 'move', i, [round(a[0] + (b[0] - a[0]) * k / n, 2), round(a[1] + (b[1] - a[1]) * k / n, 2), hpv]] for k in range(1, n + 1)]
def save(sid, j, cap, qs=''):
    j = copy.deepcopy(j)
    j['name'] = 'kit20_S' + sid
    j['cap'] = cap
    j['live'] = j.get('live20', BOTH)
    j.pop('live20', None)
    j['pin'] = True
    j.setdefault('earlyHp', 400)
    open(os.path.join(K, 'K20_%s.json' % sid), 'w').write(json.dumps([j], indent=1))
    open(os.path.join(K, 'K20_%s.qs' % sid), 'w').write(qs)
def new(slots, aim, allies, foes, seq, secs, setup=HP(400), guides=None, **kw):
    j = {'key': None, 'fps': 15, 'pre': 0.25, 'pin': True, 'earlyHp': 400, 'aim': aim, 'slots': slots, 'allies': allies, 'dummies': foes, 'seq': seq, 'secs': secs, 'setup': setup}
    if guides: j['guides'] = guides
    j.update(kw)
    return j
area = lambda r, c: {'k': 'area', 'r': r, 'c': c}
FAR = [-3.4, 2.6, 1]  # an ally parked out of the way

# L5 Pollen Gust (his example, first): heals and hastes two allies; hits each foe 12 and pushes;
# the top foe is blown into a foe standing just outside the wind and slams (+10).
save('14', new(['hearthsong'], [3, 0], [[1.2, -0.9, 0.5], [2.4, -1.2, 0.6], FAR],
               [[2.0, 0.3], [2.4, 1.45], [3.5, 1.95]], [[0.3, 'key', 'q']], 3.4,
               guides=[{'k': 'area', 'rect': True, 'c': [0, 0], 'dir': [1, 0], 'len': 7.0, 'w': 3.0}]),
     'S14 Pollen Gust · heal, haste and slow, hit and wall slam')
# L28 Dash: a dash through a dummy beside two hurt allies; the second dash, inside 3 s, has no heal or burst.
save('9', new([], [3, 0], [[2.3, 0.9, 0.5], [2.6, -0.8, 0.6], FAR], [[0.9, 0.0]],
              [[0.4, 'key', 'Space'], [1.9, 'aim', [-3, -1]], [2.0, 'key', 'Space']], 3.8),
     'S9 Dash · thorn burst, heal round the landing, 20% faster 2 s')
# L27 Basic attack: two bolts leave thorns; the planted gem sends a mote to a hurt ally.
save('8', new([], [0, -3], [[1.5, -2.4, 0.5], [-3.2, 2.6, 1], [3.2, 2.6, 1]], [[-0.4, -4.4], [0.5, -4.6]],
              [[0.3, 'rdown'], [1.1, 'rup']], 6.0),
     'S8 Basic attack · bolts leave thorns, the gem sends motes')
# L1 Swiftleaf: a dummy on the leaf's path both ways; the healed ally gets a sprig.
save('10', new(['swift_mend'], [0, -3.0], [[0, -3.0, 0.4], [1.0, -1.4, 0.6], [3.2, 2.6, 1]], [[0.0, -1.7]],
               [[0.3, 'key', 'q']], 3.6),
     'S10 Swiftleaf · razor leaf out and back, sprig')
# L2 Seed Bolt: it pierces two dummies, tangles them, heals the ally behind.
save('11', new(['mending_bolt'], [0, -3.8], [[0, -3.9, 0.5], [-3.2, 2.6, 1], [3.2, 2.6, 1]], [[0.1, -1.5], [-0.1, -2.6]],
               [[0.3, 'key', 'q']], 3.0),
     'S11 Seed Bolt · pierces and tangles, heals')
# L3 Dew Wave: a dummy in the lane takes 10; the lane stays wet 3 s and keeps healing.
save('12', new(['mending_tide'], [0, -3], [[-0.35, -1.2, 0.5], [0.45, -2.4, 0.5], FAR], [[0.0, -3.5]],
               [[0.4, 'key', 'q']], 4.4, guides=[{'k': 'area', 'rect': True, 'c': [0, 0], 'dir': [0, -1], 'len': 4.0, 'w': 1.6}]),
     'S12 Dew Wave · wet lane 3 s, foes in it take 10')
# L4 Heartbloom: the bloom throws petal blades at dummies within 3 u.
save('13', new(['nova_bloom'], [0, -3], [[0, -1.6, 0.5], [1.2, -2.4, 0.65], [-3.6, 2.4, 1]], [[1.5, -3.0], [-1.3, -3.1]],
               [[0.3, 'key', 'q']], 6.0, guides=[area(3, [0, -1.6])]),
     'S13 Heartbloom · the bloom throws petal blades')
# L7 Mossgrowth: haste while the Moss is on; a boar biting the ally takes thorn moss.
save('15', new(['kindred_shield'], [0, -3], [[0, -2.4, 0.5], [-3.2, 2.6, 1], [3.2, 2.6, 1]], [],
               [spawnAt(0.05, [[0.9, -3.3, 300]]), [0.3, 'key', 'q']], 6.5, setup=''),
     'S15 Mossgrowth · 15% faster, thorn moss bites back')
# L8 Firefly Swarm: stung foes are slowed.
j = old('16'); j.pop('name', None)
save('16', j, 'S16 Firefly Swarm · stung foes slowed 20%')
# L9 Dewfall: a thorn a second at the dummy; an ally steps out and the bed clings 2 s.
save('17', new(['dewfall'], [0, -2.6], [[-1.0, -2.3, 0.5], [1.0, -2.3, 0.5], [0, -3.3, 0.5]], [[2.6, -4.1]],
               [[0.3, 'key', 'q']] + walk(0, [-1.0, -2.3], [-3.8, -0.6], 1.6, 2.4, 0.5), 6.0),
     'S17 Dewfall · clings 2 s outside, shoots thorns')
# L10 Mending Sapling: roots slow a dummy within 2 u; a thorn with each blossom.
save('18', new(['sanctuary'], [2.9, -0.6], [[1.6, -0.9, 0.4], [3.6, -2.6, 0.55], [-3.2, 2.6, 1]], [[3.8, 0.7], [4.4, -1.4]],
               [[0.3, 'key', 'q']], 7.4, guides=[area(2, [2.9, -0.6])]),
     'S18 Mending Sapling · roots slow, thorns with blossoms')
# L11 Glade Wisps: three wait and nobody is hurt, so the oldest dives on a dummy; then allies get hurt
# and the wisps heal with a sprig.
save('19', new(['warding_aura'], [0, -3], [[-1.8, -1.0, 1], [2.6, 1.2, 1], [-4.2, 2.6, 1]], [[1.6, -2.4]],
               [[7.0, 'eval', "const p=E.state().party;E.cmd('setHp',p[1].id,0.5);E.cmd('setHp',p[2].id,0.6);"]], 10.0),
     'S19 Glade Wisps · wisp fire when nobody is hurt, sprigs')
# L6 Nectar Burst: three wisps dive into the burst.
save('57', new(['nectar_burst'], [0.3, -2.3], [[0, -2.0, 0.45], [0.9, -2.6, 0.5], [-3.4, 2.0, 0.6]], [[-0.9, -3.0], [0.9, -3.7], [-1.2, -1.6]],
               [[0.3, 'key', 'q']], 4.0, guides=[area(2, [0.3, -2.3])]),
     'S57 Nectar Burst · three wisps dive in')
# L12 Elder Oak: acorns fall on the dummies under the crown.
j = old('S50'); j.pop('name', None)
save('50', j, 'S50 Elder Oak · acorns on foes under the crown')
# L13 Rain Cloud: dummies under the cloud are slowed and take heavy rain.
j = old('58'); j.pop('name', None); j['dummies'] = [[0.9, -2.5], [2.3, -1.4]]; j['setup'] = HP(400)
save('58', j, 'S58 Rain Cloud · slows and rains on foes under it')
# L14 Creeping Moss: each creep chokes the nearest foe within 3 u.
j = old('59'); j.pop('name', None); j['dummies'] = [[0.6, -2.6], [2.6, -3.6], [4.3, -2.2]]; j['setup'] = HP(400)
save('59', j, 'S59 Creeping Moss · each creep chokes a foe')
# L15 Forest Spirit: heals the most hurt ally every 3 s, an acorn every 2 s, the 10% kept 2 s after leaving.
j = old('67'); j.pop('name', None); j['dummies'] = [[-1.4, -2.6]]; j['setup'] = HP(400); j['secs'] = 8.0
save('67', j, 'S67 Forest Spirit · heals, throws acorns, keeps the 10% 2 s')
# L16 Leaf Gale: blades fly back at the shooters; an ally walks through the wall and runs faster.
j = old('61'); j.pop('name', None)
j['allies'] = [[-0.9, 1.3, 0.6], [0.9, 1.3, 0.6], [-1.5, -1.0, 0.7]]
j['seq'] = j['seq'] + walk(2, [-1.5, -1.0], [-1.5, -3.4], 1.6, 2.6, 0.7)
save('61', j, 'S61 Leaf Gale · shots fly back, crossers speed up')
# L18 Rootspear: blossoms to hurt allies, thorns on the foes hit.
save('21', new(['pale_lance'], [3, 0], [[-1.4, 1.8, 0.5], [0.6, 2.2, 0.6], FAR], [[1.6, 0.2], [3.0, -0.3], [4.3, 0.25], [2.4, 1.9]],
               [[0.3, 'key', 'q']], 4.2, guides=[{'k': 'area', 'rect': True, 'c': [0, 0], 'dir': [1, 0], 'len': 7.0, 'w': 1.4}]),
     'S21 Rootspear · blossoms to allies, thorns on foes')
# L19 Wispfall: a healing wisp on the most hurt ally each second; dives slow.
save('22', new(['bell_toll'], [0, -3], [[-1.4, 2.0, 0.5], [2.2, 1.6, 0.6], FAR], [[-2.0, -1.5], [2.2, -1.2], [0.5, -3.2]],
               [[0.3, 'key', 'q']], 5.9),
     'S22 Wispfall · healing wisps, dives slow')
# L20 Rootsnare: an ally in the circle heals 4 a second.
save('23', new(['rootsnare'], [0, -2.8], [[0.5, -2.2, 0.5], [-3.2, 2.6, 1], [3.2, 2.6, 1]], [[-2.0, -2.4], [1.9, -2.2], [0.4, -4.4]],
               [[0.3, 'key', 'q']], 4.4, guides=[area(2.4, [0, -2.8])]),
     'S23 Rootsnare · allies inside heal 4 a second')
# L21 Puffcap: an ally in the spore cloud heals 4 a second.
j = old('24'); j.pop('name', None); j['allies'] = [[2.2, -0.9, 0.5], [-3.2, 2.6, 1], [3.2, 2.6, 1]]; j['live'] = BOTH
save('24', j, 'S24 Puffcap · allies in the cloud heal 4 a second')
# L22 Sapping Vine: the foe is bound (30% slow).
j = old('25'); j.pop('name', None); j['dummies'] = [[0, -3.0, 'boar']]; j['setup'] = HP(400)
save('25', j, 'S25 Sapping Vine · the foe is bound, 30% slow')
# L23 Oakling: the ally it guards heals 3 a second.
j = old('S51'); j.pop('name', None)
save('51', j, 'S51 Oakling · the guarded ally heals 3 a second')
# L24 Wild Thicket: fruit falls on the ally in the circle.
j = old('62'); j.pop('name', None); j['allies'] = [[-1.6, -2.4, 0.5], [2.6, 1.4, 1], [0, 2.4, 1]]
save('62', j, 'S62 Wild Thicket · fruit heals allies inside')
# L25 Pollen Mark: a weak dusted dummy falls and its pollen bursts; the rest burst at 6 s.
j = old('64'); j.pop('name', None); j['secs'] = 7.4
j['setup'] = "const d=w.entities().filter(e=>e.kind==='dummy').sort((a,b)=>a.id-b.id);d.forEach((e,i)=>{e.maxHp=i===0?45:900;e.hp=e.maxHp;});"
save('64', j, 'S64 Pollen Mark · the pollen bursts at the end or on a fall')
# L26 Drowsy Spores: a slowed ally in the puff rests; sleepers take nightmares and stay asleep.
j = old('65'); j.pop('name', None)
j['allies'] = [[0.7, -3.2, 0.5], [1.2, 2.6, 1], [0, 3.4, 1]]
j['seq'] = j['seq'] + [[0.2, 'eval', "const a=E.state().party[1];const e=w.entities().find(q=>q.id===a.id);if(e){e.status=e.status||{};e.status.slow={mag:0.3,untilTick:window.__echoes.tick+900,src:null,at:window.__echoes.tick,fresh:true};}"]]
save('65', j, 'S65 Drowsy Spores · allies rest, sleepers take nightmares')
print('jobs written')
