# mkpage.py: Ashfang's ability review page (simple and clean: clip, name, a few lines, nodes).
import html, os
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'index.html')
E = html.escape
SHARED = ('Every skill also takes Sharpen, Ascend, Keen, Galvanize, Siphon, Detonate, Resonance, Lethality, Execute, Duel and Gale Step; '
          'every skill with a press also takes Echo, Flow, Momentum and Parry.')
ELN = {'fire': 'Fire', 'earth': 'Earth', 'water': 'Water', 'wind': 'Wind'}
# (id, name, element or None, kind chips, cooldown, lines, nodes or None)
SECTIONS = [
 ('core', 'Passive, attack and dash', None, [
  ('S11', 'Bladesong', None, ['Class passive'], None, ['Free from the first room, no button.', 'The count: every cut or wave that hits adds 1 for each foe (up to 3). It falls to 0 after 3 s without a hit. Up to 30.', 'The song: each 10 count, skills cool down 10% faster.', 'The strong cut: the first cut after each cast deals 50% more and throws a 5 u wave. The last basic hit throws the sword.', 'The dash keeps the count (+2 for each foe it cuts). Each cast stores an orb; he holds two.'], None, None),
  ('N_basic', 'Basic attack', None, ['Always on'], None, ['Six hits from your reel in about 2.1 s: diagonal down-cut 10, flat sweep 10, overhead chop 12, rising cut 11, low lunge 14, then the sword throw (18).'], None, 'S12'),
  ('B_slow', 'Basic attack, slow motion', None, ['4x slower'], None, ['One flowing path through all six hits. He steps in on the hits, the left paw balances and joins the grip for the chop, the tail and ears drag behind.', 'Each hit: a short hit pause, sparks and a cut mark where the blade meets, the dummy rocks away from the blow.'], None, 'S12'),
  ('B_side', 'Basic attack, from the side', None, ['4x slower'], None, ['The feet stay planted and step; the blade never goes into the floor.'], None, 'S12'),
  ('N_throw', 'Sword throw', None, ['Basic, last hit'], None, ["The last hit throws the sword: it spins out 4 u, whirls, bursts 1.5 u with the newest orb's element, then flies back."], None, 'S11'),
  ('S13', 'Dash', None, ['Always on'], None, ['A low thrust, 2.6 u, untouchable. 8 to each foe it passes, +2 count.'], None, None),
  ('N_idle', 'Open left paw', None, ['Look'], None, ['Idle and walk hold the empty left paw out, palm up. The two orbs float over it.'], None, 'S10'),
  ('B1', 'Skill, cut, skill', None, ['Rule'], None, ['Each cast makes his next basic cut a strong cut with a wave.'], None, None),
  ('B2', 'Two orbs', None, ['Rule'], None, ['Each cast stores an orb of its element over his open left paw. A third pushes out the oldest.', 'Fire 4% more damage, wind 5% faster attacks, earth 4% less damage taken, water 1 health every 2 s.'], None, None),
  ('S7', 'Juggle', None, ['Rule'], None, ['A cut on a foe in the air adds 2 to the count, not 1.'], None, None),
 ]),
 ('fire', 'Fire · burns', 'fire', [
  ('S14', 'Flurry', 'fire', ['Blade'], '3 s', ['Four cuts in 0.4 s, 60° fan: 3 each to up to 6 foes.', 'Burn 2 a second for 3 s.'], 'Quicken, Multiply, Widen, Reach, Pursuit', None),
  ('S15', 'Crescent Finisher', 'fire', ['Blade'], '6 s', ['Rising cut, 70° fan: 20 to up to 5 foes, 2% more for each count (32 at 30).', 'Burn 4 a second for 3 s.'], 'Quicken, Multiply, Widen, Reach, Pursuit', None),
  ('S16', 'Flame Crescent', 'fire', ['Wave'], '4 s', ['A burning wave, 6 u, through every foe: 16, burn 3 a second for 3 s.'], 'Quicken, Multiply, Widen, Reach', None),
  ('N_cascade', 'Blazing Cascade', 'fire', ['Blade'], '10 s', ['Two wide sweeps, an overhead slam with a star on the floor, a fire swirl that pulls foes in, then a dash through them.', '5 + 5, 10, 3 × 3 in the swirl, dash 14 · burns.'], 'Quicken, Multiply, Widen, Reach, Pursuit', 'S17'),
  ('S18', 'Crimson Edge', 'fire', ['Passive'], None, ['25% more crit chance. His crits set the foe burning, 3 a second for 3 s.'], 'Keen makes it 40%', None),
  ('S19', 'Flashfire', 'fire', ['Art'], '7 s', ['Every foe within 4 u catches fire, 3 a second for 3 s.', 'A foe already burning bursts: 12, and lights the foes within 1.5 u.'], 'Quicken, Widen', None),
  ('S20', 'Triple Crescent', 'fire', ['Wave', 'Big skill'], '12 s', ['A 0.4 s draw, then three great waves a quarter second apart, 7 u, 2 u wide: 18 each.', 'The 2nd and 3rd deal half to a foe already hit. He can turn between waves. Burn 4 a second for 3 s.'], 'Quicken, Multiply, Widen, Reach', None),
 ]),
 ('earth', 'Earth · stuns', 'earth', [
  ('S21', 'Lunge Strike', 'earth', ['Blade'], '4 s', ['A thrust, 1.3 u: 26 to up to 2 foes in line, stun 0.5 s.'], 'Quicken, Multiply, Reach, Pursuit', None),
  ('S24', 'Ground Wave', 'earth', ['Wave'], '6 s', ['He drags the blade; a crack runs 5 u: 14 to every foe on it, stun 0.4 s.'], 'Quicken, Multiply, Reach', 'S22'),
  ('N_split', 'Earthsplitter', 'earth', ['Blade', 'Charge'], '6 s', ['Hold to charge up to 1.2 s; the sword grows. Slam 1 u ahead.', 'Quick: 20 in 1.5 u, stun 0.5 s. Full: 40 in 2.8 u, stun 1 s.'], 'Quicken, Widen', 'S23'),
  ('N_ink', 'Inkstone Dive', 'earth', ['Blade'], '9 s', ['Rising slash, X cut with stone spikes, a leap with three cuts and a burst in the air, then a dive into the floor.', '8, 6 + 6, 4 × 3, 6, landing 20 in 1.8 u with a 0.6 s stun.'], 'Quicken, Multiply, Widen, Reach, Pursuit', 'S24'),
  ('S25', 'Caltrops', 'earth', ['Art'], '6.5 s', ["Stone caltrops, radius 0.7 u, for 5 s. A foe's first step on them stuns it 0.4 s."], 'Quicken, Multiply, Widen, Reach', None),
  ('S26', 'Riposte', 'earth', ['Art'], '8 s', ['A 0.6 s parry. It blocks the next hit and answers: 30 in a 90° arc, stun 0.5 s.', 'A parried shot flies back at the shooter as a wave for 30.'], 'Quicken, Multiply, Reach', None),
 ]),
 ('water', 'Water · slows', 'water', [
  ('S27', 'Moonfang', 'water', ['Blade', 'Dash cut'], '7 s', ['An untouchable dash, 3.2 u: 24 to up to 4 foes.', 'Marked 2 s (20% more damage taken), slowed 30% for 2 s.'], 'Quicken, Multiply, Reach', None),
  ('N_riptide', 'Riptide Form', 'water', ['Blade'], '6 s', ['Overhead arc, a leap and stab down, a rising cut, a low crouched sweep.', '10, 12, 8, 10 · slows 30 to 40%.'], 'Quicken, Multiply, Widen, Reach, Pursuit', 'S28'),
  ('S29', 'Tide Crescent', 'water', ['Wave'], '5 s', ['A wide wave, 2.5 u across, 4 u: 14, slow 40% for 3 s.', 'He hops 1.5 u the way he steers, untouchable.'], 'Quicken, Multiply, Widen, Reach', None),
  ('N_ring', 'Tide Ring', 'water', ['Art', 'Big skill'], '14 s', ['A water ring, 2.5 u. Seven water images thrust across it one by one: 5 each, slow 30%.', 'Then 剑花 and four bursts inside: 4 each. All in 4 s.'], 'Quicken, Multiply, Widen', 'S30'),
  ('S31', 'Mirror Image', 'water', ['Art'], '10 s', ["A water image of him. Foes within 4 u turn on it for 3 s (never a boss or the tank's foes).", 'Then it bursts: 12 within 2 u, slow 40% for 3 s.'], 'Quicken, Multiply, Widen', None),
  ('S32', 'Cold Edge', 'water', ['Passive'], None, ['His hits deal 15% more to a slowed foe.', 'Every 4th hit on the same foe slows it 30% for 1.5 s.'], 'Quicken (every 3rd hit)', None),
 ]),
 ('wind', 'Wind · throws, pulls, pushes', 'wind', [
  ('S33', 'Fox Step', 'wind', ['Blade', 'Dash cut'], '5 s', ['An untouchable dash, 2 u: 18 to up to 3 foes, thrown up 0.5 s.'], 'Quicken, Multiply, Reach, Pursuit', None),
  ('S34', 'Blade Storm', 'wind', ['Blade'], '7 s', ['The wind pulls foes within 2.5 u 1 u in. Three turns in 0.9 s, walking: five cuts of 4.'], 'Quicken, Multiply, Widen, Pursuit', None),
  ('N_waltz', 'Skyblade Waltz', 'wind', ['Blade'], '12 s', ['Floor crescent, big flat cut, flash dash, spin ring, blades rise and throw foes up, rising cut, three beams that leave swords standing.', '6, 8, 6, 8, 6, 10, then 6 per beam.'], 'Quicken, Multiply, Widen, Reach, Pursuit', 'S35'),
  ('S36', 'Blade Dance', 'wind', ['Art'], '6 s', ['A burst round him, 1.3 u: 10 to up to 6 foes, thrown up 0.6 s. He runs 30% faster for 2 s.'], 'Quicken, Multiply, Widen, Pursuit', None),
  ('S37', 'Whirlwind Slash', 'wind', ['Wave'], '7 s', ['A spinning wave travels 4 u in 1.6 s: 3 every quarter second.', 'It drags the foes it touches and drops them together at the end.'], 'Quicken, Multiply, Widen, Reach', None),
  ('S38', 'Razor Wake', 'wind', ['Passive'], None, ['Every second the 3 nearest foes within 0.9 u take 4. Its cuts count.', 'The third cut in a row on the same foe throws it up 0.4 s.'], 'Quicken, Multiply, Widen', None),
  ('S35', 'Gale Crescent', 'wind', ['Wave'], '4 s', ['A fast thin wave, 7 u, through every foe: 14, pushed 2 u back.'], 'Quicken, Multiply, Reach', 'S39'),
 ]),
 ('combos', 'Combos', None, [
  ('L1', 'Light and set off', None, ['Flame Crescent', 'Flashfire'], None, ['Every burning foe bursts and lights its neighbours.'], None, None),
  ('C1', 'Wind fans fire', None, ['Flame Crescent', 'Gale Crescent'], None, ['A wind hit on a burning foe spreads its burn to foes within 1.5 u.'], None, None),
  ('C2', 'Wall slam', None, ['Gale Crescent', 'a wall'], None, ['A foe pushed into a wall takes 10 and is stunned 0.5 s.'], None, None),
  ('C3', 'Spike', None, ['Fox Step', 'Crescent Finisher'], None, ['A foe in the air is slammed down: 50% more, 10 to foes within 1.5 u.'], None, None),
  ('C5a', 'Coloured whirl: fire', None, ['Whirlwind Slash', 'Flame Crescent'], None, ['A crescent through the whirl gives it its element: its cuts burn.'], None, None),
  ('C5c', 'Coloured whirl: water', None, ['Whirlwind Slash', 'Tide Crescent'], None, ['Tide: the whirl slows 40%.'], None, None),
  ('C6', 'The image throws too', None, ['Mirror Image', 'Triple Crescent'], None, ['While the image stands it throws a copy of each Wave skill, for half.'], None, None),
  ('C7', 'Burst the image', None, ['Mirror Image', 'Moonfang'], None, ['A dash cut through the image bursts it at once.'], None, None),
  ('C8', 'Sent back', None, ['Riposte', 'a shooter'], None, ['A parried shot flies back at the shooter as a wave for 30.'], None, None),
  ('C9', 'Kick the caltrops', None, ['Caltrops', 'Ground Wave'], None, ['The patch scatters twice as wide; each foe on it is stunned again.'], None, None),
  ('C10', 'Fire spin', None, ['Flurry', 'Blade Storm'], None, ['A burning foe in the spin passes its burn to every foe the spin cuts.'], None, None),
  ('C11', 'Dash strike', None, ['Dash', 'Lunge Strike'], None, ['Pressed during a dash, it comes out at the end: 1 u farther, 30% harder.'], None, None),
 ]),
 ('mixes', 'Fusion mixes (Spellblade)', None, [
  ('M1', 'Blaze', None, ['Fire + fire'], None, ['A wall of flame 2 u wide rolls 5 u: 14, burn 6 a second for 4 s.'], None, None),
  ('M2', 'Quake', None, ['Earth + earth'], None, ['The floor jolts round him, 3 u: 18, a full 1 s stun.'], None, None),
  ('M3', 'Flood', None, ['Water + water'], None, ['A wave 3 u wide washes 5 u: 14, carried 1.5 u back, slow 60% for 4 s.'], None, None),
  ('M4', 'Tornado', None, ['Wind + wind'], None, ['A whirlwind travels 5 u in 2 s: 4 each half second, thrown up 1 s, carried along.'], None, None),
  ('M5', 'Firestorm', None, ['Fire + wind'], None, ['Burning wind to 3.5 u: 12, pushed 1 u, burn 4 a second for 3 s; burns pass on within 2 u.'], None, None),
  ('M6', 'Magma', None, ['Fire + earth'], None, ['Molten rock, 1.8 u, for 5 s: the first step stuns 0.5 s, burn 5 a second on it.'], None, None),
  ('M7', 'Steam', None, ['Fire + water'], None, ['Steam round him, 3 u: 10, blinded 1.5 s.'], None, None),
  ('M8', 'Mud', None, ['Earth + water'], None, ['Mud, 2.2 u, for 5 s: stuck 1 s on the first step, slow 60% on it.'], None, None),
  ('M9', 'Sandstorm', None, ['Earth + wind'], None, ['A whirl of sand, 3 u, pulls foes in over 1 s, then bursts: 14, stun 0.5 s.'], None, None),
  ('M10', 'Frost', None, ['Water + wind'], None, ['A cone of frost, 4 u, 70°: 12, frozen 1 s; the next hit deals 8 more.'], None, None),
 ]),
 ('old', 'Replaced or gone', None, [
  ('S12', 'Basic attack', None, ['Always on'], None, ['Replaced by the six-hit combo.', 'Cut 11, rising cut 11, thrust 13, spin cut 16.5 (a strong cut with a wave).'], None, 'old'),
  ('S17', 'Flare Wave', 'fire', ['Wave'], '5 s', ['Replaced by Blazing Cascade.', 'A wave that bursts on the first foe: 16 within 1.5 u, burn 3 a second for 3 s.'], None, 'old'),
  ('S22', 'Hilt Bash', 'earth', ['Blade'], '6 s', ['Gone; Ground Wave came back.', 'The pommel on the nearest foe: 14 and a full 1 s stun. Stops a wind-up.'], None, 'old'),
  ('S23', 'Stone Crescent', 'earth', ['Wave'], '5 s', ['Replaced by Earthsplitter.', 'A heavy wave that stops at the first foe: 24, stun 0.6 s.', 'Rock shards hit foes within 1.2 u for 8.'], None, 'old'),
  ('S28', 'Flowing Blade', 'water', ['Blade'], '5 s', ['Replaced by Riptide Form.', 'Three sweeping cuts in 0.6 s, each carries him 0.6 u the way he steers.', '8 each, slow 30% for 2 s.'], None, 'old'),
  ('S30', 'Blade Rain', 'water', ['Wave'], '7 s', ['Replaced by Tide Ring.', 'Eight water blades fall over 1.2 s in a circle of 1.8 u, up to 5 u away.', '5 each, slow 30% for 2 s.'], None, 'old'),
  ('S39', 'Thousand Cuts', 'wind', ['Blade', 'Big skill'], '12 s', ['Gone; Gale Crescent came back.', 'A blur for 1.2 s: eight cuts of 5 on foes within 3 u, a different foe each time.', 'Untouchable. The last foe is thrown up 0.6 s.'], None, 'old'),
  ('C4', 'Bat it away', None, ['Blade Dance', 'Stone Crescent'], None, ['Now Smash down: Earthsplitter on a foe in the air.', 'A foe in the air is sent 3 u along the wave; foes it lands on take 10 and a 0.4 s stun.'], None, 'old'),
  ('C5b', 'Coloured whirl: earth', None, ['Whirlwind Slash', 'Stone Crescent'], None, ['Stone Crescent is gone; Ground Wave colours the whirl now.', 'Stone: the whirl stuns 0.3 s on first touch.'], None, 'old'),
  ('C12', 'Quench', None, ['Flashfire', 'Blade Rain'], None, ['Blade Rain is gone; Tide Crescent and Tide Ring quench now.', 'Water on a burning foe: the rest of the burn at once, blinded 0.8 s.'], None, 'old'),
 ]),
]

