// SPDX-License-Identifier: BUSL-1.1

import Foundation

// nil mimeType is allowed — some CDNs omit Content-Type; the SHA-256 hash is the primary integrity gate.
enum RemoteContentIntegrity {
    static func normalizeSha256(_ value: String) -> String {
        var normalized = value.lowercased()
        if normalized.hasPrefix("sha256-") {
            normalized.removeFirst("sha256-".count)
        }
        if normalized.hasPrefix("0x") {
            normalized.removeFirst(2)
        }
        return normalized
    }

    static func isAcceptableMimeType(_ mimeType: String?) -> Bool {
        let normalized = mimeType?
            .split(separator: ";", maxSplits: 1)
            .first?
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .lowercased()
        return normalized == nil || normalized == "text/html"
    }
}
