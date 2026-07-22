# SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
# SPDX-License-Identifier: BUSL-1.1
#
# Consumer ProGuard/R8 rules for xyz.self.sdk:nfc and its reflection-heavy transitive
# stack. jMRTD, SCUBA and BouncyCastle load providers and codec classes by name at
# runtime; without these keeps a minified release build fails the chip read with
# ClassNotFound / NoSuchMethod at PACE/BAC or SOD parsing time.

# --- BouncyCastle (bcprov-jdk18on) -------------------------------------------------
-keep class org.bouncycastle.** { *; }
-dontwarn org.bouncycastle.**
# JCA/JCE providers are instantiated reflectively.
-keep class org.bouncycastle.jce.provider.BouncyCastleProvider { *; }
-keep class org.bouncycastle.jcajce.provider.** { *; }

# --- jMRTD --------------------------------------------------------------------------
-keep class org.jmrtd.** { *; }
-dontwarn org.jmrtd.**

# --- SCUBA (net.sf.scuba) -----------------------------------------------------------
-keep class net.sf.scuba.** { *; }
-dontwarn net.sf.scuba.**

# --- Self NFC AAR (provider + vendored reader entry points) -------------------------
-keep class xyz.self.sdk.nfc.** { *; }
-keep class io.tradle.nfc.** { *; }

# jMRTD/SCUBA reference javax.smartcardio on non-Android JVMs; absent on Android.
-dontwarn javax.smartcardio.**
