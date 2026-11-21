# mkpage.py: Ashfang's ability review page (simple and clean: clip, name, a few lines, nodes).
import html, os
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'index.html')
E = html.escape
SHARED = ('Every skill also takes Sharpen, Ascend, Keen, Galvanize, Siphon, Detonate, Resonance, Lethality, Execute, Duel and Gale Step; '
          'every skill with a press also takes Echo, Flow, Momentum and Parry.')
ELN = {'fire': '剑意 Intent', 'earth': '不屈 Unbowed', 'water': '止水 Still Water', 'wind': '狂热 Fervour'}
# (id, name, will or None, kind chips, cooldown, lines, nodes or None, number shown)
ECI = "Trial (talent T44): every fourth skill is cast again for half by a silver ghost of him, 0.4 s after his cast ends, from where he stood, as he aimed, in his style's form. The ghost swords are off in these clips so the echo reads alone."
SPI = 'Will style: when he holds two marks, the special of the pair casts itself 0.3 s after that cast. A sword spirit does it, so his hands stay free; both marks are spent.'
SPW = {'SP1': ('fire', 'fire'), 'SP2': ('earth', 'earth'), 'SP3': ('water', 'water'), 'SP4': ('wind', 'wind'), 'SP5': ('fire', 'earth'), 'SP6': ('fire', 'water'), 'SP7': ('fire', 'wind'), 'SP8': ('earth', 'water'), 'SP9': ('earth', 'wind'), 'SP10': ('water', 'wind')}
SECTIONS = [
 ('core', 'Passive, attack and dash', None, [
  ('S11', 'Sword Heart 剑心', None, ['Class passive'], None, ['Free from the first room, no button.', "Each cast draws a small ghost sword out of his blade in its will's colour (剑 gold, 屈 bronze, 水 aqua, 热 silver). It floats point-down behind his shoulder, the newest on the right. He holds two; a third pushes out the oldest.", "After the last hit of each skill, every ghost sword he held copies that hit for 4, with its will's effect at half length. Base: each stabs the nearest foe the skill hit. Swift: they cut along his thrust. Crescent: each fires a 剑气 5 u.", 'The sixth basic hit throws the newest ghost sword (next card). Clip: a cast with no ghost sword, one with one, one with two, then the sixth hit.'], None, None),
  ('N_basic', 'Basic attack', None, ['Always on'], None, ['Six hits in about 2.1 s: diagonal down-cut 10, flat sweep 10, overhead chop 12, rising cut 11, low lunge 14, then the ghost sword throw (12).'], None, 'S12'),
  ('N_throw', 'Ghost sword throw', None, ['Basic, last hit'], None, ['His sword stays in his right paw; his open left paw flicks the newest ghost sword out, spinning like a disc: 4 u through every foe, 12.', "It whirls 0.4 s, bursts for 6 within 1.5 u with its will (scar, daunt, stillness or push) and flies back to his shoulder; the mark is kept. Second throw in the clip: no mark, a plain silver one that fades."], None, 'S11'),
  ('S13', 'Dash', None, ['Always on'], None, ['Flat and low, the blade leading like a spear: 2.6 u, untouchable, 8 to each foe it passes.', 'A thin crimson streak with a silver edge; sparks where he stops.'], None, None),
  ('B2', 'Two marks', None, ['Rule'], None, ['剑 4% more damage, 屈 4% less damage taken, 水 1 health every 2 s, 热 basic attacks 5% faster.'], None, None),
 ]),
 ('echo', 'Echo 残响 (trial)', None, [
  ('E1', 'Lunge Strike', None, ['Swift form'], None, ['Casts 1, 2, 3 as usual; after the 4th, his ghost thrusts again from where he stood: 13.'], None, None),
  ('E2', 'Keen Crescent 锐月', None, ['Crescent form'], None, ['Casts 1, 2, 3 as usual; after the 4th, his ghost sends the wide crescent again: 8 and the burst at half.'], None, None),
  ('E3', 'Blade Storm', None, ['Base form'], None, ['Casts 1, 2, 3 as usual; after the 4th he steps away and his ghost spins again where he stood: 2.5 a cut.'], None, None),
 ]),
 ('fire', '剑意 Intent · the scar', 'fire', [
  ('S14', 'Flurry', 'fire', ['Blade'], '3 s', ['A reverse-grip draw, four cuts in an X and an X; the strokes hang, then flare into one star.', '3 each to up to 6 foes in a 60° fan. The scar 2 a second for 3 s.'], 'Quicken, Multiply, Widen, Reach, Pursuit', None),
  ('S15', 'Crescent Finisher', 'fire', ['Blade'], '6 s', ['Point dragging sparks, then a rising cut in a back turn that draws a tall gold moon.', '20 to up to 5 foes, 70° fan; +50% for each other skill landed in the last 2 s (up to 2). The scar 4 a second for 3 s.'], 'Quicken, Multiply, Widen, Reach, Pursuit', None),
  ('S16', 'Keen Crescent 锐月', 'fire', ['Wave'], '4 s', ['One turn draws a ring of light; it unrolls into the crescent. A cut line stays in the floor.', '6 u through every foe: 16, the scar 3 a second for 3 s.'], 'Quicken, Multiply, Widen, Reach', None),
  ('N_cascade', 'Radiant Cascade 耀舞连斩', 'fire', ['Blade'], '10 s', ['Two wide sweeps, an overhead slam with a star on the floor, a swirl of gold blades that pulls foes in, then a dash through them.', '5 + 5, 10, 3 × 3 in the swirl, dash 14 · the scar.'], 'Quicken, Multiply, Widen, Reach, Pursuit', 'S17'),
  ('S18', 'Crimson Edge', 'fire', ['Passive'], None, ['25% more crit chance. His crits leave a scar, 3 a second for 3 s.'], 'Keen makes it 40%', None),
  ('S19', 'Sword Bloom 剑绽', 'fire', ['Art'], '7 s', ['He tosses the sword up and snaps his open paw: a scar opens on every foe within 4 u, 3 a second for 3 s.', 'He catches it and cuts down: a foe already scarred bursts as a star, 12, and scars the foes within 1.5 u.'], 'Quicken, Widen', None),
  ('S20', 'Triple Crescent', 'fire', ['Wave', 'Big skill'], '12 s', ['A salute; three ghost blades fan out behind him like wings. Flat, rising, overhead: three great waves, 7 u, 18 each.', 'The 2nd and 3rd deal half to a foe already hit. The scar 4 a second for 3 s.'], 'Quicken, Multiply, Widen, Reach', None),
 ]),
 ('earth', '不屈 Unbowed · the daunt', 'earth', [
  ('S21', 'Lunge Strike', 'earth', ['Blade'], '4 s', ['Coiled low, a thin aim line; the thrust bursts a shock cone behind the foe; he rips the blade out.', '26 to up to 2 foes in line, daunt 0.5 s.'], 'Quicken, Multiply, Reach, Pursuit', None),
  ('S24', 'Rift Cut 裂痕斩', 'earth', ['Wave'], '6 s', ['A reverse-grip stab, the point carves a line round his feet, then he rips it up: the rift races out and blade fins rise along it.', '5 u: 14 to every foe on it, daunt 0.4 s.'], 'Quicken, Multiply, Reach', 'S22'),
  ('N_split', 'Titan Cleave 巨剑斩', 'earth', ['Blade', 'Charge'], '6 s', ['Hold to charge up to 1.2 s; the sword grows. Slam 1 u ahead.', 'Quick: 20 in 1.5 u, daunt 0.5 s. Full: 40 in 2.8 u, daunt 1 s.'], 'Quicken, Widen', 'S23'),
  ('N_ink', 'Ink Dive 墨坠', 'earth', ['Blade'], '9 s', ['Rising slash, an X cut with ink spikes, a leap with three cuts and a burst in the air, then a dive into the floor.', '8, 6 + 6, 4 × 3, 6, landing 20 in 1.8 u, daunt 0.6 s.'], 'Quicken, Multiply, Widen, Reach, Pursuit', 'S24'),
  ('S25', 'Caltrops', 'earth', ['Art'], '6.5 s', ['A spin on one foot, a cut across the floor: a fan of iron spikes lands standing.', "Radius 0.7 u for 5 s. A foe's first step on them: daunt 0.4 s."], 'Quicken, Multiply, Widen, Reach', None),
  ('S26', 'Riposte', 'earth', ['Art'], '8 s', ['A 0.6 s guard, reverse grip. On a catch: a bronze ring, one slow frame, a backhand that draws a full moon: 30 in a 90° arc, daunt 0.5 s.', 'A parried shot flies back at the shooter as a wave for 30.'], 'Quicken, Multiply, Reach', None),
 ]),
 ('water', '止水 Still Water · stillness', 'water', [
  ('S27', 'Moonfang', 'water', ['Blade', 'Dash cut'], '7 s', ['A low draw, a streak, still at the far end; a beat later a pale moon opens along the path.', '3.2 u: 24 to up to 4 foes. Marked 2 s (20% more damage taken), stillness 30% for 2 s.'], 'Quicken, Multiply, Reach', None),
  ('N_riptide', 'Calm Forms 止水四式', 'water', ['Blade'], '6 s', ['Overhead arc, a leap and stab down, a rising cut, a low crouched sweep.', '10, 12, 8, 10 · stillness 30 to 40%.'], 'Quicken, Multiply, Widen, Reach, Pursuit', 'S28'),
  ('S29', 'Calm Crescent 静月', 'water', ['Wave'], '5 s', ['A barrel-roll hop draws a full pale circle; it unfolds into the wave. One ripple where he was.', '2.5 u wide, 4 u: 14, stillness 40% for 3 s. He hops 1.5 u, untouchable.'], 'Quicken, Multiply, Widen, Reach', None),
  ('N_ring', 'Mirror Ring 镜月剑阵', 'water', ['Art', 'Big skill'], '14 s', ['A ring of pale light, 2.5 u. Seven mirror images thrust across it one by one: 5 each, stillness 30%.', 'Then 剑花 and four bursts inside: 4 each. All in 4 s.'], 'Quicken, Multiply, Widen', 'S30'),
  ('S31', 'Mirror Image', 'water', ['Art'], '10 s', ['The point draws a mirror of light; he steps back out of himself. The image turns its sword in slow wheels.', "Foes within 4 u turn on it for 3 s (never a boss or the tank's foes). Then it bursts in mirror shards: 12 within 2 u, stillness 40% for 3 s."], 'Quicken, Multiply, Widen', None),
  ('S32', 'Calm Edge 静锋', 'water', ['Passive'], None, ['His hits deal 15% more to a foe in stillness.', 'Every 4th hit on the same foe: stillness 30% for 1.5 s.'], 'Quicken (every 3rd hit)', None),
 ]),
 ('wind', '狂热 Fervour · the launch, the pull, the push', 'wind', [
  ('S33', 'Fox Step', 'wind', ['Blade', 'Dash cut'], '5 s', ['A low corkscrew dash; the blade draws a spiral of silver strokes. He slides to a stop on one knee.', '2 u: 18 to up to 3 foes, launched 0.5 s.'], 'Quicken, Multiply, Reach, Pursuit', None),
  ('S34', 'Blade Storm', 'wind', ['Blade'], '7 s', ['A small leap, three flat turns in the air, each a wider ring; down with the point in the floor.', 'Pulls foes within 2.5 u 1 u in. Five cuts of 4.'], 'Quicken, Multiply, Widen, Pursuit', None),
  ('N_waltz', 'Skyblade Waltz', 'wind', ['Blade'], '12 s', ['Floor crescent, big flat cut, flash dash, a ring of light, blades rise and launch foes, rising cut, three beams that leave swords standing.', '6, 8, 6, 8, 6, 10, then 6 per beam.'], 'Quicken, Multiply, Widen, Reach, Pursuit', 'S35'),
  ('S36', 'Blade Dance', 'wind', ['Art'], '6 s', ['A no-hands cartwheel: two tilted rings cross like an X round him; after-images on landing.', '1.3 u: 10 to up to 6 foes, launched 0.6 s. He runs 30% faster for 2 s.'], 'Quicken, Multiply, Widen, Pursuit', None),
  ('S37', 'Blade Wheel 旋刃', 'wind', ['Wave'], '7 s', ['Two figure-eights leave a wheel of ghost blades on the sword; an underhand cut sends it off.', '4 u in 1.6 s: 3 every quarter second. It carries the foes and drops them together.'], 'Quicken, Multiply, Widen, Reach', None),
  ('S38', 'Razor Wake', 'wind', ['Passive'], None, ['Every second the 3 nearest foes within 0.9 u take 4.', 'The third cut in a row on the same foe launches it 0.4 s.'], 'Quicken, Multiply, Widen', None),
  ('S39', 'Thousand Cuts', 'wind', ['Blade', 'Big skill'], '12 s', ['He splits into after-images and is gone. Eight long strokes, each from a new side; he sheathes, and at the click they all flash.', 'Eight cuts of 5 on foes within 3 u, a different foe each time. Untouchable. The last foe is launched 0.6 s.'], None, None),
 ]),
 ('specials', 'Will specials', None, [
  ('SP1', 'One Thought 一念', None, ['Two marks', 'Ranged'], None, ['A giant spirit sword falls along his aim, 7 u long, 1.5 u wide: 30.', 'The line glows 3 s and scars a foe that crosses it, 3 a second for 2 s.'], None, None),
  ('SP2', 'Unmoved 不动', None, ['Two marks', 'Self buff'], None, ['A great sword plants before him: 12 within 2.5 u and a 0.5 s daunt.', 'While it stands, 3 s, he takes 40% less and nothing pushes or daunts him.'], None, None),
  ('SP3', 'Clear Mirror 明镜', None, ['Two marks', 'Heal', 'Debuff'], None, ['The floor is a mirror, 3 u: 10 and 40% stillness for 3 s.', 'He heals 12 and every harm on him ends.'], None, None),
  ('SP4', 'Frenzy 狂澜', None, ['Two marks', 'Melee', 'Self buff'], None, ['Four spirits cut across him twice, 2 u: eight cuts of 3.', 'Basic attacks are 30% faster for 4 s.'], None, None),
  ('SP5', 'Counterblow 后发', None, ['Two marks', 'Melee'], None, ['A spirit guards him 1 s. A hit in that time is blocked and answered: 28 along a 3 u line.', 'With no hit it still cuts, for 14.'], None, None),
  ('SP6', 'See Through 看破', None, ['Two marks', 'Debuff'], None, ['Every foe within 4 u is marked: it takes 20% more from him for 4 s.', 'Then one cut lands on each, 8.'], None, None),
  ('SP7', 'Wild Dance 乱舞', None, ['Two marks', 'Melee', 'One foe'], None, ['Ten strokes draw a star on the one foe nearest his aim within 3 u: 4 each.'], None, None),
  ('SP8', 'Still Mountain 静岳', None, ['Two marks', 'Self buff'], None, ['For 3 s he heals 4 a second and takes 30% less; a foe that hits him is stilled 40% for 2 s.', 'It ends in a ring, 3 u: 8.'], None, None),
  ('SP9', 'Last Stand 破釜', None, ['Two marks', 'Melee', 'Self buff'], None, ['A shock round him, 2.5 u: 12 and a 1 u push.', 'For 4 s nothing stills or daunts him and basic attacks are 20% faster.'], None, None),
  ('SP10', 'Flow 行云', None, ['Two marks', 'Ranged'], None, ['A ribbon of six spirit swords flies 6 u in an S and back: 10 to each foe.', 'The dash is ready at once and every skill loses 2 s of cooldown.'], None, None),
 ]),
 ('combos', 'Combos', None, [
  ('L1', 'Scar, then Sword Bloom', None, ['Keen Crescent', 'Sword Bloom'], None, ['Every scarred foe bursts and scars its neighbours.'], None, None),
  ('C1', 'Fervour spreads the scar', None, ['Keen Crescent', 'Blade Wheel'], None, ['A 狂热 hit on a scarred foe spreads its scar to foes within 1.5 u.'], None, None),
  ('C2', 'Wall slam', None, ['Blade Wheel', 'a wall'], None, ['A foe pushed into a wall takes 10 and is daunted 0.5 s.'], None, None),
  ('C3', 'Spike', None, ['Fox Step', 'Crescent Finisher'], None, ['A foe in the air is slammed down: 50% more, 10 to foes within 1.5 u.'], None, None),
  ('C5a', 'Coloured wheel: 剑意', None, ['Blade Wheel', 'Keen Crescent'], None, ['A crescent thrown through the wheel gives it its will: its cuts scar.'], None, None),
  ('C5c', 'Coloured wheel: 止水', None, ['Blade Wheel', 'Calm Crescent'], None, ['The wheel gives stillness 40%.'], None, None),
  ('C6', 'The image throws too', None, ['Mirror Image', 'Triple Crescent'], None, ['While the image stands it throws a copy of each Wave skill, for half.'], None, None),
  ('C7', 'Burst the image', None, ['Mirror Image', 'Moonfang'], None, ['A dash cut through the image bursts it at once.'], None, None),
  ('C8', 'Sent back', None, ['Riposte', 'a shooter'], None, ['A parried shot flies back at the shooter as a wave for 30.'], None, None),
  ('C9', 'Kick the caltrops', None, ['Caltrops', 'Rift Cut'], None, ['The patch scatters twice as wide; each foe on it is daunted again.'], None, None),
  ('C10', 'Scar spin', None, ['Flurry', 'Blade Storm'], None, ['A scarred foe in the spin passes its scar to every foe the spin cuts.'], None, None),
  ('C11', 'Dash strike', None, ['Dash', 'Lunge Strike'], None, ['Pressed during a dash, it comes out at the end: 1 u farther, 30% harder.'], None, None),
  ('C12', 'Settle 归静', None, ['Sword Bloom', 'Calm Crescent'], None, ['A 止水 skill closes a scar: the rest lands at once and the foe is blinded 0.8 s.'], None, None),
 ]),
 ('old', 'Gone in kit 2.0', None, [
  ('S35', 'Gale Crescent', None, ['Wave'], '4 s', ['Gone; Thousand Cuts came back.', 'A fast thin wave, 7 u, through every foe: 14, pushed 2 u back.'], None, 'old'),
  ('S7', 'Juggle', None, ['Rule'], None, ['Gone with the count. Launches stay, for Spike and Smash down.'], None, 'old'),
 ]),
]

