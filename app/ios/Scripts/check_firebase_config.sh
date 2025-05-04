#!/bin/bash

# GoogleService-Info.plistを確認するスクリプト
PLIST_ROOT="/Users/nicoshark/code/pop/self/app/ios/GoogleService-Info.plist"
PLIST_PATH="/Users/nicoshark/code/pop/self/app/ios/OpenPassport/GoogleService-Info.plist"

if [ -f "$PLIST_ROOT" ]; then
  echo "GoogleService-Info.plist exists in root directory"
  cp "$PLIST_ROOT" "$PLIST_PATH"
  echo "Copied to OpenPassport directory"
else
  echo "Error: GoogleService-Info.plist not found in root directory"
fi

if [ -f "$PLIST_PATH" ]; then
  echo "GoogleService-Info.plist exists in OpenPassport directory"
else
  echo "Error: GoogleService-Info.plist not found in OpenPassport directory"
fi 