# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# ==============================================================================
# React Native / Hermes
# ==============================================================================
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.react.** { *; }
-keepclasseswithmembernames class * { native <methods>; }

# Keep classes that use reflection or serialization
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    !static !transient <fields>;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}

# ==============================================================================
# Firebase
# ==============================================================================
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

# ==============================================================================
# Sentry
# ==============================================================================
-keep class io.sentry.** { *; }
-dontwarn io.sentry.**

# ==============================================================================
# Sumsub / iDentic SDK
# ==============================================================================
-keep class com.sumsub.sns.** { *; }
-dontwarn com.sumsub.sns.**

# ==============================================================================
# NFC / Passport libraries (JMRTD, SCUBA, BouncyCastle/SpongyCastle)
# ==============================================================================
-keep class org.jmrtd.** { *; }
-keep class net.sf.scuba.** { *; }
-keep class org.spongycastle.** { *; }
-keep class org.bouncycastle.** { *; }
-dontwarn org.jmrtd.**
-dontwarn net.sf.scuba.**
-dontwarn org.spongycastle.**
-dontwarn org.bouncycastle.**

# ==============================================================================
# ML Kit (text recognition for MRZ scanning)
# ==============================================================================
-keep class com.google.mlkit.** { *; }
-dontwarn com.google.mlkit.**

# ==============================================================================
# JNA (used by native modules)
# ==============================================================================
-keep class com.sun.jna.** { *; }
-dontwarn com.sun.jna.**

# ==============================================================================
# OkHttp / Retrofit (used by passport reader and networking)
# ==============================================================================
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn retrofit2.**

# ==============================================================================
# RxJava
# ==============================================================================
-dontwarn io.reactivex.**

# ==============================================================================
# Strip verbose/debug logging in release builds
# ==============================================================================
-assumenosideeffects class android.util.Log {
    public static int v(...);
    public static int d(...);
}
