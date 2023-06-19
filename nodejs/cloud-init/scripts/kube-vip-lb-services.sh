#!/usr/bin/env bash
set -e

echo "Install kube-vip for Load Balancing..."

IMAGE=ghcr.io/kube-vip/kube-vip:v0.6.0
kubectl --kubeconfig=/etc/kubernetes/admin.conf apply -f https://kube-vip.io/manifests/rbac.yaml
ctr i pull $IMAGE
ctr run --rm --net-host $IMAGE vip /kube-vip manifest daemonset \
--interface lo \
--services \
--bgp \
--annotations metal.equinix.com \
--inCluster | kubectl --kubeconfig=/etc/kubernetes/admin.conf apply -f -

