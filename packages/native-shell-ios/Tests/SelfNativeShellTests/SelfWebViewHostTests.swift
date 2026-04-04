// SPDX-License-Identifier: BUSL-1.1

import XCTest
@testable import SelfNativeShell

final class SelfWebViewHostTests: XCTestCase {
    func testReleaseBuildUsesBundledOrigin() throws {
        let url = try XCTUnwrap(SelfWebViewHost.initialContentURL(queryParams: "", isDebugMode: false))

        XCTAssertEqual(url.absoluteString, "self-sdk://app/tunnel/tour/1")
    }

    func testAllowedNavigationRejectsRemoteAlphaOrigin() {
        XCTAssertTrue(
            SelfWebViewHost.isAllowedNavigationURL(
                URL(string: "self-sdk://app/tunnel/tour/1"),
                isDebugMode: false
            )
        )
        XCTAssertTrue(
            SelfWebViewHost.isAllowedNavigationURL(
                URL(string: "https://verify.didit.me/session/123"),
                isDebugMode: false
            )
        )
        XCTAssertFalse(
            SelfWebViewHost.isAllowedNavigationURL(
                URL(string: "https://self-app-alpha.vercel.app/tunnel/tour/1"),
                isDebugMode: false
            )
        )
    }

    func testBridgeTrustIsLimitedToBundledOrigin() {
        XCTAssertTrue(
            SelfWebViewHost.isTrustedBridgeURL(
                URL(string: "self-sdk://app/tunnel/tour/1"),
                isDebugMode: false
            )
        )
        XCTAssertFalse(
            SelfWebViewHost.isTrustedBridgeURL(
                URL(string: "https://verify.didit.me/session/123"),
                isDebugMode: false
            )
        )
        XCTAssertFalse(
            SelfWebViewHost.isTrustedBridgeURL(
                URL(string: "https://self-app-alpha.vercel.app/tunnel/tour/1"),
                isDebugMode: false
            )
        )
    }
}
