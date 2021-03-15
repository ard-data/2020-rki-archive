#!/bin/bash

cd "$(dirname "$0")"

while true
do
	echo "start run at $(date '+%Y-%m-%d %H:%M:%S')"
	/home/michaelkreil/projects/notificato/notificato.sh "Corona Scraper" ./run.sh || true
	echo "finished run at $(date '+%Y-%m-%d %H:%M:%S')"
	sleep 1800
done
