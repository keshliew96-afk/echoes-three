#!/bin/bash
cd /tmp/claude-0/af
mkdir -p mr
export NODE_PATH=/home/user/echoes-three/node_modules
node tools/rec2.cjs mr motion26.json S11,N_basic_c,N_ring_c,N_waltz_s,SP8,S15_s,S31,SP2,S27_c,S38,N_ink_s,SP9,N_cascade_s,N_ink_c,SP7,S20_s,S25_s,S39_c,N_riptide_c,S37,S14_s,S19_c,S26_c,C7,N_riptide,S24_s,S34_c,S14,S26,S16,S27,C11,S33 > mr/log0.txt 2>&1 &
node tools/rec2.cjs mr motion26.json E,E_c,N_ring_s,N_split_c,N_ring,SP4,S19_s,S31_c,N_cascade_c,S37_c,S15_c,SP1,N_basic_s,SP6,SP5,N_basic,S25,S39_s,N_riptide_s,S33_c,S7,N_cascade,S26_s,S29_c,C9,S16_c,S34_s,S36_c,S29,S21_c,S34,S35,S13 > mr/log1.txt 2>&1 &
node tools/rec2.cjs mr motion26.json E_s,S32,N_throw,N_split_s,N_waltz_c,N_split,S18,S31_s,B2,N_waltz,S15,S37_s,C6,SP3,S25_c,SP10,S20_c,S27_s,N_ink,S33_s,C2,S14_c,S20,S29_s,C8,S16_s,S24_c,S36_s,S19,S39,S24,S36,S21_s,S21 > mr/log2.txt 2>&1 &
wait
echo done
