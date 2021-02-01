#!/bin/bash

set -e
cd "$(dirname "$0")"

echo "upload"

gsutil rsync -c -C -e -x '(?!.*\.(xz|txt|html))' ../data/0_archived/ gs://brdata-public-data/rki-corona-archiv/0_archived/ 2>&1
gsutil rsync -c -C -e -x '(?!.*\.(xz|txt|html))' ../data/1_ignored/ gs://brdata-public-data/rki-corona-archiv/1_ignored/ 2>&1
gsutil rsync -c -C -e -x '(?!.*\.(xz|txt|html))' ../data/2_parsed/ gs://brdata-public-data/rki-corona-archiv/2_parsed/ 2>&1
