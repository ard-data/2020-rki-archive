#!/bin/bash

cd "$(dirname "$0")"

while true; do
	echo "start run at $(date '+%Y-%m-%d %H:%M:%S')"
	SECONDS=0

	if [ -f "/home/michaelkreil/projects/notificato/notificato.sh" ]; then
		/home/michaelkreil/projects/notificato/notificato.sh "Corona Scraper" ./run.sh || true
	else
		./run.sh || true
	fi

	printf "   took %02d:%02d:%02d\n" "$((SECONDS / 3600 % 24))" "$((SECONDS / 60))" "$((SECONDS % 60))"

	sleep 600
done
