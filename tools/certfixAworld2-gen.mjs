#!/usr/bin/env node
// A-world round-2 fix generator: clones the technician's certA2 frame
// conditions into certfixAworld2-prefixed action files so this builder's
// captures reproduce the certified frames exactly.
import { readFileSync, writeFileSync } from 'fs';
const map = {
  'certfixAworld2-camp': 'certA2-camp',
  'certfixAworld2-combat': 'certA2-combat',
  'certfixAworld2-shop': 'certA2-shop',
  'certfixAworld2-boss': 'certA2-boss',
  'certfixAworld2-combatseq': 'certA2-combatseq',
};
for (const [out, src] of Object.entries(map)) {
  const j = readFileSync(`tools/actions/${src}.json`, 'utf8');
  writeFileSync(`tools/actions/${out}.json`, j);
  console.log('wrote tools/actions/' + out + '.json  <-  ' + src);
}
