#!/bin/bash

# Set Swift version in the project file
xcrun xcodebuild -project SelfClip.xcodeproj -target SelfClip -configuration Debug build \
  SWIFT_VERSION=5.0 \
  EXCLUDED_ARCHS[sdk=iphonesimulator*]=arm64 \
  VALID_ARCHS="x86_64 arm64" \
  -sdk iphonesimulator -arch x86_64 \
  SWIFT_OPTIMIZATION_LEVEL="-O" \
  -UseModernBuildSystem=YES
