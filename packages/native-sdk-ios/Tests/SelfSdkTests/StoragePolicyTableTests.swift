// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import Foundation
import XCTest

@testable import SelfSdk

final class StoragePolicyTableTests: XCTestCase {
    private func firstRow(_ namespace: StorageNamespace, _ key: String) throws -> StoragePolicyRow? {
        let whole = NSRange(key.startIndex..., in: key)
        return try StoragePolicyTable.rows.first { row in
            guard row.namespace == namespace else { return false }
            let match = try NSRegularExpression(pattern: row.pattern)
                .firstMatch(in: key, options: [.anchored], range: whole)
            return match?.range == whole
        }
    }

    func testTableConstants() {
        XCTAssertEqual(StoragePolicyTable.version, 1)
        XCTAssertEqual(StoragePolicyTable.keyMaxLength, 128)
        XCTAssertEqual(StoragePolicyTable.defaultProtection, .noneValue)
        XCTAssertEqual(StoragePolicyTable.rows.count, 13)
    }

    func testTheRecoveryPhraseNeedsUserPresence() throws {
        XCTAssertEqual(try firstRow(.web, "self_mnemonic")?.rule, .minimum(.userPresence))
    }

    func testThePrivateKeyIsForbidden() throws {
        XCTAssertEqual(try firstRow(.web, "self_private_key")?.rule, .forbidden)
    }

    func testAPatternMatchesTheWholeKeyOnly() throws {
        let documentKey = "self_doc_" + String(repeating: "0a", count: 32)

        XCTAssertEqual(try firstRow(.web, documentKey)?.rule, .minimum(.noneValue))
        XCTAssertNil(try firstRow(.web, documentKey + "0"))
        XCTAssertNil(try firstRow(.web, "x_self_mnemonic"))
        XCTAssertNil(try firstRow(.web, "self_doc_" + String(repeating: "0A", count: 32)))
    }

    func testAnEscapedDotMatchesADotOnly() throws {
        XCTAssertEqual(try firstRow(.native, "migration.state")?.pattern, "migration\\.state")
        XCTAssertNil(try firstRow(.native, "migrationXstate"))
        XCTAssertNil(try firstRow(.web, "migration.state"))
    }
}
