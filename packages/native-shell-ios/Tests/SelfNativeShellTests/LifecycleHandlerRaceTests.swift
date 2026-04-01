// SPDX-License-Identifier: BUSL-1.1

import XCTest
@testable import SelfNativeShell

final class LifecycleHandlerRaceTests: XCTestCase {

    // MARK: - setResult then dismiss

    func testSetResultThenDismissOnlyFiresResultCallback() async throws {
        var resultCalled = false
        var failureCalled = false
        var dismissCalled = false

        let handler = LifecycleHandler(
            viewController: nil,
            onResult: { _ in resultCalled = true },
            onFailure: { _ in failureCalled = true },
            onDismiss: { dismissCalled = true }
        )

        _ = try await handler.handle(
            method: "setResult",
            params: ["result": ["success": true] as [String: Any]]
        )
        _ = try await handler.handle(method: "dismiss", params: nil)

        XCTAssertTrue(resultCalled, "onResult should fire from setResult")
        XCTAssertFalse(failureCalled, "onFailure should not fire for success")
        XCTAssertFalse(dismissCalled, "onDismiss should not fire after setResult already claimed")
    }

    // MARK: - dismiss then setResult

    func testDismissThenSetResultOnlyFiresDismissCallback() async throws {
        var resultCalled = false
        var failureCalled = false
        var dismissCalled = false

        let handler = LifecycleHandler(
            viewController: nil,
            onResult: { _ in resultCalled = true },
            onFailure: { _ in failureCalled = true },
            onDismiss: { dismissCalled = true }
        )

        _ = try await handler.handle(method: "dismiss", params: nil)
        _ = try await handler.handle(
            method: "setResult",
            params: ["result": ["success": true] as [String: Any]]
        )

        XCTAssertTrue(dismissCalled, "onDismiss should fire from dismiss")
        XCTAssertFalse(resultCalled, "onResult should not fire after dismiss already claimed")
        XCTAssertFalse(failureCalled, "onFailure should not fire")
    }

    // MARK: - failure routing

    func testSetResultWithFailureRoutesToOnFailure() async throws {
        var resultCalled = false
        var failureCalled = false

        let handler = LifecycleHandler(
            viewController: nil,
            onResult: { _ in resultCalled = true },
            onFailure: { _ in failureCalled = true },
            onDismiss: nil
        )

        _ = try await handler.handle(
            method: "setResult",
            params: ["result": ["success": false, "error": ["message": "timeout"]] as [String: Any]]
        )

        XCTAssertFalse(resultCalled, "onResult should not fire for failure")
        XCTAssertTrue(failureCalled, "onFailure should fire for success=false")
    }

    // MARK: - double setResult

    func testDoubleSetResultOnlyFiresOnce() async throws {
        var resultCallCount = 0

        let handler = LifecycleHandler(
            viewController: nil,
            onResult: { _ in resultCallCount += 1 },
            onFailure: nil,
            onDismiss: nil
        )

        _ = try await handler.handle(
            method: "setResult",
            params: ["result": ["success": true] as [String: Any]]
        )
        _ = try await handler.handle(
            method: "setResult",
            params: ["result": ["success": true] as [String: Any]]
        )

        XCTAssertEqual(resultCallCount, 1, "onResult should fire exactly once")
    }

    // MARK: - double dismiss

    func testDoubleDismissOnlyFiresOnce() async throws {
        var dismissCallCount = 0

        let handler = LifecycleHandler(
            viewController: nil,
            onResult: nil,
            onFailure: nil,
            onDismiss: { dismissCallCount += 1 }
        )

        _ = try await handler.handle(method: "dismiss", params: nil)
        _ = try await handler.handle(method: "dismiss", params: nil)

        XCTAssertEqual(dismissCallCount, 1, "onDismiss should fire exactly once")
    }
}
