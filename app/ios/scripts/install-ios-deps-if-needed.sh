#!/bin/bash

set -euo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
IOS_DIR=$(cd -- "$SCRIPT_DIR/.." && pwd)
APP_DIR=$(cd -- "$IOS_DIR/.." && pwd)
REPO_DIR=$(cd -- "$APP_DIR/.." && pwd)

STAMP_DIR="$IOS_DIR/.cache"
STAMP_FILE="$STAMP_DIR/ios-deps.sha256"

mkdir -p "$STAMP_DIR"

compute_fingerprint() {
  local file
  local files=(
    "$IOS_DIR/Podfile"
    "$IOS_DIR/Podfile.lock"
    "$APP_DIR/Gemfile"
    "$APP_DIR/Gemfile.lock"
    "$APP_DIR/package.json"
    "$APP_DIR/react-native.config.cjs"
    "$REPO_DIR/pnpm-lock.yaml"
  )

  for file in "${files[@]}"; do
    if [ -f "$file" ]; then
      shasum -a 256 "$file"
    fi
  done
}

cd "$IOS_DIR"

if bundle check >/dev/null 2>&1; then
  echo "Ruby gems already satisfied; skipping bundle install."
else
  echo "Installing Ruby gems..."
  bundle install
fi

current_fingerprint="$(compute_fingerprint)"
saved_fingerprint="$(cat "$STAMP_FILE" 2>/dev/null || true)"
pods_in_sync=false

if [ -d "$IOS_DIR/Pods" ] &&
  [ -f "$IOS_DIR/Podfile.lock" ] &&
  [ -f "$IOS_DIR/Pods/Manifest.lock" ] &&
  cmp -s "$IOS_DIR/Podfile.lock" "$IOS_DIR/Pods/Manifest.lock"; then
  pods_in_sync=true
fi

if [ "$pods_in_sync" = true ] && [ "$current_fingerprint" = "$saved_fingerprint" ]; then
  echo "iOS pods already up to date; skipping pod install."
  exit 0
fi

if [ "$pods_in_sync" = true ] && [ -z "$saved_fingerprint" ]; then
  printf '%s\n' "$current_fingerprint" >"$STAMP_FILE"
  echo "iOS pods already in sync; saved dependency fingerprint and skipped pod install."
  exit 0
fi

echo "Installing iOS pods..."
"$SCRIPT_DIR/pod-install-with-cache-fix.sh"

compute_fingerprint >"$STAMP_FILE"
echo "Saved iOS dependency fingerprint to $STAMP_FILE."
