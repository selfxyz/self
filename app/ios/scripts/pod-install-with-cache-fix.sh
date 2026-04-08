#!/bin/bash

# Pod install with an on-demand Hermes cache fix.
# Most installs should reuse CocoaPods caches; only clear them after a failure
# that is likely caused by a stale Hermes artifact from a React Native upgrade.

set -e

echo "📦 Attempting pod install with existing CocoaPods caches..."
if bundle exec pod install --no-repo-update; then
  echo "✅ Pods installed successfully"
  exit 0
fi

echo "⚠️ pod install failed; clearing Hermes cache and retrying..."
bundle exec pod cache clean hermes-engine --all > /dev/null 2>&1 || true

echo "🔧 Running targeted fix: bundle exec pod update hermes-engine..."
bundle exec pod update hermes-engine --no-repo-update --verbose

echo "🔄 Retrying pod install..."
bundle exec pod install --no-repo-update
echo "✅ Pods installed successfully after cache fix"
