# mopro-ios

## Prepare

<!--TODO: If the monorepo is seperated, update this-->

Check the [Prepare](../README.md#prepare) and [Build Bindings](../README.md#build-bindings) steps in the root directory.

## Execute

Open the `MoproKit/Example/MoproKit.xcworkspace` in Xcode.
Use `command`+`R` to execute a simulator.

## Linker problems?

Add the following settings after

1. `MoproKit/Example/Pods/Target Support Files/MoproKit/MoproKit.debug.xcconfig`
2. `MoproKit/Example/Pods/Target Support Files/MoproKit/MoproKit.release.xcconfig`

files

```
LIBRARY_SEARCH_PATHS=${SRCROOT}/../../Libs
OTHER_LDFLAGS=-lmopro_ffi
USER_HEADER_SEARCH_PATHS=${SRCROOT}/../../include
```

## Tests for the example app

There are two ways to run tests for the example app:

1. Xcode
   Open the `MoproKit/Example/MoproKit.xcworkspace` in Xcode.
   Use `command`+`U` to run tests.

2. CLI
   Run tests with command line:

    ```sh
    cd MoproKit/Example
    xcodebuild test -scheme MoproKit-Example \
                    -workspace MoproKit.xcworkspace \
                    -destination "platform=iOS Simulator,OS=17.0.1,name=iPhone 15 Pro"
    ```

    Check your simulator version and the OS with:

    ```sh
    xcodebuild -showdestinations -workspace MoproKit.xcworkspace -scheme MoproKit-Example
    ```
