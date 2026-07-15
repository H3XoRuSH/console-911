---
name: pr-guidelines
description: Enforces branching and Pull Request conventions. Requires the branch name to match issue-<number>-<description> and the PR title to follow "Issue #<issue number>: <short description>".
---

# Pull Request & Branching Guidelines (Developer Guide)

All code changes in the repository must be contributed via Pull Requests. Direct pushes to the `main` branch are blocked.

## 1. Branching Convention
Create a new branch off `main` using the following naming convention:
```bash
git checkout -b issue-<number>-<short-description>
# Example: git checkout -b issue-42-fix-crt-glow
```

## 2. Pull Request Title Format
Pull Request titles must follow a strict format to automatically link with GitHub Issues:
```text
Issue #<issue number>: <short description>
# Example: Issue #42: Fix input box caret focus in CRT screen
```

## 3. Linking Pull Requests to Issues
The description/body of the Pull Request should explicitly reference the issue it resolves using GitHub keywords to automatically link and close the issue.
- E.g., `Resolves #4` or `Closes #123` in the PR description.

## 4. Pre-flight Verification Checklist
Before submitting a PR, always run and verify:
1. `npm run format` (formats and applies linter autofixes)
2. `npm run typecheck` (verifies TypeScript types)
3. `npm run build` (verifies production build compilation)

