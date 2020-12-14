#!/bin/bash

set +e
source ~/.profile
set -e

cd "$(dirname "$0")"

git pull

node 4_check.js
