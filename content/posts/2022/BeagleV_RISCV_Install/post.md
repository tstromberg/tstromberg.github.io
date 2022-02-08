---
title: "Post"
date: 2022-02-07T07:46:40-08:00
draft: true
---

RVBoards has a handy [Getting Started with BeagleV™ - StarLight](https://www.rvboards.org/single-blog-1.php?id=93) guide that I followed to get the board up and running.

Step 1: figuring out where the fan leads go to: red (5V power) goes to pin 4, black (ground) goes to pin 6.

Step 2: Download latest Fedora image from the [starfive-tech/Fedora_on_StarFive](https://github.com/starfive-tech/Fedora_on_StarFive) repository. At the time of this writing, it's 2021-December-26, which uses the 5.16-rc6+ kernel:

```shell
curl -LO https://fedora.starfivetech.com/pub/downloads/VisionFive-release/Fedora-riscv64-jh7100-developer-xfce-Rawhide-20211226-214100.n.0-sda.raw.zst
```

It turns out that my download would fail every couple of hundred megabytes with `HTTP/2 stream 0 was not closed cleanly: INTERNAL_ERROR (err 2)`, so I wrote a small fish loop to retry and resume the download until complete:

```shell
while ! curl -LO -C - http://fedora.starfivetech.com/pub/downloads/VisionFive-release/Fedora-riscv64-jh7100-developer-xfce-Rawhide-20211226-214100.n.0-sda.raw.zst; sleep 1; end
```

Step 3: Confirm checksum and decompress image

```shell
unzstd Fedora-riscv64-jh7100-developer-xfce-Rawhide-20211226-214100.n.0-sda.raw.zst
sha256sum Fedora-riscv64-jh7100-developer-xfce-Rawhide-20211226-214100.n.0-sda.raw.zst
```

Step 4: Flash the image

Since I'm on macOS, I use [balenaEtcher](https://www.balena.io/etcher/) for it's handy UI, but dd works as well:

```shell
 sudo dd if=Fedora-riscv64-vic7100-dev-raw-image-Rawhide-202104161415.n.0-sda.raw of=<device> bs=8M status=progress
```

Step 5: Serial

Compared to other recent arm64 boards I've used, the BeagleV has no built-in USB serial port, but it does have GPIO pins you can hook your own USB serial device up to. The guide called for GND in pin 6, TX in pin 8, and RX in pin 10. However, the fan also uses pin 6 for GND, so I opted for pin 14 instead. Once setup, the monstrosity appears:

I normally use `minicom -b 115200`, but in order to learn something new today, I tried SerialTools. The important part is setting your baud to 115200, but you'll also want to turn local echo off.

Step 6: Logging in!

The default login is `riscv:starfive`.

The output of `uname -a` shows that it's running Fedora 33:

`Linux fedora-starfive 5.15.0-61.fc33.riscv64 #1 SMP Wed Nov 10 20:58:14 CST 2021 riscv64 riscv64 riscv64 GNU/Linux`

Step 6: Network connectivity

After plugging in an ethernet cable, I was able to get an IPv4 IP, but oddly enough, the host did not get an IPv6 address, which I'm going to need for this environment. This was easy enough to fix:

```shell
sudo sed -i 's/NETWORKING_IPV6=no/NETWORKING_IPV6=yes/g' /etc/sysconfig/network
```

But when I went  to restart the networking stack, it didn't go as planned:

```shell
$ sudo systemctl restart network
Failed to restart network.service: Unit network.service not found.
```

That's because it's now managed by another system:

```shell
sudo nmcli con reload eth0
```

Step 7: Updates

To update:

`sudo dnf update && sudo dnf upgrade -y`

Sadly, there were no updates, so I wouldn't put anything security sensitive on this board:

```
Last metadata expiration check: 0:01:04 ago on Tue 08 Feb 2022 01:03:06 AM CST.
Dependencies resolved.
Nothing to do.
Complete!
```
