// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.


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
#endif

#if !E2E_TESTING
@available(iOS 15, *)
@objc(SelfPassportReader)
class PassportReader: NSObject {
    private var passportReader: NFCPassportReader.PassportReader

    override init() {
        self.passportReader = NFCPassportReader.PassportReader()
        super.init()
    }

    @objc(configure:enableDebugLogs:)
    func configure(token: String, enableDebugLogs: Bool) {
        self.passportReader = NFCPassportReader.PassportReader()
    }

    @objc(scanPassport:dateOfBirth:dateOfExpiry:canNumber:useCan:skipPACE:skipCA:extendedMode:usePacePolling:resolve:reject:)
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
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        PassportReaderCore.scanPassport(
            reader: passportReader,
            passportNumber: passportNumber,
            dateOfBirth: dateOfBirth,
            dateOfExpiry: dateOfExpiry,
            canNumber: canNumber,
            useCan: useCan.boolValue,
            skipPACE: skipPACE.boolValue,
            skipCA: skipCA.boolValue,
            extendedMode: extendedMode.boolValue,
            usePacePolling: usePacePolling.boolValue,
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
@objc(SelfPassportReader)
class PassportReader: NSObject {
    override init() {
        super.init()
    }

    @objc(configure:enableDebugLogs:)
    func configure(token: String, enableDebugLogs: Bool) {
    }

    @objc(scanPassport:dateOfBirth:dateOfExpiry:canNumber:useCan:skipPACE:skipCA:extendedMode:usePacePolling:resolve:reject:)
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
