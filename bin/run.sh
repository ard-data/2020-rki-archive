#!/bin/bash

cd "$(dirname "$0")"

set -e # exit on error
#set -x # print commands

git pull -q

{
	node 1_download.js \
		&& node 2_deduplicate.js \
		&& node 3_parse.js \
		&& node 4_check.js
} || {
	error=$?

	if [ $error -eq 42 ]; then
		echo "no new data"
		node 7_recompress.js || exit 0
	else
		echo "ERROR happend $error"
		exit $error
	fi
}

node 5_index_data.js

uploadResults=$({ bash 6_upload.sh | grep "Copying file" | grep -v "index"; }) || true

if [[ "$uploadResults" == "" ]]; then
	echo "no new files, thx, bye"
	exit 0
fi

echo "$uploadResults"
exit 42
