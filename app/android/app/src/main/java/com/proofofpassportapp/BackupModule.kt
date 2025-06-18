// SPDX-License-Identifier: BSL-1.1
// Copyright (c) 2025 Social Connect Labs, Inc.
//
// This file is licensed under the Business Source License 1.1 (BSL-1.1).
//
// Use of this software is governed by the Business Source License included in the LICENSE file.
//
// As of 2029-06-11, this file will be governed by the Apache License, Version 2.0.


package com.proofofpassportapp

import android.app.backup.BackupManager
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class BackupModule(reactContext: ReactApplicationContext): ReactContextBaseJavaModule(reactContext) {
    override fun getName() = "BackupModule"

    @ReactMethod
    fun backupNow(promise: Promise) {
        // https://developer.android.com/identity/data/keyvaluebackup#RequestingBackup
        BackupManager.dataChanged(BuildConfig.APPLICATION_ID)
        promise.resolve(null)
    }

    @ReactMethod
    fun restoreNow(promise: Promise) {
        // noop
        // https://developer.android.com/identity/data/keyvaluebackup#RequestingRestore
        promise.resolve(null)
    }
}