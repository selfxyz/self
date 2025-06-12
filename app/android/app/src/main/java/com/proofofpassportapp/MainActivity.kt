// SPDX-License-Identifier: BSL-1.1
// Copyright (c) 2025 Social Connect Labs, Inc.
//
// This file is licensed under the Business Source License 1.1 (BSL-1.1).
//
// Use of this software is governed by the Business Source License included in the LICENSE file.
//
// As of 2029-06-11, this file will be governed by the Apache License, Version 2.0.
package com.proofofpassportapp

import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.content.pm.ActivityInfo
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
    RNPassportReaderModule.getInstance().receiveIntent(intent)
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    // Lock to portrait orientation
    requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
  }
}
