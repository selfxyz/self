// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/// A failure a handler reports with a contract code (BC 7.2). A handler maps each platform error to
/// one of these. The router answers any other error with `INTERNAL_ERROR`.
struct BridgeFailure: Error, Equatable {
    let error: BridgeError

    /// Nil when `details.reason` is not in the list of the code.
    init?(_ error: BridgeError) {
        if let reason = error.details?.reason, !error.code.allowedReasons.contains(reason) { return nil }
        self.error = error
    }

    /// The failure of a `details.reason` value, under the one code whose list holds it. Nil for any other value.
    static func forReason(_ reason: String, message: String) -> BridgeFailure? {
        BridgeErrorCode.allCases
            .first { $0.allowedReasons.contains(reason) }
            .flatMap { code in
                BridgeFailure(BridgeError(code: code, message: message, details: BridgeErrorDetails(reason: reason)))
            }
    }
}

extension Error {
    /// BC 7.2: a `BridgeFailure` keeps its error. Any other error is `INTERNAL_ERROR`, named by its type only.
    var bridgeError: BridgeError {
        (self as? BridgeFailure)?.error ?? BridgeError(code: .internalError, message: "Unexpected \(type(of: self))")
    }
}
