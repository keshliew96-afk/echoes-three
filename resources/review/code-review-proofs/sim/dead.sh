cd /home/claude/echoes-three
for f in src/sim/*.js src/sim/bosses/*.js src/sim/enemies/*.js src/data/*.js src/campaign/*.js; do
  for name in $(grep -oE "^export (const|function|let) [A-Za-z_0-9]+" $f | awk '{print $3}'); do
    # count uses outside the file in src/ and server/ (tools excluded)
    n=$(grep -rlw --include=*.js --include=*.mjs "$name" src server 2>/dev/null | grep -v "^$f$" | wc -l)
    if [ "$n" = "0" ]; then
      inner=$(grep -cw "$name" $f)
      t=$(grep -rlw "$name" tools 2>/dev/null | wc -l)
      echo "$f $name (in-file refs $inner, tools $t)"
    fi
  done
done
