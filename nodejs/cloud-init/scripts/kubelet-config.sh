#!/usr/bin/env bash
set -e

echo "Kubelet config..."

PRIVATE_IPv4=$(curl -s https://metadata.platformequinix.com/metadata | jq -r '.network.addresses | map(select(.public==false and .management==true)) | first | .address')

echo "KUBELET_EXTRA_ARGS=--node-ip=${PRIVATE_IPv4}" > /etc/default/kubelet
