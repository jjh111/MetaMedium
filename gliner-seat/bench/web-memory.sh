#!/bin/sh
# web-memory.sh — the browser tab's memory, read from outside the page.
#
# A page cannot see its own wasm heap or its GPU buffers, and the pane has no
# measureUserAgentSpecificMemory. So the renderer that holds the tab and the
# browser's GPU process are read with macOS `footprint` (physical footprint,
# the number Activity Monitor calls Memory), before, during and after a run.
#
#   sh bench/web-memory.sh <renderer pid> <gpu pid> <seconds> > results/<name>.tsv
#
# One line per second: time, renderer footprint, renderer peak, GPU footprint (MB).
R=$1; G=$2; N=${3:-60}
mb() { footprint -p "$1" 2>/dev/null | awk -v k="$2" '$1==k":" { v=$2; u=$3; if (u=="GB") v*=1024; if (u=="KB") v/=1024; printf "%d", v }'; }
printf "t\trendererMB\trendererPeakMB\tgpuMB\n"
i=0
while [ $i -lt "$N" ]; do
  printf "%s\t%s\t%s\t%s\n" "$i" "$(mb "$R" phys_footprint)" "$(mb "$R" phys_footprint_peak)" "$(mb "$G" phys_footprint)"
  i=$((i + 1))
  sleep 1
done
