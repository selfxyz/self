// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

//
//  PassportReader.swift
//  OpenPassport
//
//  Created by Y E on 27/07/2023.
//

import Foundation
import React
#if !E2E_TESTING
import NFCPassportReader
import Mixpanel
#endif
import Sentry

#if !E2E_TESTING
@available(iOS 15, *)
@objc(PassportReader)
class PassportReader: NSObject {
    private var passportReader: NFCPassportReader.PassportReader
    private var analytics: SelfAnalytics?

    override init() {
        self.passportReader = NFCPassportReader.PassportReader()
        super.init()
    }

    private func logNfc(level: SentryLevel, message: String, stage: String, useCANBool: Bool, sessionId: String, extras: [String: Any] = [:]) {
        let data: [String: Any] = [
            "session_id": sessionId,
            "platform": "ios",
            "scan_type": useCANBool ? "can" : "mrz",
            "stage": stage,
        ].merging(extras) { (_, new) in new }

        if level == .error {
            SentrySDK.configureScope { scope in
                scope.setTag(value: sessionId, key: "session_id")
                scope.setTag(value: "ios", key: "platform")
                scope.setTag(value: useCANBool ? "can" : "mrz", key: "scan_type")
                scope.setTag(value: stage, key: "stage")
                for (key, value) in extras {
                    scope.setExtra(value: value, key: key)
                }
            }
            SentrySDK.capture(message: message)
        } else {
            let breadcrumb = Breadcrumb(level: level, category: "nfc")
            breadcrumb.message = message
            breadcrumb.data = data.mapValues { "\($0)" }
            SentrySDK.addBreadcrumb(breadcrumb)
        }
    }

    @objc(configure:enableDebugLogs:)
    func configure(token: String, enableDebugLogs: Bool) {
        let analytics = SelfAnalytics(token: token, enableDebugLogs: enableDebugLogs)
        self.analytics = analytics
        self.passportReader = NFCPassportReader.PassportReader(analytics: analytics)
    }

    @objc(trackEvent:properties:)
    func trackEvent(_ name: String, properties: [String: Any]?) {
        if let mpProps = properties as? Properties {
            analytics?.trackEvent(name, properties: mpProps)
        } else {
            analytics?.trackEvent(name, properties: nil)
        }
    }

    @objc(flush)
    func flush() {
        analytics?.flush()
    }

    @objc(scanPassport:dateOfBirth:dateOfExpiry:canNumber:useCan:skipPACE:skipCA:extendedMode:usePacePolling:sessionId:resolve:reject:)
    func scanPassport(
        _ passportNumber: String,
        dateOfBirth: String,
        dateOfExpiry: String,
        canNumber: String,
        useCan: NSNumber,
        skipPACE: NSNumber,
        skipCA: NSNumber,
        extendedMode: NSNumber,
        usePacePolling: NSNumber,
        sessionId: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        let useCANBool = useCan.boolValue
        let skipPACEBool = skipPACE.boolValue
        let skipCABool = skipCA.boolValue
        let extendedModeBool = extendedMode.boolValue
        let usePacePollingBool = usePacePolling.boolValue

        PassportReaderCore.scanPassport(
            reader: passportReader,
            passportNumber: passportNumber,
            dateOfBirth: dateOfBirth,
            dateOfExpiry: dateOfExpiry,
            canNumber: canNumber,
            useCan: useCANBool,
            skipPACE: skipPACEBool,
            skipCA: skipCABool,
            extendedMode: extendedModeBool,
            usePacePolling: usePacePollingBool,
            onStart: { [weak self] in
                self?.logNfc(level: .info, message: "scan_start", stage: "start", useCANBool: useCANBool, sessionId: sessionId)
                NativeLoggerBridge.logInfo(category: "NFC", message: "NFC passport scan started", data: [
                    "useCAN": useCANBool,
                    "skipPACE": skipPACEBool,
                    "skipCA": skipCABool,
                    "extendedMode": extendedModeBool,
                    "usePacePolling": usePacePollingBool,
                ])
            },
            onSuccess: { [weak self] in
                self?.logNfc(level: .info, message: "scan_success", stage: "complete", useCANBool: useCANBool, sessionId: sessionId)
            },
            onFailure: { [weak self] error in
                self?.logNfc(
                    level: .warning,
                    message: "scan_failed",
                    stage: "error",
                    useCANBool: useCANBool,
                    sessionId: sessionId,
                    extras: ["error": error.localizedDescription]
                )
            },
            resolve: resolve,
            reject: reject
        )
    }

    @objc
    static func requiresMainQueueSetup() -> Bool {
        true
    }
}
#else
@available(iOS 15, *)
@objc(PassportReader)
class PassportReader: NSObject {
    override init() {
        super.init()
    }

    @objc(configure:enableDebugLogs:)
    func configure(token: String, enableDebugLogs: Bool) {
    }

    @objc(trackEvent:properties:)
    func trackEvent(_ name: String, properties: [String: Any]?) {
    }

    @objc(flush)
    func flush() {
    }

    @objc(scanPassport:dateOfBirth:dateOfExpiry:canNumber:useCan:skipPACE:skipCA:extendedMode:usePacePolling:sessionId:resolve:reject:)
    func scanPassport(
        _ passportNumber: String,
        dateOfBirth: String,
        dateOfExpiry: String,
        canNumber: String,
        useCan: NSNumber,
        skipPACE: NSNumber,
        skipCA: NSNumber,
        extendedMode: NSNumber,
        usePacePolling: NSNumber,
        sessionId: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        reject("E2E_TESTING", "NFC scanning not available in E2E testing mode", nil)
    }

    @objc
    static func requiresMainQueueSetup() -> Bool {
        true
    }
}
#endif
