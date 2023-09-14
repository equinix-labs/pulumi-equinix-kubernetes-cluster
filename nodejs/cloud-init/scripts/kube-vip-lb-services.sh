#!/usr/bin/env bash
set -e

echo "Install kube-vip for Load Balancing..."

KUBE_VIP_VERSION=${KUBE_VIP_VERSION:-v0.6.0}
KUBE_VIP_IMAGE=${KUBE_VIP_IMAGE:-ghcr.io/kube-vip/kube-vip:$KUBE_VIP_VERSION}

kubectl --kubeconfig=/etc/kubernetes/admin.conf apply -f https://kube-vip.io/manifests/rbac.yaml
ctr i pull $KUBE_VIP_IMAGE
ctr run --rm --net-host $KUBE_VIP_IMAGE vip /kube-vip manifest daemonset \
--interface lo \
--services \
--bgp \
--annotations metal.equinix.com \
--inCluster | kubectl --kubeconfig=/etc/kubernetes/admin.conf apply -f -
