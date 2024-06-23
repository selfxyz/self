#!/bin/bash

source "scripts/common.sh"

cd witnesscalc
./build_gmp.sh ios
make ios
cd build_witnesscalc_ios

xcodebuild -project witnesscalc.xcodeproj \
  -scheme register_sha256WithRSAEncryption_65537 \
  -sdk iphoneos \
  -configuration Release \
  DEVELOPMENT_TEAM="$DEVELOPMENT_TEAM" \
  ARCHS="arm64" \
  -destination 'generic/platform=iOS' \
  PRODUCT_BUNDLE_IDENTIFIER=com.warrom.witnesscalc \
  build

xcodebuild -project witnesscalc.xcodeproj \
  -scheme disclose \
  -sdk iphoneos \
  -configuration Release \
  DEVELOPMENT_TEAM="$DEVELOPMENT_TEAM" \
  ARCHS="arm64" \
  -destination 'generic/platform=iOS' \
  PRODUCT_BUNDLE_IDENTIFIER=com.warrom.witnesscalc \
  build

cd ../..
cp witnesscalc/build_witnesscalc_ios/src/Release-iphoneos/libwitnesscalc_register_sha256WithRSAEncryption_65537.a ios
mkdir -p ios/ProofOfPassport/Assets.xcassets/register_sha256WithRSAEncryption_65537.dat.dataset
cp witnesscalc/src/register_sha256WithRSAEncryption_65537.dat ios/ProofOfPassport/Assets.xcassets/register_sha256WithRSAEncryption_65537.dat.dataset/register_sha256WithRSAEncryption_65537.dat
cp witnesscalc/src/witnesscalc_register_sha256WithRSAEncryption_65537.h ios

cp witnesscalc/build_witnesscalc_ios/src/Release-iphoneos/libwitnesscalc_disclose.a ios
mkdir -p ios/ProofOfPassport/Assets.xcassets/disclose.dat.dataset
cp witnesscalc/src/disclose.dat ios/ProofOfPassport/Assets.xcassets/disclose.dat.dataset/disclose.dat
cp witnesscalc/src/witnesscalc_disclose.h ios
