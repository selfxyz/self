# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# Keep React Native bridge methods
-keep class com.facebook.react.** { *; }
-keepclassmembers class * {
    @com.facebook.react.bridge.ReactMethod <methods>;
}

# Keep Bouncy Castle classes
-keep class org.bouncycastle.** { *; }
-dontwarn org.bouncycastle.**

# Keep JMRTD classes
-keep class org.jmrtd.** { *; }
-dontwarn org.jmrtd.**

# Keep SCUBA classes
-keep class net.sf.scuba.** { *; }
-dontwarn net.sf.scuba.**

# Keep Commons IO
-keep class org.apache.commons.io.** { *; }
-dontwarn org.apache.commons.io.**

# Keep Gson
-keep class com.google.gson.** { *; }
-dontwarn com.google.gson.**

# Keep OkHttp
-keep class okhttp3.** { *; }
-dontwarn okhttp3.**
-dontwarn okio.**

# Keep our SDK classes
-keep class com.selfxyz.selfSDK.** { *; }
