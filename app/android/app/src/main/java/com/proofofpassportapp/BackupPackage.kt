// SPDX-License-Identifier: BSL-1.1
// Copyright (c) 2025 Social Connect Labs, Inc.
//
// This file is licensed under the Business Source License 1.1 (BSL-1.1).
//
// Use of this software is governed by the Business Source License included in the LICENSE file.
//
// As of 2029-06-11, this file will be governed by the Apache License, Version 2.0.


package com.proofofpassportapp

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class BackupPackage : ReactPackage {
    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }

    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(
            BackupModule(reactContext)
        )
    }

}