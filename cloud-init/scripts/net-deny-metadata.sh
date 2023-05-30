#!/usr/bin/env bash
set -e

echo "Prevent metadata access by pods..."

iptables -A OUTPUT -d 192.80.8.124 -j DROP

mkdir -p /var/lib/cloud/scripts/per-boot/
cat << EOF > /var/lib/cloud/scripts/per-boot/deny-egress-metadata.sh
#!/bin/bash
iptables -A OUTPUT -d 192.80.8.124 -j DROP
EOF
