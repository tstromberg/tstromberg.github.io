---
title: "Entropy & heterogenous networks"
date: 2021-02-07
description: "Managing a network designed to support 20+ operating systems is difficult, especially when you plan t..."
slug: reasoning-out-the-kernel-cafe-infrastructure-4a0m-temp-slug-9692600
draft: true
main_image: https://dev-to-uploads.s3.amazonaws.com/i/b6pvdtx7zqcl4zeet0cb.jpg
---
Managing a network designed to support 20+ operating systems is difficult, especially when you plan to allow people on the internet to arbitrarily join the network.

The central idea for doing this successfully is loosely coupled interfaces. Two systems should not have to know or trust one another to work successfully together. While this is quite popular in software engineering, it isn't always this way in systems engineering.

The first time I saw this idea espoused was from Matthew Dillon in the 1990's, who mentioned that NFS, from a reliability perspective, was not appropriate for production usage. To avoid mystery outages, you are better off with sharding the data and workloads into independent nodes with local filesystems. Google too briefly followed this idea, before eventually adopting a hybrid approach with Bigtable.

The other early place where loose coupling came up was Kerberos, but only in terms of trust: no computer should ever trust another on the same network. As an authentication mechanism battle-hardened by  MIT, this made absolute sense.  Google again furthered the idea of never trusting machines, even if they are on a local network, with BeyondCorp.

## So, where were we?

This all brings me to trying to reason about how to manage the machines behind the http://kernel.cafe/ service. The machines are relatively unique: intentionally, no single hardware/operating-system combination is duplicated. This really screws with the modern "cattle, not pets" model that large-scale computing has foisted upon us. It literally feels like a throwback to 1990's era computing.

## Combating entropy

Large scale systems management is effectively a battle against entropy. If you start up 1000 systems from the same hard disk image, and boot them simultaneously, the machines will invariably begin to differentiate themselves, even before ever being logged into. Given a large enough sample size of systems, you will be amazed about how much they can vary from one another even if the clock is 1 second off from one another. Don't ask me how I know.

Once you add human interaction, entropy only accelerates: different config files get edited, different commands get run in different orders, eventually it becomes complete chaos until the process halts and the system is reinstalled.

### Continuous Repair (Chef, Ansible, Puppet, SaltStack)

These tools all allow you to limit the scope of entropy, by declaring the intended configuration on an ad-hoc basis. For instance, I want this particular `httpd.conf` and these users to be created. 

While there is up-front headache to set it up, these systems work exceedingly well. The primary advantage of this approach is that it is designed to handle human intervention by running continuously. 

### Repair on Init (cloud-init)

I think of `cloud-init` as an immature single-shot equivalent to Ansible. `cloud-init` only repairs a host on boot, so it is really built around the idea of immutable and/or disposable systems. 

The major plus-side about `cloud-init` is that it can easily managed centrally, even by a 3rd party who does not otherwise have access to the systems being operated. This makes it easy for providers like EC2 or Google to use `cloud-init` as an integration point to manage users on hosts.

### Repair on Reboot (Rocks Cluster Linux, Tinkerbell)

The only thing that ultimately halts entropy is death. This approach brings ephemeral computing to its apex: node reinstallation on reboot. 

One caveat is that this approach always assumes that storage  is someone else's problem. 

### Finding a gold standard

Personally, I find the gold standard to be reinstallation on reboot with scheduled reboots, and continuous repair to fill in the gaps. In my world, this probably means Tinkerbell + crontab + Ansible. 

##  Back to loose coupling.


