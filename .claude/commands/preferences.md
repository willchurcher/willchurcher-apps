# /preferences — View and manage saved preferences

Read `/root/.claude/projects/-root-willchurcher-apps/memory/MEMORY.md` and display the contents of the `## User Preferences` section in a clean, readable format.

Then ask the user (using AskUserQuestion) what they'd like to do:
- **Done** — nothing to change
- **Add a preference** — prompt for the new rule, append it, confirm
- **Remove a preference** — show a multi-select of current prefs, remove selected ones, confirm
