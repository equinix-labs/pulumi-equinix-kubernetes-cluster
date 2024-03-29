#!/usr/bin/env sh

echo "Wait for BGP enabled..."

until jq -r -e ".bgp_neighbors" /tmp/metadata.json
do
  sleep 10
  curl -o /tmp/metadata.json -fsSL https://metadata.platformequinix.com/metadata
done
