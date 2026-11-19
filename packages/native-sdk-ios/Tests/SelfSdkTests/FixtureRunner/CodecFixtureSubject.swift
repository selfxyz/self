// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import Foundation

@testable import SelfSdk

/// The part of native that exists before the router: the codec. It drops what BC 4.6 says to drop
/// and answers a request with a field at fault. Every other step is deferred, because a request
/// that parses needs the router and a handler.
final class CodecFixtureSubject: FixtureSubject {
    private var emitted: [String] = []

    func send(_ body: String) throws {
        switch EnvelopeCodec.decode(body) {
        case .dropped:
            break
        case .invalidRequest(let invalid):
            guard let domain = invalid.domain else {
                throw FixtureDeferred(why: "the router decides the domain of this answer")
            }
            let response = BridgeResponse(
                version: BridgeProtocol.major,
                id: UUID().uuidString.lowercased(),
                domain: domain,
                requestId: invalid.requestId,
                success: false,
                error: invalid.error,
                timestamp: FixturePlaceholders.timestamp
            )
            emitted.append(try EnvelopeCodec.encode(response))
        case .request, .cancel:
            throw FixtureDeferred(why: "a message that parses needs the router")
        }
    }

    func native(_ action: String) throws {
        throw FixtureDeferred(why: "a native action needs the router")
    }

    func advance(_ milliseconds: Int) throws {
        throw FixtureDeferred(why: "the fake clock comes with the router")
    }

    func drain() -> [String] {
        defer { emitted = [] }
        return emitted
    }
}
