# Mosslight round 2: one play-camera shot job per skill not yet dreamed (survey takes)
import json
HP = lambda n: "for(const e of w.entities()) if(e.faction==='hostile'&&e.hittable){e.maxHp=%d;e.hp=%d;}" % (n, n)
QUIET = "for(const e of w.entities()) if(e.partyIndex>0){e.nextBasicTick=1e9;e.cds=[1e9,1e9,1e9,1e9];}"
FAR = [-3.4, 2.6, 1]
def J(name, slots, aim, allies, foes, seq, secs, **kw):
    j = {'name': name, 'key': None, 'fps': 15, 'pre': 0.25, 'pin': True, 'earlyHp': 400, 'aim': aim, 'slots': slots,
         'allies': allies, 'dummies': foes, 'seq': seq, 'secs': secs, 'setup': HP(400), 'every': QUIET, 'cap': name, 'from': 4, 'shotEvery': 3}
    j.update(kw); return j
Q = [[0.3, 'key', 'q']]
jobs = [
 J('05-sower', [], [0, -3], [[1.2, -1.4, 0.5], FAR, [3.4, 2.6, 1]], [[0.6, -3.2]], [[0.3, 'rdown'], [0.9, 'rup']], 6.5, shotEvery=6),
 J('06-basic', [], [0, -3], [[1.5, -2.4, 0.5], FAR, [3.2, 2.6, 1]], [[-0.4, -4.4], [0.5, -4.6]], [[0.3, 'rdown'], [1.1, 'rup']], 3.6),
 J('07-dash', [], [3, 0], [[2.3, 0.9, 0.5], [2.6, -0.8, 0.6], FAR], [[0.9, 0.0]], [[0.4, 'key', 'Space']], 1.6, shotEvery=2),
 J('08-pollen-gust', ['hearthsong'], [3, 0], [[1.2, -0.9, 0.5], [2.4, -1.2, 0.6], FAR], [[2.0, 0.3], [2.4, 1.45], [3.5, 1.95]], Q, 2.4, shotEvery=2),
 J('09-seed-bolt', ['mending_bolt'], [0, -3.8], [[0, -3.9, 0.5], FAR, [3.2, 2.6, 1]], [[0.1, -1.5], [-0.1, -2.6]], Q, 2.4, shotEvery=2),
 J('10-heartbloom', ['nova_bloom'], [0, -3], [[0, -1.6, 0.5], [1.2, -2.4, 0.65], FAR], [[1.5, -3.0], [-1.3, -3.1]], Q, 4.0),
 J('11-nectar-burst', ['nectar_burst'], [0.3, -2.3], [[0, -2.0, 0.45], [0.9, -2.6, 0.5], FAR], [[-0.9, -3.0], [0.9, -3.7], [-1.2, -1.6]], Q, 3.0, shotEvery=2),
 J('12-mossgrowth', ['kindred_shield'], [0, -3], [[0, -2.4, 0.5], FAR, [3.2, 2.6, 1]], [[0.9, -3.3]], Q, 3.6),
 J('13-firefly-swarm', ['lantern_ward'], [0, -3], [[-1.6, -1.2, 0.5], [1.8, -0.8, 0.45], FAR], [[0.4, -3.0]], Q, 5.0),
 J('14-dewfall', ['dewfall'], [0, -2.6], [[-1.0, -2.3, 0.5], [1.0, -2.3, 0.5], [0, -3.3, 0.5]], [[2.6, -4.1]], Q, 4.0),
 J('15-mending-sapling', ['sanctuary'], [2.9, -0.6], [[1.6, -0.9, 0.4], [3.6, -2.6, 0.55], FAR], [[3.8, 0.7], [4.4, -1.4]], Q, 5.0, shotEvery=4),
 J('16-glade-wisps', ['warding_aura'], [0, -3], [[-1.8, -1.0, 1], [2.6, 1.2, 1], [-4.2, 2.6, 1]], [[1.6, -2.4]],
   [[4.5, 'eval', "const p=E.state().party;E.cmd('setHp',p[1].id,0.5);E.cmd('setHp',p[2].id,0.6);"]], 7.0, shotEvery=5),
 J('17-elder-oak', ['guardian_bond'], [0, -2.2], [[-1.2, -1.6, 0.45], [1.4, -2.4, 0.5], [3.6, 2.6, 1]], [[-0.6, -4.6], [1.8, -4.2]], Q, 5.0, shotEvery=4, selfHp=0.7),
 J('18-rain-cloud', ['rain_cloud'], [0.5, -2.2], [[-0.4, -1.8, 0.5], FAR, [3.2, 2.6, 1]], [[0.9, -2.5], [1.6, -1.6]], Q, 4.0, shotEvery=4),
 J('19-creeping-moss', ['creeping_moss'], [0, -2.2], [[0, -1.8, 0.5], FAR, [3.2, 2.6, 1]], [[0.6, -2.6], [2.6, -3.6], [-1.8, -3.2]], Q, 4.0, shotEvery=4),
 J('20-leaf-gale', ['wind_wall'], [0, -2], [[-0.9, 1.3, 0.6], [0.9, 1.3, 0.6], [-1.5, -1.0, 0.7]], [[-1.2, -4.6, 'mantis'], [1.4, -4.8, 'mantis']], Q, 3.4, shotEvery=3),
 J('21-lure-lily', ['lure_lily'], [0, -2.8], [[-1.6, 0.8, 0.5], FAR, [3.2, 2.6, 1]], [[-1.6, -4.4], [1.8, -4.2], [0.3, -5.0]], Q, 4.5, shotEvery=4),
 J('22-scatter-seeds', ['lantern_flurry'], [0, -3], [FAR, [-1.4, 3.0, 1], [3.2, 2.6, 1]], [[-1.0, -3.9], [1.0, -3.9], [0, -1.9]], Q, 4.0, shotEvery=3),
 J('23-rootsnare', ['rootsnare'], [0, -2.8], [[0.5, -2.2, 0.5], FAR, [3.2, 2.6, 1]], [[-2.0, -2.4], [1.9, -2.2], [0.4, -4.4]], Q, 3.6, shotEvery=3),
 J('24-puffcap', ['dawn_brand'], [2.6, -1.6], [[2.2, -0.9, 0.5], FAR, [3.2, 2.6, 1]], [[4.1, -2.4], [1.3, -2.9]], Q, 4.5, shotEvery=3),
 J('25-snapjaw', ['snapjaw'], [0, -2.8], [[-1.6, 0.8, 0.5], FAR, [3.2, 2.6, 1]], [[0.2, -3.2], [-0.8, -3.6]], Q, 3.6, shotEvery=3),
 J('26-oakling', ['restorative_wave'], [0, -1.5], [[-2.6, -1.6, 0.35], [2.6, 1.8, 0.9], [3.6, -2.6, 1]], [[-3.4, -2.6], [-1.8, -2.9]], Q, 5.0, shotEvery=4),
 J('27-wild-thicket', ['wild_thicket'], [0, -2.8], [[-1.6, -2.4, 0.5], [2.6, 1.4, 1], [0, 2.4, 1]], [[0.6, -3.2], [-0.4, -3.8], [1.4, -2.4]], Q, 4.5, shotEvery=4),
 J('28-petal-twister', ['petal_twister'], [0, -2.8], [[-1.6, 0.8, 0.5], FAR, [3.2, 2.6, 1]], [[0.4, -3.0], [-0.6, -3.4]], Q, 3.6, shotEvery=3),
 J('29-drowsy-spores', ['drowsy_spores'], [0, -2.8], [[0.7, -3.2, 0.5], [1.2, 2.6, 1], [0, 3.4, 1]], [[-0.6, -3.0], [0.4, -3.8]], Q, 3.6, shotEvery=3),
]
json.dump(jobs, open('/tmp/claude-0/-home-user/abc95526-10ff-5672-b517-de825bbef76c/scratchpad/r2/jobs.json', 'w'), indent=1)
print(len(jobs))
