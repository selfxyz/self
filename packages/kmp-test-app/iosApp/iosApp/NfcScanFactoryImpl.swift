//
//  NfcScanFactoryImpl.swift
//  iosApp
//
//  Swift implementation of NfcScanViewFactory that bridges to NfcPassportHelper
//

import Foundation
import UIKit
import ComposeApp

/// Swift implementation of the NFC scan factory
class NfcScanFactoryImpl: NSObject {

    /// Retain the NFC helper so ARC doesn't deallocate it during scanning
    private var nfcHelper: NfcPassportHelper?

    /// Call this from app init to register the factory
    static func register() {
        let factory = NfcScanFactoryImpl()
        NfcScanFactory.shared.instance = factory
    }
}

/// Extension implementing the Kotlin interface
extension NfcScanFactoryImpl: NfcScanViewFactory {

    func scanPassport(
        passportNumber: String,
        dateOfBirth: String,
        dateOfExpiry: String,
        onProgress: @escaping (Any) -> Void,
        onComplete: @escaping (Any) -> Void,
        onError: @escaping (String) -> Void
    ) {
        let helper = NfcPassportHelper()
        self.nfcHelper = helper

        helper.scanPassport(
            passportNumber: passportNumber,
            dateOfBirth: dateOfBirth,
            dateOfExpiry: dateOfExpiry,
            progress: { stateIndex, _, _ in
                DispatchQueue.main.async {
                    onProgress(stateIndex as Any)
                }
            },
            completion: { success, result in
                DispatchQueue.main.async { [weak self] in
                    self?.nfcHelper = nil
                    if success {
                        onComplete(result as Any)
                    } else {
                        onError(result)
                    }
                }
            }
        )
    }
}
