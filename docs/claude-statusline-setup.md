# Claude Code Statusline Setup

Shows model name, estimated session cost, token usage, duration, and git branch in the Claude Code statusline.

```text
Claude Opus 4.6  $1.23  42.3k tokens  5m30s  main
```

## Quick Setup Prompt

Paste this into Claude Code to set it up automatically:

```text
Read docs/claude-statusline-setup.md and follow the Manual Setup steps exactly.
Copy the script to ~/.claude/statusline-command.sh, make it executable,
and add the statusLine block to ~/.claude/settings.json.
```

## Manual Setup

### 1. Create `~/.claude/statusline-command.sh`

```sh
#!/bin/sh
# Claude Code status line: model name, session cost, total tokens, and duration
# Set TRACK_RESUMES="true" to persist cost/token totals across session resumes
# (writes a small log to ~/.claude/session-costs.dat)
TRACK_RESUMES="true"

input=$(cat)

# Git branch
branch=$(git branch --show-current 2>/dev/null)

model=$(echo "$input" | jq -r '.model.display_name // "Unknown"')
model_id=$(echo "$input" | jq -r '.model.id // ""')

# Token counts
input_tokens=$(echo "$input" | jq -r '.context_window.total_input_tokens // 0')
output_tokens=$(echo "$input" | jq -r '.context_window.total_output_tokens // 0')

# Use cost.total_cost_usd if available (more accurate), fall back to token math
raw_cost=$(echo "$input" | jq -r '.cost.total_cost_usd // 0')
if [ "$raw_cost" = "0" ] || [ "$raw_cost" = "null" ] || [ -z "$raw_cost" ]; then
  # Determine pricing per million tokens based on model family
  # Opus:   input $15.00/M, output $75.00/M
  # Sonnet: input  $3.00/M, output $15.00/M
  # Haiku:  input  $0.25/M, output  $1.25/M
  case "$model_id" in
    *opus*)
      input_price=15.00
      output_price=75.00
      ;;
    *haiku*)
      input_price=0.25
      output_price=1.25
      ;;
    *)
      input_price=3.00
      output_price=15.00
      ;;
  esac
  raw_cost=$(awk "BEGIN { printf \"%.4f\", ($input_tokens * $input_price / 1000000) + ($output_tokens * $output_price / 1000000) }")
fi

# --- Session cost persistence across resumes (optional) ---
transcript=$(echo "$input" | jq -r '.transcript_path // ""')

accumulated_cost=0
accumulated_in=0
accumulated_out=0

if [ "$TRACK_RESUMES" = "true" ]; then
  # Format: session_id|date|accumulated_cost|last_seen_cost|accumulated_in|accumulated_out|last_seen_in|last_seen_out
  DAT_FILE="$HOME/.claude/session-costs.dat"

  session_id=""
  if [ -n "$transcript" ]; then
    session_id=$(basename "$transcript" .jsonl)
  fi

  if [ -n "$session_id" ]; then
    touch "$DAT_FILE" 2>/dev/null

    existing=$(grep "^${session_id}|" "$DAT_FILE" 2>/dev/null | head -1)

    if [ -n "$existing" ]; then
      # Parse existing entry
      acc_cost=$(echo "$existing" | cut -d'|' -f3)
      last_cost=$(echo "$existing" | cut -d'|' -f4)
      acc_in=$(echo "$existing" | cut -d'|' -f5)
      acc_out=$(echo "$existing" | cut -d'|' -f6)
      last_in=$(echo "$existing" | cut -d'|' -f7)
      last_out=$(echo "$existing" | cut -d'|' -f8)

      # Detect reset: current cost < last seen cost means session was resumed
      reset_detected=$(awk "BEGIN { print ($raw_cost < $last_cost) ? 1 : 0 }")
      if [ "$reset_detected" = "1" ]; then
        acc_cost=$(awk "BEGIN { printf \"%.4f\", $acc_cost + $last_cost }")
        acc_in=$(( acc_in + last_in ))
        acc_out=$(( acc_out + last_out ))
      fi

      accumulated_cost=$acc_cost
      accumulated_in=$acc_in
      accumulated_out=$acc_out

      # Update entry in dat file
      today=$(date +%Y-%m-%d)
      new_line="${session_id}|${today}|${accumulated_cost}|${raw_cost}|${accumulated_in}|${accumulated_out}|${input_tokens}|${output_tokens}"
      tmp_file="${DAT_FILE}.tmp.$$"
      grep -v "^${session_id}|" "$DAT_FILE" > "$tmp_file" 2>/dev/null
      echo "$new_line" >> "$tmp_file"
      mv "$tmp_file" "$DAT_FILE"
    else
      # New session — create entry
      today=$(date +%Y-%m-%d)
      new_line="${session_id}|${today}|0|${raw_cost}|0|0|${input_tokens}|${output_tokens}"
      echo "$new_line" >> "$DAT_FILE"

      # Prune old entries: remove >14 days old, keep max 100
      cutoff=$(date -v-14d +%Y-%m-%d 2>/dev/null || date -d "14 days ago" +%Y-%m-%d 2>/dev/null)
      if [ -n "$cutoff" ]; then
        tmp_file="${DAT_FILE}.tmp.$$"
        awk -F'|' -v cutoff="$cutoff" '$2 >= cutoff' "$DAT_FILE" > "$tmp_file" 2>/dev/null
        line_count=$(wc -l < "$tmp_file" | tr -d ' ')
        if [ "$line_count" -gt 100 ]; then
          tail -n 100 "$tmp_file" > "${tmp_file}.2"
          mv "${tmp_file}.2" "$tmp_file"
        fi
        mv "$tmp_file" "$DAT_FILE"
      fi
    fi
  fi
fi

# Calculate display values (accumulated from prior resumes + current)
cost=$(awk "BEGIN { printf \"%.2f\", $accumulated_cost + $raw_cost }")
total_in=$(( accumulated_in + input_tokens ))
total_out=$(( accumulated_out + output_tokens ))
total_tokens=$(( total_in + total_out ))
tokens_display=$(awk "BEGIN { printf \"%.1fk\", $total_tokens / 1000 }")

# Session duration from transcript file creation time
duration=""
if [ -n "$transcript" ] && [ -f "$transcript" ]; then
  start_epoch=$(stat -f "%B" "$transcript" 2>/dev/null)
  if [ -n "$start_epoch" ] && [ "$start_epoch" -gt 0 ] 2>/dev/null; then
    now_epoch=$(date +%s)
    elapsed=$(( now_epoch - start_epoch ))
    hours=$(( elapsed / 3600 ))
    minutes=$(( (elapsed % 3600) / 60 ))
    seconds=$(( elapsed % 60 ))
    if [ "$hours" -gt 0 ]; then
      duration=$(printf "%dh%02dm%02ds" "$hours" "$minutes" "$seconds")
    elif [ "$minutes" -gt 0 ]; then
      duration=$(printf "%dm%02ds" "$minutes" "$seconds")
    else
      duration=$(printf "%ds" "$seconds")
    fi
  fi
fi

# Build output
branch_part=""
if [ -n "$branch" ]; then
  branch_part=$(printf "  \033[0;34m%s\033[0m" "$branch")
fi

if [ -n "$duration" ]; then
  printf "\033[0;36m%s\033[0m  \033[0;33m$%.2f\033[0m  \033[0;32m%s tokens\033[0m  \033[0;35m%s\033[0m%s" "$model" "$cost" "$tokens_display" "$duration" "$branch_part"
else
  printf "\033[0;36m%s\033[0m  \033[0;33m$%.2f\033[0m  \033[0;32m%s tokens\033[0m%s" "$model" "$cost" "$tokens_display" "$branch_part"
fi
```