import importlib.util
_sp = importlib.util.spec_from_file_location('zh', os.path.join(HERE, 'zh.py')); Z = importlib.util.module_from_spec(_sp); _sp.loader.exec_module(Z)
_sp2 = importlib.util.spec_from_file_location('forms', os.path.join(HERE, 'forms.py')); FM = importlib.util.module_from_spec(_sp2); _sp2.loader.exec_module(FM)
# kit 2.2 (kit22.py): no will effects or colours, Echo in the passive, no copies
_sp3 = importlib.util.spec_from_file_location('kit22', os.path.join(HERE, 'kit22.py')); K22 = importlib.util.module_from_spec(_sp3); _sp3.loader.exec_module(K22)
Z.LINES.update(K22.ZH)
Z.NAME['Echo 残响'] = '残响'
Z.CHIP['Sword Grove 剑林'] = '剑林'
FM.F['E'] = K22.FORM_E
for k, (se, ce, sz, cz) in K22.FORMS_FIX.items():
    o = FM.F[k]
    FM.F[k] = (se or o[0], ce or o[1], sz or o[2], cz or o[3])
for k, v in K22.SEC_ZH.items(): Z.SEC[k] = v
_new = []
for k, t, el, items in SECTIONS:
    if k == 'echo': continue
    out = []
    for it in items:
        sid = it[0]
        if sid in K22.DROP: continue
        it = list(it)
        if sid in K22.EN: it[5] = K22.EN[sid]
        if sid in K22.CHIPS: it[3] = K22.CHIPS[sid]
        if sid in K22.NODES: it[6] = K22.NODES[sid]
        if sid in getattr(K22, 'RENAME', {}): it[1] = K22.RENAME[sid][0]; Z.NAME[it[1]] = K22.RENAME[sid][1]
        if sid in getattr(K22, 'CD', {}): it[4] = K22.CD[sid]
        out.append(tuple(it))
        if sid == 'S11': out.append(K22.ECHO)
    _new.append((k, K22.SEC_EN.get(k, t), el, out))
