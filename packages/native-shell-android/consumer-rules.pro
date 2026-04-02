# Consumer ProGuard rules for native-shell-android
# Keep bridge models for JSON serialization
-keep class xyz.self.sdk.bridge.** { *; }
-keep class xyz.self.sdk.api.** { *; }
