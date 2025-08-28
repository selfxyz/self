// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import Foundation
import React

@objc(NativeLoggerBridge)
class NativeLoggerBridge: RCTEventEmitter {
    
    private static let loggerQueue = DispatchQueue(label: "com.proofofpassportapp.logger", qos: .utility)
    
    @objc
    override static func requiresMainQueueSetup() -> Bool {
        return false
    }
    
    @objc
    override func supportedEvents() -> [String]! {
        return ["logEvent"]
    }
    

    private static func sendLogEvent(level: String, category: String, message: String, data: [String: Any]? = nil) {
        var params: [String: Any] = [
            "level": level,
            "category": category,
            "message": message
        ]
        
        if let data = data, !data.isEmpty {
            params["data"] = data
        }
        
        loggerQueue.async {
            if let sharedInstance = NativeLoggerBridge.shared {
                sharedInstance.sendEvent(withName: "logEvent", body: params)
            }
        }
    }
    
    static var shared: NativeLoggerBridge?
    
    override init() {
        super.init()
        NativeLoggerBridge.shared = self
    }
    
    @objc
    static func logDebug(category: String, message: String, data: [String: Any]? = nil) {
        sendLogEvent(level: "debug", category: category, message: message, data: data)
    }
    
    @objc
    static func logInfo(category: String, message: String, data: [String: Any]? = nil) {
        sendLogEvent(level: "info", category: category, message: message, data: data)
    }
    
    @objc
    static func logWarn(category: String, message: String, data: [String: Any]? = nil) {
        sendLogEvent(level: "warn", category: category, message: message, data: data)
    }
    
    @objc
    static func logError(category: String, message: String, data: [String: Any]? = nil) {
        sendLogEvent(level: "error", category: category, message: message, data: data)
    }
} 