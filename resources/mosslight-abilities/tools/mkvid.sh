#!/bin/bash
# mkvid.sh <framesDir> <fps> <name>: page mp4 + project-folder gif
S=/tmp/claude-0/-home-user/32a8741f-483c-523d-bcd7-a3da532d6a06/scratchpad
d=$1; fps=$2; n=$3
ffmpeg -nostdin -loglevel error -y -framerate $fps -i "$d/%03d.jpg" -vf "scale=960:-2" -c:v libx264 -pix_fmt yuv420p -crf 23 -preset slow -movflags +faststart -an "$S/page/vid/$n.mp4"
ffmpeg -nostdin -loglevel error -y -framerate $fps -i "$d/%03d.jpg" -vf "scale=640:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle" -loop 0 "/mnt/project-files/mosslight-abilities/gif/$n.gif"
