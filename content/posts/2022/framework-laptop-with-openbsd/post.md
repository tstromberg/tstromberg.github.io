---
kind: post
draft: false
date: "2022-01-21T11:36:17.085124-08:00"
title: Framework DIY laptop build with OpenBSD

# words of the day
#
# uncarnate —  https://wordnik.com/word-of-the-day
#    adjective: Not carnate or fleshly; not incarnate; not made flesh.
#    adjective: To divest of flesh or fleshliness.

# contumacious —  https://www.dictionary.com/e/word-of-the-day/
#    adjective: stubbornly perverse or rebellious; willfully and obstinately disobedient.
---

While getting things arranged to begin working at [Chainguard](https://chainguard.dev/), the CEO mentioned that I should order my own laptop before my first day of work. As a small ~15 person startup, there isn't exactly an IT department to handle these sorts of things. 

In 2022, the default  laptop of choice for a software engineer working on cloud infrastructure is the [Apple M1 Powerbook](https://apple.com/powerbook). They hit nearly all the checkboxes: a great screen, powerful CPU's, and battery life that is the envy of any laptop in their class.  The arm64 based Mac's are fantastic: in fact, I'm typing this from my personal M1 MacBook Air. 

A few thoughts dissuaded me from selecting yet another MacBook for this job:

* Working at a company that embraces a secure-by-default stance should use an operating-system that matches philosophically
* As a software engineer, using a different environment than my coworkers ensures that I will be forced to learn the underlying internals of how the system works
* As an open-source contributor, using a different operating-system than other contributors helps with open-source inclusiveness, diversity, and promotes cleaner architecture.

The clear hardware alternative for open-source developers in 2022? The Framework Laptop. Not only does Framework fully embrace the open-source ethos, but the hardware is designed to be upgradeable. As a believer in waste-free sustainability as well as someone stuck with a MacBook Air with 16GB of RAM, this last aspect in particular is important. In fact, I'll make use of it later in this article.

OpenBSD is a little bit of a less-clear alternative, particularly on a laptop. If you work at all in computer security, you owe it to yourself to try running OpenBSD as a laptop: if only to learn about the impact of a secure-by-default stance has on user behavior. I can only recommend OpenBSD on a laptop to folks who are truly comfortable at a command-line, or those that wish to be.

## Assembling the laptop

The Framework laptops come in two varieties: a standard pre-assembled laptop with Windows, and a DIY laptop with nothing on it. Since I wasn't planning on running Windows, I opted for the DIY version to save some money. 

I won't repeat what is already in the excellent [Framework Laptop DIY Edition Quick Start Guide](https://guides.frame.work/Guide/Framework+Laptop+DIY+Edition+Quick+Start+Guide/57), but I'll share some of the high points and problems I ran into.

The only parts you need to assemble for the DIY laptop are:

* Memory: easy enough
* Storage: also easy
* Wireless: a little trickier, but not difficult
* I/O ports: I opted for 3 USB-C ports and 1 USB-A port, they snapped into place trivially.

The things that stood out to me about the Framework hardware was:

* The case screws are all designed to be half-removed and stay in place. As someone who always loses screws, I really appreciated this.
* The magnetic case clasps are also a surprisingly nice reassuring touch
* If you make any changes to the RAM configuration, you will be staring at a black screen for the first 1-2 minutes of the next boot. It isn't reassuring at all.
* The I/O ports are much further away from each other than on a MBP. The lines don't look great from an aesthetic perspective, but the distance makes it much easier to plug larger devices in, such as USB-C SD readers.
* The webcam is great if you have lots of light, but didn't look at good at low-light as the equivalent MacbBook camera. It was enough for me to change rooms and hook up a Logitech USB camera (which I eventually decided was unnecessary)

Due to OpenBSD compatibility issues, I used an older Intel Wireless card that was known to work well. 

## OpenBSD: Flashing a USB drive from macOS

I find I learn more about software by installing it from HEAD, or at least a recent snapshot of it. OpenBSD offers [nightly snapshot images](https://cdn.openbsd.org/pub/OpenBSD/snapshots/amd64/), so I opted to download OpenBSD from there. I don't typically do so, but due to my interest in the software signing space, I decided to follow the instructions to confirm that the install image matches the expected SHA256 signature:

```shell
curl -O https://cdn.openbsd.org/pub/OpenBSD/snapshots/amd64/SHA256                   shasum -c SHA256 --ignore-missing
```

I had no idea that the `shasum` command could pull hashes out of a text file like that. This is a great way to avoid corrupt downloads, but doesn't help at all for avoiding supply-chain attacks, as the checksums and the image share the same mutable distribution mechanism.

Writing the install image to disk on macOS is nearly identical to that of any other UNIX platform. Find the device name for the USB stick:

```shell
sudo diskutil list                                                                  ```

In this case, it's a 128GB Samsung Stick connected via USB-C, hiding at `/dev/disk4`:

```
/dev/disk0 (internal):
   #:                       TYPE NAME                    SIZE       IDENTIFIER
   0:      GUID_partition_scheme                         500.3 GB   disk0
   1:             Apple_APFS_ISC ⁨⁩                        524.3 MB   disk0s1
   2:                 Apple_APFS ⁨Container disk3⁩         494.4 GB   disk0s2
   3:        Apple_APFS_Recovery ⁨⁩                        5.4 GB     disk0s3

...
/dev/disk4 (external, physical):
   #:                       TYPE NAME                    SIZE       IDENTIFIER
   0:     FDisk_partition_scheme                        *128.3 GB   disk4
   1:                 DOS_FAT_32 ⁨UNTITLED⁩                128.3 GB   disk4s1
```

Unmount the disk, and flash it with OpenBSD:

```shell
sudo diskutil unmountDisk /dev/disk4 
sudo dd if=install70.img of=/dev/disk4 bs=1m                                         ```

## First Boot

During the first boot, I found myself staring at a black screen for a few minutes. It turns out that this weird behavior is expected when booting a standard open-source operating system due to Secure Boot. 

Once I rebooted, hit F2, and disabled secure boot, the laptop booted directly to USB.

```
Welcome to the OpenBSD/amd64 7.9 installation program.
(I)nstall, (U)pgrade, (A)autoinstall, or (S)hell?
```

Since this is a corporate laptop, I certainly wanted to use Full Disk Encryption. I followed the [OpenBSD Full Disk Encryption](https://www.openbsd.org/faq/faq14.html#softraidFDE), which meant selecting the `(S)hell` option.

While setting up the disks, the laptop suddenly lost power. What The Fudge?

The only thing I wasn't fully confident about was the DIMM insertion, so I attempted a RAM dance (something I learned from working in a Google Datacenter over a decade ago), but it happened again.

I then tried reseating all the components, and it happened again. I found a [scary sounding forum thread](https://community.frame.work/t/instant-power-loss/13474/9), but it wasn't a complete match for what I was seeing. The power loss only seemed to happen while I was typing, and only after a couple of minutes. 

In my 3rd install attempt, everything worked mysteriously. It was only later that I realized I was battling a race condition which seemingly only OpenBSD users suffer from.

One unexpected surprise after installation was that even my Intel Wireless card didn't work due to missing firmware blobs. I used an older EDIMax USB wireless card, and not only did it work great, but it magically allowed the Intel wireless card to work properly as OpenBSD downloads the necessary drivers during boot time via `fw_update`: if it has a working internet connection to begin with.

## Post-Installation

Once the machine was installed, I configured `doas` to allow the users in the `wheel` group (me)  to easily execute commands as `root`:

```shell
echo "permit persist :wheel" > /etc/doas.conf
```

I set the hostname:

```shell
echo wintermute.chainguard.dev | sudo tee /etc/myname
sudo hostname $(cat /etc/myname)
```

I copied the network configuration from the EDIMax USB ethernet to the Intel card I was using:

```shell
doas cp /etc/hostname.urtwn0 /etc/hostname.iwx0
```

OpenBSD disables audio/video recording by default, which makes it difficult to use video-conferencing software. I added these values to `/etc/sysctl.conf`:

```
kern.audio.record=1
kern.video.record=1
```

I configured OpenBSD to default to using my USB microphone for input and output. Oddly enough, there doesn't seem to be an easy way to enumerate audio devices in OpenBSD, so none of the graphical audio switchers work well. 


I couldn't get screen sharing to work in Google Meet in either Chrome or Firefox, but eventually made it function in Firefox by using:

```
```

To keep Firefox from suddenly crashing, I needed to up the maximum memory limits for the wheel class in `/etc/login.conf`:

```
```

I found in the end that most of the heartache in OpenBSD is related to one of two things: 

## Future Work

* Fan control: The Framework laptop fans seem overactive in OpenBSD, especially given the CPU temperatures. Linux probably behaves better here.

* Videoconferencing: I never did figure out how to get Google Meet's screen sharing feature to work within Google Chrome on OpenBSD. It works great in Firefox though. Also annoying: Zoom refuses to work due to an unsupported platform error.

* Editors: While NeoVim is good, 

* Whil

