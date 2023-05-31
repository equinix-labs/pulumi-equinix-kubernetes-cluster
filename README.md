# Pulumi Templates for Kubernetes on Equinix Metal with kubeadm via cloud-init

![](https://img.shields.io/badge/Stability-Experimental-red.svg)

This repository contains two Pulumi templates for deploying Kubernetes clusters using kubeadm via cloud-init. The templates are written using the Pulumi Python SDK and the Pulumi Node.js SDK, respectively.

This repository is [Experimental](https://github.com/packethost/standards/blob/master/experimental-statement.md) meaning that it's based on untested ideas or techniques and not yet established or finalized or involves a radically new and innovative style! This means that support is best effort (at best!) and we strongly encourage you to NOT use this in production.

## Warning

Currently, we're stuffing a self-signed CA into the custom data of your Equinix Metal instances. This is a rather serious security risk and we don't encourage using this pattern just yet until we tighten this up.

## Prerequisites

Before you begin, ensure you have the following installed:

- [Pulumi CLI](https://www.pulumi.com/docs/get-started/install/)
- [Python](https://www.python.org/downloads/) (for the Python template)
- [Node.js](https://nodejs.org/) (for the Node.js template)

## Getting Started

Choose the template based on your preferred programming language:

- [Python Template](./python)
- [Node.js Template](./nodejs)

Inside each template directory, you will find the necessary files to deploy a Kubernetes cluster on Equinix Metal.

## Usage

### Python Template

1. Change to the `python` directory: `cd python`
2. Initialize a new Pulumi stack: `pulumi stack init`
3. Set the required configuration variables. See [configuration variables](#configuration-variables) below.
4. Deploy the stack: `pulumi up`
5. Follow the instructions printed in the console to complete the deployment.

### Node.js Template

1. Change to the `nodejs` directory: `cd nodejs`
2. Initialize a new Pulumi stack: `pulumi stack init`
3. Set the required configuration variables. See [configuration variables](#configuration-variables) below.
4. Deploy the stack: `pulumi up`
5. Follow the instructions printed in the console to complete the deployment.

## Configuration Variables

The following table lists the configuration variables for both templates:

| Variable | Description | Default Value |
|----------|-------------|---------------|
| metal-k8s-cluster:metalOrg | The Equinix Metal organization name. This variable is required. | N/A           |
| metal-k8s-cluster:metalMetro   | The deployment metro code. This variable is optional and defaults to 'SV'. See [metro codes](https://deploy.equinix.com/developers/docs/metal/locations/metros/#metros-quick-reference) | SV            |
| metal-k8s-cluster:kubernetesVersion  | The Kubernetes version. This variable is optional and defaults to '1.24.7'. | 1.24.7         |

To add them you can use `pulumi config set` command:

```sh
pulumi config set metal-k8s-cluster:metalOrg <METAL_ORG_ID>
```

## Customization

Feel free to customize the templates according to your specific requirements. You can modify the cloud-init scripts, adjust the cluster configuration, or add additional resources.

## Contributing

Contributions are welcome! If you find any issues or have suggestions for improvement, please open an issue or submit a pull request.

## License

This project is licensed under the [Apache 2.0](LICENSE).
