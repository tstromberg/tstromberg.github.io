---
title: "Supply vs Demand"
date: 2021-01-20
description: "When running public service as a free-time effort, it is  critical to consider supply &amp; demand as..."
slug: supply-vs-demand-20e7
main_image: https://dev-to-uploads.s3.amazonaws.com/i/naa391es1q7gcpm7b3ke.jpg
---
When running public service as a free-time effort, it is  critical to consider supply & demand as early on in the process as feasible.

For most folks:

* 'supply' is the resources you can sink into the service
* 'demand' is what the public wants out of this service

If you structure your service in such a way that demand immediately outstrips supply, you may have to quickly pivot in a manner that is disruptive to your users.

On the contrary, building a service that no one wants is a waste of your time entirely.

## Addressing demand

For the kernel café, I'll focus initially on solving the use cases where I've seen demonstrable demand by open-source developers:

* Access to mixed-architecture Kubernetes clusters
* Interactive access to arm64 (Linux, macOS)

To reduce demand, I am considering the following limitations:

* IPv6-only
* Public data only
* 1-hour CPU limit*
** Unprivileged access*

* Subject to contribution of time or money

## Addressing supply

Maintaining open infrastructure is incredibly time consuming, and potentially expensive.

### Time

CNCF Projects, such as [https://tinkerbell.org](Tinkerbell), make it substantially cheaper to work with physical infrastructure, by allowing it to be managed as cattle rather than pets. Treating the hosts as ephemeral, where they are reinstalled each reboot, goes a long way to addressing long-term maintainability of nodes. In situations where downtime is acceptable or encouraged, requiring that each node is rebooted on a schedule (weekly) also helps.

=== Money

Setting up a janky datacenter is not expensive, but does require capital outlay.

With my limited experience, the more worrying expense is that of power and cooling. Thankfully, both issues can be addressed by speccing out equipment that consumes no more power than necessary.

I intend to build the backbone of cluster with Raspberry Pi 4's, which seems to be unusually cost-effective, even if there are I/O performance limitations. They only consume ~4w at idle.

I have 4x RockPro64's that I can throw into the mix, but they are a bit more exotic for a build-out, and are limited to 8GB. Similar power consumption properties. Interactive users will likely use a Honeycomb LX2 for now.

For x86 support (a necessary evil for platforms like Fuschia), it is difficult to get similar power consumption numbers. Intel NUC's seem to enjoy the best balance of support and power consumption, even if AMD-based solutions trounce them in performance. Before I begin to acquire NUC's, I'll first need to collect data on consumption vs performance.

To be continued ...
