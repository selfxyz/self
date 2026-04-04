// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import XCTest
@testable import SelfSdkSwift

final class WebViewProviderImplTests: XCTestCase {
    func testReleaseBuildUsesBundledOrigin() throws {
        let url = try XCTUnwrap(WebViewProviderImpl.initialContentURL(queryParams: nil, isDebugMode: false))

        XCTAssertEqual(url.absoluteString, "self-sdk://app/tunnel/tour/1")
    }

    func testAllowedNavigationRejectsRemoteAlphaOrigin() {
        XCTAssertTrue(
            WebViewProviderImpl.isAllowedNavigationURL(
                URL(string: "self-sdk://app/tunnel/tour/1"),
                isDebugMode: false
            )
        )
        XCTAssertTrue(
            WebViewProviderImpl.isAllowedNavigationURL(
                URL(string: "https://verify.didit.me/session/123"),
                isDebugMode: false
            )
        )
        XCTAssertFalse(
            WebViewProviderImpl.isAllowedNavigationURL(
                URL(string: "https://self-app-alpha.vercel.app/tunnel/tour/1"),
                isDebugMode: false
            )
        )
    }

    func testBridgeTrustIsLimitedToBundledOrigin() {
        XCTAssertTrue(
            WebViewProviderImpl.isTrustedBridgeURL(
                URL(string: "self-sdk://app/tunnel/tour/1"),
                isDebugMode: false
            )
        )
        XCTAssertFalse(
            WebViewProviderImpl.isTrustedBridgeURL(
                URL(string: "https://verify.didit.me/session/123"),
                isDebugMode: false
            )
        )
        XCTAssertFalse(
            WebViewProviderImpl.isTrustedBridgeURL(
                URL(string: "https://self-app-alpha.vercel.app/tunnel/tour/1"),
                isDebugMode: false
            )
        )
    }
}
