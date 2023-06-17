#!/usr/bin/env bash
set -e

echo "Network config..."

GATEWAY_IP=$(jq -r '.network.addresses[] | select(.public == false and .address_family == 4) | .gateway' /run/metadata.json)
for i in $(jq -r '.bgp_neighbors[0].peer_ips[]' /run/metadata.json); do
  ip route add $i via $GATEWAY_IP
done