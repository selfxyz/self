# React Native Android CMake Build Fix Guide

## Issue: react-native-svg duplicate target conflict

**Context:**
- React Native 0.80.1 project with Android build failing
- JS engine (Hermes) is properly configured and working
- CMake build fails with: "add_library cannot create target 'react_codegen_rnsvg' because another target with the same name already exists"
- Error occurs in react-native-svg module during CMake configuration

**Current Error:**
```
CMake Error at /path/to/app/android/app/build/generated/source/codegen/jni/CMakeLists.txt:11 (add_library):
  add_library cannot create target "react_codegen_rnsvg" because another
  target with the same name already exists.  The existing target is a shared
  library created in source directory
  "/path/to/node_modules/react-native-svg/android/src/main/jni".
```

## Steps to Fix:

### 1. Update react-native-svg to latest version
```bash
npm install react-native-svg@latest
# or
yarn add react-native-svg@latest
```

### 2. If update doesn't work, try excluding react-native-svg from CMake build
Add to `android/app/build.gradle` in the android block:
```groovy
externalNativeBuild {
    cmake {
        cppFlags += "-fexceptions -frtti -std=c++11"
        arguments += "-DANDROID_STL=c++_shared"
        // Exclude problematic modules
        arguments += "-DEXCLUDE_SVG=ON"
    }
}
```

### 3. Alternative: Use a different SVG library
- Consider replacing react-native-svg with react-native-svg-transformer
- Or use a different SVG library compatible with RN 0.80.1

### 4. Temporary workaround: Build without native modules
```bash
cd android
./gradlew assembleDebug --exclude-task :app:configureCMakeDebug
```

### 5. Check for CMake policy settings
Add to CMakeLists.txt or build configuration:
```cmake
cmake_minimum_required(VERSION 3.22.1)
cmake_policy(SET CMP0002 NEW)
```

### 6. Verify the fix
- Clean build: `./gradlew clean`
- Rebuild: `./gradlew assembleDebug`
- Check APK contents: `unzip -l app/build/outputs/apk/debug/app-debug.apk | grep -i svg`

## Expected Outcome:
- CMake build completes successfully
- APK builds without duplicate target errors
- react-native-svg functionality works properly

## If the issue persists, consider:
- Downgrading react-native-svg to a version known to work with RN 0.80.1
- Using a different SVG library
- Filing an issue with react-native-svg maintainers about RN 0.80.1 compatibility

## Related Files Modified:
- `android/app/build.gradle` - CMake configuration
- `android/app/src/main/java/com/proofofpassportapp/MainApplication.kt` - React Native host configuration

## Notes:
- This fix preserves the JS engine (Hermes) configuration that was already working
- The issue is specific to CMake build configuration, not the JavaScript engine
- React Native 0.80.1 autolinking should handle most native modules automatically