SECTIONS = _new
def bi(en, zh):
    return f'<span class="en">{E(en)}</span><span class="zh">{E(zh)}</span>'
def card(sid, name, el, chips, cd, lines, nodes, num=None):
    zn = Z.NAME.get(name)
    assert zn, name
    zl = Z.LINES.get(sid)
    assert zl and len(zl) == len(lines), sid
    meta = (f'<span class="chip el el-{el}">{bi(ELN[el], Z.ELN[el])}</span>' if el else '') + ''.join(f'<span class="chip">{bi(c, Z.CHIP.get(c, c))}</span>' for c in chips)
    if sid in SPW:
        MK = {'fire': '剑', 'earth': '屈', 'water': '水', 'wind': '热'}
        a, b = SPW[sid]
        marks = f'<span class="chip marks"><span class="mk el-{a}">{MK[a]}</span> + <span class="mk el-{b}">{MK[b]}</span></span>'
        meta = marks + ''.join(f'<span class="chip">{bi(c, Z.CHIP.get(c, c))}</span>' for c in chips if c != 'Two marks')
    if cd: meta += f'<span class="cd">{E(cd.replace(" s", " s"))}</span>'
    ps = ''.join(f'<p>{bi(l, zl[i])}</p>' for i, l in enumerate(lines))
    if nodes:
        znd = Z.NODE.get(nodes) or '、'.join(Z.NODE[n.strip()] for n in nodes.split(','))
        nd = f'<p class="nodes">{bi(nodes, znd)}</p>'
    else: nd = ''
    fm = ''
    if sid in FM.F:
        se, ce, sz, cz = FM.F[sid]
        fm = ('<div class="forms" role="group" aria-label="Form">'
              '<button type="button" data-f="" aria-pressed="true">' + bi('Base', '基础') + '</button>'
              '<button type="button" data-f="_s" aria-pressed="false">' + bi('Swift', '疾') + '</button>'
              '<button type="button" data-f="_c" aria-pressed="false">' + bi('Crescent', '剑气') + '</button></div>'
              f'<p class="fline" data-f="_s" hidden>{bi(se, sz)}</p><p class="fline" data-f="_c" hidden>{bi(ce, cz)}</p>')
    return (f'<article class="skill" id="{sid}"><video src="vid/{sid}.mp4" data-base="vid/{sid}" autoplay muted loop playsinline preload="metadata" aria-label="{E(name)}"></video>'
            f'<div class="txt"><div class="head"><span class="num">{E(num or sid)}</span><h3>{bi(name, zn)}</h3></div><div class="meta">{meta}</div>{fm}{ps}{nd}</div></article>')

