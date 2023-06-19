#!/usr/bin/env bash
set -e

# NOTE: To use CCM all kubelets in your cluster must set the flag --cloud-provider=external.
# This has been removed from this script and included in ./kubernetes-kubeadm-cp-config.sh and ./kubernetes-kubeadm-worker-config.sh
# If CPEM installation is removed from cloud-init config scripts should be updated accordingly
# More info https://github.com/equinix/cloud-provider-equinix-metal#kubernetes-binary-arguments

echo "Install CPEM..."

CONTROL_PLANE_ROLE=$(jq -r ".controlPlaneRole" /run/customdata.json)
if ! [[ "${CONTROL_PLANE_ROLE}" == "primary" ]]; then
  exit 0
fi

CPEM_VERSION="v3.6.2"
API_KEY=$(jq -r ".ccmApiKey" /run/customdata.json)
PROJECT=$(jq -r ".projectId" /run/customdata.json)
METRO=$(jq -r ".metro" /run/metadata.json)
LOAD_BALANCER="kube-vip://"

# create a secret to store required Equinix Metal configuration
cat << EOF > /tmp/equinix-ccm-config.yaml
apiVersion: v1
kind: Secret 
metadata:
  name: metal-cloud-config
  namespace: kube-system
stringData:
  cloud-sa.json: |
    {
      "apiKey": "${API_KEY}",
      "projectID": "${PROJECT}",
      "metro": "${METRO}",
      "loadbalancer": "${LOAD_BALANCER}"
    }
EOF
kubectl --kubeconfig=/etc/kubernetes/admin.conf apply -f /tmp/equinix-ccm-config.yaml
rm /tmp/equinix-ccm-config.yaml

# deploy cloud-provider-equinix-metal
URL="https://github.com/equinix/cloud-provider-equinix-metal/releases/download/${CPEM_VERSION}/deployment.yaml"
kubectl --kubeconfig=/etc/kubernetes/admin.conf apply -f $URL
