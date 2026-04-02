// SPDX-License-Identifier: BUSL-1.1

import UIKit
import XCTest
@testable import SelfNativeShell

// MARK: - Mock UIViewController

private final class MockViewController: UIViewController {
    var dismissCallCount = 0
    private var pendingCompletions: [() -> Void] = []

    override func dismiss(animated flag: Bool, completion: (() -> Void)? = nil) {
        dismissCallCount += 1
        if let completion {
            pendingCompletions.append(completion)
        }
    }

    func simulateDismissCompletions() {
        let completions = pendingCompletions
        pendingCompletions = []
        for completion in completions {
            completion()
        }
    }
}

// MARK: - Tests (viewController: nil)

final class LifecycleHandlerRaceTests: XCTestCase {

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

// MARK: - Tests (viewController path)

@MainActor
final class LifecycleHandlerViewControllerRaceTests: XCTestCase {

    func testSetResultThenDismissWithVC() async throws {
        let vc = MockViewController()
        var resultCalled = false
        var dismissCalled = false

        let handler = LifecycleHandler(
            viewController: vc,
            onResult: { _ in resultCalled = true },
            onFailure: nil,
            onDismiss: { dismissCalled = true }
        )

        _ = try await handler.handle(
            method: "setResult",
            params: ["result": ["success": true] as [String: Any]]
        )

        XCTAssertTrue(resultCalled, "onResult should fire from setResult")
        XCTAssertEqual(vc.dismissCallCount, 1, "vc.dismiss should be called once by setResult")

        // Second dismiss via bridge should still dismiss the VC but not fire onDismiss
        _ = try await handler.handle(method: "dismiss", params: nil)

        XCTAssertEqual(vc.dismissCallCount, 2, "vc.dismiss called again for the explicit dismiss")
        XCTAssertFalse(dismissCalled, "onDismiss must not fire — setResult already claimed the gate")
    }

    func testDismissThenSetResultWithVC_gateClaimedBeforeCompletion() async throws {
        let vc = MockViewController()
        var resultCalled = false
        var dismissCalled = false

        let handler = LifecycleHandler(
            viewController: vc,
            onResult: { _ in resultCalled = true },
            onFailure: nil,
            onDismiss: { dismissCalled = true }
        )

        // dismiss claims the gate immediately, before vc.dismiss completion fires
        _ = try await handler.handle(method: "dismiss", params: nil)

        XCTAssertEqual(vc.dismissCallCount, 1)
        XCTAssertFalse(dismissCalled, "onDismiss should not fire yet — waiting for completion")

        // setResult arrives while vc.dismiss animation is in-flight
        _ = try await handler.handle(
            method: "setResult",
            params: ["result": ["success": true] as [String: Any]]
        )

        XCTAssertFalse(resultCalled, "onResult must not fire — dismiss already claimed the gate")

        // vc.dismiss completion fires
        vc.simulateDismissCompletions()

        XCTAssertTrue(dismissCalled, "onDismiss should fire from completion")
        XCTAssertFalse(resultCalled, "onResult must still not have fired")
    }

    func testDismissWithVC_completionFiresOnDismiss() async throws {
        let vc = MockViewController()
        var dismissCalled = false

        let handler = LifecycleHandler(
            viewController: vc,
            onResult: nil,
            onFailure: nil,
            onDismiss: { dismissCalled = true }
        )

        _ = try await handler.handle(method: "dismiss", params: nil)
        XCTAssertFalse(dismissCalled, "onDismiss should not fire until vc.dismiss completes")

        vc.simulateDismissCompletions()
        XCTAssertTrue(dismissCalled, "onDismiss should fire from vc.dismiss completion")
    }

    func testDoubleDismissWithVC_onlyFiresOnce() async throws {
        let vc = MockViewController()
        var dismissCallCount = 0

        let handler = LifecycleHandler(
            viewController: vc,
            onResult: nil,
            onFailure: nil,
            onDismiss: { dismissCallCount += 1 }
        )

        _ = try await handler.handle(method: "dismiss", params: nil)
        _ = try await handler.handle(method: "dismiss", params: nil)

        // Both calls dismiss the VC, but only the first claims the gate
        XCTAssertEqual(vc.dismissCallCount, 2)

        vc.simulateDismissCompletions()
        XCTAssertEqual(dismissCallCount, 1, "onDismiss should fire exactly once")
    }

    func testFailureRoutingWithVC() async throws {
        let vc = MockViewController()
        var resultCalled = false
        var failureCalled = false

        let handler = LifecycleHandler(
            viewController: vc,
            onResult: { _ in resultCalled = true },
            onFailure: { _ in failureCalled = true },
            onDismiss: nil
        )

        _ = try await handler.handle(
            method: "setResult",
            params: ["result": ["success": false, "error": ["message": "denied"]] as [String: Any]]
        )

        XCTAssertFalse(resultCalled)
        XCTAssertTrue(failureCalled, "onFailure should fire for success=false with VC present")
        XCTAssertEqual(vc.dismissCallCount, 1, "vc.dismiss should be called after setResult")
    }
}
