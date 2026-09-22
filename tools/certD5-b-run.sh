#!/usr/bin/env bash
# certD5-b- runner: wait until no OTHER capture job / headless Chrome is on the machine, run one capture,
# and monitor for co-tenants during the run. Usage: certD5-b-run.sh <name> <w> <h>
cd "/c/Users/keshl/OneDrive/Desktop/游戏制作/echoes-three" || exit 3
NAME=$1; W=$2; H=$3
q() { powershell -NoProfile -Command "\$c=@(Get-CimInstance Win32_Process | Where-Object { (\$_.Name -eq 'node.exe') -and (\$_.CommandLine -match 'capture\.mjs') }).Count; \$h=@(Get-CimInstance Win32_Process | Where-Object { (\$_.Name -match 'chrome') -and (\$_.CommandLine -match 'puppeteer|--headless') }).Count; \$l=(Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average; Write-Output \"\$c \$h \$l\""; }
start=$(date +%s)
while :; do
  read C HC L < <(q)
  if [ "$C" = "0" ] && [ "$HC" = "0" ]; then break; fi
  if [ $(( $(date +%s) - start )) -gt 900 ]; then echo "WAITED 900 s, still busy ($C capture jobs, $HC headless chrome)"; break; fi
  sleep 5
done
echo "PRE $(date +%H:%M:%S) other capture jobs=$C headless chrome=$HC cpu=$L waited=$(( $(date +%s) - start ))s"
MON="captures/${NAME}.cotenant.txt"; : > "$MON"
( while :; do read C HC L < <(q); echo "$(date +%H:%M:%S) jobs=$C chrome=$HC cpu=$L" >> "$MON"; sleep 3; done ) &
MP=$!
node tools/cert-capture.mjs shot "$NAME" --url "http://127.0.0.1:5199/?seed=999" --settle 3000 --actions "tools/actions/${NAME}.json" --w "$W" --h "$H" --timeout 180000
RC=$?
kill $MP 2>/dev/null; wait $MP 2>/dev/null
echo "EXIT $RC"
# own run = 1 capture job + ~7-9 own chrome procs; anything above means a co-tenant
echo "MON max jobs=$(awk '{split($2,a,"=");if(a[2]>m)m=a[2]}END{print m+0}' "$MON") max chrome=$(awk '{split($3,a,"=");if(a[2]>m)m=a[2]}END{print m+0}' "$MON") samples=$(wc -l < "$MON")"
