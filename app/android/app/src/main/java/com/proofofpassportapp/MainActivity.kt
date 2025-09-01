// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

package com.proofofpassportapp

import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.content.pm.ActivityInfo
import androidx.core.view.WindowCompat
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
    DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    Log.d("MAIN_ACTIVITY", "onNewIntent: " + intent.action)
    try {
      RNPassportReaderModule.getInstance().receiveIntent(intent)
    } catch (e: IllegalStateException) {
      // Module not initialized yet (React context not ready). Ignore safely.
      Log.w("MAIN_ACTIVITY", "RNPassportReaderModule not ready; deferring NFC intent")
      setIntent(intent)
    }
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    // Prevent fragment state restoration to avoid react-native-screens crash
    // See: https://github.com/software-mansion/react-native-screens/issues/17#issuecomment-424704978
    super.onCreate(null)
    // Ensure edge-to-edge is enabled consistently across Android versions
    // Android 15 enables by default; on earlier versions, opt-in for immersive layouts
    WindowCompat.setDecorFitsSystemWindows(window, false)
    // Allow system to manage orientation for large screens
  }
}
