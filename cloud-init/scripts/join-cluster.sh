#!/usr/bin/env sh
set -e

# If the control plane IP responds to a ping, we should join that cluster
# Otherwise we'll init a new one.
if ping -c 1 -w 30 {{ ds.meta_data.customdata.controlPlaneIp }};
then
  kubeadm join {{ ds.meta_data.customdata.controlPlaneIp }}:6443 \
    --certificate-key {{ ds.meta_data.customdata.certificateKey }} \
    --control-plane \
    --discovery-token-unsafe-skip-ca-verification \
    --ignore-preflight-errors=DirAvailable--etc-kubernetes-manifests \
    --token {{ ds.meta_data.customdata.joinToken }}
else
  kubeadm init \
      --apiserver-advertise-address {{ ds.meta_data.customdata.controlPlaneIp }} \
      --certificate-key {{ ds.meta_data.customdata.certificateKey }} \
      --control-plane-endpoint {{ ds.meta_data.customdata.controlPlaneIp }} \
      --kubernetes-version {{ ds.meta_data.customdata.kubernetesVersion }} \
      --token {{ ds.meta_data.customdata.joinToken }} \
      --upload-certs
fi
