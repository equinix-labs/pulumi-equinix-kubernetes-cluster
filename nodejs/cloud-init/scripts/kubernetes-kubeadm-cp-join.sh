#!/usr/bin/env bash
set -e

echo "Execute kubeadm init/join..."

CONTROL_PLANE_ROLE=$(jq -r ".controlPlaneRole" /run/customdata.json)

systemctl enable kubelet.service

if [[ "${CONTROL_PLANE_ROLE}" == "primary" ]];
then
  kubeadm init --ignore-preflight-errors=DirAvailable--etc-kubernetes-manifests,FileAvailable--etc-kubernetes-pki-ca.crt \
    --skip-phases=addon/kube-proxy --config=/etc/kubernetes/init.yaml
else
  kubeadm join --ignore-preflight-errors=DirAvailable--etc-kubernetes-manifests,FileAvailable--etc-kubernetes-pki-ca.crt \
    --config=/etc/kubernetes/join.yaml
fi

rm /etc/kubernetes/{init,join}.yaml