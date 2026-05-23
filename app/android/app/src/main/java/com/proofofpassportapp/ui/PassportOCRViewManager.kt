// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

package com.proofofpassportapp.ui

import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.viewmanagers.PassportOCRViewManagerManagerDelegate
import com.facebook.react.viewmanagers.PassportOCRViewManagerManagerInterface

@ReactModule(name = PassportOCRViewManager.REACT_CLASS)
class PassportOCRViewManager :
    SimpleViewManager<PassportCameraView>(),
    PassportOCRViewManagerManagerInterface<PassportCameraView> {
  private val delegate: ViewManagerDelegate<PassportCameraView> =
      PassportOCRViewManagerManagerDelegate(this)

  override fun getName(): String = REACT_CLASS

  override fun createViewInstance(reactContext: ThemedReactContext): PassportCameraView =
      PassportCameraView(reactContext)

  override fun onDropViewInstance(view: PassportCameraView) {
    view.stopCamera()
    super.onDropViewInstance(view)
  }

  override fun getDelegate(): ViewManagerDelegate<PassportCameraView> = delegate

  override fun setIsMounted(view: PassportCameraView, value: Boolean) {
    view.setMounted(value)
  }

  companion object {
    const val REACT_CLASS = "PassportOCRViewManager"
  }
}
