#!/usr/bin/env sh
set -e

# Wait for BGP to be enabled on device
until jq -r -e ".bgp_neighbors" /tmp/metadata.json
do
  sleep 10
  curl -o /tmp/metadata.json -fsSL https://metadata.platformequinix.com/metadata
done

# Fetch metadata and customdata
curl -o /tmp/metadata.json -fsSL https://metadata.platformequinix.com/metadata
jq -r ".customdata" /tmp/metadata.json > /tmp/customdata.json

# Add routes for BGP peers
GATEWAY_IP=$(jq -r ".network.addresses[] | select(.public == false) | .gateway" /tmp/metadata.json)
ip route add 169.254.255.1 via $GATEWAY_IP
ip route add 169.254.255.2 via $GATEWAY_IP

# Prepare environment for Kubernetes installation
KUBERNETES_VERSION=$(jq -r ".kubernetesVersion" /tmp/customdata.json)
JOIN_TOKEN=$(jq -r ".joinToken" /tmp/customdata.json)
CONTROL_PLANE_IP=$(jq -r ".controlPlaneIp" /tmp/customdata.json)
CERTIFICATE_KEY=$(jq -r ".certificateKey" /tmp/customdata.json)

sed -ri '/\sswap\s/s/^#?/#/' /etc/fstab
swapoff -a
mount -a

cat <<EOF > /etc/modules-load.d/containerd.conf
overlay
br_netfilter
EOF

modprobe overlay
modprobe br_netfilter

cat <<EOF > /etc/sysctl.d/99-kubernetes-cri.conf
net.bridge.bridge-nf-call-iptables  = 1
net.ipv4.ip_forward                 = 1
net.bridge.bridge-nf-call-ip6tables = 1
EOF
sysctl --system


# Install Kubernetes packages
apt-get -y update
DEBIAN_FRONTEND=noninteractive apt-get install -y apt-transport-https curl

curl -s https://packages.cloud.google.com/apt/doc/apt-key.gpg | apt-key add -
echo "deb https://apt.kubernetes.io/ kubernetes-xenial main" > /etc/apt/sources.list.d/kubernetes.list
apt-get update -y

TRIMMED_KUBERNETES_VERSION=$(echo ${KUBERNETES_VERSION} | sed 's/\./\\./g' | sed 's/^v//')
RESOLVED_KUBERNETES_VERSION=$(apt-cache policy kubelet | awk -v VERSION=${TRIMMED_KUBERNETES_VERSION} '$1~ VERSION { print $1 }' | head -n1)

apt-get install -y ca-certificates socat jq ebtables apt-transport-https cloud-utils prips containerd kubelet=${RESOLVED_KUBERNETES_VERSION} kubeadm=${RESOLVED_KUBERNETES_VERSION} kubectl=${RESOLVED_KUBERNETES_VERSION}
systemctl daemon-reload
systemctl enable containerd
systemctl start containerd

apt-mark hold kubelet kubeadm kubectl

# Deploy kube-vip for VIP management
ctr image pull docker.io/plndr/kube-vip:0.3.1
ctr run \
    --rm \
    --net-host \
    docker.io/plndr/kube-vip:0.3.1 \
    vip /kube-vip manifest pod \
        --interface lo \
        --vip $CONTROL_PLANE_IP \
        --controlplane \
        --services \
        --bgp \
        --peerAS $(jq -r '.bgp_neighbors[0].peer_as' /tmp/metadata.json) \
        --peerAddress $(jq -r '.bgp_neighbors[0].peer_ips[0]' /tmp/metadata.json) \
        --localAS $(jq '.bgp_neighbors[0].customer_as' /tmp/metadata.json) \
        --bgpRouterID $(jq -r '.bgp_neighbors[0].customer_ip' /tmp/metadata.json) | sudo tee /etc/kubernetes/manifests/vip.yaml


# If the control plane IP responds to a ping, we should join that cluster
# Otherwise we'll init a new one.
if ping -c 1 -w 30 $CONTROL_PLANE_IP;
then
  kubeadm join $CONTROL_PLANE_IP:6443 \
    --certificate-key $CERTIFICATE_KEY \
    --control-plane \
    --discovery-token-unsafe-skip-ca-verification \
    --ignore-preflight-errors=DirAvailable--etc-kubernetes-manifests \
    --token $JOIN_TOKEN
else
  kubeadm init \
      --apiserver-advertise-address $CONTROL_PLANE_IP \
      --certificate-key $CERTIFICATE_KEY \
      --control-plane-endpoint $CONTROL_PLANE_IP \
      --kubernetes-version $KUBERNETES_VERSION \
      --token $JOIN_TOKEN \
      --upload-certs
fi
