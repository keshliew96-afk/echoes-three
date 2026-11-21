const R='/home/claude/echoes-three/src/';
const L=await import(R+'data/levels.js');
const {ENEMY_KINDS, ENEMY_STATS, ARCHETYPES}=await import(R+'sim/enemies.js');
const {BOSS_KINDS, BOSS_KITS}=await import(R+'sim/boss.js');
const {LAYOUTS, LAYOUT_IDS}=await import(R+'data/layouts.js');
const {HAZARD_TYPES}=await import(R+'sim/hazards.js');
const {INTERACT_TYPES}=await import(R+'sim/interactables.js');
const C=await import(R+'data/classes.js');
const {SKILLS, HEALER_SKILL_IDS}=await import(R+'sim/skills.js');
const {NODES}=await import(R+'sim/nodes.js');
const U=await import(R+'data/unlocks.js');
const {RELICS,CURSES}=await import(R+'sim/relics.js');
const J=await import(R+'data/journal.js');
const CH=await import(R+'sim/champions.js');
const V=await import(R+'data/vows.js');
const RU=await import(R+'data/rush.js');
const EN=await import(R+'data/endless.js');
const CA=await import(R+'data/campaign.js');
const OB=await import(R+'sim/objectives.js');
const err=[];const e=(m)=>err.push(m);
console.log('ENEMY_KINDS',[...ENEMY_KINDS].length,'ENEMY_STATS keys',Object.keys(ENEMY_STATS).length);
const {enemyStats}=await import(R+"sim/enemies.js"); for(const k of ENEMY_KINDS){const s=enemyStats(k); if(!s||!(s.hp>0)) e("bad stats "+k+" "+JSON.stringify(s));}
for(const k of Object.keys(ENEMY_STATS)) if(!ENEMY_KINDS.has(k)) e('ENEMY_STATS has unregistered '+k);
for(const [a,lv] of Object.entries(L.LEVELS)){
  const cl=L.campaignLevel(lv);
  for(const k of Object.keys(cl.roster)) { if(!ENEMY_KINDS.has(k)) e(`act ${a} roster ${k}`); if(!(k in cl.introduce)) e(`act ${a} roster ${k} no introduce`);}
  for(const k of Object.keys(cl.introduce)) if(!(k in cl.roster)) e(`act ${a} introduce ${k} not in roster`);
  for(const id of [...lv.layouts,...lv.legacyLayouts,lv.bossLayout]) { if(!LAYOUTS[id]) e(`act ${a} layout ${id} missing`); else if(LAYOUTS[id].act!=lv.act) e(`act ${a} layout ${id} is act ${LAYOUTS[id].act}`);}
  for(const b of lv.bosses){ if(!BOSS_KINDS.includes(b.kind)) e(`act ${a} boss ${b.kind}`);
    for(const ad of [...b.adds, ...(b.addsByPhase||[]).flat()]) if(!ENEMY_KINDS.has(ad[0])) e(`act ${a} boss ${b.kind} add ${ad[0]}`);
    if(b.layout && !LAYOUTS[b.layout]) e(`boss layout ${b.layout}`);
    if(b.addsByPhase && b.addsByPhase.length!==3) e(`boss ${b.kind} addsByPhase len ${b.addsByPhase.length}`); }
  for(const h of lv.hazards) if(!HAZARD_TYPES[h]) e(`act ${a} hazard ${h}`);
  for(const h of lv.interactables) if(!INTERACT_TYPES[h]) e(`act ${a} interactable ${h}`);
  if(lv.boss!==lv.bosses[0].kind) e(`act ${a} boss!=bosses[0]`);
  // layout hazard types allowed in act?
  for(const id of [...lv.layouts, lv.bossLayout, ...lv.bosses.map(b=>b.layout).filter(Boolean)]){ const Ly=LAYOUTS[id]; if(!Ly) continue;
    for(const h of Ly.hazards||[]) { if(!HAZARD_TYPES[h.type]) e(`layout ${id} hazard ${h.type} unknown`); else if(!lv.hazards.includes(h.type)) e(`layout ${id} (act ${a}) hazard ${h.type} not in act list`);}
    for(const h of Ly.interactables||[]) { if(!INTERACT_TYPES[h.type]) e(`layout ${id} interactable ${h.type} unknown`); else if(!lv.interactables.includes(h.type)) e(`layout ${id} (act ${a}) inter ${h.type} not in act list`);}
  }
}
for(const k of BOSS_KINDS) if(!Object.values(L.LEVELS).some(lv=>lv.bosses.some(b=>b.kind===k))) e('boss kind unused in levels '+k);
for(const k of L.CAMPAIGN_ONLY_ENEMIES) if(!ENEMY_KINDS.has(k)) e('campaign only '+k);
// layouts ids
for(const id of LAYOUT_IDS) if(!LAYOUTS[id]) e('LAYOUT_IDS '+id); for(const id of Object.keys(LAYOUTS)) if(!LAYOUT_IDS.includes(+id)) e('LAYOUTS not in IDS '+id);
// skills / nodes
for(const [c,ids] of Object.entries(C.CLASS_SKILLS)) for(const s of ids){ if(!SKILLS[s]) e(`class skill ${c}:${s}`); else if(SKILLS[s].cls!==c) e(`skill ${s} cls ${SKILLS[s].cls}!=${c}`);}
for(const s of C.CAMPAIGN_ONLY_SKILLS) if(!SKILLS[s]) e('camp-only skill '+s);
for(const s of C.CAMPAIGN_ONLY_NODES) if(!NODES[s]) e('camp-only node '+s);
for(const [c,ids] of Object.entries(C.CLASS_NODES)) for(const s of ids){ if(!NODES[s]) e(`class node ${c}:${s}`); else if(NODES[s].cls!==c) e(`node ${s} cls ${NODES[s].cls}!=${c}`);}
for(const [c,ids] of Object.entries(C.SHARED_ACCESS)) for(const s of ids){ if(!NODES[s]) e(`shared ${c}:${s}`); else if(NODES[s].cls) e(`shared ${s} has cls`);}
for(const [c,ids] of Object.entries(C.CLASS_BASE_KIT)) for(const s of ids) if(!SKILLS[s]) e('basekit '+s);
for(const [c,p] of Object.entries(C.AI_PRIORITY)) for(const s of (Array.isArray(p)?p:Object.values(p).flat())) if(typeof s==='string' && !SKILLS[s] && !NODES[s]) e(`AI_PRIORITY ${c}:${s}`);
for(const s of C.STRESS_ORDER) if(!NODES[s]) e('stress '+s);
for(const s of Object.values(C.STRESS_LOADOUT).flat()) if(typeof s==='string'&&!SKILLS[s]&&!NODES[s]) e('stress loadout '+s);
// unlocks
for(const u of Object.values(U.UNLOCKS)){
  if(u.kind==='kit'){ const raw=u.skills; }
  const r=u.req; if(!r) continue;
  if(r.boss && !BOSS_KINDS.includes(r.boss)) e(`unlock ${u.id} boss ${r.boss}`);
  if(r.relic && !RELICS[r.relic]) e(`unlock ${u.id} relic`);
  if(r.unlock && !U.UNLOCKS[r.unlock]) e(`unlock ${u.id} req unlock ${r.unlock}`);
  if(r.feat && !U.FEATS[r.feat]) e(`unlock ${u.id} feat ${r.feat}`);
  if(r.deed && !U.DEEDS[r.deed]) e(`unlock ${u.id} deed ${r.deed}`);
  if(r.level && !L.LEVELS[r.level]) e(`unlock ${u.id} level ${r.level}`);
  if(u.kind==='vow' && !V.VOW_RANKS[u.curse]) e('vow '+u.curse);
  if(u.cls && !U.LOADOUT_CLASSES.includes(u.cls)) e(`unlock ${u.id} cls ${u.cls}`);
}
// kit skills dropped by filter
import fs from 'fs';
const src=fs.readFileSync(R+'data/unlocks.js','utf8');
for(const m of src.matchAll(/\['(kit_[a-z]+)', '([a-z]+)', '[^']+', \[([^\]]+)\]/g)){ const sk=m[3].match(/'([a-z_]+)'/g).map(s=>s.slice(1,-1)); for(const s of sk){ if(!SKILLS[s]) e(`kit ${m[1]} skill ${s} missing`); else if((SKILLS[s].cls??'healer')!==m[2]) e(`kit ${m[1]} skill ${s} cls ${SKILLS[s].cls} != ${m[2]}`);} }
for(const k of [...U.WATER_BOSSES,...U.STONE_BOSSES,...U.HEART_BOSSES]) if(!BOSS_KINDS.includes(k)) e('feat boss '+k);
// vows
for(const id of V.VOW_IDS) if(!CURSES[id] && !V.VOW_RANKS[id].name) e('vow no curse/name '+id);
for(const [id,row] of Object.entries(V.VOW_RANKS)) if(row.key){ const c=CURSES[id]; if(!c||!c.diff||c.diff[row.key]===undefined) e(`vow ${id} key ${row.key} missing on curse`); else if(Math.abs(c.diff[row.key]-row.ranks[0])>1e-9) e(`vow ${id} rank1 ${row.ranks[0]} != curse ${c.diff[row.key]}`); }
// journal
for(const b of J.BESTIARY){ if(b.boss){ if(!BOSS_KINDS.includes(b.id)) e('journal boss '+b.id);} else if(!ENEMY_KINDS.has(b.id) && !CH.CHAMPION_IDS.includes(b.id)) e('journal enemy '+b.id);}
for(const k of ENEMY_KINDS) if(!J.BESTIARY_IDS.includes(k) && !J.JOURNAL_ALIAS[k] && !CH.CHAMPION_IDS.includes(k)) e('enemy kind w/o journal: '+k);
for(const k of BOSS_KINDS) if(!J.BESTIARY_IDS.includes(k)) e('boss w/o journal '+k);
for(const id of CH.CHAMPION_IDS) if(!ARCHETYPES[id]) e('champion no archetype '+id);
// quarry
for(const k of Object.values(OB.QUARRY)) if(!ENEMY_KINDS.has(k)) e('quarry '+k);
// rush/endless lines
for(let s=0;s<200;s++){ for(const open of [null,[1,2,3,4,5]]){ const line=RU.rushLine(s,open); if(line.length!==10) e('rush len'); for(const f of line) if(!BOSS_KINDS.includes(f.kind)) e('rush kind'); for(let i=0;i<5;i++) if(line[i].kind===line[i+5].kind) e(`rush seed ${s} fight ${i+1} same boss both laps ${line[i].kind} open=${!!open}`);} }
console.log('campaign levels',CA.CAMPAIGN_LEVELS, CA.roadLevels('kiln'), 'final',CA.FINAL_LEVEL, 'ACT_IDS',L.ACT_IDS,'ENDLESS',L.ENDLESS_ACTS);
for(const lvl of L.ACT_IDS) console.log('next',lvl, CA.nextLevel(lvl), CA.nextLevel(lvl,'kiln'), CA.nextLevels(lvl), 'grant', JSON.stringify(CA.grantFor(lvl)).slice(0,80));
console.log(U.BOSSES.map(b=>b.kind).join(','));
console.log(err.length? err.join('\n') : 'NO ERRORS');
