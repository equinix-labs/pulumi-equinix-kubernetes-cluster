#!/usr/bin/env bash
set -e

echo "Kubeadm config..."

KUBERNETES_VERSION=$(jq -r ".kubernetesVersion" /run/customdata.json)
JOIN_TOKEN=$(jq -r ".joinToken" /run/customdata.json)
CONTROL_PLANE_IP=$(jq -r ".controlPlaneIp" /run/customdata.json)
PRIVATE_IPv4=$(curl -s https://metadata.platformequinix.com/metadata | jq -r '.network.addresses | map(select(.public==false and .management==true)) | first | .address')

cat > /etc/kubernetes/init.yaml <<EOF
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
cgroupDriver: systemd
---
apiVersion: kubeadm.k8s.io/v1beta3
kind: InitConfiguration
localAPIEndpoint:
  advertiseAddress: ${PRIVATE_IPv4}
  bindPort: 6443
nodeRegistration:
  kubeletExtraArgs:
    cloud-provider: "external"
    node-ip: "${PRIVATE_IPv4}"
  taints: null
bootstrapTokens:
- token: ${JOIN_TOKEN}
---
apiVersion: kubeadm.k8s.io/v1beta3
kind: ClusterConfiguration
apiServer:
  timeoutForControlPlane: 4m0s
certificatesDir: /etc/kubernetes/pki
controlPlaneEndpoint: ${CONTROL_PLANE_IP}:6443
kubernetesVersion: ${KUBERNETES_VERSION}
networking:
  podSubnet: 10.244.0.0/16
EOF

cat > /etc/kubernetes/join.yaml <<EOF
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
cgroupDriver: systemd
---
apiVersion: kubeadm.k8s.io/v1beta3
kind: JoinConfiguration
nodeRegistration:
  kubeletExtraArgs:
    cloud-provider: "external"
    node-ip: "${PRIVATE_IPv4}"
  taints: null
discovery:
  bootstrapToken:
    token: ${JOIN_TOKEN}
    apiServerEndpoint: ${CONTROL_PLANE_IP}:6443
    unsafeSkipCAVerification: true
controlPlane:
  localAPIEndpoint:
    advertiseAddress: ${PRIVATE_IPv4}
    bindPort: 6443
EOF