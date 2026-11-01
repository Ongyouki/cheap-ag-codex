
# Project Instructions

## Development principles

- Preserve existing Claude Code functionality.
- Keep the core cheap-ag engine shared between clients.
- Prefer minimal, targeted changes over broad refactoring.
- Run relevant tests and type-checks after modifications.
- Never commit, push, or publish without explicit authorization.
- Never make paid model/API calls without authorization.
- Keep architectural decisions and handoffs in docs/.

## Independent review workflow

The developer uses ChatGPT as an independent architecture
and code reviewer, alongside Codex CLI for implementation.

Do not generate review artifacts after every task.

When the developer asks to "prepare for review" or
"prepare a review packet":

1. Create .review/REVIEW_PACKET.md containing:
   - Objective and scope
   - Relevant architecture decisions
   - Files modified and reason for each change
   - Implementation summary
   - Tests run and their actual results
   - Risks, unresolved issues, and known limitations
   - Questions requiring independent review

2. Create .review/changes.patch from the current
   uncommitted tracked changes using git diff HEAD.
   Include staged and unstaged tracked changes.
   Report any untracked files separately.

3. Include the current branch, HEAD commit SHA,
   and whether the working tree is clean.

4. Never fabricate test results or claim untested
   behavior works.

5. Do not include secrets or credentials.

6. Do not modify production code while preparing
   review artifacts.

7. Do not commit or push review artifacts automatically.

For changes already pushed to GitHub, provide the
branch name and commit range instead. The independent
reviewer can inspect those changes directly.
