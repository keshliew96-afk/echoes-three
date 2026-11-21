# mkpage.py: Stonehide's ability review page (simple and clean: clip, name, a few lines, nodes).
import html, os
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'index.html')

SHARED = 'Sharpen, Ascend, Echo, Snare, Galvanize, Resonance, Aegis and Rampart, and Retaliate when it has a press'
# (id, name, chips, cooldown, lines, nodes or None)
SECTIONS = [
 ('passive', 'Class passive', [
  ('S13', 'Bristle', ['Class passive'], None, [
    'Free from the first room, no button.',
    'Basic hits 1 and 3 and the dash taunt for free. Every 8 s he growls at a foe that is on an ally. Not on a boss.',
    'Each foe taunted is a Stone: 3% less damage, up to 8. Each lasts 6 s, then flies at a foe within 4 u for 3.',
    'A taunted foe that falls gives +1 max HP (up to +15 a level), and he grows 1% for every +5 (up to 15% taller).',
    'A hit from a boss or champion, a shatter and a capped hit also give 1 Stone.'], None),
 ]),
 ('core', 'Attack and dash', [
  ('S14', 'Basic attack', ['Always on'], None, [
    'Shield bash 9, taunts 2 s. Fist hook 9.',
    'Overhead slam 14 + 4% HP; taunts every foe within 2 u for 3 s.'], None),
  ('S15', 'Dash', ['Always on'], None, [
    'Two-paw shield charge, 2.2 u, untouchable.',
    'Foes in the way are knocked aside, stunned 0.3 s and taunted 2 s.', 'Out of Slabguard it is a Slab charge (C7).'], None),
 ]),
 ('taunts', 'Taunts and team play', [
  ('S16', 'Bellow', ['Taunt'], '5 s', ['A roar 3 u round him: 6 damage, taunted 4 s.'], 'Quicken, Widen, Tremor, Anchor, Crush'),
  ('S17', 'Rock Toss', ['Taunt'], '3 s', ['A rock at the foe nearest his aim, up to 7 u: 12 + 3% HP, taunted 4 s.', 'It stumbles 1.5 u toward him.', 'By the Growlstone he throws the stone (C1); by rubble, three rocks (C3).'], 'Quicken, Multiply, Reach, Crush'),
  ('S18', 'Landslide', ['Taunt'], '8 s', ['A strip 5 u long and 2.4 u wide slides back to him.', 'Foes on it: 12, carried up to 3 u, taunted 3 s, slowed 30%.'], 'Quicken, Widen, Reach, Linger, Tremor, Crush'),
  ('S19', 'Growlstone', ['Taunt', 'Helper'], '12 s', ['Plants a Growlstone up to 5 u away for 8 s.', 'Every 2 s it roars: foes within 3 u are taunted onto him and pay Stone.', 'A big blow within 2 u makes it roar at once, 1 u wider.'], 'Quicken, Multiply, Widen, Reach, Linger, Anchor'),
  ('S20', 'Fracture', ['Passive slot'], None, ['His hits and taunts crack a foe. Then every hit from anyone adds a Crack (one per attacker each 0.5 s).', 'At 4 Cracks it shatters: 12 + 4% HP, stunned 1 s.', 'Heavy hits (Heavy Slam, Fault Line, Burrow, Badger Toss, wall slam) put 2 Cracks.'], 'Quicken, Multiply, Widen, Linger'),
  ('S47', 'Stone Ring', ['Taunt', 'Zone'], '16 s', ['Standing stones rise round him, 3.5 u, for 4 s. Walking foes cannot cross; foes inside are taunted 4 s.', 'Heroes and shots pass.'], 'Quicken, Widen, Linger, Tremor, Anchor'),
  ('S48', 'Slab Throw', ['Taunt'], '8 s', ['Throws the slab at the foe nearest his aim, up to 7 u. It bounces to 3 more within 4 u: 14 + 3% HP, taunted 3 s each.', 'It flies back to his paw.', 'It also bounces off his stones (C2).'], 'Quicken, Multiply, Widen, Reach, Crush'),
  ('S50', 'Stone Cubs', ['Taunt', 'Helper'], '16 s', ['Two stone cubs climb out for 10 s and run to foes attacking an ally.', 'Bites 6 a second; each bite taunts the foe onto him 2 s.', 'They dig and roar with him (C4).'], 'Quicken, Multiply, Reach, Linger, Crush'),
 ]),
 ('stone', 'Stone and earth', [
  ('S21', 'Slabguard', ['Guard'], '10 s', ['Holds the slab toward his aim for 3 s, walking at 60%. Shots that reach its 120° front stop there.', 'Front hits 40% smaller. Foes within 5 u in front are taunted 3 s.', 'Stopped shots fly back at the shooter for half damage.', 'Ends with a shove: 14 + 4% HP, pushed 1.5 u.', 'Skills on himself work under it; any other press ends it.'], 'Quicken, Widen, Reach, Linger, Crush'),
  ('S22', 'Bodyguard', ['Guard', 'Taunt', 'Move'], '9 s', ['Hops in 0.4 s to the most hurt ally within 6 u. The landing taunts foes within 2.5 u for 3 s.', 'For 5 s half the damage that ally takes goes to him, and both take 15% less.'], 'Quicken, Multiply, Widen, Reach, Linger, Tremor, Anchor'),
  ('S23', 'Fault Line', ['Taunt'], '9 s', ['After 0.4 s a crack runs 6 u: 30 + 6% HP, taunted 2 s.', 'Foes on it are thrown up 0.6 s (the first 1 s), and so are foes within 1.5 u of him.', 'Its rubble slows 35% for 4 s.'], 'Quicken, Multiply, Widen, Reach, Linger, Anchor, Crush'),
  ('S24', 'Burrow', ['Taunt', 'Move'], '10 s', ['Digs in, tunnels up to 5 u, bursts up: 24 + 6% HP within 2.2 u.', 'Thrown up 0.6 s, taunted 3 s. Untouchable underground.', 'Leaves rubble where he comes up.'], 'Quicken, Widen, Reach, Anchor, Crush'),
  ('S25', 'Rallying Cry', ['Party'], '12 s', ['He and allies within 4 u: 20% less damage for 4 s, 20% more for 3 s.'], 'Quicken, Reach, Linger, Provoke'),
  ('S45', 'Colossus', ['Big skill'], '30 s', ['Grows 40% taller into a stone giant for 8 s. Foes within 4 u are taunted 4 s.', '30% more max HP at the same share, 20% less damage, 20% more damage, 25% more reach.', 'His Heavy Slam and hit 3 leave rubble.'], 'Quicken, Widen, Linger, Tremor, Anchor'),
  ('S53', 'Stoneheart', ['Guard'], '18 s', ['For 5 s no single hit takes more than 5% of his max HP (reduced first, then capped).', 'Each capped hit gives 1 Stone and a Crack, at most once a second.'], 'Quicken, Linger, Provoke'),
 ]),
 ('fury', 'Fury', [
  ('S26', 'Heavy Slam', ['Damage'], '5 s', ['34 + 8% HP to up to 3 foes in front, +1 for each 1% damage reduction he has.', 'It sends the Growlstone rolling 5 u. On a foe in the air it is a Spike (C5).'], 'Quicken, Multiply, Widen, Reach, Provoke, Tremor, Anchor, Crush'),
  ('S27', 'Maul', ['Damage'], '7 s', ['6 swipes in 2 s, 7 + 1% HP each, walking at half speed.', 'Each swipe that hits: attacks 5% faster for 4 s, up to 30%.'], 'Quicken, Widen, Reach, Linger, Provoke, Tremor, Anchor, Crush'),
  ('S28', 'Bloodboil', ['Self'], '14 s', ['Burns 10% of his health. For 6 s: 25% more damage, attacks 25% faster.'], 'Quicken, Linger'),
  ('S29', 'Savage Bite', ['Damage'], '6 s', ['Lunges 1.5 u and bites: 28, plus 0.8 for each 1% health missing.', 'A kill gives back half the cooldown.', 'Health he burns is kept as a debt (up to 20% max HP); the next bite adds it all.'], 'Quicken, Multiply, Reach, Provoke, Crush'),
  ('S49', 'Grindstone', ['Damage', 'Burn'], '12 s', ['6 s of grinding dust round him. He loses 3% max HP a second (stops at 10%).', 'Foes within 2.5 u lose 6% of his max HP a second.'], 'Quicken, Widen, Linger, Provoke, Anchor, Crush'),
  ('S55', 'Badger Toss', ['Damage'], '9 s', ['Grabs the foe nearest his aim within 1.5 u and throws it up to 5 u.', 'It and foes within 1.5 u of the landing: 20 + 5% HP, stunned 0.6 s.'], 'Quicken, Widen, Reach, Provoke, Crush'),
 ]),
 ('iron', 'Iron thorn', [
  ('S30', 'Iron Bristles', ['Thorns'], '10 s', ['For 5 s each hit he takes returns 60% (+3% HP) to the attacker, at any range.'], 'Quicken, Linger, Provoke'),
  ('S31', 'Grudge', ['Thorns'], '12 s', ['For 3 s he counts every hit and takes 20% less.', 'Then he slams within 3 u: 20 + all he counted (up to 50% max HP).', 'The slam bursts every quilled foe (C9).'], 'Quicken, Widen, Linger, Provoke, Tremor, Anchor, Crush'),
  ('S32', 'Iron Briar', ['Zone'], '11 s', ['Thorns in a 2.4 u circle, up to 4 u away, for 5 s: 6 a second, slowed 25%.', 'A foe that attacks from inside takes 6 more.', 'A foe pushed or thrown into it is impaled (C8).'], 'Quicken, Widen, Reach, Linger, Provoke, Tremor, Anchor, Crush'),
  ('S33', 'Iron Quills', ['Thorns'], '9 s', ['A quill to each foe within 4 u (up to 8): 10.', 'For 5 s a quilled foe takes 6 each time it attacks.', 'A quilled foe that falls sends quills to 3 more within 3 u.'], 'Quicken, Widen, Linger, Provoke, Tremor, Anchor, Crush'),
  ('S54', 'Counter Spin', ['Passive slot'], None, ['Every 5th hit he takes, he spins: 14 + 3% HP to foes within 2 u. At most one spin a second.', 'It never cuts his combo.'], 'Quicken, Widen, Provoke, Tremor, Anchor, Crush'),
 ]),
 ('combos', 'Combos', [
  ('C1', 'Throw the stone', ['Rock Toss', 'Growlstone'], None, ['Rock Toss by the Growlstone throws the stone: 16 to foes within 1.5 u, taunted 3 s, and it roars at once.'], None),
  ('C2', 'Slab pinball', ['Stone Ring', 'Slab Throw'], None, ['The slab bounces off his stones and may hit a foe again.'], None),
  ('C3', 'Rubble is ammo', ['Fault Line', 'Rock Toss'], None, ['Rock Toss by rubble throws three rocks and uses the rubble up.'], None),
  ('C4', 'The cubs copy him', ['Stone Cubs', 'Burrow', 'Bellow'], None, ['The cubs burst out with him for 8, and roar with him: taunted 2 s.'], None),
  ('C5', 'Spike', ['Fault Line', 'Heavy Slam'], None, ['A foe thrown up is slammed down: 50% more, 10 to foes within 1.5 u.'], None),
  ('C7', 'Slab charge', ['Slabguard', 'Dash'], None, ['The foes in front go with him, into a wall: wall slam.'], None),
  ('C8', 'Thorn slam', ['Iron Briar', 'Badger Toss'], None, ['Thrown into the briar: impaled, 12 + 3% HP, quilled 5 s.'], None),
  ('C9', 'Grudge bursts the quills', ['Iron Quills', 'Grudge'], None, ['Each quilled foe in the slam bursts: quills fly to 3 more within 3 u for 10.'], None),
 ]),
 ('moves', 'New moves', [
  ('BC', 'Bare Claws set', ['Feral talent'], None, ['The slab is gone: both paws swing as fists.', 'Claw rake, hook, both fists down. The dash is a shoulder ram.'], None),
  ('S21b', 'Slabguard, Bare Claws', ['Feral talent'], None, ['He rips a slab out of the floor and holds that. It breaks on the shove.'], None),
  ('S45b', 'Colossus, Bare Claws', ['Feral talent'], None, ['A giant with bare claws.'], None),
  ('S51', 'Wall slam', ['Rule'], None, ['A foe he pushes or throws into a wall takes 10 + 3% HP more and is stunned 0.5 s.'], None),
  ('S55b', 'Badger Toss into a wall', ['Rule'], None, ['The thrown foe meets the wall: wall slam.'], None),
  ('S19b', 'Kick the stone', ['Combo'], None, ['Heavy Slam on the Growlstone rolls it 5 u: 16, knocked aside, taunted 3 s.'], None),
 ]),
]

