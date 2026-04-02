// SPDX-License-Identifier: BUSL-1.1

import XCTest
@testable import SelfNativeShell

final class CryptoHandlerTests: XCTestCase {

    func testDomainIsCrypto() {
        let handler = CryptoHandler()
        XCTAssertEqual(handler.domain, .crypto)
    }

    func testGenerateKeyThrowsWhenKeyRefMissing() async {
        let handler = CryptoHandler()

        do {
            _ = try await handler.handle(method: "generateKey", params: nil)
            XCTFail("Expected missingParam error")
        } catch let error as BridgeHandlerError {
            XCTAssertEqual(error.code, "MISSING_PARAM")
        } catch {
            XCTFail("Unexpected error: \(error)")
        }
    }

    func testGetPublicKeyThrowsWhenKeyRefMissing() async {
        let handler = CryptoHandler()

        do {
            _ = try await handler.handle(method: "getPublicKey", params: nil)
            XCTFail("Expected missingParam error")
        } catch let error as BridgeHandlerError {
            XCTAssertEqual(error.code, "MISSING_PARAM")
        } catch {
            XCTFail("Unexpected error: \(error)")
        }
    }

    func testSignThrowsWhenKeyRefMissing() async {
        let handler = CryptoHandler()

        do {
            _ = try await handler.handle(method: "sign", params: ["data": "dGVzdA=="])
            XCTFail("Expected missingParam error")
        } catch let error as BridgeHandlerError {
            XCTAssertEqual(error.code, "MISSING_PARAM")
        } catch {
            XCTFail("Unexpected error: \(error)")
        }
    }

    func testSignThrowsWhenDataMissing() async {
        let handler = CryptoHandler()

        do {
            _ = try await handler.handle(method: "sign", params: ["keyRef": "key1"])
            XCTFail("Expected missingParam error")
        } catch let error as BridgeHandlerError {
            XCTAssertEqual(error.code, "MISSING_PARAM")
        } catch {
            XCTFail("Unexpected error: \(error)")
        }
    }

    func testUnknownMethodThrows() async {
        let handler = CryptoHandler()

        do {
            _ = try await handler.handle(method: "deleteKey", params: nil)
            XCTFail("Expected unknownMethod error")
        } catch let error as BridgeHandlerError {
            XCTAssertEqual(error.code, "UNKNOWN_METHOD")
        } catch {
            XCTFail("Unexpected error: \(error)")
        }
    }
}
