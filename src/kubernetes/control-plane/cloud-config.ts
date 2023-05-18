import * as cloudinit from "@pulumi/cloudinit";
import * as fs from "fs";

export const cloudConfig = cloudinit.getConfig({
  gzip: false,
  base64Encode: false,
  parts: [
    {
      contentType: "text/x-shellscript",
      content: fs.readFileSync(
        "../cloud-init/scripts/pre-install.sh",
        "utf8"
      ),
    },
    {
      contentType: "text/x-shellscript",
      content: fs.readFileSync(
        "../cloud-init/scripts/wait-for-bgp-enabled.sh",
        "utf8"
      ),
    },
    {
      contentType: "text/x-shellscript",
      content: fs.readFileSync(
        "../cloud-init/scripts/download-metadata.sh",
        "utf8"
      ),
    },
    {
      contentType: "text/x-shellscript",
      content: fs.readFileSync(
        "../cloud-init/scripts/network-config-cp.sh",
        "utf8"
      ),
    },
    {
      contentType: "text/x-shellscript",
      content: fs.readFileSync(
        "../cloud-init/scripts/containerd-prerequisites.sh",
        "utf8"
      ),
    },
    {
      contentType: "text/x-shellscript",
      content: fs.readFileSync(
        "../cloud-init/scripts/kubernetes-prerequisites.sh",
        "utf8"
      ),
    },
    {
      contentType: "text/x-shellscript",
      content: fs.readFileSync(
        "../cloud-init/scripts/crictl-config.sh",
        "utf8"
      ),
    },
    {
      contentType: "text/x-shellscript",
      content: fs.readFileSync(
        "../cloud-init/scripts/kubelet-config.sh",
        "utf8"
      ),
    },
    {
      contentType: "text/x-shellscript",
      content: fs.readFileSync(
        "../cloud-init/scripts/kubernetes-kubeadm-certs.sh",
        "utf8"
      ),
    },
    {
      contentType: "text/x-shellscript",
      content: fs.readFileSync(
        "../cloud-init/scripts/kubernetes-kubeadm-packages.sh",
        "utf8"
      ),
    },
    {
      contentType: "text/x-shellscript",
      content: fs.readFileSync(
        "../cloud-init/scripts/kubernetes-kubeadm-cp-config.sh",
        "utf8"
      ),
    },
    {
      contentType: "text/x-shellscript",
      content: fs.readFileSync(
        "../cloud-init/scripts/kube-vip-cp-ha-bgp.sh",
        "utf8"
      ),
    },
    {
      contentType: "text/x-shellscript",
      content: fs.readFileSync(
        "../cloud-init/scripts/kubernetes-kubeadm-cp-join.sh",
        "utf8"
      ),
    },
    {
      contentType: "text/x-shellscript",
      content: fs.readFileSync(
        "../cloud-init/scripts/helm.sh",
        "utf8"
      ),
    },
    {
      contentType: "text/x-shellscript",
      content: fs.readFileSync(
        "../cloud-init/scripts/cni-cilium.sh",
        "utf8"
      ),
    },
    {
      contentType: "text/x-shellscript",
      content: fs.readFileSync(
        "../cloud-init/scripts/net-deny-metadata.sh",
        "utf8"
      ),
    },
    {
      contentType: "text/x-shellscript",
      content: fs.readFileSync(
        "../cloud-init/scripts/ingress.sh",
        "utf8"
      ),
    },
    {
      contentType: "text/x-shellscript",
      content: fs.readFileSync(
        "../cloud-init/scripts/post-install.sh",
        "utf8"
      ),
    },
  ],
});
