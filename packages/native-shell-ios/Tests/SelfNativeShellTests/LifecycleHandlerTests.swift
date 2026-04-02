// SPDX-License-Identifier: BUSL-1.1

import UIKit
import XCTest
@testable import SelfNativeShell

private final class MockViewController: UIViewController {
    var dismissCallCount = 0
    private var pendingCompletions: [() -> Void] = []

    override func dismiss(animated flag: Bool, completion: (() -> Void)? = nil) {
        dismissCallCount += 1
        if let completion {
            pendingCompletions.append(completion)
        }
    }

    func simulateDismissCompletion() {
        let completions = pendingCompletions
        pendingCompletions = []
        for completion in completions {
            completion()
        }
    }
}

final class LifecycleHandlerTests: XCTestCase {

    func testSetResultEmitsResultAndSuppressesDismissCallback() async throws {
        let viewController = MockViewController()
        var receivedResult: Any?
        var dismissCallCount = 0

        let handler = LifecycleHandler(
            viewController: viewController,
            onResult: { receivedResult = $0 },
            onFailure: nil,
            onDismiss: { dismissCallCount += 1 }
        )

        _ = try await handler.handle(
            method: "setResult",
            params: ["success": true, "verificationId": "ver_123"]
        )

        XCTAssertEqual(viewController.dismissCallCount, 1)
        let result = receivedResult as? [String: Any]
        XCTAssertEqual(result?["success"] as? Bool, true)
        XCTAssertEqual(result?["verificationId"] as? String, "ver_123")

        viewController.simulateDismissCompletion()
        XCTAssertEqual(dismissCallCount, 0)
    }

    func testDismissWithViewControllerWaitsForCompletionBeforeCallingOnDismiss() async throws {
        let viewController = MockViewController()
        var dismissCallCount = 0

        let handler = LifecycleHandler(
            viewController: viewController,
            onResult: nil,
            onFailure: nil,
            onDismiss: { dismissCallCount += 1 }
        )

        _ = try await handler.handle(method: "dismiss", params: nil)

        XCTAssertEqual(viewController.dismissCallCount, 1)
        XCTAssertEqual(dismissCallCount, 0)

        viewController.simulateDismissCompletion()
        XCTAssertEqual(dismissCallCount, 1)
    }

    func testDismissWithoutViewControllerCallsOnDismissImmediatelyOnce() async throws {
        var dismissCallCount = 0

        let handler = LifecycleHandler(
            viewController: nil,
            onResult: nil,
            onFailure: nil,
            onDismiss: { dismissCallCount += 1 }
        )

        _ = try await handler.handle(method: "dismiss", params: nil)
        _ = try await handler.handle(method: "dismiss", params: nil)

        XCTAssertEqual(dismissCallCount, 1)
    }
}
