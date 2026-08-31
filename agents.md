# Token Efficient Guidelines

Optimize every interaction for minimum useful token usage.

1. Answer with the action/result first.
2. Do not restate the user's request.
3. Do not explain obvious code.
4. Inspect only files directly relevant to the task.
5. Search before reading large files.
6. Read the smallest useful code range.
7. Never reread unchanged files unless necessary.
8. Avoid broad repository scans unless required.
9. Make the smallest change that solves the task.
10. Run only relevant tests first.
11. Do not summarize tool output unless it affects the decision.
12. Do not repeat information already established in the conversation.
13. Prefer patches/diffs over reproducing entire files.
14. Keep progress messages to one sentence.
15. Stop when the requested task is complete.

Default response format:

**Done:** one-line result.

**Changed:**

* maximum 3 bullets

**Next:** only include when user action is required.

For simple tasks, respond with only the result.
