---
title: "The makings of a great playbook entry"
date: 2021-05-19
description: "Playbooks are high-level guides for how to respond to an automated alert. Perhaps you were introduced..."
slug: the-makings-of-a-great-playbook-entry-2f43-temp-slug-6540710
draft: true
main_image: https://dev-to-uploads.s3.amazonaws.com/uploads/articles/lqpn3qng1h118f5zpr6i.jpg
---
Playbooks are high-level guides for how to respond to an automated alert. Perhaps you were introduced to playbooks when you read the following line from the [https://sre.google/sre-book/introduction/](SRE book introduction):

> thinking through and recording the best practices ahead of
> time in a "playbook" produces roughly a 3x improvement in
> MTTR (mean-time-to-resolution) as compared to the strategy of "winging it."

So what makes a great playbook entry?

# Philosophy

A playbook entry needs to provide just enough context for a new on-call responder to confidently follow without so much content that keeping the document up-to-date causes a burden. 

* Think concise
* Think bulleted or numbered lists instead of paragraphs.

# Discovery

*Alerts should include playbook URLs: otherwise, you introduce human error by adding the chance of the responder following the wrong playbook*

Consider naming the playbooks directly after the alert so that you can templatize your alert template to specify something like: `https://playbooks/%%ALERT_NAME%%`

# Structure

Playbooks are the easiest to read if they have a consistent structure. This property is especially useful when you are paged at 3am due to an outage in a system you are not experienced with.
 
The structure that works best is highly dependent on your team's culture, but for my own uses, this is what has worked for me:

- **Severity** - How to assess the criticality of this page to you and your team. Does the severity of this alert rise with duration? Often a one-liner.

- **Impact** - How are customers impacted by this alert? Often a one-liner.

* **Metrics** - Nearly every alert has an accompanying set of graphs to see the damage, duration, and if the effect is worsening. In my favorite playbooks, these graphs are displayed inline. Having a link to the relevant metric is nearly as good.

* **Background** - What should a new person on the on-call rotation know about this system? Be as brief as possible, providing at most an architectural diagram and a hyperlink to more technical information. This section can be shared across multiple playbook entries via templatization.

* **Mitigation or Remediation** - What are the recommended steps to mitigate or remediate the issue? This is often in checklist style and may include steps for rolling back or redirecting traffic.

* **Debugging** - How should one get started digging into debugging why this alert is firing?

* **References** - Links to the alert configuration, or code that generates the metric used by the alert, can be useful in understanding the underlying behavior. post-mortems where this alert was important, can also be valuable references.

# Maintenance

In my experience, the best way to keep playbooks up to date are:

* Regularly scheduled "Wheel of Misfortune" game sessions, where the previous on-call engineer walks the current on-call engineer through a pager response scenario. 

* Post-mortem action items that suggest playbook updates to decrease the resolution time for future pages for the same alert.

In my experience, big-bang efforts such as auditing all of the playbooks for relevance are best made once to get the playbooks into the same structure. 