def card(sid, name, el, chips, cd, lines, nodes, num=None):
    meta = (f'<span class="chip el el-{el}">{ELN[el]}</span>' if el else '') + ''.join(f'<span class="chip">{E(c)}</span>' for c in chips)
    if cd: meta += f'<span class="cd">{E(cd)}</span>'
    ps = ''.join(f'<p>{E(l)}</p>' for l in lines)
    nd = f'<p class="nodes">{E(nodes)}</p>' if nodes else ''
    return (f'<article class="skill" id="{sid}"><video src="vid/{sid}.mp4" autoplay muted loop playsinline preload="metadata" aria-label="{E(name)}"></video>'
            f'<div class="txt"><div class="head"><span class="num">{E(num or sid)}</span><h3>{E(name)}</h3></div><div class="meta">{meta}</div>{ps}{nd}</div></article>')

CSS = open(os.path.join(HERE, 'style.css')).read()
nav = ''.join(f'<a href="#{k}">{E(t)}</a>' for k, t, _, _ in SECTIONS)
body = ''
for k, t, el, items in SECTIONS:
    intro = f'<p class="intro">{E(SHARED)}</p>' if k == 'fire' else ''
    if k == 'mixes': intro = '<p class="intro">With the Spellblade talent Fusion, his second orb fuses with the first: the mix of the two fires by itself 0.3 s after that cast, and both orbs are spent.</p>'
    body += f'<section id="{k}"><h2>{E(t)}</h2>{intro}' + ''.join(card(*i) for i in items) + '</section>\n'
page = f'''<title>Ashfang Skills</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;600&display=swap">
<style>
{CSS}
</style>
<div class="wrap">
<header>
  <h1>Ashfang skills</h1>
  <p>Kit 1.7 · 26 skills · 12 combos · 10 mixes · on your Tripo model · effects are stand-ins.</p>
  <nav>{nav}</nav>
</header>
{body}</div>
'''
open(OUT, 'w').write(page)
n = sum(len(i) for _, _, _, i in SECTIONS)
print('wrote', OUT, len(page), 'cards', n)
