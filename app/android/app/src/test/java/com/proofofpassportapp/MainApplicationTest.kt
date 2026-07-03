// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

package com.proofofpassportapp

import android.app.Application
import android.content.Context
import android.content.ContextWrapper
import androidx.test.core.app.ApplicationProvider
import com.facebook.react.ReactNativeHost
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

// Uses a plain Application so Robolectric skips MainApplication.onCreate,
// which loads native libraries unavailable on the JVM.
@RunWith(RobolectricTestRunner::class)
@Config(application = Application::class, sdk = [35])
class MainApplicationTest {

  // Regression test: an unqualified `packages` reference inside the anonymous
  // DefaultReactNativeHost resolved to the host's own getPackages() instead of
  // MainApplication's property, recursing until StackOverflowError. Only
  // old-arch callers (e.g. BlobProvider) hit getPackages(), so startup testing
  // never caught it.
  @Test
  fun getPackagesReturnsWithoutInfiniteRecursion() {
    val app = MainApplication()
    val attach =
        ContextWrapper::class.java.getDeclaredMethod("attachBaseContext", Context::class.java)
    attach.isAccessible = true
    attach.invoke(app, ApplicationProvider.getApplicationContext<Application>())

    val getPackages = ReactNativeHost::class.java.getDeclaredMethod("getPackages")
    getPackages.isAccessible = true
    val packages = getPackages.invoke(app.reactNativeHost) as List<*>

    assertTrue(packages.any { it is CameraActivityPackage })
    assertTrue(packages.any { it is QRCodeScannerPackage })
    assertTrue(packages.any { it is BackupPackage })
  }
}
