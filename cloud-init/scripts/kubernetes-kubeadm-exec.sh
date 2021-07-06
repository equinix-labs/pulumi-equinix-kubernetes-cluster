#!/usr/bin/env bash
CONTROL_PLANE_IP=$(jq -r ".controlPlaneIp" /tmp/customdata.json)

if ping -c 1 -w 30 ${CONTROL_PLANE_IP};
then
  kubeadm join --ignore-preflight-errors=DirAvailable--etc-kubernetes-manifests,FileAvailable--etc-kubernetes-pki-ca.crt \
    --config=/etc/kubernetes/join.yaml
else
  kubeadm init --ignore-preflight-errors=DirAvailable--etc-kubernetes-manifests,FileAvailable--etc-kubernetes-pki-ca.crt \
    --skip-phases=addon/kube-proxy --config=/etc/kubernetes/init.yaml
fi

rm /etc/kubernetes/{init,join}.yaml

cat >> /etc/network/interfaces <<EOF
auto lo:0
iface lo:0 inet static
    address ${CONTROL_PLANE_IP}
    netmask 255.255.255.255
EOF
ifup lo:0
