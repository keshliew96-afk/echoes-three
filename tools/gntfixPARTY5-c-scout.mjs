import { launch, open, E, sleep, writeJson, shot, waitFor } from './gntfixPARTY5-lib.mjs';
const b = await launch();
try {
  const { page, errors } = await open(b, (process.env.GNTC_BASE || 'http://127.0.0.1:5199/') + '?menu=0&seed=7');
  const out = await E(page, () => {
    const X = window.__echoes;
    const ks = Object.keys(X);
    const party = X.party ? Object.keys(X.party) : null;
    let st = null; try { st = X.party.state(); } catch (e) { st = String(e); }
    let pools = null; try { pools = X.cmd('partyPools'); } catch (e) { pools = String(e); }
    let v1 = null; try { v1 = X.cmd('partyView', 1); } catch (e) { v1 = String(e); }
    return { version: X.version, ks, party, st: JSON.stringify(st).slice(0, 3000), pools, v1: JSON.stringify(v1).slice(0, 2500) };
  });
  writeJson('gntfixPARTY5-scout', { out, errors });
  console.log(JSON.stringify(out, null, 1).slice(0, 9000));
  console.log('errors', errors);
} finally { await b.close(); }
