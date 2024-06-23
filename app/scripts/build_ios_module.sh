#!/bin/bash

source "scripts/common.sh"

cd witnesscalc
./build_gmp.sh ios
make ios
cd build_witnesscalc_ios

# Build for each circuit
for circuit in "${CIRCUITS[@]}"; do
    xcodebuild -project witnesscalc.xcodeproj \
      -scheme "$circuit" \
      -sdk iphoneos \
      -configuration Release \
      DEVELOPMENT_TEAM="$DEVELOPMENT_TEAM" \
      ARCHS="arm64" \
      -destination 'generic/platform=iOS' \
      PRODUCT_BUNDLE_IDENTIFIER=com.warrom.witnesscalc \
      build
done

cd ../..

# Copy artifacts for each circuit
for circuit in "${CIRCUITS[@]}"; do
    cp witnesscalc/build_witnesscalc_ios/src/Release-iphoneos/libwitnesscalc_${circuit}.a ios
    mkdir -p ios/ProofOfPassport/Assets.xcassets/${circuit}.dat.dataset
    cp witnesscalc/src/${circuit}.dat ios/ProofOfPassport/Assets.xcassets/${circuit}.dat.dataset/${circuit}.dat
    cp witnesscalc/src/witnesscalc_${circuit}.h ios
done

echo "copied artifacts to ios directory"