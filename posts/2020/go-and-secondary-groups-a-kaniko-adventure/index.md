---
title: "Go & secondary groups: a kaniko adventure!"
date: 2020-04-10
---
![](jEcOae4C.jpg)

I wanted to get my feet wet with understanding [Kaniko](https://github.com/GoogleContainerTools/kaniko), an open-source in-cluster builder for Docker images. I happen to work with one of the maintainers, Tejal, and I asked her if there was any interesting UNIX-internals sort of bugs that might be interesting.

Here's the [mystery issue](https://github.com/GoogleContainerTools/kaniko/issues/1097): "The USER command does not set the correct gids, so extra groups are dropped". Here's an example to reproduce it:

<!--more-->

```
FROM ubuntu:latest
RUN groupadd -g 20000 bar
RUN groupadd -g 10000 foo
RUN useradd -c "Foo user" -u 10000 -g 10000 -G bar -m foo
RUN id foo
USER foo
RUN id
```

In an ideal world, both "id" commands should give the same output, but the second one did not include `foo`'s membership in `bar`. This definitely sounded
like a secondary group issue. I happened to know that secondary groups were bolted onto the UNIX implementation some 10 years later than primary groups (SVR4, by way of BSD).

## How to reproduce

First, get a shell into the Kaniko debug image, mounting in the out/ and integration/ subdirectory:

```shell
docker run -it --entrypoint /busybox/sh -v "$HOME"/.config/gcloud:/root/.config/gcloud -v (pwd)/integration:/workspace -v (pwd)/out:/out gcr.io/kaniko-project/executor:debug
```

I placed their Dockerfile into `kaniko/integration/1097`, which was mounted as `/workspace`. I could then trivially reproduce their case using kaniko:

```shell
/kaniko/executor -f 1097 --context=dir://workspace --destination=gcr.io/kaniko/test --tarPath=/tmp/image.tar --no-push
```

## Finding the culprit

The first question was: how does Kaniko implement user switching? Are they switching in such a way that populates secondary groups? I ask because the standard syscalls (`seteuid`, `setegid`) do not implement secondary groups: one has to instead call [`setgroups`](https://linux.die.net/man/2/setgroups). Here's what I found:

```go
cmd.SysProcAttr.Credential = &syscall.Credential{Uid: uid, Gid: gid}
```

`[SysProcAttr](https://golang.org/pkg/syscall/#SysProcAttr)` is not exactly a well-known feature in Go, but it's perfect for setting exec attributes such as:

* `Chroot` - lock the process into a directory
* `Pdeathsig` -  Signal that the process will get when its parent dies (Linux only)
* ... and many options for user namespacing: handy for container tools.

So, I figured it would be easy enough to improve the function in such a way that performs secondary group impersonation. The trick to you, dear reader, is to find the flaw!

```go
func impersonate(userStr string) (*syscall.Credential, error) {
   ...
   groups := []uint32{}
   gidStr, err := u.GroupIds()
   logrus.Infof("groupstr: %s", gidStr)

   for _, g := range gidStr {
       i, err := strconv.ParseUint(g, 10, 32)
       if err != nil {
           return nil, errors.Wrap(err, "parseuint")
       }
       groups = append(groups, uint32(i))
   }

   return &syscall.Credential{
       Uid:    uid,
       Gid:    gid,
       Groups: groups,
   }, nil
}
```

After running `make`, I hop back into the container to run the repro case, and I'm perplexed by the log message:

`INFO[0013] u.GroupIds returned: []`

Is kaniko running in some alternate chroot universe where it can't see? I double check by adding a shell command:

```go
out, err = exec.Command("grep", "foo", "/etc/group").Output()
```

The answer is no. At this point, there are only two options in my mind. Either this is a Go bug, or, if Go is using libc to make this call (likely),
it's a libc bug, or at least a disagreement between the two systems. As soon as you have made the decision to blame the compiler, it's time to gather evidence, typically by making a simpler test case. I opt first to investigate if Go is using libc to look up the list of secondary groups, starting with:

* [os/user/listgroups_unix.go](https://golang.org/src/os/user/listgroups_unix.go)

A couple of nested functions later, and you can see that it's calling:

```c
static int mygetgrouplist(const char* user, gid_t group, gid_t* groups, int* ngroups) {
  return getgrouplist(user, group, groups, ngroups);
}
```

This is almost the same implementation you see in busybox's `id` command [source](https://github.com/brgl/busybox/blob/master/coreutils/id.c)

```c
static int get_groups(const char *username, gid_t rgid, gid_t *groups, int *n)
{
  int m;
   if (username) {
   	 m = getgrouplist(username, rgid, groups, n);
   	 return m;
   }
```

Now, it's possible that Go is setting `ngroups` to 0, so we just build a little test case program:

```go
func main() {
    u, err := user.Lookup(os.Args[1])
    if err != nil {
   	 panic(fmt.Sprintf("lookup failed: %v", err))
    }
```

The test program runs great on macOS, but when I use [xgo](https://github.com/karalabe/xgo) to cross-compile it for Linux, all it outputs is:

```
-rwxr-xr-x    1 0        0          2125099 Mar 28 20:26 ggroups-linux-amd64

# ./ggroups-linux-amd64
/busybox/sh: ./ggroups-linux-amd64: not found
```

If you ever see this error in UNIX, it usually means one of three things:

* The program specifies an invalid `#!` line
* The binary needs a shared library that does not exist
* The binary is for the wrong architecture

In this case, I suspected #2, because I see that busybox is in use, chances are pretty high that this Docker image lacks libc. This environment
does not have `ldd`, but it has `strings`, so I can get some hints about the binary that was built:

```
strings /out/ggroups-linux-amd64  | head
bhkFaBAPgWy3KAp2RQcd/llKGprZSMM7cCxIzwmJ9/0QgnPM9q9pk--9IIyIXn/X9bTurj9MBmKtnVL-ANT
/lib64/ld-linux-x86-64.so.2
ATUSH
```

It looks like the right architecture, but yeah, that library doesn't exist. Just to confirm my sanity, I confirmed this program works great in an ubuntu container. I immediately suspect that either kaniko's user environment is trash, or kaniko is up to shenanigans in their `Makefile`. The easier is easier to check, and it doesn't take long to notice:

```make
out/executor: $(GO_FILES)
	GOARCH=$(GOARCH) GOOS=linux CGO_ENABLED=0 go build -ldflags 
       $(GO_LDFLAGS) -o $@ $(EXECUTOR_PACKAGE)
```

God damnit. kaniko works because they disable `cgo` to workaround the lack of a libc environment. Look back at [listgroups_unix.go](https://golang.org/src/os/user/listgroups_unix.go) - it uses C code, and the build rule specifically states only to build with cgo. If we look at the fallback implementation, we see:

```
func listGroups(*User) ([]string, error) {
    if runtime.GOOS == "android" || runtime.GOOS == "aix" {
        return nil, fmt.Errorf("user: GroupIds not implemented on %s", runtime.GOOS)
    }
    return nil, errors.New("user: GroupIds requires cgo")
}
```

But wait - we didn't see an error in our impersonate function! I try to compile it without cgo:

```
env CGO_ENABLED=0 go run ggroups.go root
panic: groupids failed: user: GroupIds requires cgo

goroutine 1 [running]:
main.main()
    /Users/tstromberg/src/ggroups/ggroups.go:18 +0x117
exit status 2
```

## The mystery deepens

If you see an error in one environment, and not the other, chances are either:

* A compiler error
* A kernel error
* You forgot to check the error code.

It's almost always the last option. Sure enough:

```go
   gidStr, err := u.GroupIds()
   logrus.Infof("groupstr: %s", gidStr)
```

As soon as I noticed this, I walked away from my computer for an hour. I suggest you do the same.