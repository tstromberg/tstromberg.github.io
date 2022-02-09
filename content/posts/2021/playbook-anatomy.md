---
title: "The anatomy of a great playbook entry"
date: 2021-05-21
description: "What if you could easily reduce the length of outages by 3X?  According to the SRE book, \"recording t..."
slug: playbook-anatomy
main_image: https://dev-to-uploads.s3.amazonaws.com/uploads/articles/k7idltgd9vjp5kz3e4y3.jpg
---
What if you could easily reduce the length of outages by 3X?

According to the [SRE book](https://sre.google/sre-book/introduction/), "recording the best practices ahead of time in a playbook produces roughly a 3x improvement in MTTR".  This improvement mirrors my experience with well-written playbooks. 

So what makes a playbook entry "great"?

## Philosophy

Remember how you felt in your first on-call rotation, when you were paged at 3am for a system you barely understood? **Write your playbook entries for that person.**

Playbooks should provide just enough context to confidently work through an incident, without providing extraneous content that will be a burden to keep up-to-date.

Be wary of playbooks that offer exact remediation steps: these are often a sign of sacrificing human blood to a system that should be automated.

## Discovery

Alerts should always include the relevant playbook URL. Otherwise, you will introduce human error by introducing the possibility of the responder following the incorrect playbook.

Consider including the alert name in the playbook URL to make it easier to find. This also the alert template to be templatized in some systems. For example: `https://playbooks/%%ALERT_NAME%%`

## Structure

Playbooks are the easiest to scan through in an emergency when they have a consistent structure. The exact best structure may differ depending on the organization, but this is what has worked for me:

The structure that works best is highly dependent on your team's culture, but this is what has worked for me:

- **Severity**: How to assess the criticality of this alert from your team's point of view. Is it a slow-burning issue that generates tickets, a critical paging event, or does the severity depend on the duration?

- **Impact**: How are your customers impacted by this alert? Often a one-liner, for example: "None immediately. If ignored, may result in revenue-impacting customer provisioning failures due to resource exhaustion"

* **Metrics**: 1-2 graphs showing the impact, duration, and if the effect is worsening. Inline live-updating graphs work best, as they can prevent the incident responder from making unnecessary changes when the problem is dissipating. Hyperlinks are nearly as good.

* **Background**: What should a new person on the on-call rotation know about this system? Be terse, providing a hyperlink for more information and/or an architectural diagram. To reduce maintenance burden and cognitive load during incident response, share this section between multiple playbook entries via templating.

* **Mitigation**: What are the recommended steps to mitigate the issue? This is often in checklist-style and may include steps for rolling back or redirecting traffic.

* **Debugging**: How should one get started digging into why this alert is firing? For example:

     1. Check for recent fatal error messages:
     2. Check the cluster for free disk space:
     3. Check <url> to see when the last release went out

* **References**: Links to the alert configuration, or code that generates the metric used by the alert, can be useful in understanding the underlying behavior. Post-mortems can also be valuable.

## Formatting

* Be concise
* Bulleted or numbered lists instead of paragraphs.

The [Kubernetes Documentation Style Guide](https://kubernetes.io/docs/contribute/style/style-guide/)  has great recommendations for technical documentation, but the most important for playbooks is: **make your commands trivial to copy and paste.**

- Do not include the command prompt. S
  - See: [data loss due to > character in prompt](https://tanelpoder.com/posts/how-to-stay-safe-in-shell/)
- Separate commands from example output
- Do not include real but unrelated host, site, or cluster names in your example command.
  - I once saw an outage spread when a responder copied an example command with the intent to edit the hostnames before pressing enter. They pressed enter first.

## Maintenance

Keep playbooks up to date by:

* Regularly scheduled ["Wheel of Misfortune" role-playing game sessions]([https://sre.google/sre-book/accelerating-sre-on-call/), where the previous on-call engineer walks the current on-call engineer through a pager response scenario. 

* Post-mortem action items that suggest playbook updates to decrease the resolution time for future pages for the same alert.

Big-bang efforts such as auditing all of the playbooks for relevance are best made once initially, to get the playbooks into the same structure. I have never seen quarterly playbook reviews work.



*Special thanks to [Joseph Bironas](https://josebiro.medium.com/) for editorial feedback and ideas for this article.*











