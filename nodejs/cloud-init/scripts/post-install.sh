#!/usr/bin/env bash

echo "Post-Install script..."

rm /run/{customdata,metadata}.json

mkdir -p /root/.kube && cp -f /etc/kubernetes/admin.conf /root/.kube/config
cp /etc/kubernetes/admin.conf /root/.kube/config

echo "source <(kubectl completion bash)" >> /root/.bashrc
echo "alias k=kubectl" >> /root/.bashrc
echo "complete -o default -F __start_kubectl k" >> /root/.bashrc