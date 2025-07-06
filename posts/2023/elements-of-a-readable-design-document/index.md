---
title: "Writing Readable Design Docs"
date: 2023-06-06
---
A reposting from my Google Doc at <https://tinyurl.com/readable-dd>

## **Why bother?**

_**Circulating a design document is like putting your idea up for code review.**_

Submitting ideas to the scrutiny of peer review is your team's best defense against engineering incompatible with its principles.

All humans have blind spots. Your goal as an author is to gather enough input to reveal them before execution. Issues found during design are [6X cheaper](https://www.researchgate.net/publication/255965523_Integrating_Software_Assurance_into_the_Software_Development_Life_Cycle_SDLC) to fix than during implementation:

![](https://i.snap.as/tN45o8UW.png)

The questions that reviewers should have in their mind while reading the document are:

* Does this fit with my organization's principles?
* Could the proposed implementation be made simpler?
* Are there alternative approaches to consider?
* What additional concerns should be addressed?

<!--more-->

## 10 Elements of Readable Design Documents

### 1. Optimized for reading

_**Be respectful of your reader's time.**_

Design documents should be just long enough to convey your novel idea and no longer.  The longer your design document, the less likely it is to be read and understood.

If your design document is over seven pages long, relocate supporting content into separate documents and add hyperlinks. If your design document is over 10 pages long, you are not respecting your reader's time.

### 2. Grounded by context

Why do we need this thing?

Design documents often have a shelf-life of 5-10 years and may be read by hundreds of engineers. _**Write design documents for the engineers that come after you.**_

Provide a Background section to ground all readers in the same context that you have as an author. This section should describe how this became a problem, why it is worth solving, and whether anyone has previously attempted to solve it. This section should not reference the proposed design.

### 3. Focused content

_**Most design documents should not include code or configuration examples.**_

If an example is critical to understanding a design (for example, a new API or config file format), show an example or two, but stay under 20 lines total.

Including code encourages [bike-shedding](https://exceptionnotfound.net/bikeshedding-the-daily-software-anti-pattern/) and distracts reviewers from reviewing the novel portions of your design and architecture. Code changes are better reviewed down the line using code-review tools, where more context is available.

### 4. Considers alternatives

The most critical section of a design document is the enumeration of ideas imagined and why they are no longer being considered. This section sends a message to prospective reviewers that you've done your homework and should serve to answer the question: "Is this solution sized appropriately?"

_**Your reviewers should be confident that your proposal is no more complicated than necessary and not simpler than required.**_

### 5. Consistently structured

To promote easy reading and ensure that the most important topics are covered, introduce a standard design document template within your organization. Here's my ideal set to start with, roughly based on Google's own internal structure:

* **Objective:** 1-2 line description of the impact you intend this new design to have
* **Background:** What context is necessary to understand this design? Assume the reader is brand-new to the project. Do not mention your proposed solution.
* **Goals/Non-Goals:** A bulleted list of your goals and what problems you do not intend to solve. This section helps illustrate design constraints.
* **Detailed Design:** This is where you describe the novel part of your design.
* **Alternatives Considered:** What ideas did you consider and discard?
* **(Reliability|Security|Privacy) Considerations:** optional. Include where helpful.

Noticeably missing are planning-related sections, as they come after design approval and are better tracked elsewhere. Keep your template concise and well-scoped to encourage folks to design early and design often.

### 6. Collaborative

To cover your blind spots, pair up with a co-author early on.

Share your design document widely before it is fully polished.  Encourage peers to suggest improvements or make them directly. In my experience, Sharing a Google Doc invites more collaboration and comments than sharing a pull request.

When feedback is light, set aside 10 minutes at the beginning of your next team meeting for attendees to read your document and add comments.

### 7. Measured Success

How will you prove whether or not this design was successful? Don't make the reviewer guess: paint them a picture of success.

If this design intends to replace an existing system, include the deprecation of the previous system and comparisons to the existing behavior. For example:

* $new_system handles 100% of requests within 1ms (vs 100ms)
* $old_system code base is deleted

Bonus points if you add a hyperlink to the authoritative data source.

### 8. Visual

Use this one strange trick to make your design doc memorable and encourage further reading: add an image.

![](https://i.snap.as/NBuZa0uF.jpg)

It doesn't really matter what the image is, but consider adding a simple diagram to convey how your system interacts with others. If you can't come up with a diagram, insert a relevant meme or photo of your dog. People will remember it.

### 9. Legible

Do not assume that every reader is a native English speaker.

Understanding new ideas is difficult enough in a native language and doubly so when it isn't in your native language. Do not make non-native readers suffer through poor grammar or slang.

Just as you would run a lint-checker on code, use a grammar checker to find text that may confuse readers.  Many free options exist, from Google Docs to [VS Code plug-ins](https://valentjn.github.io/vscode-ltex/) to purpose-driven solutions such as [Grammarly](https://grammarly.com/).

### 10. Annotated

Design docs should declare who the authors are, the design, when it was written, and where within the review process it is.  \\

Your design document will move across different document repositories over its lifetime, so don't rely on revision control or Google Docs metadata, which may not be visible to the reader.

### References

* [Design Docs at Google](https://www.industrialempathy.com/posts/design-docs-at-google/) by [Malte Ubl](https://www.industrialempathy.com/about/)
* [Oxide Computer Company: RFD 1 Requests for Discussion](https://oxide.computer/blog/rfd-1-requests-for-discussion/) by Jessica Frazelle

---

## Appendix: Example Design Doc Template

**Note for reviewers**

While reviewing this proposal, focus on answering for yourself:

Does this proposal fit with our engineering principles?

Are there unexplored concerns with this design, such as reliability or usability issues?

Could the proposed implementation be made simpler?

Are there other alternatives to consider?

**Summary**

1-2 sentence summary of the idea, including the expected impact if implemented.

**Background**

The background serves to ground all readers in the same context that you have as an author. You should describe how the problem came to be, why it's worth solving, and whether there were previous attempts to solve it. Assume that the reader is new to this project but not the company.

Define or add hyperlinks to terms the reader may not yet be familiar with.

**Goals**

* A bulleted list of specific goals for this proposal
* How will we know that this proposal has succeeded?
* Include specific, measurable outcomes that can be cited or tracked on a dashboard.

**Non-Goals**

A bulleted list of what is out of scope for this proposal

Is there something specific that is too difficult to solve at this time?

**Detailed design**

This section constitutes the bulk of the RFC and is typically 1-4 pages long. It should focus on the novel implementation idea and specific corner cases.

**Drawbacks**

There are tradeoffs to choosing any path: this is where you identify them. Why should we not implement this design? Consider costs in additional complexity, training, reliability, and dollars.

**Alternatives Considered**

This is the most critical section of an RFC. It serves as an enumeration of ideas imagined that were determined to be suboptimal.

This section lets readers know you have done your homework and helps them assess if the solution is sized appropriately.

**Title of Alternative #1**

What other ideas did you consider and discard? What is the impact of not taking this approach?