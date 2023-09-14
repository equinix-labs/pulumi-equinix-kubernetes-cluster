#!/usr/bin/env bash
set -e

echo "Execute kubeadm join..."

systemctl enable kubelet.service

kubeadm join --config=/etc/kubernetes/join.yaml

rm /etc/kubernetes/join.yaml
