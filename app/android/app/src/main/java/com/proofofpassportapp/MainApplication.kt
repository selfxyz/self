// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

package com.proofofpassportapp

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.soloader.OpenSourceMergedSoMapping
import com.facebook.soloader.SoLoader

class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost =
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): MutableList<ReactPackage> =
            PackageList(this).packages.apply {
              // Packages that cannot be autolinked yet can be added manually here, for example:
              // add(MyReactNativePackage())
              add(CameraActivityPackage())
              add(QRCodeScannerPackage())
              add(BackupPackage())

              // Note: RNPassportReaderPackage is auto-linked in React Native 0.80.1
              // No need to add explicitly - this was causing duplicate registration
              android.util.Log.d("MAIN_APPLICATION", "✅ Using auto-linked RNPassportReaderPackage (React Native 0.80.1)")
            }

        override fun getJSMainModuleName(): String = "index"

        override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

        override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
        override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
      }

  /**
   * Validates that the React Native host is properly configured
   */
  private fun validateReactNativeHost() {
    try {
      val host = reactNativeHost
      val instanceManager = host.reactInstanceManager
      android.util.Log.d("MAIN_APPLICATION", "✅ React Native host validation passed")
      android.util.Log.d("MAIN_APPLICATION", "🔧 New Architecture enabled: ${BuildConfig.IS_NEW_ARCHITECTURE_ENABLED}")
      android.util.Log.d("MAIN_APPLICATION", "�� Hermes enabled: ${BuildConfig.IS_HERMES_ENABLED}")
    } catch (e: Exception) {
      android.util.Log.e("MAIN_APPLICATION", "❌ React Native host validation failed", e)
    }
  }

  override fun onCreate() {
    super.onCreate()

    // Validate React Native host configuration
    validateReactNativeHost()

    // Enhanced SoLoader initialization with debugging for React Native 0.80.1
    android.util.Log.d("MAIN_APPLICATION", "🏗️ onCreate: Initializing SoLoader with OpenSourceMergedSoMapping")
    SoLoader.init(this, OpenSourceMergedSoMapping)
    android.util.Log.d("MAIN_APPLICATION", "✅ SoLoader initialization completed")

    // Ensure React Native host is properly initialized before New Architecture setup
    android.util.Log.d("MAIN_APPLICATION", "🔧 React Native host initialization")
    try {
      // Force React Native host initialization
      reactNativeHost.reactInstanceManager
      android.util.Log.d("MAIN_APPLICATION", "✅ React Native host initialized successfully")
    } catch (e: Exception) {
      android.util.Log.e("MAIN_APPLICATION", "❌ React Native host initialization failed", e)
    }

    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      // If you opted-in for the New Architecture, we load the native entry point for this app.
      android.util.Log.d("MAIN_APPLICATION", "🔧 Loading New Architecture entry point")
      try {
        DefaultNewArchitectureEntryPoint.load()
        android.util.Log.d("MAIN_APPLICATION", "✅ New Architecture entry point loaded")
      } catch (e: Exception) {
        android.util.Log.e("MAIN_APPLICATION", "❌ New Architecture entry point loading failed", e)
      }
    } else {
      android.util.Log.d("MAIN_APPLICATION", "🔧 New Architecture DISABLED - using legacy bridge")
    }

    // React Native 0.80.1: Let autolinking handle native module initialization
    android.util.Log.d("MAIN_APPLICATION", "🔧 React Native 0.80.1 initialization with autolinking")
    android.util.Log.d("MAIN_APPLICATION", "✅ SoLoader and native modules ready for autolinking")

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(
        "default",
        "Default Channel",
        NotificationManager.IMPORTANCE_HIGH
      ).apply {
        description = "Default notification channel"
        enableLights(true)
        enableVibration(true)
      }

      val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      notificationManager.createNotificationChannel(channel)
    }
  }
}
