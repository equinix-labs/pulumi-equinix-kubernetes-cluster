#!/usr/bin/env bash
set -e

KUBERNETES_VERSION=$(jq -r ".kubernetesVersion" /tmp/customdata.json)
JOIN_TOKEN=$(jq -r ".joinToken" /tmp/customdata.json)
CONTROL_PLANE_IP=$(jq -r ".controlPlaneIp" /tmp/customdata.json)
CERTIFICATE_PRIVATE_KEY=$(jq -r ".certificatePrivateKey" /tmp/customdata.json)
CERTIFICATE_CERT=$(jq -r ".certificateCert" /tmp/customdata.json)

mkdir -p /etc/kubernetes/pki
echo "${CERTIFICATE_CERT}" > /etc/kubernetes/pki/ca.crt
echo "${CERTIFICATE_PRIVATE_KEY}" > /etc/kubernetes/pki/ca.key

# If the control plane IP responds to a ping, we should join that cluster
# Otherwise we'll init a new one.
if ping -c 1 -w 30 $CONTROL_PLANE_IP;
then
  kubeadm join $CONTROL_PLANE_IP:6443 \
    --discovery-token-unsafe-skip-ca-verification \
    --ignore-preflight-errors=DirAvailable--etc-kubernetes-manifests \
    --control-plane \
    --token $JOIN_TOKEN
else
  kubeadm init \
      --apiserver-advertise-address $CONTROL_PLANE_IP \
      --control-plane-endpoint $CONTROL_PLANE_IP \
      --kubernetes-version $KUBERNETES_VERSION \
      --token $JOIN_TOKEN
fi
