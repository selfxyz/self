#!/bin/bash

# Pod install with bounded automatic recovery for CocoaPods resolver drift.
# Most installs should reuse CocoaPods caches; only run pod updates after
# resolver failures and only for pods CocoaPods explicitly reports as conflicted.

set -euo pipefail

LOG_FILE="$(mktemp -t pod-install-log.XXXXXX)"
MAX_RECOVERY_ATTEMPTS=2

run_pod_install() {
  bundle exec pod install --no-repo-update 2>&1 | tee "$LOG_FILE"
}

reset_local_pod_resolution_state() {
  echo "🧹 Resetting local CocoaPods resolution state (Podfile.lock + Local Podspecs)..."
  rm -f Podfile.lock
  rm -rf Pods/Local\ Podspecs
}

extract_conflicting_pods() {
  awk '
    /could not find compatible versions for pod "/ {
      line = $0
      sub(/^.*pod "/, "", line)
      sub(/".*$/, "", line)
      if (length(line) > 0) {
        print line
      }
    }
  ' "$LOG_FILE" | sort -u
}

run_recovery_for_conflicts() {
  local attempt="${1:-1}"
  mapfile -t conflicting_pods < <(extract_conflicting_pods)

  if [ ${#conflicting_pods[@]} -eq 0 ]; then
    return 1
  fi

  echo "⚠️ Detected resolver conflicts for pods: ${conflicting_pods[*]}"

  # Hermes drift can live in the global CocoaPods tarball cache, which neither
  # the reset path nor `pod update` will refresh. Clean it first whenever
  # hermes-engine appears in the conflict list, regardless of which recovery
  # branch we take next.
  for pod in "${conflicting_pods[@]}"; do
    if [ "$pod" = "hermes-engine" ]; then
      echo "🧹 Clearing hermes-engine cache before recovery..."
      bundle exec pod cache clean hermes-engine --all >/dev/null 2>&1 || true
      break
    fi
  done

  # Path-based React Native podspecs can drift from a cached lockfile snapshot.
  # When RN core pods conflict, force CocoaPods to rebuild local resolution
  # state instead of trying partial pod updates against stale local podspecs.
  for pod in "${conflicting_pods[@]}"; do
    if [ "$pod" = "fmt" ] || [ "$pod" = "fast_float" ] || [ "$pod" = "hermes-engine" ] || [ "$pod" = "RCT-Folly" ]; then
      reset_local_pod_resolution_state
      return 0
    fi
  done

  # On the first attempt, try the cheap targeted `pod update`. If a follow-up
  # attempt is needed, escalate to a full reset — `pod update` won't refresh
  # `Pods/Local Podspecs/` when the podspec's source URL itself changed (e.g.
  # a pod moved from a local file to a remote URL), and re-running the same
  # `pod update` would loop on the same failure.
  if [ "$attempt" -ge 2 ]; then
    echo "⤴️ Targeted pod update did not resolve conflicts; escalating to full reset."
    reset_local_pod_resolution_state
    return 0
  fi

  echo "🔧 Running: bundle exec pod update ${conflicting_pods[*]} --no-repo-update --verbose"
  bundle exec pod update "${conflicting_pods[@]}" --no-repo-update --verbose
  return 0
}

echo "📦 Attempting pod install with existing CocoaPods caches..."
if run_pod_install; then
  echo "✅ Pods installed successfully"
  rm -f "$LOG_FILE"
  exit 0
fi

attempt=1
while [ "$attempt" -le "$MAX_RECOVERY_ATTEMPTS" ]; do
  echo "♻️ Recovery attempt ${attempt}/${MAX_RECOVERY_ATTEMPTS}..."
  if ! run_recovery_for_conflicts "$attempt"; then
    echo "❌ pod install failed with a non-resolver error; cannot auto-recover"
    rm -f "$LOG_FILE"
    exit 1
  fi

  echo "🔄 Retrying pod install..."
  if run_pod_install; then
    echo "✅ Pods installed successfully after automatic recovery"
    rm -f "$LOG_FILE"
    exit 0
  fi

  attempt=$((attempt + 1))
done

echo "❌ pod install still failing after ${MAX_RECOVERY_ATTEMPTS} recovery attempts"
rm -f "$LOG_FILE"
exit 1
