#!/bin/bash
# sheet.sh <out> <view> <clip...> : one strip per clip, stacked
out=$1; v=$2; shift; shift; list=$(IFS=,; echo "$*")
node strip.js $list $v 10 > /dev/null 2>&1
args=""; for c in "$@"; do args="$args -i shots/$c.png"; done
ffmpeg -loglevel error -y $args -filter_complex "vstack=inputs=$#,scale=2000:-1" shots/$out.png
