// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

#if canImport(UIKit)
import SelfSdk
import UIKit
import XCTest

@testable import SelfSdkUI

/// Proves that the UI target builds and runs on a simulator. It tests no SDK behaviour.
final class ToolchainTests: XCTestCase {
    func testUsesTheCoreTarget() {
        XCTAssertEqual(SelfSdkUI.coreVersion, SelfSdk.version)
    }

    @MainActor
    func testWebKitAndUIKitLoad() {
        let frame = CGRect(x: 0, y: 0, width: 320, height: 480)
        let host = UIView(frame: frame)
        let webView = SelfSdkUI.makeWebView(frame: frame)
        host.addSubview(webView)
        XCTAssertTrue(webView.isDescendant(of: host))
    }
}
#endif