def card(sid, name, chips, cd, lines, nodes):
    e = html.escape
    meta = ''.join(f'<span class="chip">{e(c)}</span>' for c in chips)
    if cd: meta += f'<span class="cd">{e(cd)}</span>'
    ps = ''.join(f'<p>{e(l)}</p>' for l in lines)
    nd = f'<p class="nodes">{e(nodes)}</p>' if nodes else ''
    return (f'<article class="skill" id="{sid}"><video src="vid/{sid}.mp4" autoplay muted loop playsinline preload="metadata" aria-label="{e(name)}"></video>'
            f'<div class="txt"><div class="head"><span class="num">{sid}</span><h3>{e(name)}</h3></div><div class="meta">{meta}</div>{ps}{nd}</div></article>')

CSS = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'style.css')).read()
nav = ''.join(f'<a href="#{k}">{html.escape(t)}</a>' for k, t, _ in SECTIONS)
body = ''
for k, t, items in SECTIONS:
    intro = f'<p class="intro">Every skill also takes {SHARED}.</p>' if k == 'taunts' else ''
    body += f'<section id="{k}"><h2>{html.escape(t)}</h2>{intro}' + ''.join(card(*i) for i in items) + '</section>\n'
page = f'''<title>Stonehide Skills</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;600&display=swap">
<style>
{CSS}
</style>
<div class="wrap">
<header>
  <h1>Stonehide skills</h1>
  <p>Kit 1.6 · 26 skills · 8 combos · on your Tripo model · effects are stand-ins.</p>
  <nav>{nav}</nav>
</header>
{body}</div>
'''
open(OUT, 'w').write(page)
print('wrote', OUT, len(page))
