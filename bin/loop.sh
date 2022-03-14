#!/bin/bash

cd "$(dirname "$0")"

while true; do
	echo "start run at $(date '+%Y-%m-%d %H:%M:%S')"
	SECONDS=0

	if [ -f ~/projects/notificato/notificato.js ]; then
		node ~/projects/notificato/notificato.js "Corona Scraper" ./run.sh || true
	else
		./run.sh || true
	fi

	printf "   took %02d:%02d:%02d\n" "$((SECONDS / 3600 % 24))" "$((SECONDS / 60))" "$((SECONDS % 60))"

	sleep 600
done
