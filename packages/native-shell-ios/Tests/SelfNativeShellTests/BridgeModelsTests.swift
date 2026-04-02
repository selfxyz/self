// SPDX-License-Identifier: BUSL-1.1

import XCTest
@testable import SelfNativeShell

final class BridgeModelsTests: XCTestCase {

    // MARK: - BridgeRequest decoding

    func testBridgeRequestDecodesFromJSON() throws {
        let json = """
        {
            "type": "request",
            "version": 1,
            "id": "req-1",
            "domain": "secureStorage",
            "method": "get",
            "params": {"key": "token"},
            "timestamp": 1000.0
        }
        """.data(using: .utf8)!

        let request = try JSONDecoder().decode(BridgeRequest.self, from: json)

        XCTAssertEqual(request.type, "request")
        XCTAssertEqual(request.version, 1)
        XCTAssertEqual(request.id, "req-1")
        XCTAssertEqual(request.domain, .secureStorage)
        XCTAssertEqual(request.method, "get")
        XCTAssertEqual(request.params?["key"]?.value as? String, "token")
        XCTAssertEqual(request.timestamp, 1000.0)
    }

    func testBridgeRequestDecodesWithNilParams() throws {
        let json = """
        {
            "type": "request",
            "version": 1,
            "id": "req-2",
            "domain": "lifecycle",
            "method": "ready",
            "timestamp": 2000.0
        }
        """.data(using: .utf8)!

        let request = try JSONDecoder().decode(BridgeRequest.self, from: json)

        XCTAssertEqual(request.domain, .lifecycle)
        XCTAssertNil(request.params)
    }

    // MARK: - BridgeResponse

    func testSuccessResponseFactory() {
        let request = BridgeRequest(
            type: "request", version: 1, id: "req-1",
            domain: .crypto, method: "generateKey",
            params: nil, timestamp: 1000.0
        )

        let response = BridgeResponse.success(request: request, result: ["keyRef": "key1"])

        XCTAssertEqual(response.type, "response")
        XCTAssertEqual(response.version, 1)
        XCTAssertEqual(response.domain, .crypto)
        XCTAssertEqual(response.requestId, "req-1")
        XCTAssertTrue(response.success)
        XCTAssertNil(response.error)
    }

    func testFailureResponseFactory() {
        let request = BridgeRequest(
            type: "request", version: 1, id: "req-2",
            domain: .secureStorage, method: "get",
            params: nil, timestamp: 2000.0
        )

        let response = BridgeResponse.failure(
            request: request, code: "MISSING_KEY", message: "Key required"
        )

        XCTAssertFalse(response.success)
        XCTAssertNil(response.data)
        XCTAssertEqual(response.error?.code, "MISSING_KEY")
        XCTAssertEqual(response.error?.message, "Key required")
    }

    func testBridgeResponseRoundtrips() throws {
        let request = BridgeRequest(
            type: "request", version: 1, id: "req-1",
            domain: .crypto, method: "sign",
            params: nil, timestamp: 1000.0
        )
        let original = BridgeResponse.success(request: request, result: "signed-data")

        let data = try JSONEncoder().encode(original)
        let decoded = try JSONDecoder().decode(BridgeResponse.self, from: data)

        XCTAssertEqual(decoded.type, "response")
        XCTAssertEqual(decoded.domain, .crypto)
        XCTAssertEqual(decoded.requestId, "req-1")
        XCTAssertTrue(decoded.success)
    }

    // MARK: - BridgeDomain

    func testAllDomainsDecodeFromRawValues() throws {
        let domains: [(String, BridgeDomain)] = [
            ("nfc", .nfc),
            ("biometrics", .biometrics),
            ("secureStorage", .secureStorage),
            ("camera", .camera),
            ("crypto", .crypto),
            ("haptic", .haptic),
            ("analytics", .analytics),
            ("lifecycle", .lifecycle),
            ("documents", .documents),
            ("navigation", .navigation),
        ]

        for (rawValue, expected) in domains {
            let json = "\"\(rawValue)\"".data(using: .utf8)!
            let decoded = try JSONDecoder().decode(BridgeDomain.self, from: json)
            XCTAssertEqual(decoded, expected, "Failed for \(rawValue)")
        }
    }

    // MARK: - AnyCodable

    func testAnyCodableDecodesString() throws {
        let json = "\"hello\"".data(using: .utf8)!
        let decoded = try JSONDecoder().decode(AnyCodable.self, from: json)
        XCTAssertEqual(decoded.value as? String, "hello")
    }

    func testAnyCodableDecodesInt() throws {
        let json = "42".data(using: .utf8)!
        let decoded = try JSONDecoder().decode(AnyCodable.self, from: json)
        XCTAssertEqual(decoded.value as? Int, 42)
    }

    func testAnyCodableDecodesBool() throws {
        let json = "true".data(using: .utf8)!
        let decoded = try JSONDecoder().decode(AnyCodable.self, from: json)
        XCTAssertEqual(decoded.value as? Bool, true)
    }

    func testAnyCodableDecodesNull() throws {
        let json = "null".data(using: .utf8)!
        let decoded = try JSONDecoder().decode(AnyCodable.self, from: json)
        XCTAssertTrue(decoded.value is NSNull)
    }

    func testAnyCodableDecodesArray() throws {
        let json = "[1, 2, 3]".data(using: .utf8)!
        let decoded = try JSONDecoder().decode(AnyCodable.self, from: json)
        let array = decoded.value as? [Any]
        XCTAssertEqual(array?.count, 3)
    }

    func testAnyCodableDecodesDict() throws {
        let json = "{\"a\": 1}".data(using: .utf8)!
        let decoded = try JSONDecoder().decode(AnyCodable.self, from: json)
        let dict = decoded.value as? [String: Any]
        XCTAssertNotNil(dict?["a"])
    }

    func testAnyCodableRoundtripsString() throws {
        let original = AnyCodable("test")
        let data = try JSONEncoder().encode(original)
        let decoded = try JSONDecoder().decode(AnyCodable.self, from: data)
        XCTAssertEqual(decoded.value as? String, "test")
    }

    // MARK: - BridgeHandlerError

    func testBridgeHandlerErrorCodes() {
        XCTAssertEqual(BridgeHandlerError.unknownMethod("foo").code, "UNKNOWN_METHOD")
        XCTAssertEqual(BridgeHandlerError.missingParam("bar").code, "MISSING_PARAM")
        XCTAssertEqual(BridgeHandlerError.operationFailed("baz").code, "OPERATION_FAILED")
    }

    func testBridgeHandlerErrorDescriptions() {
        XCTAssertEqual(
            BridgeHandlerError.unknownMethod("foo").errorDescription,
            "Unknown method: foo"
        )
        XCTAssertEqual(
            BridgeHandlerError.missingParam("bar").errorDescription,
            "Missing parameter: bar"
        )
        XCTAssertEqual(
            BridgeHandlerError.operationFailed("baz").errorDescription,
            "baz"
        )
    }
}
