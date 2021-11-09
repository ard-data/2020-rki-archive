#!/bin/bash

cd "$(dirname "$0")"

while true; do
	echo "start run at $(date '+%Y-%m-%d %H:%M:%S')"
	if [ -f "/home/michaelkreil/projects/notificato/notificato.sh" ]; then
		/home/michaelkreil/projects/notificato/notificato.sh "Corona Scraper" ./run.sh || true
	else
		./run.sh || true
	fi
	echo "finished run at $(date '+%Y-%m-%d %H:%M:%S')"
	sleep 600
done
