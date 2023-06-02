# Development Guide for Pulumi Template for Kubernetes on Equinix Metal

Welcome to the development guide for the Pulumi Template for Kubernetes on Equinix Metal! This document provides instructions and guidelines for contributing to the development of these templates. Please follow these steps to get started.

> **_NOTE:_** you SHOULD NOT include cloud-init scripts and template code changes in the same pull request. `cloud-init` sub-folder inside each supported language folder, such as `python` or `nodejs`, must contain the same code and have been replicated just to make it easier for users to install each template. To ensure that all them are excatly the same we use `git subtree`, where the code of the cloud-init scripts are centralized in a separated branch `cloudinit/main` and what you see in each folder are copies of the original. Therefore, for script changes open a pull request against `cloudinit/main`, otherwise `main`.

## Contributing

1. Fork the repository and create a new branch for your changes:

Updating templates

```bash
git checkout -b feature/your-feature-name
```

Updating cloud-init scripts

```bash
git checkout cloudinit/main
git checkout -b feature/your-feature-name
```

1. Make your changes to the codebase.

2. Write clear and concise commit messages for your changes.

3. Submit a pull request from your forked repository to the main repository.

## Working with subtrees

### Pull in new subtree commits

If you want to update all copies after new commits are added to the `cloudinit/main` use:

```bash
git checkout main
git checkout -b feature/your-feature-name
git subtree pull --prefix nodejs/cloud-init https://github.com/equinix-labs/pulumi-equinix-kubernetes-cluster cloudinit/main --squash
git subtree pull --prefix python/cloud-init https://github.com/equinix-labs/pulumi-equinix-kubernetes-cluster cloudinit/main --squash
git push
```

## Contact and Support

If you have any questions or need assistance during the development process, feel free to open an issue on [GitHub](https://github.com/equinix-labs/pulumi-equinix-kubernetes-cluster/issues/new/choose).