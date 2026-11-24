// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import XCTest

@testable import SelfSdk

final class SelfSdkTests: XCTestCase {
    func testVersionIsSet() {
        XCTAssertFalse(SelfSdk.version.isEmpty)
    }
}
