#!/bin/bash

cd "$(dirname "$0")"

while true
do
	/home/michaelkreil/projects/notificato/notificato.sh "Corona Scraper" ./run.sh || true
	sleep 600
done
