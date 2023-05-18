#!/usr/bin/env sh
set -e

echo "Download metadata..."

curl -o /run/metadata.json --retry 10 -fsSL https://metadata.platformequinix.com/metadata
jq -r ".customdata" /run/metadata.json > /run/customdata.json
