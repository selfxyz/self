// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import Foundation

#if !targetEnvironment(simulator)
import CoreNFC
#endif

/// Swift implementation of NfcProvider wrapping NfcPassportHelper.
public class NfcProviderImpl: NSObject {

    /// Retained during scan to prevent ARC deallocation
    private var nfcHelper: NfcPassportHelper?

    public override init() {
        super.init()
    }

    @objc public func isAvailable() -> Bool {
        return NfcPassportHelper.isNfcAvailable()
    }

    @objc(scanPassportPassportNumber:dateOfBirth:dateOfExpiry:onProgress:onComplete:onError:)
    public func scanPassport(
        passportNumber: String,
        dateOfBirth: String,
        dateOfExpiry: String,
        onProgress: @escaping (Any) -> Void,
        onComplete: @escaping (String) -> Void,
        onError: @escaping (String) -> Void
    ) {
        guard self.nfcHelper == nil else {
            onError("A scan is already in progress")
            return
        }

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
            completion: { [weak self] success, result in
                DispatchQueue.main.async {
                    self?.nfcHelper = nil
                    if success {
                        onComplete(result)
                    } else {
                        onError(result)
                    }
                }
            }
        )
    }

    @objc public func cancelScan() {
        nfcHelper = nil
    }
}
