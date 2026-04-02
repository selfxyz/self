// SPDX-License-Identifier: BUSL-1.1

import XCTest
@testable import SelfNativeShell

final class LifecycleResultEnvelopeTests: XCTestCase {

    // MARK: - extractPayload

    func testExtractPayloadUnwrapsNestedResult() {
        let inner: [String: Any] = ["success": true, "data": "value"]
        let params: [String: Any] = ["result": inner, "extra": "ignored"]

        let payload = SelfLifecycleResultEnvelope.extractPayload(from: params)

        XCTAssertNotNil(payload)
        let dict = payload as? [String: Any]
        XCTAssertEqual(dict?["success"] as? Bool, true)
        XCTAssertEqual(dict?["data"] as? String, "value")
    }

    func testExtractPayloadFallsBackToParamsWhenResultMissing() {
        let params: [String: Any] = ["success": false, "error": "oops"]

        let payload = SelfLifecycleResultEnvelope.extractPayload(from: params)

        let dict = payload as? [String: Any]
        XCTAssertEqual(dict?["success"] as? Bool, false)
        XCTAssertEqual(dict?["error"] as? String, "oops")
    }

    func testExtractPayloadReturnsNilForNilParams() {
        let payload = SelfLifecycleResultEnvelope.extractPayload(from: nil)

        XCTAssertNil(payload)
    }

    // MARK: - extractSuccess

    func testExtractSuccessReturnsTrueWhenSuccessIsTrue() {
        let payload: [String: Any] = ["success": true]

        let result = SelfLifecycleResultEnvelope.extractSuccess(from: payload)

        XCTAssertEqual(result, true)
    }

    func testExtractSuccessReturnsFalseWhenSuccessIsFalse() {
        let payload: [String: Any] = ["success": false]

        let result = SelfLifecycleResultEnvelope.extractSuccess(from: payload)

        XCTAssertEqual(result, false)
    }

    func testExtractSuccessReturnsNilWhenSuccessMissing() {
        let payload: [String: Any] = ["data": "value"]

        let result = SelfLifecycleResultEnvelope.extractSuccess(from: payload)

        XCTAssertNil(result)
    }

    func testExtractSuccessReturnsNilWhenSuccessIsNotBool() {
        let payload: [String: Any] = ["success": "yes"]

        let result = SelfLifecycleResultEnvelope.extractSuccess(from: payload)

        XCTAssertNil(result)
    }

    func testExtractSuccessReturnsNilForNonDictPayload() {
        let result = SelfLifecycleResultEnvelope.extractSuccess(from: "not-a-dict")

        XCTAssertNil(result)
    }

    func testExtractSuccessReturnsNilForNilPayload() {
        let result = SelfLifecycleResultEnvelope.extractSuccess(from: nil)

        XCTAssertNil(result)
    }

    // MARK: - SelfLifecycleResultError

    func testResultErrorExtractsNestedErrorMessage() {
        let payload: [String: Any] = [
            "success": false,
            "error": ["code": "TIMEOUT", "message": "Request timed out"],
        ]
        let error = SelfLifecycleResultError(payload: payload)

        XCTAssertEqual(error.localizedDescription, "Request timed out")
    }

    func testResultErrorFallsBackToDefaultMessage() {
        let error = SelfLifecycleResultError(payload: nil)

        XCTAssertEqual(error.localizedDescription, "Verification failed")
    }

    func testResultErrorFallsBackWhenPayloadHasNoErrorKey() {
        let payload: [String: Any] = ["success": false]
        let error = SelfLifecycleResultError(payload: payload)

        XCTAssertEqual(error.localizedDescription, "Verification failed")
    }
}
