#!/bin/bash

source ~/.profile

set -e
set -x
cd "$(dirname "$0")"

git pull

signalNoUpdate=0
signalUpdate=42

{
	node 1_download.js &&
	sh 2_deduplicate.sh &&
	node 3_parse.js
} || {
	error=$?
	signalNoUpdate=$error
	signalUpdate=$error
	echo "ERROR happend $error"
}

sleep 3

git add ../data/
git commit -m "automatic data update" || exit $signalNoUpdate
git push

exit $signalUpdate
