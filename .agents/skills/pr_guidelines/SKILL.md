---
name: pr-guidelines
description: Enforces branching, testing, and Pull Request conventions. Requires switching to main first, dev testing before branching, pre-flight checks, and standard PR naming conventions.
---

# Ticket Workflow & Pull Request Guidelines (Developer Guide)

All code changes in the repository must be contributed via Pull Requests. Direct pushes to the remote `main` branch are blocked.

## 1. Workflow Sequence

When starting work on a new ticket/issue, follow this strict step-by-step sequence:

1. **Switch to main**: Always switch to the local `main` branch first:
   ```bash
   git checkout main
   git pull
   ```
2. **Implement changes**: Develop the code changes directly on your local `main` branch. **Do not do pre-flight checks yet.**
3. **User Dev Test**: Present the changes to the user and request they perform a development test on the local `main` branch. **Do not create a branch or a commit yet.**
4. **Pre-flight Checks**: Once the user approves the dev test, run formatting, typecheck, and build checks:
   - `npm run format` (formats and applies linter autofixes)
   - `npm run typecheck` (verifies TypeScript types)
   - `npm run build` (verifies production build compilation)
5. **Create Branch**: Create the new branch using the branching convention below:
   ```bash
   git checkout -b issue-<number>-<short-description>
   ```
6. **Commit & Pull Request**: Commit the changes and create the Pull Request.

## 2. Branching Convention

Branches must follow this naming convention:
`issue-<number>-<short-description>`

- Example: `issue-42-fix-crt-glow`

## 3. Pull Request Title Format

Pull Request titles must follow a strict format to automatically link with GitHub Issues:
`Issue #<issue number>: <short description>`

- Example: `Issue #42: Fix input box caret focus in CRT screen`

## 4. Linking Pull Requests to Issues

The description/body of the Pull Request should explicitly reference the issue it resolves using GitHub keywords to automatically link and close the issue.

- E.g., `Resolves #4` or `Closes #123` in the PR description.
