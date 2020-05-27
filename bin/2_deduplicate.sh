#!/bin/bash
# set -e

cd "$(dirname "$0")"
cd "../data/0_archived/"

echo "deduplicate"

md5sum *.bz2 | sort | awk 'BEGIN{lasthash = ""} $1 == lasthash {print $2} {lasthash = $1}' | xargs rm 2> /dev/null || true
