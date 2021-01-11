#!/bin/bash

set -x
openssl dgst -md5 "*.tar" > md5.txt
openssl dgst -sha1 "*.tar" > sha1.txt
openssl dgst -sha256 "*.tar" > sha256.txt
