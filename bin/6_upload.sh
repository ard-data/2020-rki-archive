#!/bin/bash

set -e
set -x
cd "$(dirname "$0")"

echo "upload"

gsutil rsync -c -r -x '(?!.*\.(xz|txt|html))' ../data/ gs://brdata-public-data/rki-corona-archiv/ 2>&1
