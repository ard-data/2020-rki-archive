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
	bash 2_deduplicate.sh &&
	node 3_parse.js
} || {
	error=$?
	signalNoUpdate=$error
	signalUpdate=$error
	echo "ERROR happend $error"
}

node 4_index_data.js

uploadResults=$( { bash 6_upload.sh 2>&1 | grep "Copying file"; } 2>&1 )
if [ $uploadResults ]; then
	echo $uploadResults
	exit $signalUpdate
fi

exit $signalNoUpdate
