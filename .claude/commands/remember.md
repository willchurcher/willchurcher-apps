# /remember — Capture preferences from this conversation

Scan the recent conversation for anything that looks like a user preference, opinion, or working style rule. Look for phrases like:
- "I hate / don't like / dislike / never want..."
- "I prefer / I like / always do / make sure..."
- "don't / never / always" followed by a behaviour
- Frustrations that led to a fix (implies a permanent rule)

## Steps

1. Identify 1–5 candidate preferences from the conversation. Be specific and actionable — phrase each as a rule Claude should follow going forward. For example:
   - "Always set `font-size: 16px` on inputs to prevent iOS Safari zoom"
   - "Never auto-commit without being asked"

2. Use AskUserQuestion to show the candidates and ask which to save. Allow multi-select. Each option label should be a short version of the rule, with the full rule as the description.

3. For each confirmed preference:
   - Read `/root/.claude/projects/-root-willchurcher-apps/memory/MEMORY.md`
   - Add the preference as a bullet under the `## User Preferences` section (create the section if missing)
   - Write the updated file

4. Confirm what was saved, or say "Nothing saved" if none were selected.
