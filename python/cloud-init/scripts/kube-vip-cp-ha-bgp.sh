#!/usr/bin/env bash
set -e

echo "Install kube-vip for HA..."

CONTROL_PLANE_IP=$(jq -r ".controlPlaneIp" /run/customdata.json)
KUBE_VIP_VERSION="v0.5.12" #TODO $(jq -r ".kubeVipVersion" /run/customdata.json)

ctr image pull ghcr.io/kube-vip/kube-vip:${KUBE_VIP_VERSION}
ctr run --rm --net-host ghcr.io/kube-vip/kube-vip:${KUBE_VIP_VERSION} vip /kube-vip manifest pod \
--interface "lo" \
--address "${CONTROL_PLANE_IP}" \
--controlplane \
--bgp \
--localAS $(cat /run/metadata.json | jq -r '.bgp_neighbors[0].customer_as') \
--bgpRouterID $(cat /run/metadata.json | jq -r '.bgp_neighbors[0].customer_ip') \
--bgppeers $(cat /run/metadata.json | jq -r '.bgp_neighbors[0].peer_ips[0]'):$(cat /run/metadata.json | jq -r '.bgp_neighbors[0].peer_as'),$(cat /run/metadata.json | jq -r '.bgp_neighbors[0].peer_ips[1]'):$(cat /run/metadata.json | jq -r '.bgp_neighbors[0].peer_as') > /etc/kubernetes/manifests/vip.yaml
