---
name: linear-initiative-update
description: Draft and post a status update for a Linear initiative you own. Pulls the last status update plus recent issue activity across the initiative's projects, drafts a brief informative update, and posts it after confirmation.
disable-model-invocation: false
user-invocable: true
argument-hint: '[initiative name or ID]'
---

# Post a Linear Initiative Status Update

You help the user post a status update for a Linear initiative they own. The output should be informative but brief, focused on what changed since the last update.

## Input

`$ARGUMENTS` — Optional initiative name or ID. If omitted, list the user's owned initiatives and ask which one.

## Workflow

### Step 1: Pick the Initiative

If `$ARGUMENTS` is provided, resolve it via `mcp__linear-server__get_initiative` (pass `includeProjects: true`).

If omitted, call `mcp__linear-server__list_initiatives` with `owner: "me"`. Filter to `status: "Active"` initiatives. If more than one, list them with current health and ask which to update. If exactly one, use it directly.

### Step 2: Gather Context

Do this in two passes — fetch the last updates first, then size the issue-activity window from them.

**Pass A — Last status updates.** Call `mcp__linear-server__get_status_updates` with `type: "initiative"`, the initiative ID, and `limit: 3`. The most recent update's `createdAt` is the cutoff for "what's new."

**Pass B — Recent issue activity per project.** Compute the window from the most recent update's `createdAt`:

- Take `(today - createdAt)` rounded up to the next whole day, then add a 2-day buffer to catch issues that were in flight at the time of the previous update.
- Format as an ISO-8601 duration: `-P<N>D` for days, `-P<N>W` for whole weeks. Example: last update 13 days ago → use `-P15D`.
- If there is no previous update, default to `-P4W`.

For each project on the initiative, call `mcp__linear-server__list_issues` with `project: <id>` and `updatedAt: <computed window>`. Filter results to issues whose `completedAt`, `canceledAt`, or `startedAt` falls strictly after the previous update's `createdAt` — earlier activity is already covered by that update.

If the initiative has no projects or no recent activity, ask the user whether to post a "nothing to report" update or skip.

**Closed PRs (optional).** If the user asks about PRs, or if the issues found reference PR numbers, run `gh pr list --state merged --search "merged:>=<YYYY-MM-DD>" --limit 50 --json number,title,mergedAt,url` using the previous update's date. Cross-reference with the issues to enrich the draft (e.g., "shipped: account transfer prototype, Belgian ID fix"). Do not include PR numbers in the draft body.

### Step 3: Draft the Update

Compose a short body (2–4 sentences typical, up to ~6 for big events). Rules:

- **No ticket numbers** in the body unless the user explicitly asks. Reference work by what it accomplished, not by ID.
- **Lead with the most important event** since the last update (incident response, milestone hit, blocker, scope change).
- **Group small wins** rather than listing each issue.
- **Mention follow-ups still in progress** so the reader knows what's next.
- **Reference prior context** ("since the January follow-ups", "since last update") instead of repeating it.
- Avoid back-patting or filler. Signal over praise.

Pick a health value:

- `onTrack` — work is progressing as expected
- `atRisk` — meaningful blocker, slipping target, or unresolved issue
- `offTrack` — target missed or major issue unresolved

If the user has not given a signal, default to the previous update's health and ask in Step 4 whether to change it.

### Step 4: Confirm

Show the user:

- The drafted body
- The proposed health
- Note when the previous update was posted

Ask if they want to post as-is, tweak, or change the health. Iterate until they approve.

### Step 5: Post

Call `mcp__linear-server__save_status_update` with:

- `type: "initiative"`
- `initiative: <id>`
- `health: <chosen>`
- `body: <approved draft>`

Return the URL of the posted update.

## Multi-Initiative Mode

If the user asks to update multiple initiatives in one session, do them **one at a time** — draft, confirm, post for each before moving to the next. Do not batch-draft all of them up front; context from one update can shift the framing of the next.

## Important Notes

- Never post without explicit confirmation.
- Initiative summaries and descriptions are durable context, not status — do not edit them as part of an update.
- If the initiative has no recent activity and no external news, ask the user what to write rather than inventing content.
- Convert relative dates ("last week") to absolute dates when referencing them in the update body.
