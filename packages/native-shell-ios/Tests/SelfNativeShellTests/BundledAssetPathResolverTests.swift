// SPDX-License-Identifier: BUSL-1.1

import Foundation
import XCTest
@testable import SelfNativeShell

final class BundledAssetPathResolverTests: XCTestCase {
    func testResolvesIndexForDirectoryStyleRequest() {
        let rootURL = URL(fileURLWithPath: "/tmp/self-sdk-web", isDirectory: true)
        let requestURL = URL(string: "self-sdk://app/tunnel/tour/1")!

        XCTAssertEqual(
            BundledAssetPathResolver.resolveFileURL(for: requestURL, rootURL: rootURL)?.path,
            rootURL.appendingPathComponent("index.html").path
        )
    }

    func testResolvesStaticAssetInsideBundle() {
        let rootURL = URL(fileURLWithPath: "/tmp/self-sdk-web", isDirectory: true)
        let requestURL = URL(string: "self-sdk://app/assets/app.js")!

        XCTAssertEqual(
            BundledAssetPathResolver.resolveFileURL(for: requestURL, rootURL: rootURL)?.path,
            rootURL.appendingPathComponent("assets/app.js").path
        )
    }

    func testRejectsPathTraversal() {
        let rootURL = URL(fileURLWithPath: "/tmp/self-sdk-web", isDirectory: true)
        let requestURL = URL(string: "self-sdk://app/../../secret.txt")!

        XCTAssertNil(BundledAssetPathResolver.resolveFileURL(for: requestURL, rootURL: rootURL))
    }

    func testRejectsPercentEncodedTraversal() {
        let rootURL = URL(fileURLWithPath: "/tmp/self-sdk-web", isDirectory: true)
        let requestURL = URL(string: "self-sdk://app/%2E%2E/%2E%2E/secret.txt")!

        XCTAssertNil(BundledAssetPathResolver.resolveFileURL(for: requestURL, rootURL: rootURL))
    }
}
