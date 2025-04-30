#!/bin/bash

# This script will update all pod targets to exclude arm64 architecture for simulator builds
# Run this after pod install

PODS_XCCONFIG="Pods/Target Support Files/Pods-SelfClip/Pods-SelfClip.debug.xcconfig"
PODS_RELEASE_XCCONFIG="Pods/Target Support Files/Pods-SelfClip/Pods-SelfClip.release.xcconfig"

# Add excluded architectures to xcconfig files
echo 'EXCLUDED_ARCHS[sdk=iphonesimulator*] = arm64' >> $PODS_XCCONFIG
echo 'EXCLUDED_ARCHS[sdk=iphonesimulator*] = arm64' >> $PODS_RELEASE_XCCONFIG

# Also directly modify QKMRZParser and SwiftQRScanner build settings in the main project
sed -i '' 's/SWIFT_OPTIMIZATION_LEVEL = "-Onone";/SWIFT_OPTIMIZATION_LEVEL = "-Onone";\n\t\t\t\tEXCLUDED_ARCHS[sdk=iphonesimulator*] = arm64;/' SelfClip.xcodeproj/project.pbxproj
sed -i '' 's/SWIFT_OPTIMIZATION_LEVEL = "-O";/SWIFT_OPTIMIZATION_LEVEL = "-O";\n\t\t\t\tEXCLUDED_ARCHS[sdk=iphonesimulator*] = arm64;/' SelfClip.xcodeproj/project.pbxproj

echo "Architecture settings updated"
