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

node 4_index_data.js

gsutil rsync -r -x '(?!.*\.(xz|html))' ../data/ gs://brdata-public-data/rki-corona-archiv/

exit $signalUpdate
