---
layout: base.njk
title: Home
---

This is my personal website, featuring selected projects and musings on software engineering, security, and technology.

## recent posts

{% set recentPosts = collections.posts | reverse %}
{% for post in recentPosts %}
  {% if loop.index <= 5 %}
- [{{ post.data.title }}]({{ post.url }}) - {{ post.date | date("%Y-%m-%d") }}
  {% endif %}
{% endfor %}

[View all posts →](/posts)

## open source projects

### actively contributing

- [quietude](http://github.com/tstromberg/quietude) — distraction-free Android *(author)*
- [livstid](http://github.com/tstromberg/livstid) — static photo website generator *(author)*

### past creations

- [chainguard-dev/malcontent](http://github.com/chainguard-dev/malcontent) — supply-chain attack detection *(author)*
- [chainguard-dev/osquery-defense-kit](http://github.com/chainguard-dev/osquery-defense-kit) — production-ready detection & response queries for osquery *(author)*
- [chainguard-dev/yacls](http://github.com/chainguard-dev/yacls) — SaaS access review system *(author)*
- [google/triage-party](http://github.com/google/triage-party) — Massively multiplayer GitHub triage *(author)*
- [google/pullsheet](https://github.com/google/pullsheet) — GitHub statistics exporter *(author)*
- [cstat](https://github.com/tstromberg/cstat) — a more civilized iostat *(author)*
- [google/slowjam](https://github.com/google/slowjam) — latency profiler for Go programs *(author)*
- [campwiz](http://github.com/tstromberg/campwiz) — California campsite finder *(author)*
- [gopkgsize](https://github.com/tstromberg/gopkgsize) — Visualization of package size relationships in a Go program *(author)*
- [extract-strava](https://github.com/tstromberg/extract_strava) — Rescue crashed Strava tracks *(author)*
- [google/namebench](http://github.com/google/namebench) — DNS benchmarking for macOS, Windows, Linux *(author)*
- [iexploder](https://code.google.com/archive/p/iexploder/) — browser-directed HTML/CSS fuzzer, included in WebKit *(author)*
- [geotoad](https://github.com/steve8x8/geotoad) — the original Geocaching app *(author)*

### past contributions

- [kubernetes/minikube](http://github.com/kubernetes/minikube) — Local Kubernetes for everyone! *(maintainer, v1.0 lead)*
- [Bugzilla](https://www.bugzilla.org) — Issue management for software developers *(contributor)*
- [FreeBSD](https://docs.freebsd.org/en/articles/contributors/) — open-source operating system *(contributor)*

## presentations

- 2025: [CackalackyCon - Supply-chain security from the trenches](https://github.com/tstromberg/supplychain-trenches?tab=readme-ov-file)
- 2021: [Klustered #11 - Repairing and destroying Kubernetes Clusters](https://www.youtube.com/watch?v=ysfUgYs4YYY)
- 2020: [Kubernetes Podcast: Minikube Redux](https://kubernetespodcast.com/episode/115-minikube-redux/)
- 2019: [KubeCon San Diego: Minikube](https://www.youtube.com/watch?v=3giynG20f3I)
- 2019: [KubeCon Shanghai: Bringing Kubernetes to the Next Billion Users](https://www.youtube.com/watch?v=ahb-_NBtOL0)
- 2018: [KubeCon Seattle: Deep Dive: Minikube](https://www.youtube.com/watch?v=46-FXiSEfE4)
- 2018: [KubeCon Seattle: Intro: Minikube](https://www.youtube.com/watch?v=2yBOVlonHQw)
