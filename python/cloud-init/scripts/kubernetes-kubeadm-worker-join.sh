#!/usr/bin/env bash
set -e

echo "Execute kubeadm join..."

CONTROL_PLANE_IP=$(jq -r ".controlPlaneIp" /run/customdata.json)
JOIN_TOKEN=$(jq -r ".joinToken" /run/customdata.json)

systemctl enable kubelet.service

kubeadm join --token $JOIN_TOKEN --discovery-token-unsafe-skip-ca-verification $CONTROL_PLANE_IP:6443

rm /etc/kubernetes/join.yaml
