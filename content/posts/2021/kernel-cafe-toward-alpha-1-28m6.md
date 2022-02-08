---
title: "kernel café, toward alpha 1"
date: 2021-01-22
description: "I spent some time today in the data-hall, getting lighting setup, as well as a console. This weekend..."
slug: kernel-cafe-toward-alpha-1-28m6
main_image: https://dev-to-uploads.s3.amazonaws.com/i/sf1hfba90h7123489srl.jpg
---
I spent some time today in the data-hall, getting lighting setup, as well as a console. This weekend I aim to get the rack-boards installed on the walls.

Here are the alpha milestones I aim to reach before the service becomes initially shareable:

* **Week 1**: Initial network setup, first node with SSH cert sync 
* **Week 2**: Tinkerbell setup and second node: Honeycomb LX2, installed via Tinkerbell. Trusted testers.
* **Week 3**: Third node: Mac Mini
* **Week 4**: Nodes 4 & 5, Public Kubernetes Cluster
* **Week 5**: Segregate Firewall, resource controls

Beta!

For the SSH cert synchronization setup, I'm considering basing it on:

 * [periblos](https://github.com/kubernetes/test-infra/tree/master/prow/cmd/peribolos) - YAML to GitHub Org sync
 * [sync-ssh-keys](https://github.com/samber/sync-ssh-keys) - GitHub Org to SSH keys

The missing component though is GitHub Org to UNIX users and groups, which should be easy enough to solve.

