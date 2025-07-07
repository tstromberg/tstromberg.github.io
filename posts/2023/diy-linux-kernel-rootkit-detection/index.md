---
title: "DIY Linux Kernel Rootkit Detection"
date: 2023-03-04
---
![](uzmvIJhe.jpg)

Today I will teach you how to roll your own detection of a classic Linux kernel rootkit using shell scripting (for explanation) and osquery (for production).

Your chance of encountering a Linux kernel rootkit in the wild is slim due to compatibility and distribution challenges, so this explanation is geared toward the most paranoid folks in the audience. For this demonstration, we'll use [reveng_rtkit](https://github.com/reveng007/reveng_rtkit) - one of the more modern examples of a Linux rootkit.

As of February 2023, this reveng_rtkit runs well on Debian, so I used [lima](https://github.com/lima-vm/lima) with `limactl start template://debian` to create my test environment.

<!--more-->

## How does one detect a rootkit anyways?

The trick to detecting a rootkit is to find cracks in the illusion they present. Most rootkits only hide their presence when probed with a specific syscall, but Linux has [hundreds of syscalls](https://filippo.io/linux-syscall-table/) to choose from. Most commonly, Linux rootkits will hide processes or directory entries by overriding [getdents(2)](https://man7.org/linux/man-pages/man2/getdents.2.html), but neglect [stat(2)](https://man7.org/linux/man-pages/man2/stat.2.html). Some rootkits hide file contents by overriding [read(2)](https://man7.org/linux/man-pages/man2/read.2.html), but forget about [mmap(2)](https://man7.org/linux/man-pages/man2/mmap.2.html).

## Collecting Evidence

Collecting the state of a system before and after a malware installation is an easy way to determine what attributes to alert on.

If you are only concerned about filesystem changes, many methods are available, such as [Sleuthkit](https://www.sleuthkit.org/) or [hashdeep](https://github.com/jessek/hashdeep). Fewer choices exist if you are concerned about the larger overall system state.

Since I work on the \[osquery-detection-kit,\]((https://github.com/chainguard-dev/osquery-defense-kit project) I’ll use it to collect a subset of system information to a file. osquery-detection-kit does require extremely recent versions of Go and osquery to be installed, so here's how I installed the dependencies:

```shell
arch=$(uname -m | sed -e s/x86_64/amd64/g -e s/aarch64/arm64/g)
curl -L https://go.dev/dl/go1.20.1.linux-${arch}.tar.gz | sudo tar -C /usr/local -zxvf -
curl -LO https://pkg.osquery.io/deb/osquery_5.7.0-1.linux_${arch}.deb
sudo dpkg -i osquery_5.7.0-1.linux_${arch}.deb
export PATH=/usr/local/go/bin:$PATH
```

Here's how I collected the data:

```shell
git clone https://github.com/chainguard-dev/osquery-defense-kit
cd osquery-defense-kit
git pull
make collection
```

This will populate a subfolder named `out/` with evidence, so that we may compare against it later.

## Installing The Rootkit

I followed the instructions on <https://github.com/reveng007/reveng_rtkit> to install the rootkit. Here's how I loaded it:

```shell
sudo insmod reveng_rtkit.ko
```

Afterward, `sudo dmesg` shows:

```log
[  382.584069] [+] reveng_rtkit: Created by @reveng007(Soumyanil)
[  382.584070] [+] reveng_rtkit: Loaded
[  382.584071] [*] reveng_rtkit: Hiding our rootkit LKM from `lsmod` cmd, `/proc/modules` file path and `/proc/kallsyms` file path
```

## Finding System State Differences

Now I'm able to collect system state once again and diff the two:

```shell
cd $HOME/osquery-defense-kit
make collect
diff -ubR ./out/<old> ./out/<new>
```

The first thing that stood out was that one of the sysctl's changed:

```diff
-config_value: current_value:0 name:kernel.tainted oid: subsystem:kernel type:string
+config_value: current_value:12288 name:kernel.tainted oid: subsystem:kernel type:string
```

The rootkit uses `kill -31` to hide processes, so I used `kill -31 $$` to hide my shell process, ran the collection, and ... found no further differences. This means I'm going to have to improve our detection scripts.

For testing, I also started a `sleep 7200 &` process in the background from the hidden shell. This rootkit also hid this subprocess - not all are so consistent.

## Detecting hidden pids

Kernel rootkits tend to do two things with varying levels of success: hide their kernel module, and hide a process ID. revenge_rtkit does this by hiding getdents() calls to /proc, but if you know the hidden process ID, you can stat it directly. Ironically, this is also how Linux hides lightweight threads from users.

For most of Linux's life, the maximum number of pids on a system was 32768, a relatively small area to stat. Most modern Linux distros have bumped this number up, so this process is going to be slow. To check your system's maximum pid number, run `cat /proc/sys/kernel/pid_max`.

Here's a shell script that iterates through all possible pid numbers, revealing any that were not found when listing /proc: \[[full source](https://github.com/tstromberg/sunlight/blob/main/hidden-pids.sh)\]

```shell
[[ $EUID != 0 ]] && echo "* WARNING: For accurate output, run $0 as uid 0"

declare -A visible
cd /proc || exit

start=$(date +%s)
for pid in *; do
    visible[$pid]=1
done

for i in $(seq 2 "$(cat /proc/sys/kernel/pid_max)"); do
    [[ ${visible[$i]} = 1 ]] && continue
    [[ ! -e /proc/$i/status ]] && continue
    [[ $(stat -c %Z /proc/$i) -ge $start ]] && continue

    #  pid is a kernel thread
    [[ $(awk '/Tgid/{ print $2 }' "/proc/${i}/status") != "${i}" ]] && continue

    exe=$(readlink "/proc/$i/exe")
    cmdline=$(tr '\000' ' ' <"/proc/$i/cmdline")
    echo "- hidden $(cat /proc/$i/comm)[${i}] is running ${exe}: ${cmdline}"
done
```

Here's the output of this script:

```log
- hidden bash[1924] is running /usr/bin/bash: /bin/bash --login
- hidden sleep[18518] is running /usr/bin/sleep: sleep 7200
```

To use roughly the same logic with osquery, use the following within `sudo osqueryi` \[[full source](https://github.com/chainguard-dev/osquery-defense-kit/blob/main/detection/evasion/pid-hidden-by-rootkit.sql)\]:

```sql
WITH RECURSIVE cnt(x) AS (
   SELECT 1
   UNION ALL
   SELECT x + 1
   FROM cnt
   LIMIT 4194304
)
SELECT p.*
FROM cnt
   JOIN processes p ON x = p.pid
WHERE x NOT IN (
       SELECT pid
       FROM processes
)
AND p.start_time < (strftime('%s', 'now') - 1)
AND (
       p.pgroup = p.pid
       OR (
           p.pid = p.parent
           AND p.threads = 1
       )
)
```

## Detecting unusual kernel taints

Earlier we talked about the value of `sysctl kernel.tainted` changing from 0 to 12288. Let's use the following script  to diagnose it \[[full source](https://github.com/tstromberg/sunlight/blob/main/kernel-taint.sh)\]:

```shell
declare -A table=(
    [0]="proprietary module was loaded"
    [1]="module was force loaded"
    [2]="kernel running on an out of specification system"
    [3]="module was force unloaded"
    [4]="processor reported a Machine Check Exception (MCE)"
    [5]="bad page referenced or some unexpected page flags"
    [6]="taint requested by userspace application"
    [7]="kernel died recently, i.e. there was an OOPS or BUG"
    [8]="ACPI table overridden by user"
    [9]="kernel issued warning"
    [10]="staging driver was loaded"
    [11]="workaround for bug in platform firmware applied"
    [12]="externally-built (out-of-tree) module was loaded"
    [13]="unsigned module was loaded"
    [14]="soft lockup occurred"
    [15]="kernel has been live patched"
    [16]="auxiliary taint, defined for and used by distros"
    [17]="kernel was built with the struct randomization plugin"
    [18]="an in-kernel test has been run"
)


taint=$(cat /proc/sys/kernel/tainted)
[[ $taint == 0 ]] && exit

echo "kernel taint value: ${taint}"
for i in $(seq 18); do
    bit=$(($i-1))
    match=$(($taint >> $bit &1))
    [[ $match == 0 ]] && continue
    echo "* matches bit $bit: ${table[$bit]}"
done

echo ""
echo "dmesg:"
dmesg | grep taint
```

Here's the output of that script when this rootkit is loaded:

```log
kernel taint value: 12288
* matches bit 12: externally-built (out-of-tree) module was loaded
* matches bit 13: unsigned module was loaded

dmesg:
[  368.765518] reveng_rtkit: loading out-of-tree module taints kernel.
[  368.777600] reveng_rtkit: module verification failed: signature and/or required key missing - tainting kernel
```

Here's the osquery query I generated for alerting on this kind of taint \[[full source](https://github.com/chainguard-dev/osquery-defense-kit/blob/main/detection/evasion/unusually-tainted-kernel-linux.sql)\]:

```sql
SELECT current_value AS value,
    current_value & 65536 AS is_aux,
    current_value & 8192 is_unsigned,
    current_value & 4096 AS out_of_tree,
    current_value & 512 AS kernel_warning,
    current_value & 614 AS requested_by_userspace,
    current_value & 8 AS force_unloaded,
    current_value & 4 AS out_of_spec,
    current_value & 2 AS force_loaded,
    current_value & 1 AS proprietary
FROM system_controls
WHERE name = "kernel.tainted"
    AND current_value NOT IN (0, 512, 12289, 4097)
```

## Detecting unusual /dev entries

We noted an unusual device earlier, which is used to communicate to the rootkit:

```shell
crw-------  1 root root 247,   0 Feb 23 15:53 etx_device
```

The "247" in the output there is the major device number, which generally maps to a kernel module. To find unexpected devices like this, you can either whitelist expected device names, or expected major numbers. We'll do it both ways here.

To use major number logic, you'll want to refer to <https://www.kernel.org/doc/Documentation/admin-guide/devices.txt>. Armed with this information, there are two data sources to check, /proc/devices, and /dev. The first one is interesting, as it's a map of major numbers to drivers:

```shell
Character devices:
  1 mem
  4 /dev/vc/0
  4 tty
…
189 usb_device
226 drm
247 etx_Dev
248 aux
```

One major flaw in my plan is that there are sections of dynamically generated major numbers, for instance, our suspicious 247 major device lands squarely in this section:

```log
240-254 block LOCAL/EXPERIMENTAL USE
```

So, I went with a hybrid approach to discover devices that are commonly found on UNIX systems, by major number when possible, and the device name when it's dynamic \[[full source](https://github.com/tstromberg/sunlight/blob/main/kernel-taint.sh)\]:

```shell

declare -A expected_major=(
    [1]="memory"
    [2]="pty master"
    [3]="pty slave"
    [4]="tty"
    [5]="alt tty"
    [6]="parallel"
    [7]="vcs"
    # [8]="scsi tape"
    [9]="md"
    [10]="misc"
    [13]="input"
    [21]="scsi"
    [29]="fb"
...
)

declare -A expected_low=(
    ["bsg/"]=1
    ["dma_heap/system"]=1
...
)

declare -A expected_high=(
    ["drm_dp_aux"]=1
    ["iiodevice"]=1
)

for path in $(find /dev -type c); do
    hex=$(stat -c '%t' $path)
    major=$(( 16#${hex} ))
    pattern=$(echo $path | cut -d/ -f3- | tr -d '[:0-9]')

    # Unix98 PTY Slaves
    (( major >= 136 && major <= 143 )) && continue
    [[ ${expected_major[$major]} != "" ]] && continue

    class="UNKNOWN"
    (( major >= 60 && major <= 63 )) && class="LOCAL/EXPERIMENTAL"
    (( major >= 120 && major <= 127 )) && class="LOCAL/EXPERIMENTAL"
    if (( major >= 234 && major <= 254 )); then
        class="low dynamic"
        [[ ${expected_low[$pattern]} == 1 ]] && continue
    fi

    if (( major >= 384 && major <= 511 )); then
        class="high dynamic"
        [[ ${expected_high[$pattern]} == 1 ]] && continue
    fi

    echo "${class} major device ${pattern}[${major}]"
    echo "* $(ls -lad $path)"
    echo "* /proc/devices: $(sed -n '/Block devices:/q;p' /proc/devices | grep -e "^ *${major}")"
    echo ""
done
```

Here is the output of this script on a system with reveng_rtkit installed:

```shell
low dynamic major device etx_device[247]
* crw------- 1 root root 247, 0 Mar  3 19:48 /dev/etx_device
* /proc/devices: 247 etx_Dev
```

In osquery, there is no reliable way to determine a major number, as it depends on a local magic database. There we'll rely on a simple whitelist of device names \[[full source](https://github.com/chainguard-dev/osquery-defense-kit/blob/main/detection/persistence/unexpected-device.sql)\]:

```sql
SELECT *
FROM
 file
WHERE
 (
   path LIKE '/dev/%'
   OR directory LIKE '/dev/%'
 )
 AND path_expr NOT IN (
   '/dev/acpi_thermal_rel',
   '/dev/autofs',
   '/dev/block/',
   '/dev/block/:',
   '/dev/bsg/',
   '/dev/bsg/:::',
…
)
```

## In Closing

In a future episode, we'll explore what it takes to detect an eBPF rootkit. The general philosophy is the same: know what to expect from your system and detect half-hearted illusions. I hope you enjoyed this article!

If you have questions, find me at [@tstromberg.](https://triangletoot.party/@thomrstrom "triangletoot.party/@thomrstrom")