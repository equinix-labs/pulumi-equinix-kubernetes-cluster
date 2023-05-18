#!/usr/bin/env bash
set -e

echo "Kubeadm config..."

JOIN_TOKEN=$(jq -r ".joinToken" /run/customdata.json)
CONTROL_PLANE_IP=$(jq -r ".controlPlaneIp" /run/customdata.json)

mkdir -p /etc/kubernetes/

cat <<EOF > /etc/kubernetes/join.yaml
apiVersion: kubeadm.k8s.io/v1beta3
kind: JoinConfiguration
nodeRegistration:
  kubeletExtraArgs:
    cloud-provider: "external"
  taints: null
discovery:
  bootstrapToken:
    token: ${JOIN_TOKEN}
    apiServerEndpoint: ${CONTROL_PLANE_IP}:6443
    unsafeSkipCAVerification: true
EOF
