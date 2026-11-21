# Mosslight skill review page, clean version (Kesh 16 Nov: simple, few words; notes go in NOTES.md).
import html, os, sys
S = '/tmp/claude-0/-home-user/32a8741f-483c-523d-bcd7-a3da532d6a06/scratchpad'
VID = f'{S}/page/vid'
OUT = sys.argv[1] if len(sys.argv) > 1 else f'{S}/page/index.html'

# (line, name, group, cooldown, lines, nodes, clip)
CORE = [
    ('S8', 'Basic attack', 'Always on', None,
     ['Hits 1 and 2 send a dark green thorn bolt.', 'Hit 3 throws the staff: it takes root and shoots as a turret for 5 s.', '§Watered, the turret shoots 50% faster for 3 s.'],
     None, 'kit_S8'),
    ('S9', 'Dash', 'Always on', None,
     ['Heals her 5% of max health on landing, once every 3 s.'],
     None, 'kit_S9'),
]
HEALS = [
    ('S10', 'Swiftleaf', 'Quick heal', '2.5 s',
     ['A leaf flies to the most hurt ally within 3.2 u: heals 14, or 21 on an ally with Moss.', '§It flies back to her and heals one more ally on the way for half.', 'Each seed within 1 u of its flight adds 11 (up to 2).'],
     'Bounce, Reach, Quicken', 'kit_S10'),
    ('S11', 'Seed Bolt', 'Quick heal', '3.5 s',
     ['A seed pod heals the first ally in its path for 22.', 'If it hits no ally, it drops a seed.'],
     'Reach, Pierce, Quicken', 'kit_S11'),
    ('S12', 'Dew Wave', 'Quick heal', '4 s',
     ['A lane of dew, 4 u by 1.6 u: heals up to 4 allies 12 each.', '§It clears their slows.', 'Waters what it touches: seeds come up at once as watered Spitters.'],
     'Widen, Reach, Quicken', 'kit_S12'),
    ('S13', 'Heartbloom', 'Quick heal', '8 s',
     ['A bud on the most hurt ally heals 4 a second for 4 s.', 'Then it blooms: 12 to that ally and everyone within 3 u. Blooms at once below 40% health.', 'Up to 4 seeds within 3 u open as flowers: 8 to allies within 2 u.'],
     'Reach, Widen, Multiply, Bounce, Linger', 'kit_S13'),
    ('S14', 'Pollen Gust', 'Quick heal', '10 s',
     ['A wall of wind 3 u wide travels 7 u.', 'Allies: heal 10 and 30% faster for 3 s. Foes: pushed 2 u and slowed.', '§It rolls seeds along; the first three land as two each.'],
     'Reach, Widen, Linger', 'kit_S14'),
    ('S15', 'Mossgrowth', 'Lasting heal', '5 s',
     ['Moss on the most hurt ally: 5 a second for 6 s.', 'A full run drops a seed at their feet.', 'It eats one seed within 1.5 u: the Moss lasts 9 s.'],
     'Reach, Linger, Quicken', 'kit_S15'),
    ('S16', 'Firefly Swarm', 'Lasting heal', '9 s',
     ['A swarm hops ally, foe, ally, foe: 5 a second for 3 s at each stop.', 'At a stop it eats a seed within 2 u for one more stop (up to 2).'],
     'Bounce, Multiply, Linger, Breeze', 'kit_S16'),
    ('S17', 'Dewfall', 'Lasting heal', '11 s',
     ['A flower bed, radius 2.2 u: allies inside heal 7 a second for 5 s.', 'Waters what is inside.'],
     'Widen, Linger, Reach', 'kit_S17'),
    ('S18', 'Mending Sapling', 'Lasting heal', '12 s',
     ['A sapling grows for 8 s and sends a blossom heal of 8 every 2 s.', 'At the end it sheds its leaves: 8 to every ally within 4.5 u.', '§Then it leaves a seed.', 'It draws in up to 3 seeds within 3 u: 2 s and one blossom more each.'],
     'Linger, Reach, Quicken', 'kit_S18'),
    ('S19', 'Glade Wisps', 'Passive', None,
     ['A wisp forms round her every 2.5 s, up to 3.', 'Each flies to a hurt ally within 4 u and heals 10.', '§One nobody needs in 10 s becomes a seed (at most one every 5 s).'],
     'Reach, Quicken, Multiply, Bounce, Linger, Breeze', 'kit_S19'),
    ('S50', 'Elder Oak', 'Lasting heal', '24 s',
     ['A great oak stands 8 s. Under its 3.5 u crown allies heal 6 a second and foes are slowed 25%.', 'At the end its leaves fly to each ally and heal 10.'],
     'Widen, Linger, Reach', 'kit_S50'),
    ('S57', 'Nectar Burst', 'Quick heal', '8 s',
     ['Tossed up to 5 u: allies within 2 u heal 10.', 'For 5 s they take 30% more healing from everything.'],
     'Widen, Reach, Linger, Multiply, Quicken, Siphon, Detonate', 'kit_S57'),
    ('S58', 'Rain Cloud', 'Lasting heal', '12 s',
     ['A cloud follows the most hurt ally within 6 u for 6 s.', 'Allies under it (1.8 u) heal 5 a second.', 'It waters every plant, Moss and seed it passes.'],
     'Widen, Linger, Reach, Breeze, Multiply, Quicken, Siphon, Detonate', 'kit_S58'),
    ('S59', 'Creeping Moss', 'Lasting heal', '10 s',
     ['Moss on the most hurt ally within 5 u: 4 a second for 6 s.', 'Every 2 s it creeps to the nearest ally within 3 u, with a fresh 6 s.'],
     'Reach, Linger, Bounce, Multiply, Quicken, Siphon', 'kit_S59'),
    ('S61', 'Leaf Gale', 'Wall', '14 s',
     ['A wall of wind 4 u wide stands 4 s across her aim, up to 4 u away.', 'Enemy shots that cross it become leaves that heal the most hurt ally within 6 u for 5.', 'At most 8 leaves a wall; later shots are just stopped.'],
     'Widen, Linger, Reach, Multiply, Quicken, Siphon', 'kit_S61'),
    ('S67', 'Forest Spirit', 'Passive', None,
     ['A small oak spirit floats behind her shoulder.', 'Allies within 4 u of it, her too, have 10% more maximum health. The bar grows; health stays.', 'Leaving trims it but never downs anyone.'],
     'Widen, Linger', 'kit_S67'),
]
DAMAGE = [
    ('S20', 'Scatter Seeds', 'Damage', '9 s',
     ['Three seeds land round her aim.', 'By allies they heal 11 on touch; near foes they sprout after 3 s into Spitters (4 a shot, 5 s).'],
     'Multiply, Reach, Widen, Linger, Bounce', 'kit_S20'),
    ('S21', 'Rootspear', 'Damage', '6 s',
     ['After 0.4 s, wooden spears burst along a row 7 u by 1.4 u: 28 to each foe.', '+30% on a weakened foe.', 'Each seed in the row bursts as roots: 12 within 1.5 u and slowed, then sprouts.'],
     'Reach, Widen, Multiply', 'kit_S21'),
    ('S22', 'Wispfall', 'Damage', '12 s',
     ['For 5 s a wisp dives every 0.5 s on a nearby foe: 7 around where it lands.', '§Each dive wakes seeds within 0.9 u.'],
     'Multiply, Widen, Linger, Bounce', 'kit_S22'),
    ('S23', 'Rootsnare', 'Damage', '11 s',
     ['Roots in a 2.4 u circle: for 3 s foes take 5 a second, are slowed and dragged in.', 'Then they clench: 12, and held 0.8 s.'],
     'Widen, Reach, Linger', 'kit_S23'),
    ('S24', 'Puffcap', 'Damage', '8 s',
     ['A mushroom waits until a foe comes near, then bursts.', 'Spore cloud 2.2 u for 4 s: 5 a second, and foes take 20% more damage.', 'Seeds within 3 u grow into Puffcaps too (up to 4 waiting).'],
     'Multiply, Widen, Reach, Linger', 'kit_S24'),
    ('S25', 'Sapping Vine', 'Damage', '8 s',
     ['A thorned vine holds one foe for 4 s: 8 a second.', 'Each tick sends 4 healing along a root to the most hurt ally.'],
     'Linger, Reach, Quicken', 'kit_S25'),
    ('S51', 'Oakling', 'Damage', '14 s',
     ['A small tree-folk guards the most hurt ally for 10 s.', 'Every 1.5 s it slams a foe near them: 9, pushed 1.5 u, slowed.', '§Seeds within 3 u grow into Oaklings too.'],
     'Linger, Multiply, Widen, Reach, Breeze', 'kit_S51'),
    ('S62', 'Wild Thicket', 'Damage', '22 s',
     ['A 3 u circle shows for 1.5 s, then vines burst up: 30 and a 1 s toss.', 'Seeds inside sprout; plants inside work 50% faster for 5 s.'],
     'Widen, Reach, Linger, Quicken, Siphon, Detonate', 'kit_S62'),
    ('S64', 'Pollen Mark', 'Damage', '12 s',
     ['Foes within 2.2 u of her aim are dusted for 6 s.', 'Each hero hit on them heals that hero 3, twice a second at most.'],
     'Widen, Reach, Linger, Quicken, Siphon', 'kit_S64'),
    ('S65', 'Drowsy Spores', 'Damage', '12 s',
     ['Foes within 2.2 u of her aim fall asleep for 3 s.', 'They sleep through two hits; the third wakes them, and a foe woken early takes 20% more damage for 4 s.', 'A boss is slowed 30% instead.'],
     'Widen, Reach, Linger, Quicken', 'kit_S65'),
]
GARDEN = [
    ('Water grows', 'Dew Wave and Dewfall water plants and Moss: a seed comes up as a watered Spitter, a helper lasts 3 s longer and works faster.'),
    ('Roots wake', 'Rootspear and Rootsnare sprout seeds. Rootspear bursts a Puffcap in its row.'),
    ('Wind carries', 'Pollen Gust bursts a Puffcap and carries its spores to the foes it pushes.'),
    ('§Light wakes', 'Wispfall\'s dives sprout seeds. Heartbloom opens them as healing flowers.'),
    ('§More seeds', 'An unused Glade wisp, a fading relic wisp, a Mending Sapling at its end and the Sprout node each leave a seed.'),
    ('§Sprout node', 'On any skill: it leaves one seed where it lands.'),
]
COMBOS = [
    ('C1', 'kit_C1', 'Rootsnare, then Rootspear', 'The pack is gathered and slowed, so each spear hits for 36.'),
    ('C2', 'kit_C2', 'Scatter Seeds, then Rootspear', 'Each seed bursts as roots, then sprouts into a Spitter.'),
    ('C3', 'kit_S30', 'Mossgrowth and the relic wisp', 'Moss overheal fills the wisp; it heals the Tank when he is hit.'),
    ('C4', 'kit_C4', 'Heartbloom below 40%', 'The bud blooms at once when its ally is in danger.'),
    ('C5', 'kit_CA', 'Scatter Seeds, then Dew Wave', 'Watered seeds come up at once as watered Spitters.'),
    ('C6', 'kit_CB', 'Mending Sapling in Dewfall', 'Watered, the sapling heals faster and lives longer.'),
    ('C7', 'kit_CC', 'Puffcap, then Rootspear', 'The spears burst the mushroom from afar.'),
    ('C8', 'kit_CD', 'Puffcap, then Pollen Gust', 'The wind carries the spores; pushed foes take 20% more.'),
    ('C9', 'kit_CE', 'Rootsnare, Puffcap, Rootspear', 'Slowed and exposed, each foe takes 44.'),
    ('C10', 'kit_CF', 'Elder Oak over the garden', 'Seeds sprout, nothing withers, foes are slowed.'),
    ('C11', 'kit_CG', 'Oakling, then Dew Wave', 'Watered, the Oakling slams faster.'),
]
EXTRA_COMBOS = [
    ('C13', 'kit_C13', 'Scatter Seeds, then Wispfall', 'The dives wake the seeds before their 3 s is up.'),
    ('C14', 'kit_C14', 'Pollen Gust over seeds', 'The wind rolls the seeds; the first three land as two each.'),
    ('C15', 'kit_C15', 'Sprout on Dew Wave and Rootspear', 'Each leaves one seed where it lands.'),
    ('C16', 'kit_C16', 'The relic wisp runs out', 'It leaves a seed at its ally\'s feet.'),
    ('C18', 'kit_C18', 'Scatter Seeds, then Oakling', 'The seeds grow into Oaklings.'),
    ('C19', 'kit_C19', 'Mending Sapling ends', 'It leaves a seed.'),
    ('C20', 'kit_C20', 'Turret called back early', 'Its buds wither: no seeds.'),
    ('C21', 'kit_C21', 'Sower seeds, then Oakling', 'Three seeds grow into Oaklings: four in all.'),
    ('C22', 'kit_C22', 'Sower seeds, then Rootspear', 'Each seed bursts as roots, then sprouts.'),
    ('C23', 'kit_C23', 'A 20 s fight with no skills', 'Pouch seeds and turret seeds keep the garden going.'),
    ('C24', 'kit_C24', 'Seeds wait 3 s, then Dew Wave', 'Watered seeds come up at once as watered Spitters; the others sprout at 3 s.'),
    ('C25', 'kit_C25', 'Pollen Gust, then Oakling', 'Three seeds land as six, and the six grow into Oaklings.'),
    ('C26', 'kit_C26', 'Puffcap among seeds', 'The seeds grow into Puffcaps.'),
    ('C28', 'kit_C28', 'Mending Sapling by seeds', 'It draws them in: 2 s and a blossom more each.'),
    ('C29', 'kit_C29', 'Swiftleaf over two seeds', 'The leaf picks them up: +11 each.'),
    ('C30', 'kit_C30', 'Heartbloom by seeds', 'The seeds open as flowers that heal allies near them.'),
    ('C31', 'kit_C31', 'Mossgrowth by a seed', 'It eats the seed: the Moss lasts 9 s.'),
    ('C32', 'kit_C32', 'Rootspear through seeds', 'Each seed bursts as roots: 12 and slowed, then sprouts.'),
    ('C33', 'kit_C33', 'Firefly Swarm by seeds', 'It eats a seed at a stop for one more stop.'),
    ('C34', 'kit_C34', 'Nectar Burst, then Heartbloom', 'Sweetened allies take 30% more from the bloom.'),
    ('C35', 'kit_C35', 'Rain Cloud over seeds', 'It waters the seeds as it follows its ally: they come up as watered Spitters.'),
    ('C36', 'kit_C36', 'Creeping Moss, then Heartbloom', 'The Moss spreads through the party; the bloom pays it out.'),
    ('C37', 'kit_C37', 'Sower seeds, then Wild Thicket', 'The thicket sprouts the turret\'s seeds and speeds up the Spitters.'),
    ('C38', 'kit_C38', 'Leaf Gale against shooters', 'Their shots turn into leaves that heal the party.'),
    ('C39', 'kit_C39', 'Drowsy Spores, hit awake, then Wild Thicket', 'Three hits wake the pack exposed, so the thicket hits 20% harder.'),
    ('C40', 'kit_C40', 'Leaf Gale over seeds', 'Seeds by the wall blow 3 u forward and sprout among the shooters.'),
    ('C41', 'kit_C41', 'Pollen Mark, then Pollen Gust', 'The gust carries the pollen: every foe it pushes is dusted.'),
    ('C42', 'kit_C42', 'Pollen Mark with the turret and Spitters', 'Their hits on dusted foes heal the most hurt ally 1 (3 a second at most).'),
    ('C43', 'kit_C43', 'Elder Oak with the Forest Spirit', 'Allies under the crown keep the 10% when she walks away.'),
    ('C44', 'kit_C44', 'Drowsy Spores, then Sapping Vine', 'The vine heals 8 a tick and does not wake the sleeper.'),
    ('C45', 'kit_C45', 'Creeping Moss under the Rain Cloud', 'It creeps every 1 s: all four covered in 3 s.'),
    ('C46', 'kit_C46', 'Nectar Burst on foes', 'Foes in it are slowed 30% for 2 s.'),
    ('C47', 'kit_C47', 'Pollen Gust through the Rain Cloud', 'It waters every plant on the rest of its path; carried seeds land as watered Spitters.'),
    ('C48', 'kit_C48', 'A dusted foe falls', 'It leaves a seed (one every 1.5 s at most).'),
    ('C49', 'kit_C49', 'Forest Spirit by a new Spitter', 'A plant that grows within 4 u of the spirit lives 2 s longer.'),
    ('C50', 'kit_C50', 'Wild Thicket under the Elder Oak', 'The toss lasts 1.5 s, not 1 s.'),
] if os.environ.get('SHOW15') == '1' else []


