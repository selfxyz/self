//
//  SelfSDK.swift
//  SelfSDK
//

import Foundation
import React

@objc(SelfSDK)
class SelfSDK: NSObject, RCTBridgeModule {
    static func moduleName() -> String! {
        return "SelfSDK"
    }

    static func requiresMainQueueSetup() -> Bool {
        return true
    }

    @objc func registerViewManagers(_ bridge: RCTBridge) {
        // This method is required by the Objective-C interface
        // but we don't need to manually register view managers
    }
}
