#!/usr/bin/env bash
set -e

echo "Pre-Install script..."

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release jq kubetail
