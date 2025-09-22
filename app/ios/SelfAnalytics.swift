// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import Foundation
import NFCPassportReader
import Mixpanel

public class SelfAnalytics: Analytics {
    private let enableDebugLogs: Bool

    public override init(token: String, enableDebugLogs: Bool = false, trackAutomaticEvents: Bool = false) {
        self.enableDebugLogs = enableDebugLogs
        super.init(token: token, enableDebugLogs: enableDebugLogs, trackAutomaticEvents: trackAutomaticEvents)
    }

    public override func trackEvent(_ name: String, properties: Properties? = nil) {
        super.trackEvent(name, properties: properties)

        print("[NFC Analytics] Event: \(name), Properties: \(properties ?? [:])")

        if let logger = NativeLoggerBridge.shared {
            logger.sendEvent(withName: "logEvent", body: [
                "level": "info",
                "category": "NFC",
                "message": "Analytics Event: \(name)",
                "data": properties ?? [:]
            ])
        }
    }

    public override func trackDebugEvent(_ name: String, properties: Properties? = nil) {
        super.trackDebugEvent(name, properties: properties)

        if enableDebugLogs {
            print("[NFC Analytics Debug] Event: \(name), Properties: \(properties ?? [:])")

            if let logger = NativeLoggerBridge.shared {
                logger.sendEvent(withName: "logEvent", body: [
                    "level": "debug",
                    "category": "NFC",
                    "message": "Analytics Debug Event: \(name)",
                    "data": properties ?? [:]
                ])
            }
        }
    }

    public override func trackError(_ error: Error, context: String) {
        super.trackError(error, context: context)

        print("[NFC Analytics Error] Context: \(context), Error: \(error.localizedDescription)")

        if let logger = NativeLoggerBridge.shared {
            logger.sendEvent(withName: "logEvent", body: [
                "level": "error",
                "category": "NFC",
                "message": "Analytics Error: \(error.localizedDescription)",
                "data": [
                    "error_type": String(describing: type(of: error)),
                    "error_description": error.localizedDescription,
                    "context": context
                ]
            ])
        }
    }

    public func flush() {
        Mixpanel.mainInstance().flush()
    }
}
