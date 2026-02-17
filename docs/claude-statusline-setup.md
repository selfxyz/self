# Claude Code Statusline Setup

Shows model name, estimated session cost, token usage, and duration in the Claude Code statusline.

```
Claude Opus 4.6  $1.23  42.3k tokens  5m30s
```

## Quick Setup Prompt

Paste this into Claude Code to set it up automatically:

```
Read docs/claude-statusline-setup.md and follow the Manual Setup steps exactly.
Copy the script to ~/.claude/statusline-command.sh, make it executable,
and add the statusLine block to ~/.claude/settings.json.
```

## Manual Setup

### 1. Create `~/.claude/statusline-command.sh`

```sh
#!/bin/sh
# Claude Code status line: model name, session cost, total tokens, and duration

input=$(cat)

model=$(echo "$input" | jq -r '.model.display_name // "Unknown"')
model_id=$(echo "$input" | jq -r '.model.id // ""')

# Token counts for cost calculation
input_tokens=$(echo "$input" | jq -r '.context_window.total_input_tokens // 0')
output_tokens=$(echo "$input" | jq -r '.context_window.total_output_tokens // 0')

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
    # Default to Sonnet pricing
    input_price=3.00
    output_price=15.00
    ;;
esac

cost=$(awk "BEGIN { printf \"%.2f\", ($input_tokens * $input_price / 1000000) + ($output_tokens * $output_price / 1000000) }")

# Total tokens (input + output) formatted with "k" suffix
total_tokens=$(( input_tokens + output_tokens ))
tokens_display=$(awk "BEGIN { printf \"%.1fk\", $total_tokens / 1000 }")

# Session duration from transcript file creation time
transcript=$(echo "$input" | jq -r '.transcript_path // ""')
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
if [ -n "$duration" ]; then
  printf "\033[0;36m%s\033[0m  \033[0;33m$%.2f\033[0m  \033[0;32m%s tokens\033[0m  \033[0;35m%s\033[0m" "$model" "$cost" "$tokens_display" "$duration"
else
  printf "\033[0;36m%s\033[0m  \033[0;33m$%.2f\033[0m  \033[0;32m%s tokens\033[0m" "$model" "$cost" "$tokens_display"
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

## Platform Notes

- **macOS:** Works as-is. Uses `stat -f "%B"` for file birth time.
- **Linux:** Change `stat -f "%B"` to `stat -c "%W"` on line 43. The rest is portable.
- **Requires:** `jq` must be installed (`brew install jq` / `apt install jq`).

## Cost Estimates

These are estimates based on published API pricing, not actual billing. Cached tokens and batch discounts are not accounted for.

| Model  | Input (per M tokens) | Output (per M tokens) |
| ------ | -------------------- | --------------------- |
| Opus   | $15.00               | $75.00                |
| Sonnet | $3.00                | $15.00                |
| Haiku  | $0.25                | $1.25                 |
