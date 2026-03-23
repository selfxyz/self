// SPDX-License-Identifier: BUSL-1.1

import Foundation

enum BridgeDomain: String, Codable {
    case nfc
    case biometrics
    case secureStorage
    case camera
    case crypto
    case haptic
    case analytics
    case lifecycle
    case documents
    case navigation
}

struct BridgeRequest: Codable {
    let type: String
    let version: Int
    let id: String
    let domain: BridgeDomain
    let method: String
    let params: [String: AnyCodable]?
    let timestamp: Double
}

struct BridgeResponse: Codable {
    let type: String
    let version: Int
    let id: String
    let domain: BridgeDomain
    let requestId: String
    let success: Bool
    let data: AnyCodable?
    let error: BridgeError?
    let timestamp: Double

    static func success(request: BridgeRequest, result: Any?) -> BridgeResponse {
        BridgeResponse(
            type: "response",
            version: 1,
            id: UUID().uuidString,
            domain: request.domain,
            requestId: request.id,
            success: true,
            data: result.map { AnyCodable($0) },
            error: nil,
            timestamp: Date().timeIntervalSince1970 * 1000
        )
    }

    static func failure(request: BridgeRequest, code: String, message: String) -> BridgeResponse {
        BridgeResponse(
            type: "response",
            version: 1,
            id: UUID().uuidString,
            domain: request.domain,
            requestId: request.id,
            success: false,
            data: nil,
            error: BridgeError(code: code, message: message),
            timestamp: Date().timeIntervalSince1970 * 1000
        )
    }
}

struct BridgeError: Codable {
    let code: String
    let message: String
}

// Type-erased Codable wrapper for heterogeneous JSON values
struct AnyCodable: Codable {
    let value: Any

    init(_ value: Any) {
        self.value = value
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if container.decodeNil() {
            value = NSNull()
        } else if let bool = try? container.decode(Bool.self) {
            value = bool
        } else if let int = try? container.decode(Int.self) {
            value = int
        } else if let double = try? container.decode(Double.self) {
            value = double
        } else if let string = try? container.decode(String.self) {
            value = string
        } else if let array = try? container.decode([AnyCodable].self) {
            value = array.map { $0.value }
        } else if let dict = try? container.decode([String: AnyCodable].self) {
            value = dict.mapValues { $0.value }
        } else {
            throw DecodingError.dataCorruptedError(in: container, debugDescription: "Unsupported JSON type")
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch value {
        case is NSNull:
            try container.encodeNil()
        case let bool as Bool:
            try container.encode(bool)
        case let int as Int:
            try container.encode(int)
        case let double as Double:
            try container.encode(double)
        case let string as String:
            try container.encode(string)
        case let array as [Any]:
            try container.encode(array.map { AnyCodable($0) })
        case let dict as [String: Any]:
            try container.encode(dict.mapValues { AnyCodable($0) })
        default:
            throw EncodingError.invalidValue(value, .init(codingPath: encoder.codingPath, debugDescription: "Unsupported type"))
        }
    }
}
