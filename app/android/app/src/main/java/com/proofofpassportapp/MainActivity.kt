package com.proofofpassportapp

import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.content.pm.ActivityInfo
import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import io.tradle.nfc.RNPassportReaderModule

class MainActivity : ReactActivity() {
  private val NOTIFICATION_PERMISSION_CODE = 100

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
    
    // Request notification permission for Android 13+
    requestNotificationPermissionIfNeeded()
  }
  
  private fun requestNotificationPermissionIfNeeded() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      Log.d("PERMISSION", "Checking notification permission for Android 13+")
      val permission = Manifest.permission.POST_NOTIFICATIONS
      
      if (ContextCompat.checkSelfPermission(this, permission) != PackageManager.PERMISSION_GRANTED) {
        Log.d("PERMISSION", "Requesting POST_NOTIFICATIONS permission")
        ActivityCompat.requestPermissions(
          this,
          arrayOf(permission),
          NOTIFICATION_PERMISSION_CODE
        )
      } else {
        Log.d("PERMISSION", "POST_NOTIFICATIONS permission already granted")
      }
    }
  }
  
  override fun onRequestPermissionsResult(
    requestCode: Int,
    permissions: Array<out String>,
    grantResults: IntArray
  ) {
    super.onRequestPermissionsResult(requestCode, permissions, grantResults)
    
    if (requestCode == NOTIFICATION_PERMISSION_CODE) {
      if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
        Log.d("PERMISSION", "POST_NOTIFICATIONS permission granted by user")
      } else {
        Log.d("PERMISSION", "POST_NOTIFICATIONS permission denied by user")
      }
    }
  }
}
