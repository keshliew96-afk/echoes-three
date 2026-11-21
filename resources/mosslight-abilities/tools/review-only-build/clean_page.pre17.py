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
     ['A leaf flies to the most hurt ally within 3.2 u: heals 14, or 21 on an ally with Moss.', '§It flies back to her and heals one more ally on the way for half.'],
     'Bounce, Reach, Quicken', 'kit_S10'),
    ('S11', 'Seed Bolt', 'Quick heal', '3.5 s',
     ['A seed pod heals the first ally in its path for 22.', 'If it hits no ally, it drops a seed.'],
     'Reach, Pierce, Quicken', 'kit_S11'),
    ('S12', 'Dew Wave', 'Quick heal', '4 s',
     ['A lane of dew, 4 u by 1.6 u: heals up to 4 allies 12 each.', '§It clears their slows.', 'Waters what it touches.'],
     'Widen, Reach, Quicken', 'kit_S12'),
    ('S13', 'Heartbloom', 'Quick heal', '8 s',
     ['A bud on the most hurt ally heals 4 a second for 4 s.', 'Then it blooms: 12 to that ally and everyone within 3 u. Blooms at once below 40% health.', '§The bloom wakes seeds within 3 u.'],
     'Reach, Widen, Multiply, Bounce, Linger', 'kit_S13'),
    ('S14', 'Pollen Gust', 'Quick heal', '10 s',
     ['A wall of wind 3 u wide travels 7 u.', 'Allies: heal 10 and 30% faster for 3 s. Foes: pushed 2 u and slowed.', '§It rolls seeds along and drops them where it ends.'],
     'Reach, Widen, Linger', 'kit_S14'),
    ('S15', 'Mossgrowth', 'Lasting heal', '5 s',
     ['Moss on the most hurt ally: 5 a second for 6 s.', 'A full run drops a seed at their feet.'],
     'Reach, Linger, Quicken', 'kit_S15'),
    ('S16', 'Firefly Swarm', 'Lasting heal', '9 s',
     ['A swarm hops ally, foe, ally, foe: 5 a second for 3 s at each stop.'],
     'Bounce, Multiply, Linger, Breeze', 'kit_S16'),
    ('S17', 'Dewfall', 'Lasting heal', '11 s',
     ['A flower bed, radius 2.2 u: allies inside heal 7 a second for 5 s.', 'Waters what is inside.'],
     'Widen, Linger, Reach', 'kit_S17'),
    ('S18', 'Mending Sapling', 'Lasting heal', '12 s',
     ['A sapling grows for 8 s and sends a blossom heal of 8 every 2 s.', 'At the end it sheds its leaves: 8 to every ally within 4.5 u.', '§Then it leaves a seed.'],
     'Linger, Reach, Quicken', 'kit_S18'),
    ('S19', 'Glade Wisps', 'Passive', None,
     ['A wisp forms round her every 2.5 s, up to 3.', 'Each flies to a hurt ally within 4 u and heals 10.', '§One nobody needs in 10 s becomes a seed (at most one every 5 s).'],
     'Reach, Quicken, Multiply, Bounce, Linger, Breeze', 'kit_S19'),
    ('S50', 'Elder Oak', 'Lasting heal', '24 s',
     ['A great oak stands 8 s. Under its 3.5 u crown allies heal 6 a second and foes are slowed 25%.', 'At the end its leaves fly to each ally and heal 10.'],
     'Widen, Linger, Reach', 'kit_S50'),
]
DAMAGE = [
    ('S20', 'Scatter Seeds', 'Damage', '9 s',
     ['Three seeds land round her aim.', 'By allies they heal 11 on touch; by foes they sprout into Spitters (4 a shot, 5 s).'],
     'Multiply, Reach, Widen, Linger, Bounce', 'kit_S20'),
    ('S21', 'Rootspear', 'Damage', '6 s',
     ['After 0.4 s, wooden spears burst along a row 7 u by 1.4 u: 28 to each foe.', '+30% on a weakened foe.'],
     'Reach, Widen, Multiply', 'kit_S21'),
    ('S22', 'Wispfall', 'Damage', '12 s',
     ['For 5 s a wisp dives every 0.5 s on a nearby foe: 7 around where it lands.', '§Each dive wakes seeds within 0.9 u.'],
     'Multiply, Widen, Linger, Bounce', 'kit_S22'),
    ('S23', 'Rootsnare', 'Damage', '11 s',
     ['Roots in a 2.4 u circle: for 3 s foes take 5 a second, are slowed and dragged in.', 'Then they clench: 12, and held 0.8 s.'],
     'Widen, Reach, Linger', 'kit_S23'),
    ('S24', 'Puffcap', 'Damage', '8 s',
     ['A mushroom waits until a foe comes near, then bursts.', 'Spore cloud 2.2 u for 4 s: 5 a second, and foes take 20% more damage.'],
     'Multiply, Widen, Reach, Linger', 'kit_S24'),
    ('S25', 'Sapping Vine', 'Damage', '8 s',
     ['A thorned vine holds one foe for 4 s: 8 a second.', 'Each tick sends 4 healing along a root to the most hurt ally.'],
     'Linger, Reach, Quicken', 'kit_S25'),
    ('S51', 'Oakling', 'Damage', '14 s',
     ['A small tree-folk guards the most hurt ally for 10 s.', 'Every 1.5 s it slams a foe near them: 9, pushed 1.5 u, slowed.', '§Seeds within 3 u grow into Oaklings too.'],
     'Linger, Multiply, Widen, Reach, Breeze', 'kit_S51'),
    ('S53', 'Bramble Hedge', 'Damage', '14 s',
     ['A hedge 4 u wide grows across her aim, up to 4 u away, and stands 5 s.', 'Foes cannot walk through it and take 6 a second while touching it. A boss tramples it.', 'Watered: 3 s longer and 9 a second.'],
     'Widen, Linger, Reach, Multiply', 'kit_S53'),
]
GARDEN = [
    ('Water grows', 'Dew Wave and Dewfall water plants and Moss: a seed sprouts, a helper lasts 3 s longer and works faster.'),
    ('Roots wake', 'Rootspear and Rootsnare sprout seeds. Rootspear bursts a Puffcap in its row.'),
    ('Wind carries', 'Pollen Gust bursts a Puffcap and carries its spores to the foes it pushes.'),
    ('§Light wakes', 'Heartbloom\'s bloom and Wispfall\'s dives sprout seeds.'),
    ('§More seeds', 'An unused Glade wisp, a fading relic wisp, a Mending Sapling at its end and the Sprout node each leave a seed.'),
    ('§Sprout node', 'On any skill: it leaves one seed where it lands.'),
]
COMBOS = [
    ('C1', 'kit_C1', 'Rootsnare, then Rootspear', 'The pack is gathered and slowed, so each spear hits for 36.'),
    ('C2', 'kit_C2', 'Scatter Seeds, then Rootspear', 'The spears wake every seed into a Spitter at once.'),
    ('C3', 'kit_S30', 'Mossgrowth and the relic wisp', 'Moss overheal fills the wisp; it heals the Tank when he is hit.'),
    ('C4', 'kit_C4', 'Heartbloom below 40%', 'The bud blooms at once when its ally is in danger.'),
    ('C5', 'kit_CA', 'Scatter Seeds, then Dew Wave', 'Watered seeds sprout into Spitters at once.'),
    ('C6', 'kit_CB', 'Mending Sapling in Dewfall', 'Watered, the sapling heals faster and lives longer.'),
    ('C7', 'kit_CC', 'Puffcap, then Rootspear', 'The spears burst the mushroom from afar.'),
    ('C8', 'kit_CD', 'Puffcap, then Pollen Gust', 'The wind carries the spores; pushed foes take 20% more.'),
    ('C9', 'kit_CE', 'Rootsnare, Puffcap, Rootspear', 'Slowed and exposed, each foe takes 44.'),
    ('C10', 'kit_CF', 'Elder Oak over the garden', 'Seeds sprout, nothing withers, foes are slowed.'),
    ('C11', 'kit_CG', 'Oakling, then Dew Wave', 'Watered, the Oakling slams faster.'),
]
EXTRA_COMBOS = [
    ('C12', 'kit_C12', 'Heartbloom by the seeds', 'The bloom wakes every seed within 3 u.'),
    ('C13', 'kit_C13', 'Scatter Seeds, then Wispfall', 'The dives wake the seeds before their 1 s is up.'),
    ('C14', 'kit_C14', 'Pollen Gust over seeds', 'The wind rolls the seeds and drops them where it ends.'),
    ('C15', 'kit_C15', 'Sprout on Dew Wave and Rootspear', 'Each leaves one seed where it lands.'),
    ('C16', 'kit_C16', 'The relic wisp runs out', 'It leaves a seed at its ally\'s feet.'),
    ('C17', 'kit_C17', 'A boss meets Bramble Hedge', 'It tramples the hedge and takes one tick of 6.'),
    ('C18', 'kit_C18', 'Scatter Seeds, then Oakling', 'The seeds grow into Oaklings.'),
    ('C19', 'kit_C19', 'Mending Sapling ends', 'It leaves a seed.'),
    ('C20', 'kit_C20', 'Turret called back early', 'Its buds wither: no seeds.'),
    ('C21', 'kit_C21', 'Sower seeds, then Oakling', 'Three seeds grow into Oaklings: four in all.'),
    ('C22', 'kit_C22', 'Sower seeds, then Rootspear', 'The spears wake the seeds into Spitters.'),
    ('C23', 'kit_C23', 'A 20 s fight with no skills', 'Pouch seeds and turret seeds keep the garden going.'),
] if os.environ.get('SHOW15') == '1' else []


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
            f'<div class="head"><span class="num">{num}</span><h3>{html.escape(title)}</h3></div><p>{html.escape(line)}</p></div></article>')


VERSION = os.environ.get('PAGE_VERSION', '')
SHOW15 = os.environ.get('SHOW15') == '1'
if not SHOW15:
    DAMAGE = [r for r in DAMAGE if r[0] != 'S53']
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
  <p>Review build clips · kit 1.6. Mark with the S or C number.</p>
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
