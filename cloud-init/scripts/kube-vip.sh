#!/usr/bin/env sh
set -e

CONTROL_PLANE_IP=$(jq -r ".controlPlaneIp" /tmp/customdata.json)

mkdir -p /etc/kubernetes/manifests

ctr image pull docker.io/plndr/kube-vip:0.3.1
ctr run \
    --rm \
    --net-host \
    docker.io/plndr/kube-vip:0.3.1 \
    vip /kube-vip manifest pod \
        --interface lo \
        --vip $CONTROL_PLANE_IP \
        --controlplane \
        --services \
        --bgp \
        --peerAS $(jq -r '.bgp_neighbors[0].peer_as' /tmp/metadata.json) \
        --peerAddress $(jq -r '.bgp_neighbors[0].peer_ips[0]' /tmp/metadata.json) \
        --localAS $(jq '.bgp_neighbors[0].customer_as' /tmp/metadata.json) \
        --bgpRouterID $(jq -r '.bgp_neighbors[0].customer_ip' /tmp/metadata.json) | sudo tee /etc/kubernetes/manifests/vip.yaml
