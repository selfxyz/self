#!/bin/bash
# SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

# Reset Xcode project after local fastlane builds
set -euo pipefail

PROJECT_NAME="${IOS_PROJECT_NAME:-Self}"
PBXPROJ="ios/${PROJECT_NAME}.xcodeproj/project.pbxproj"

if [ ! -f "$PBXPROJ" ]; then
  echo "Project file not found: $PBXPROJ" >&2
  exit 1
fi

MARKETING_VERSION=$(grep -m1 "MARKETING_VERSION =" "$PBXPROJ" | awk '{print $3}' | tr -d ';')
CURRENT_VERSION=$(grep -m1 "CURRENT_PROJECT_VERSION =" "$PBXPROJ" | awk '{print $3}' | tr -d ';')

# Validate extracted versions
if [[ -z "$MARKETING_VERSION" || -z "$CURRENT_VERSION" ]]; then
  echo "Failed to extract version information from $PBXPROJ" >&2
  exit 1
fi

git checkout -- "$PBXPROJ"

if sed --version >/dev/null 2>&1; then
  sed -i -e "s/\(MARKETING_VERSION = \).*/\1$MARKETING_VERSION;/" -e "s/\(CURRENT_PROJECT_VERSION = \).*/\1$CURRENT_VERSION;/" "$PBXPROJ"
else
  sed -i '' -e "s/\(MARKETING_VERSION = \).*/\1$MARKETING_VERSION;/" -e "s/\(CURRENT_PROJECT_VERSION = \).*/\1$CURRENT_VERSION;/" "$PBXPROJ"
fi

echo "Reset $PBXPROJ"
