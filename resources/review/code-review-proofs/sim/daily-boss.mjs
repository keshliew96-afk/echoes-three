const R='/home/claude/echoes-three/src/';
const {dailySeed,dailyLevelSeed,dailyKey}=await import(R+'data/daily.js');
const {bossFor}=await import(R+'data/levels.js');
const {runFacts}=await import(R+'data/unlocks.js');
let days=0, wrong=0, ex=null;
for(let d=0; d<365; d++){
  const key=dailyKey(Date.UTC(2026,0,1)+d*86400000); const s1=dailySeed(key);
  const seeds=[s1]; for(let i=2;i<=5;i++) seeds.push(dailyLevelSeed(s1,i));
  // campaign won: summary.seed = last frame seed (level 5)
  const met=[1,2,3,4,5].map((lv,i)=>bossFor(lv,seeds[i]).kind);
  const summary={result:'victory',seed:seeds[4],campaign:{daily:{key},levels:[1,2,3,4,5].map((lv,i)=>({level:lv,index:i+1,cleared:true})),complete:true}};
  const credited=runFacts(summary,{}).bosses;
  days++; if(credited.join()!==met.join()){wrong++; if(!ex) ex={key,met,credited};}
}
console.log(`days ${days}, Daily wins credited with a boss they did not fight: ${wrong}`); console.log(ex);
