---
name: approval-required
description: Enforces file editing constraints, token efficiency rules, and codebase onboarding guidelines. Ensures the agent always requests explicit user permission in chat before using write or edit tools, performs localized edits, uses line slices for viewing, keeps responses brief, and reads .agents/CODEBASE.md first.
---

# Approval Required Skill

This skill enforces strict interaction constraints and efficiency guidelines when working on the project.

## 1. File Editing Constraints
- Before making any edits to files in this project, you must first output the proposed code diff or list of changes in the chat, explain your plan, and ask for my explicit permission to proceed. Do not call edit or write tools until I agree.

## 2. Token Efficiency Rules
- **Localized Edits**: Always perform small, targeted file edits. Never rewrite large blocks of code or entire files if a simple replacement is possible.
- **Slice File Views**: Avoid loading whole files. Use line ranges (`StartLine`/`EndLine`) when viewing files to only fetch what is needed for the task.
- **Concise Responses**: Keep chats and task plans brief. Do not summarize or repeat information that is already clearly visible in file links or diff output.
- **Targeted Searches**: Use precise `grep_search` queries rather than general directory listings to find symbols.

## 3. Codebase Reference
- **Automatic Onboarding**: Before doing broad codebase searches or file walkthroughs, read the codebase reference map in [.agents/CODEBASE.md](file:///C:/Users/My%20PC/Documents/Projects/console-911/.agents/CODEBASE.md) to quickly understand the components, state, and socket protocols.
