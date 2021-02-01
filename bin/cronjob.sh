#!/bin/bash

source ~/.profile

cd "$(dirname "$0")"

set -e
set -x

git pull

{
	node 1_download.js &&
	bash 2_deduplicate.sh &&
	node 3_parse.js &&
	node 4_check.js
} || {
	error=$?
	echo "ERROR happend $error"
	exit $error
}

node 5_index_data.js

uploadResults=$( { bash 6_upload.sh; } )

if ( echo "$uploadResults" | grep "Copying file" ); then
	exit 42
fi

exit 0
