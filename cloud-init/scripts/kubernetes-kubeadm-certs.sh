#!/usr/bin/env bash
set -e

CERTIFICATE_PRIVATE_KEY=$(jq -r ".certificatePrivateKey" /tmp/customdata.json)
CERTIFICATE_CERT=$(jq -r ".certificateCert" /tmp/customdata.json)

mkdir -p /etc/kubernetes/pki
echo "${CERTIFICATE_CERT}" > /etc/kubernetes/pki/ca.crt
echo "${CERTIFICATE_PRIVATE_KEY}" > /etc/kubernetes/pki/ca.key
