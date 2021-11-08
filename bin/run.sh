#!/bin/bash

cd "$(dirname "$0")"

set -e
set -x

git pull -q

{
	node 1_download.js &&
	node 2_deduplicate.js &&
	node 3_parse.js &&
	node 4_check.js
} || {
	error=$?

	if [ $error -eq 42 ]; then
		echo "no new data"
		exit 0
	fi

	echo "ERROR happend $error"
	exit $error
}

node 5_index_data.js

uploadResults=$({ bash 6_upload.sh | grep "Copying file" | grep -v "index"; }) || true

free -h | head -n2

if [[ "$uploadResults" == "" ]]; then
	echo "no new files, thx, bye"
	exit 0
fi

echo "$uploadResults"
exit 42
