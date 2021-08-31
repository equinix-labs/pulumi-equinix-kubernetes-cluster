# Pulumi Template for Kubernetes on Equinix Metal with kubeadm via cloud-init

![](https://img.shields.io/badge/Stability-Experimental-red.svg)

This repository is [Experimental](https://github.com/packethost/standards/blob/master/experimental-statement.md) meaning that it's based on untested ideas or techniques and not yet established or finalized or involves a radically new and innovative style! This means that support is best effort (at best!) and we strongly encourage you to NOT use this in production.

---
## Warning

Currently, we're stuffing a self-signed CA into the custom data of your Equinix Metal instances. This is a rather serious security risk and we don't encourage using this pattern just yet until we tighten this up.