NEW = set()  # Kesh passed everything, kit 1.11, 17 Nov 06:02 UTC ("all good, mask pass")
POOL = os.environ.get('POOL', '26')
NEWCHIP = '<div class="meta"><span class="chip new">New, not passed</span></div>'


def has(c):
    return c and os.path.exists(f'{VID}/{c}.mp4')


def video(c, label):
    if not has(c):
        return '<div class="novid">Clip coming</div>'
    return f'<video src="vid/{c}.mp4" autoplay muted loop playsinline preload="metadata" aria-label="{html.escape(label)}"></video>'


def card(row):
    num, name, grp, cd, lines, nodes, clip = row
    lines = [t.lstrip('§') for t in lines if SHOW15 or not t.startswith('§')]
    meta = [f'<span class="chip">{html.escape(grp)}</span>']
    if num in NEW:
        meta.insert(0, '<span class="chip new">New, not passed</span>')
    if cd:
        meta.append(f'<span class="cd">{html.escape(cd)}</span>')
    body = ''.join(f'<p>{html.escape(t)}</p>' for t in lines)
    nd = f'<div class="nodes">{html.escape(nodes)}</div>' if nodes else ''
    return (f'<article class="skill" id="{num}">{video(clip, name)}<div class="txt">'
            f'<div class="head"><span class="num">{num}</span><h3>{html.escape(name)}</h3></div>'
            f'<div class="meta">{"".join(meta)}</div>{body}{nd}</div></article>')


