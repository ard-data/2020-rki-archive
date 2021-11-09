#!/bin/bash

echo "helper script to recompress files in place"

set -e

bin_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
tmp_dir="$(cd "$(dirname "$bin_dir")"/tmp && pwd)"
src_dir="$(pwd)"
dst_dir="$(pwd)"

for filename in "$@"; do
	src_file="$src_dir"/"$filename"
	tmp_file="$tmp_dir"/"$filename"
	dst_file="$dst_dir"/"$filename"

	echo "recompress $filename"

	nice -20 xz -dkcq $src_file | xz -z9eq > $tmp_file
	mv -f $tmp_file $dst_file
done
