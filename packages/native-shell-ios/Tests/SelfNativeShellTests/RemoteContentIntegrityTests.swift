// SPDX-License-Identifier: BUSL-1.1

import XCTest
@testable import SelfNativeShell

final class RemoteContentIntegrityTests: XCTestCase {

    // MARK: - normalizeSha256

    func testStripsShaPrefixOnly() {
        XCTAssertEqual(
            RemoteContentIntegrity.normalizeSha256("sha256-abcdef1234567890"),
            "abcdef1234567890"
        )
    }

    func testStrips0xPrefixOnly() {
        XCTAssertEqual(
            RemoteContentIntegrity.normalizeSha256("0xabcdef1234567890"),
            "abcdef1234567890"
        )
    }

    func testStripsSha256Then0xPrefix() {
        XCTAssertEqual(
            RemoteContentIntegrity.normalizeSha256("sha256-0xabcdef"),
            "abcdef"
        )
    }

    func testLowercasesInput() {
        XCTAssertEqual(
            RemoteContentIntegrity.normalizeSha256("ABCDEF"),
            "abcdef"
        )
    }

    func testRawHexPassesThrough() {
        XCTAssertEqual(
            RemoteContentIntegrity.normalizeSha256("abcdef1234567890"),
            "abcdef1234567890"
        )
    }

    func testDoesNotStripInteriorSha256() {
        XCTAssertEqual(
            RemoteContentIntegrity.normalizeSha256("absha256-cd"),
            "absha256-cd"
        )
    }

    func testDoesNotStripInterior0x() {
        XCTAssertEqual(
            RemoteContentIntegrity.normalizeSha256("ab0xcd"),
            "ab0xcd"
        )
    }

    // MARK: - isAcceptableMimeType

    func testAcceptsNilMimeType() {
        XCTAssertTrue(RemoteContentIntegrity.isAcceptableMimeType(nil))
    }

    func testAcceptsTextHtml() {
        XCTAssertTrue(RemoteContentIntegrity.isAcceptableMimeType("text/html"))
    }

    func testRejectsApplicationJavascript() {
        XCTAssertFalse(RemoteContentIntegrity.isAcceptableMimeType("application/javascript"))
    }

    func testRejectsApplicationJson() {
        XCTAssertFalse(RemoteContentIntegrity.isAcceptableMimeType("application/json"))
    }

    func testRejectsTextPlain() {
        XCTAssertFalse(RemoteContentIntegrity.isAcceptableMimeType("text/plain"))
    }

    func testRejectsEmptyString() {
        XCTAssertFalse(RemoteContentIntegrity.isAcceptableMimeType(""))
    }
}
