#!/usr/bin/env bash
set -e

echo "Containerd prerequisites..."

cat <<EOF > /etc/modules-load.d/containerd.conf
overlay
br_netfilter
EOF

modprobe overlay
modprobe br_netfilter
