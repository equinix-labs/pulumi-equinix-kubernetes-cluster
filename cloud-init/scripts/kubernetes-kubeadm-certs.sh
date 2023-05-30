#!/usr/bin/env bash
set -e

echo "Manage kubernetes PKI certificates..."

CERTIFICATE_AUTHORITY_KEY=$(jq -r ".certificateAuthorityKey" /run/customdata.json)
CERTIFICATE_AUTHORITY_CERT=$(jq -r ".certificateAuthorityCert" /run/customdata.json)
SERVICE_ACCOUNT_KEY=$(jq -r ".serviceAccountKey" /run/customdata.json)
SERVICE_ACCOUNT_PUBLIC_KEY=$(jq -r ".serviceAccountPublicKey" /run/customdata.json)
SERVICE_ACCOUNT_CERT=$(jq -r ".serviceAccountCert" /run/customdata.json)
FRONT_PROXY_KEY=$(jq -r ".frontProxyKey" /run/customdata.json)
FRONT_PROXY_CERT=$(jq -r ".frontProxyCert" /run/customdata.json)
ETCD_KEY=$(jq -r ".etcdKey" /run/customdata.json)
ETCD_CERT=$(jq -r ".etcdCert" /run/customdata.json)

mkdir -p /etc/kubernetes/pki/etcd

echo "${CERTIFICATE_AUTHORITY_KEY}" > /etc/kubernetes/pki/ca.key
echo "${CERTIFICATE_AUTHORITY_CERT}" > /etc/kubernetes/pki/ca.crt
echo "${SERVICE_ACCOUNT_KEY}" > /etc/kubernetes/pki/sa.key
echo "${SERVICE_ACCOUNT_PUBLIC_KEY}" > /etc/kubernetes/pki/sa.pub
echo "${SERVICE_ACCOUNT_CERT}" > /etc/kubernetes/pki/sa.crt
echo "${FRONT_PROXY_KEY}" > /etc/kubernetes/pki/front-proxy-ca.key
echo "${FRONT_PROXY_CERT}" > /etc/kubernetes/pki/front-proxy-ca.crt
echo "${ETCD_KEY}" > /etc/kubernetes/pki/etcd/ca.key
echo "${ETCD_CERT}" > /etc/kubernetes/pki/etcd/ca.crt
