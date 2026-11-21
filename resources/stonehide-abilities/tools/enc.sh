# enc.sh NAME SRC_DIR [maxframes]
n=$1; d=$2; m=${3:-9999}
ffmpeg -loglevel error -y -framerate 15 -start_number 3 -i $d/%03d.jpg -frames:v $m -vf scale=960:-2 -c:v libx264 -pix_fmt yuv420p -crf 23 -preset slow -movflags +faststart -an /tmp/claude-0/sh/vid12/$n.mp4 && echo "$n $(du -k /tmp/claude-0/sh/vid12/$n.mp4 | cut -f1)k"
