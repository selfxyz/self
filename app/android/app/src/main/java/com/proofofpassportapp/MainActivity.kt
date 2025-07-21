// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

package com.proofofpassportapp

import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.content.pm.ActivityInfo
import android.nfc.NfcAdapter
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import io.tradle.nfc.RNPassportReaderModule

class MainActivity : ReactActivity() {
  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "OpenPassport"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
    DefaultReactActivityDelegate(this, mainComponentName, false) // - Explicitly disable new architecture

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    Log.e("MAIN_ACTIVITY", "🔥 onNewIntent: Received at ${System.currentTimeMillis()}")
    Log.e("MAIN_ACTIVITY", "🔥 onNewIntent: Action=${intent.action}, extras=${intent.extras?.keySet()}")
    Log.e("MAIN_ACTIVITY", "🔥 Intent data: " + intent.data?.toString())
    Log.e("MAIN_ACTIVITY", "🔥 Intent type: " + intent.type)
    Log.e("MAIN_ACTIVITY", "🔥 Intent categories: " + intent.categories?.toString())

    // Check if it's an NFC intent
    if (intent.action == "android.nfc.action.TECH_DISCOVERED") {
      Log.e("MAIN_ACTIVITY", "🚀 NFC TECH DISCOVERED! Forwarding to RNPassportReaderModule")
      try {
        RNPassportReaderModule.getInstance().receiveIntent(intent)
        Log.e("MAIN_ACTIVITY", "✅ Successfully forwarded to RNPassportReaderModule")
      } catch (e: Exception) {
        Log.e("MAIN_ACTIVITY", "❌ Error forwarding to RNPassportReaderModule: ${e.message}", e)
      }
    } else {
      Log.e("MAIN_ACTIVITY", "ℹ️ Non-NFC intent, not forwarding")
    }
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    Log.e("MAIN_ACTIVITY", "🏗️ onCreate: App starting at ${System.currentTimeMillis()}")
    Log.e("MAIN_ACTIVITY", "🏗️ onCreate: Initial intent action: ${intent?.action}")
    Log.e("MAIN_ACTIVITY", "🏗️ onCreate: NFC available=${NfcAdapter.getDefaultAdapter(this) != null}")
    // Lock to portrait orientation
    requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
  }

  override fun onResume() {
    super.onResume()
    Log.e("MAIN_ACTIVITY", "🔄 onResume: Activity resumed at ${System.currentTimeMillis()}")
    Log.e("MAIN_ACTIVITY", "🔄 onResume: Window focus: ${hasWindowFocus()}")
  }

  override fun onWindowFocusChanged(hasFocus: Boolean) {
    super.onWindowFocusChanged(hasFocus)
    Log.e("MAIN_ACTIVITY", "🏙️ onWindowFocusChanged: hasFocus=$hasFocus")
    if (hasFocus) {
      try {
        RNPassportReaderModule.getInstance().onWindowFocusChanged(true)
      } catch (e: Exception) {
        Log.e("MAIN_ACTIVITY", "❌ Error notifying RNPassportReaderModule: ${e.message}", e)
      }
    }
  }

  override fun onPause() {
    super.onPause()
    Log.e("MAIN_ACTIVITY", "⏸️ MainActivity onPause called")
  }
}
