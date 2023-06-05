#!/usr/bin/env bash
set -e

echo "Network config..."

CONTROL_PLANE_IP=$(jq -r ".controlPlaneIp" /run/customdata.json)
CONTROL_PLANE_ROLE=$(jq -r ".controlPlaneRole" /run/customdata.json)

if [[ "${CONTROL_PLANE_ROLE}" == "primary" ]];
then
  ip addr add ${CONTROL_PLANE_IP} dev lo
fi

curl -o /run/metadata.json --retry 10 -fsSL https://metadata.platformequinix.com/metadata
for i in $(cat /run/metadata.json | jq -r '.bgp_neighbors[0].peer_ips[]'); do
  ip route add $i via $(cat /run/metadata.json | jq -r '.network.addresses[] | select(.public == false and .address_family == 4) | .gateway')
done