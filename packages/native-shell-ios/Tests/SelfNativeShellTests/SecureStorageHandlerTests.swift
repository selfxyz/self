// SPDX-License-Identifier: BUSL-1.1

import Foundation
import XCTest
@testable import SelfNativeShell

private final class MockSecureStorageProvider: SecureStorageProvider {
    var values: [String: String] = [:]

    func get(key: String) throws -> String? {
        values[key]
    }

    func set(key: String, value: String) throws {
        values[key] = value
    }

    func remove(key: String) throws {
        values.removeValue(forKey: key)
    }
}

final class SecureStorageHandlerTests: XCTestCase {

    func testGetReturnsStoredValue() async throws {
        let provider = MockSecureStorageProvider()
        provider.values["token"] = "abc123"
        let handler = SecureStorageHandler(provider: provider)

        let result = try await handler.handle(method: "get", params: ["key": "token"]) as? [String: Any]

        XCTAssertEqual(result?["value"] as? String, "abc123")
    }

    func testGetReturnsNullForMissingKey() async throws {
        let handler = SecureStorageHandler(provider: MockSecureStorageProvider())

        let result = try await handler.handle(method: "get", params: ["key": "missing"]) as? [String: Any]

        XCTAssertTrue(result?["value"] is NSNull)
    }

    func testSetPersistsValue() async throws {
        let provider = MockSecureStorageProvider()
        let handler = SecureStorageHandler(provider: provider)

        let result = try await handler.handle(
            method: "set",
            params: ["key": "token", "value": "abc123"]
        )

        XCTAssertNil(result)
        XCTAssertEqual(provider.values["token"], "abc123")
    }

    func testRemoveDeletesValue() async throws {
        let provider = MockSecureStorageProvider()
        provider.values["token"] = "abc123"
        let handler = SecureStorageHandler(provider: provider)

        let result = try await handler.handle(method: "remove", params: ["key": "token"])

        XCTAssertNil(result)
        XCTAssertNil(provider.values["token"])
    }

    func testMissingValueThrowsBridgeHandlerError() async {
        let handler = SecureStorageHandler(provider: MockSecureStorageProvider())

        do {
            _ = try await handler.handle(method: "set", params: ["key": "token"])
            XCTFail("Expected missingParam error")
        } catch let error as BridgeHandlerError {
            XCTAssertEqual(error.code, "MISSING_PARAM")
            XCTAssertEqual(error.errorDescription, "Missing parameter: value")
        } catch {
            XCTFail("Unexpected error: \(error)")
        }
    }
}
