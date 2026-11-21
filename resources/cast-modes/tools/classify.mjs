import { SKILLS } from '/home/user/echoes-three/src/sim/skills.js';
import { CLASS_SKILLS } from '/home/user/echoes-three/src/data/classes.js';
import fs from 'fs';
const heroes = [
 ['healer','Mosslight','Healer mouse'],['tank','Stonehide','Tank badger'],['swordsman','Ashfang','Fox swordsman'],
 ['archer','Windbriar','Rabbit archer'],['tidecaller','Tide Caller','Otter'],['bellwright','Bellwright','Beetle'],['duskwing','Duskwing','Bat']];
const pools = { healer: Object.keys(SKILLS).filter(id => !SKILLS[id].cls), ...CLASS_SKILLS };
function kind(d){
  if(d.shape==='aura') return 'passive';
  if(d.shape==='direct') return 'allies';
  if(d.shape==='projectile') return d.vault?'shot_vault':(d.count>1?'fan':'line');
  if(d.shape==='melee_arc') return d.dash?'dash_cone':'cone';
  if(d.shape==='nova') return d.dash?'dash_ring':(d.drawArea?'pull_ring':(d.peal?'bells':'self_ring'));
  if(d.shape==='ground_aoe') return d.atOrigin?'hop_puddle':(d.bell?'bell':'ground');
  return '?';
}
const out=[]; const counts={};
for(const [cls,name,animal] of heroes){
  const rows = pools[cls].map(id=>{const d=SKILLS[id]; const k=kind(d); counts[k]=(counts[k]||0)+1;
    return {id, name:d.name, ab:d.abbrev, k, arch:d.archetype, heal:d.archetype==='heal', range:d.range??null, area:d.area??null, count:d.count??null, cd:d.cd??null,
      pierce:d.pierce??null, dash:d.dash?d.dash.dist:null, vault:d.vault?d.vault.dist:null, pick:d.pick??null, drawArea:d.drawArea??null, delay:d.delaySec??null, campaign: !d.cls && false};});
  out.push({cls,name,animal,skills:rows});
}
fs.writeFileSync('/tmp/claude-0/-home-user/f34e0118-a5db-5e30-9199-a860704bfc68/scratchpad/skills.json', JSON.stringify(out));
console.log(counts, out.reduce((a,h)=>a+h.skills.length,0));
for(const h of out) console.log(h.name, h.skills.map(s=>s.ab+':'+s.k).join(' '));
