__tp(0,0);
__pa(1,3.0,0); __pa(2,-3.0,0); __pa(3,0,3.0);
const t0=__tick(); const a=__party();
await __sleep(2000);
const b=__party();
return {t0,t1:__tick(),before:a,after:b,enemies:__echoes.state().enemies.length};