def combo(row):
    num, clip, title, line = row
    return (f'<article class="combo" id="{num}">{video(clip, title)}<div class="txt">'
            f'<div class="head"><span class="num">{num}</span><h3>{html.escape(title)}</h3></div>{NEWCHIP if num in NEW else ""}<p>{html.escape(line)}</p></div></article>')


VERSION = os.environ.get('PAGE_VERSION', '')
SHOW15 = os.environ.get('SHOW15') == '1'
if not SHOW15:
    GARDEN = [g for g in GARDEN if not g[0].startswith('§')]
GARDEN = [(a.lstrip('§'), b) for a, b in GARDEN]
PASSIVE = [
    ('S54', 'Sower', 'Class passive', None,
     ['Free from the first room, no button.', 'A turret that runs its full 5 s bursts and shoots 3 seeds out on low arcs. Called back early, none.', 'In a fight a seed hops from her pouch every 8 s, 1 to 4 u away.'],
     None, 'kit_S54'),
]
CORE_HTML = (f'<section id="passive"><h2>Class passive</h2>{"".join(card(r) for r in PASSIVE)}</section>'
             f'<section id="core"><h2>Attack and dash</h2>{"".join(card(r) for r in CORE)}</section>') if SHOW15 else ''
page = f'''<title>Mosslight Skills</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;600&display=swap">
<style>
/* Layout: one column of skill rows, clip left and words right; stacks on phones. */
:root {{
  --bg: #F3F5EF; --card: #FFFFFF; --fg: #1F2A1E; --muted: #5D6A5B; --line: #DCE3D6;
  --moss: #3E8240; --moss-soft: #E3EFDC; --wood: #6B4A2B;
  --f-head: "Space Grotesk", "Segoe UI", system-ui, sans-serif;
  --f-body: Inter, "Segoe UI", system-ui, sans-serif;
}}
@media (prefers-color-scheme: dark) {{ :root:not([data-theme="light"]) {{
  --bg: #141A13; --card: #1C241B; --fg: #E6EDE2; --muted: #9BA996; --line: #2C382A;
  --moss: #8CC46E; --moss-soft: #263623; --wood: #C9A27A; color-scheme: dark; }} }}
:root[data-theme="dark"] {{
  --bg: #141A13; --card: #1C241B; --fg: #E6EDE2; --muted: #9BA996; --line: #2C382A;
  --moss: #8CC46E; --moss-soft: #263623; --wood: #C9A27A; color-scheme: dark; }}
body {{ background: var(--bg); color: var(--fg); font: 15px/1.5 var(--f-body); }}
.wrap {{ max-width: 1040px; margin: 0 auto; padding-block: 28px 64px;
  padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px));
  display: grid; gap: 40px; }}
header h1 {{ font: 600 30px/1.15 var(--f-head); margin: 0; text-wrap: balance; }}
header p {{ margin: 6px 0 0; color: var(--muted); }}
nav {{ display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }}
nav a {{ color: var(--fg); text-decoration: none; border: 1px solid var(--line); border-radius: 999px; padding: 4px 12px; font-size: 13px; background: var(--card); }}
nav a:hover, nav a:focus-visible {{ border-color: var(--moss); outline: none; }}
section {{ display: grid; gap: 14px; }}
section > h2 {{ font: 600 20px/1.2 var(--f-head); margin: 0; }}
.skill, .combo {{ display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr); gap: 18px;
  background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 12px; align-items: start; }}
video, .novid {{ width: 100%; aspect-ratio: 16 / 10; border-radius: 6px; background: #0E120D; display: block; max-width: 100%; }}
.novid {{ display: grid; place-items: center; color: #9BA996; font-size: 13px; }}
.txt {{ min-width: 0; display: grid; gap: 8px; padding-top: 4px; }}
.head {{ display: flex; align-items: baseline; gap: 10px; }}
.num {{ font: 600 12px/1 var(--f-body); letter-spacing: 0.04em; color: var(--moss); background: var(--moss-soft); border-radius: 4px; padding: 4px 6px; font-variant-numeric: tabular-nums; }}
h3 {{ font: 600 19px/1.2 var(--f-head); margin: 0; }}
.meta {{ display: flex; gap: 8px; align-items: center; font-size: 13px; color: var(--muted); }}
.chip {{ border: 1px solid var(--line); border-radius: 999px; padding: 1px 9px; }}
.chip.new {{ border-color: var(--wood); color: var(--wood); font-weight: 500; }}
.cd::before {{ content: "Cooldown "; }}
.txt p {{ margin: 0; max-width: 60ch; }}
.nodes {{ font-size: 13px; color: var(--muted); }}
.nodes::before {{ content: "Nodes: "; color: var(--wood); font-weight: 500; }}
.garden {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; }}
.garden div {{ background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 12px; }}
.garden b {{ display: block; font: 600 15px/1.3 var(--f-head); color: var(--moss); margin-bottom: 4px; }}
.combos {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 14px; }}
.combo {{ grid-template-columns: minmax(0, 1fr); gap: 10px; }}
@media (max-width: 720px) {{ .skill {{ grid-template-columns: minmax(0, 1fr); }} }}
@media (prefers-reduced-motion: reduce) {{ * {{ scroll-behavior: auto; }} }}
</style>
<div class="wrap">
<header>
  <h1>Mosslight skills</h1>
  <p>Passed by Kesh, 17 Nov · kit 1.11 · pool of {POOL} · flat floor clips.</p>
  <nav>{'<a href="#passive">Passive</a><a href="#core">Attack and dash</a>' if SHOW15 else ''}<a href="#heals">Heals</a><a href="#damage">Damage</a><a href="#garden">Garden</a><a href="#combos">Combos</a></nav>
</header>
{CORE_HTML}
<section id="heals"><h2>Heals</h2>{''.join(card(r) for r in HEALS)}</section>
<section id="damage"><h2>Damage</h2>{''.join(card(r) for r in DAMAGE)}</section>
<section id="garden"><h2>Garden rules</h2><div class="garden">{''.join(f'<div><b>{html.escape(a)}</b>{html.escape(b)}</div>' for a, b in GARDEN)}</div></section>
<section id="combos"><h2>Combos</h2><div class="combos">{''.join(combo(r) for r in COMBOS + EXTRA_COMBOS)}</div></section>
</div>
'''
open(OUT, 'w').write(page)
missing = [r[-1] for r in (PASSIVE + CORE if SHOW15 else []) + HEALS + DAMAGE if not has(r[-1])]
print('written', OUT, 'missing clips:', missing)
