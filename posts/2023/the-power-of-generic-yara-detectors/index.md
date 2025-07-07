---
title: "KANDYKORN and the power of generic YARA detectors"
date: 2023-11-04
---
At my current employer, nation-state actors are part of our threat model. So, I get a little excited when someone posts malware that is tied to one of the big-4 (China, North Korea, Russia, United States of America). Last week, Elastic Security Labs posted an article titled [DPRK passing out KANDYKORN](https://www.elastic.co/security-labs/elastic-catches-dprk-passing-out-kandykorn) outlining the latest macOS malware discovery from North Korea, and this week a sample appeared in the [Objective-See Malware collection](https://github.com/objective-see/Malware) for inspection.

![](ZPNXRdih.webp)

I threw our [YARA](https://yara.readthedocs.io/en/v3.4.0/index.html) queries at Kandy Korn, and found that 2 of the 3 binaries were identified as suspicious:

<!--more-->

```log
MEDIUM objective-see/KandyKorn/kandykorn
  * generic_scan_tool
      f_gethostbyname: gethostbyname
      f_socket: socket
      f_connect: connect
      o_probe: probe
      o_port: port
  - sha256: 927b3564c1cf884d2a05e1d7bd24362ce8563a1e9b85be776190ab7f8af192f6
/Users/t/src/malware/objective-see/KandyKorn/log

MEDIUM objective-see/KandyKorn/log
  * opaque_macho_binary
      word_with_spaces: ja kw
  - sha256: 3ea2ead8f3cec030906dcbffe3efd5c5d77d5d375d4a54cca03bfe8a6cb59940
```

However, no virus scanners could detect this Malware until this week. That's the power of generic YARA detectors: once you define your baseline of normalcy, you can detect the truly weird things that circulate through your network.

## Two generic YARA techniques worth trying

What do I mean by a generic YARA detector? I mean YARA rules that are designed to match multiple kinds of suspicious binaries, even those you have never seen before. 

I'm going to share these two YARA rules that were capable of catching KandyKorn before it was published. The first generic query detects portscanners - it’s what I refer to as a “capabilities-based” detector:

```yara
rule generic_scan_tool {
  strings:
    $f_gethostbyname = "gethostbyname"
    $f_socket = "socket"
    $f_connect = "connect"
    $o_banner = "banner"
    $o_Probe = "Probe"
    $o_probe = "probe"
    $o_scan = "scan"
    $o_port = "port"
  condition:
    all of ($f*) and any of ($o*)
}
```

This rule works by trying to guess at the capabilities of a program by parsing through strings it mentions. YARA rules excel at discovering the latent capabilities of a program, which can ocassionally catch things that behavioral analysis misses.

My second favorite kind of detector is an obfuscation-detector: searching for binaries that seem to have gone through a process to hide the strings a capabilities-based detector might rely on. 

This query uncovers Mach-O binaries that have been intentionally obfuscated, by measuring the number of words found with spaces between them:

```yara
rule opaque_macho_binary {
  strings:
    $word_with_spaces = /[a-z]{2,} [a-z]{2,}/
  condition:
    filesize < 52428800 and (uint32(0) == 4277009102 or uint32(0) == 3472551422 or uint32(0) == 4277009103 or uint32(0) == 3489328638 or uint32(0) == 3405691582 or uint32(0) == 3199925962) and #word_with_spaces < 4
}
```

The idea is that very few Mach-O binaries have no sentence references. These sentences are sometimes error messages, sometimes usage messages, and sometimes phrases that are displayed to the screen. Almost no binaries have less than 4 words with spaces.

Since writing this rule, I haven't seen that alert fire for anything other than malware, and it has caught quite a few samples.

Here's a bonus query that matches the "Discord" binary by way of looking at its capabilities. This query Swift binaries that ship with a debugging entitlement and references executables, which isn't a common combination. This entitlement is normally stripped when you ship a binary, but I guess the DPRK did not get that memo.

```yara
rule swift_debug_program_with_exec_ref {
	strings:
		$task_allow = "com.apple.security.get-task-allow"
		$mh_execute_header = "_mh_execute_header"
		$executable = "executable"
		$swift_force_load = "__swift_FORCE_LOAD"
	condition:
		all of them
}
```

This next generic query also matches [Janicab](https://archive.f-secure.com/weblog/archives/00002576.html), though I suspect it will also yield false positives:

```yara
rule executable_place_ref {
	strings:
		$xecURL = "xecURL"
		$xecutableURL = "xecutableURL"
		$xecUrl = "xecUrl"
		$xecutableUrl = "xecutableUrl"
		$xecFile = "xecFile"
		$xecutableFile = "xecutableFile"
	condition:
		any of them
}
```
The “kandykorn” binary has many opportunities to be matched generically based on latent capabilities. For example, very few programs list system pids and reference libcurl:

```yara
rule proc_listpids_and_curl {
	strings:
		$proc_listpids = "proc_listpids"
		$libcurl = "libcurl"
	condition:
		all of them
}
```

Similarly, the `log` binary (aka SUGARLOADER) can be matched by the following YARA query:

```yara
rule notification_dialog_with_sysctl_and_curl {
	strings:
		$display_alert = "CFUserNotificationDisplayAlert"
		$socket = "socket"
		$sysctl = "sysctl"
		$getpid = "getpid"
		$curl = "curl"
	condition:
		all of them
}
```

Some may argue that generic queries like this are a headache due to false-positive management, but it depends on your mission and threat model: are you more interested in catching known or unknown malware? If the latter, try generic queries and aggressively update them to reduce the false positive rate to near zero. Consider all alerts to be actionable.

If you need hints as to what to match in your generic queries, here's an alias I keep around to extract the more important strings for UNIX binaries:

```shell
strings - "$1" 
  | egrep "/[a-zA-Z][a-z]{2,}|[A-Za-z]{4}|[a-zA-Z]{2}-[a-zA-Z]{2}|\d+\.\d+\.\d+|[0-9a-f]:[0-9a-f]" 
  | egrep -v "^(__TEXT|__DATA|__text|__stubs|__cstring|__const|__data|__common|__LINKEDIT|__literals|__ojc_methname|__unwind_info|__mod_init_func|__obj_|__la_symbol_ptr|__eh_frame|__DATA_CONST|__PAGEZERO|__init_offsets|__swift5_.*|__objc_.*|AUAT.*|AVAUI.*)$" | uniq
```

Good luck out there!