CSS = open(os.path.join(HERE, 'style.css')).read()
nav = ''.join(f'<a href="#{k}">{bi(t, Z.SEC[k])}</a>' for k, t, _, _ in SECTIONS)
body = ''
for k, t, el, items in SECTIONS:
    intro = f'<p class="intro">{bi(SHARED, Z.SHARED)}</p>' if k == 'fire' else ''
    if k == 'specials': intro = f'<p class="intro">{bi(SPI, Z.SPI)}</p>'
    body += f'<section id="{k}"><h2>{bi(t, Z.SEC[k])}</h2>{intro}' + ''.join(card(*i) for i in items) + '</section>\n'
page = f'''<title>Ashfang Skills</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;600&display=swap">
<style>
{CSS}
</style>
<div class="wrap" id="wrap" data-lang="zh">
<header>
  <div class="lang" role="group" aria-label="Language"><button type="button" data-l="zh" aria-pressed="true">中文</button><button type="button" data-l="en" aria-pressed="false">English</button></div>
  <h1><span class="en">Ashfang skills</span><span class="zh">Ashfang 技能</span></h1>
  <p><span class="en">{K22.HEAD_EN}</span><span class="zh">{K22.HEAD_ZH}</span></p>
  <nav>{nav}</nav>
</header>
{body}</div>
<script>
(function () {{
  var w = document.getElementById('wrap'), bs = w.querySelectorAll('.lang button');
  function set(l) {{ w.setAttribute('data-lang', l); document.documentElement.lang = l === 'zh' ? 'zh-Hans' : 'en';
    bs.forEach(function (b) {{ b.setAttribute('aria-pressed', b.dataset.l === l ? 'true' : 'false'); }});
    try {{ localStorage.setItem('af-lang', l); }} catch (e) {{}} }}
  var l = 'zh'; try {{ l = localStorage.getItem('af-lang') || 'zh'; }} catch (e) {{}}
  set(l === 'en' ? 'en' : 'zh');
  bs.forEach(function (b) {{ b.addEventListener('click', function () {{ set(b.dataset.l); }}); }});
  document.querySelectorAll('.forms').forEach(function (g) {{
    var card = g.closest('.skill'), v = card.querySelector('video');
    g.querySelectorAll('button').forEach(function (b) {{ b.addEventListener('click', function () {{
      var f = b.dataset.f;
      g.querySelectorAll('button').forEach(function (x) {{ x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }});
      card.querySelectorAll('.fline').forEach(function (p) {{ p.hidden = p.dataset.f !== f; }});
      v.src = v.dataset.base + f + '.mp4'; v.play().catch(function () {{}});
    }}); }});
  }});
}})();
</script>
'''
open(OUT, 'w').write(page)
n = sum(len(i) for _, _, _, i in SECTIONS)
print('wrote', OUT, len(page), 'cards', n)
