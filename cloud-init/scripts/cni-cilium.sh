#!/usr/bin/env bash
set -e

echo "Install CNI Cilium..."

CONTROL_PLANE_IP=$(jq -r ".controlPlaneIp" /run/customdata.json)

helm repo add cilium https://helm.cilium.io/

helm template cilium/cilium  \
	--version 1.13.3 \
	--namespace kube-system \
	--set image.repository=quay.io/cilium/cilium \
	--set MTU=1500 \
	--set global.ipam.mode=cluster-pool \
	--set global.ipam.operator.clusterPoolIPv4PodCIDRList=10.244.0.0/16 \
	--set global.ipam.operator.clusterPoolIPv4MaskSize=23 \
	--set global.nativeRoutingCIDR=10.244.0.0/16 \
	--set global.endpointRoutes.enabled=true \
	--set global.hubble.relay.enabled=true \
	--set global.hubble.enabled=true \
	--set global.hubble.listenAddress=":4244" \
	--set global.hubble.ui.enabled=true \
	--set kubeProxyReplacement=partial \
	--set nodePort.enabled=true \
	--set nodePort.enableHealthCheck=false \
	--set hostServices.enabled=true \
	--set externalIPs.enabled=true \
	--set hostPort.enabled=true \
	--set k8sServiceHost=${CONTROL_PLANE_IP} \
	--set k8sServicePort=6443 \
		> /etc/kubernetes/cilium.yaml

kubectl --kubeconfig=/etc/kubernetes/admin.conf apply --wait -f /etc/kubernetes/cilium.yaml
