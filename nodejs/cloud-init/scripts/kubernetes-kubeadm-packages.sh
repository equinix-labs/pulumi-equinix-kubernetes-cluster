#!/usr/bin/env bash
set -e

echo "Install kubernetes packages..."

KUBERNETES_VERSION=$(jq -r ".kubernetesVersion" /run/customdata.json)

# Set up apt repositories
export DEBIAN_FRONTEND=noninteractive
install -m 0755 -d /etc/apt/keyrings
curl -s https://packages.cloud.google.com/apt/doc/apt-key.gpg | apt-key add -
echo "deb https://apt.kubernetes.io/ kubernetes-xenial main" > /etc/apt/sources.list.d/kubernetes.list
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --yes --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
   tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update -y

TRIMMED_KUBERNETES_VERSION=$(echo ${KUBERNETES_VERSION} | sed 's/\./\\\\./g' | sed 's/^v//')
RESOLVED_KUBERNETES_VERSION=$(apt-cache madison kubelet | awk -v VERSION=${TRIMMED_KUBERNETES_VERSION} '$3~ VERSION { print $3 }' | head -n1)
apt-get install -y containerd.io kubelet=${RESOLVED_KUBERNETES_VERSION} kubeadm=${RESOLVED_KUBERNETES_VERSION} kubectl=${RESOLVED_KUBERNETES_VERSION}
apt-mark hold kubelet kubeadm kubectl

containerd config default > /etc/containerd/config.toml
sed -i 's/SystemdCgroup = false/SystemdCgroup = true/' /etc/containerd/config.toml
sed -i "s,sandbox_image.*$,sandbox_image = \"$(kubeadm config images list | grep pause | sort -r | head -n1)\"," /etc/containerd/config.toml
systemctl restart containerd
