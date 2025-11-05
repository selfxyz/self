package com.selfxyz.demoapp

import android.content.Intent
import android.util.Log
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.selfxyz.selfSDK.RNSelfPassportReaderModule

class MainActivity : ReactActivity() {
    /**
     * Returns the name of the main component registered from JavaScript. This is used to schedule
     * rendering of the component.
     */
    override fun getMainComponentName(): String = "SelfDemoApp"

    /**
     * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
     * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
     */
    override fun createReactActivityDelegate(): ReactActivityDelegate {
        return DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        Log.d("MAIN_ACTIVITY", "onNewIntent: " + intent.action)
        try {
            RNSelfPassportReaderModule.getInstance().receiveIntent(intent)
        } catch (e: IllegalStateException) {
            Log.w("MAIN_ACTIVITY", "RNSelfPassportReaderModule not ready; deferring NFC intent")
            setIntent(intent)
        }
    }
}
