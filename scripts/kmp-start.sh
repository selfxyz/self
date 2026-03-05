#!/usr/bin/env bash
set -euo pipefail

PORT=5173

if command -v adb >/dev/null 2>&1; then
  adb start-server >/dev/null 2>&1 || true

  device_serials="$(adb devices | awk '$2 == "device" { print $1 }')"
  if [ -n "${device_serials}" ]; then
    echo "Setting adb reverse tcp:${PORT} -> tcp:${PORT} for connected Android devices..."
    while IFS= read -r serial; do
      [ -z "${serial}" ] && continue
      if adb -s "${serial}" reverse "tcp:${PORT}" "tcp:${PORT}" >/dev/null 2>&1; then
        echo "  ${serial}: ok"
      else
        echo "  ${serial}: failed (continuing)"
      fi
    done <<< "${device_serials}"
    echo "Use http://127.0.0.1:${PORT} on Android devices with adb reverse."
  else
    echo "No adb devices detected. Run 'adb reverse tcp:${PORT} tcp:${PORT}' once a device is connected."
  fi
else
  echo "adb not found. Skipping reverse setup."
fi

echo "Starting webview dev server on 0.0.0.0:${PORT}..."
exec yarn workspace @selfxyz/webview-app dev --host 0.0.0.0 --port "${PORT}"
