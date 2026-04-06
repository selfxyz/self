// SPDX-License-Identifier: BUSL-1.1

import Foundation
import XCTest
@testable import SelfNativeShell

final class RemoteNavigationPolicyTests: XCTestCase {
    func testResolvedPortDefaultsHTTPS() {
        XCTAssertEqual(
            RemoteNavigationPolicy.resolvedPort(for: URL(string: "https://verify.self.xyz")!),
            443
        )
    }

    func testResolvedPortDefaultsHTTP() {
        XCTAssertEqual(
            RemoteNavigationPolicy.resolvedPort(for: URL(string: "http://localhost")!),
            80
        )
    }

    func testResolvedPortPreservesExplicitPort() {
        XCTAssertEqual(
            RemoteNavigationPolicy.resolvedPort(for: URL(string: "https://verify.self.xyz:8443")!),
            8443
        )
    }

    func testMainFrameAllowsMatchingRemoteOriginWithDefaultPort() {
        XCTAssertTrue(
            RemoteNavigationPolicy.isAllowedMainFrameNavigation(
                url: URL(string: "https://verify.self.xyz/tunnel/tour/1")!,
                remoteWebAppBaseURL: URL(string: "https://verify.self.xyz:443"),
                isDebugMode: false
            )
        )
    }

    func testMainFrameRejectsDifferentRemotePort() {
        XCTAssertFalse(
            RemoteNavigationPolicy.isAllowedMainFrameNavigation(
                url: URL(string: "https://verify.self.xyz:8443/tunnel/tour/1")!,
                remoteWebAppBaseURL: URL(string: "https://verify.self.xyz"),
                isDebugMode: false
            )
        )
    }

    func testMainFrameRejectsInvalidRemoteBaseURL() {
        XCTAssertFalse(
            RemoteNavigationPolicy.isAllowedMainFrameNavigation(
                url: URL(string: "https://verify.self.xyz/tunnel/tour/1")!,
                remoteWebAppBaseURL: URL(string: "http://verify.self.xyz"),
                isDebugMode: false
            )
        )
    }

    func testSubframeAllowsDiditHostOnlyOverHTTPS() {
        XCTAssertTrue(
            RemoteNavigationPolicy.isAllowedSubframeNavigation(
                url: URL(string: "https://verify.didit.me/flow")!,
                remoteWebAppBaseURL: nil,
                isDebugMode: false
            )
        )
        XCTAssertFalse(
            RemoteNavigationPolicy.isAllowedSubframeNavigation(
                url: URL(string: "http://verify.didit.me/flow")!,
                remoteWebAppBaseURL: nil,
                isDebugMode: false
            )
        )
    }

    func testMakeEntryURLAppendsHostedPathAndQuery() {
        XCTAssertEqual(
            RemoteNavigationPolicy.makeEntryURL(
                baseURL: URL(string: "https://verify.self.xyz/"),
                queryParams: "foo=bar"
            )?.absoluteString,
            "https://verify.self.xyz/tunnel/tour/1?foo=bar"
        )
    }
}
