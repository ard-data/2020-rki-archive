#!/bin/bash

source ~/.profile

signalNoUpdate=0
signalUpdate=42

cd "$(dirname "$0")"

set -e
set -x

git pull

{
	node 1_download.js &&
	bash 2_deduplicate.sh &&
	node 3_parse.js
} || {
	error=$?
	signalNoUpdate=$error
	signalUpdate=$error
	echo "ERROR happend $error"
}

node 4_index_data.js

uploadResults=$( { bash 6_upload.sh | grep "Copying file"; } )

if [ -z "$uploadResults" ]; then
	exit $signalNoUpdate
fi

echo "$uploadResults"
exit $signalUpdate
