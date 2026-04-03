// SPDX-License-Identifier: BUSL-1.1

import XCTest
@testable import SelfNativeShell

private final class MockSecureStorageProvider: SecureStorageProvider {
    func get(key: String) throws -> String? { nil }
    func set(key: String, value: String) throws {}
    func remove(key: String) throws {}
}

final class SelfSdkConfigTests: XCTestCase {

    func testDefaultsAreSetOnConstruction() {
        let provider = MockSecureStorageProvider()
        let config = SelfSdkConfig(
            verificationId: "ver-123",
            userId: "user-456",
            secureStorageProvider: provider
        )

        XCTAssertEqual(config.environment, "prod")
        XCTAssertEqual(config.isDebugMode, false)
        XCTAssertEqual(config.version, 1)
        XCTAssertTrue(config.secureStorageProvider as AnyObject === provider)
    }

    func testToQueryParamsIncludesRequiredFields() {
        let config = SelfSdkConfig(
            verificationId: "ver-123",
            userId: "user-456",
            secureStorageProvider: MockSecureStorageProvider()
        )

        let query = config.toQueryParams()

        XCTAssertTrue(query.contains("verificationId=ver-123"))
        XCTAssertTrue(query.contains("userId=user-456"))
        XCTAssertTrue(query.contains("environment=prod"))
        XCTAssertTrue(query.contains("version=1"))
    }

    func testToQueryParamsIncludesOptionalFields() {
        let config = SelfSdkConfig(
            verificationId: "ver-1",
            userId: "user-1",
            scope: "identity",
            disclosures: ["name", "dob"],
            appName: "TestApp",
            appEndpoint: "https://example.com",
            resultType: "json",
            excludedCountries: ["US", "GB"],
            endpointType: "staging",
            userIdType: "email",
            chainID: 137,
            userDefinedData: "custom",
            selfDefinedData: "internal",
            secureStorageProvider: MockSecureStorageProvider()
        )

        let query = config.toQueryParams()

        XCTAssertTrue(query.contains("scope=identity"))
        XCTAssertTrue(query.contains("disclosures=name,dob"))
        XCTAssertTrue(query.contains("appName=TestApp"))
        XCTAssertTrue(query.contains("resultType=json"))
        XCTAssertTrue(query.contains("excludedCountries=US,GB"))
        XCTAssertTrue(query.contains("endpointType=staging"))
        XCTAssertTrue(query.contains("userIdType=email"))
        XCTAssertTrue(query.contains("chainID=137"))
        XCTAssertTrue(query.contains("userDefinedData=custom"))
        XCTAssertTrue(query.contains("selfDefinedData=internal"))
    }

    func testToQueryParamsOmitsNilOptionals() {
        let config = SelfSdkConfig(
            verificationId: "ver-1",
            userId: "user-1",
            secureStorageProvider: MockSecureStorageProvider()
        )

        let query = config.toQueryParams()

        XCTAssertFalse(query.contains("scope="))
        XCTAssertFalse(query.contains("disclosures="))
        XCTAssertFalse(query.contains("appName="))
        XCTAssertFalse(query.contains("chainID="))
    }

    func testToQueryParamsEncodesSpecialCharacters() {
        let config = SelfSdkConfig(
            verificationId: "ver 123",
            userId: "user+456",
            secureStorageProvider: MockSecureStorageProvider()
        )

        let query = config.toQueryParams()

        XCTAssertFalse(query.contains(" "))
        XCTAssertTrue(query.contains("ver%20123") || query.contains("ver+123"))
    }
}