### 2. Make it executable

```bash
chmod +x ~/.claude/statusline-command.sh
```

### 3. Add to `~/.claude/settings.json`

Add the `statusLine` block to your existing settings:

```json
{
  "statusLine": {
    "type": "command",
    "command": "bash ~/.claude/statusline-command.sh"
  }
}
```

## Configuration

### `TRACK_RESUMES` (cumulative cost tracking)

When `TRACK_RESUMES="true"` (the default), the script tracks cost and token totals across session resumes. Without this, resuming a session resets the statusline counters to $0.

**How it works:** Each statusline tick, the script writes the current session's cost/token snapshot to `~/.claude/session-costs.dat`. When it detects counters have reset (i.e. a resume happened), it accumulates the pre-resume totals so the display stays accurate.

**To disable:** Change line 5 to:

```sh
TRACK_RESUMES="false"
```

This removes all file I/O — no `session-costs.dat` is created or read. The script behaves like the original (cost resets to $0 on resume). Everything else (model display, cost calculation, token count, duration) still works.

**Log file details:**

- Location: `~/.claude/session-costs.dat`
- Format: one pipe-delimited line per session
- Retention: entries older than 14 days are pruned, capped at 100 entries
- Pruning runs once per new session (not every tick)
- To clear history: `rm ~/.claude/session-costs.dat`

## Platform Notes

- **macOS:** Works as-is. Uses `stat -f "%B"` for file birth time.
- **Linux:** Change `stat -f "%B"` to `stat -c "%W"` on the relevant line. Note: `stat -c "%W"` returns 0 on filesystems that don't record birth time (e.g. ext4, xfs), so the guard `[ "$start_epoch" -gt 0 ]` will hide duration. As a fallback, use modification time: `stat -c "%Y"` (mtime) for best-effort duration (reduced accuracy).
- **Requires:** `jq` must be installed (`brew install jq` / `apt install jq`).

## Cost Estimates

The script uses `cost.total_cost_usd` from the Claude Code JSON when available (most accurate). When that field is missing, it falls back to token-based estimates using published API pricing. Cached tokens and batch discounts are not accounted for in the fallback.

| Model  | Input (per M tokens) | Output (per M tokens) |
| ------ | -------------------- | --------------------- |
| Opus   | $15.00               | $75.00                |
| Sonnet | $3.00                | $15.00                |
| Haiku  | $0.25                | $1.25                 |
