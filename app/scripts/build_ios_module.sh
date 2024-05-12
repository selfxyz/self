#!/bin/bash

cd witnesscalc
./build_gmp.sh ios
make ios
cd build_witnesscalc_ios

xcodebuild -project witnesscalc.xcodeproj \
  -scheme proof_of_passport \
  -sdk iphoneos \
  -configuration Release \
  DEVELOPMENT_TEAM="$DEVELOPMENT_TEAM" \
  ARCHS="arm64" \
  -destination 'generic/platform=iOS' \
  PRODUCT_BUNDLE_IDENTIFIER=com.warrom.witnesscalc \
  build

cd ../..
cp witnesscalc/build_witnesscalc_ios/src/Release-iphoneos/libwitnesscalc_proof_of_passport.a ios
cp witnesscalc/src/proof_of_passport.dat ios/ProofOfPassport/Assets.xcassets/proof_of_passport.dat.dataset/proof_of_passport.dat