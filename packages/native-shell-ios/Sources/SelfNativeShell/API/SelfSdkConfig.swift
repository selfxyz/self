// SPDX-License-Identifier: BUSL-1.1

import Foundation

public struct SelfSdkConfig {
    public let verificationId: String
    public let userId: String
    public let environment: String
    public let isDebugMode: Bool
    public let version: Int
    public let scope: String?
    public let disclosures: [String]?
    public let appName: String?
    public let appEndpoint: String?
    public let resultType: String?
    public let excludedCountries: [String]?
    public let endpointType: String?
    public let userIdType: String?
    public let chainID: Int?
    public let userDefinedData: String?
    public let selfDefinedData: String?
    public let secureStorageProvider: SecureStorageProvider

    public init(
        verificationId: String,
        userId: String,
        environment: String = "prod",
        isDebugMode: Bool = false,
        version: Int = 1,
        scope: String? = nil,
        disclosures: [String]? = nil,
        appName: String? = nil,
        appEndpoint: String? = nil,
        resultType: String? = nil,
        excludedCountries: [String]? = nil,
        endpointType: String? = nil,
        userIdType: String? = nil,
        chainID: Int? = nil,
        userDefinedData: String? = nil,
        selfDefinedData: String? = nil,
        secureStorageProvider: SecureStorageProvider
    ) {
        self.verificationId = verificationId
        self.userId = userId
        self.environment = environment
        self.isDebugMode = isDebugMode
        self.version = version
        self.scope = scope
        self.disclosures = disclosures
        self.appName = appName
        self.appEndpoint = appEndpoint
        self.resultType = resultType
        self.excludedCountries = excludedCountries
        self.endpointType = endpointType
        self.userIdType = userIdType
        self.chainID = chainID
        self.userDefinedData = userDefinedData
        self.selfDefinedData = selfDefinedData
        self.secureStorageProvider = secureStorageProvider
    }

    func toQueryParams() -> String {
        var components = URLComponents()
        var items = [
            URLQueryItem(name: "environment", value: environment),
            URLQueryItem(name: "verificationId", value: verificationId),
            URLQueryItem(name: "userId", value: userId),
            URLQueryItem(name: "version", value: String(version)),
        ]
        if let scope = scope {
            items.append(URLQueryItem(name: "scope", value: scope))
        }
        if let disclosures = disclosures, !disclosures.isEmpty {
            items.append(URLQueryItem(name: "disclosures", value: disclosures.joined(separator: ",")))
        }
        if let appName = appName {
            items.append(URLQueryItem(name: "appName", value: appName))
        }
        if let appEndpoint = appEndpoint {
            items.append(URLQueryItem(name: "appEndpoint", value: appEndpoint))
        }
        if let resultType = resultType {
            items.append(URLQueryItem(name: "resultType", value: resultType))
        }
        if let excludedCountries = excludedCountries, !excludedCountries.isEmpty {
            items.append(URLQueryItem(name: "excludedCountries", value: excludedCountries.joined(separator: ",")))
        }
        if let endpointType = endpointType {
            items.append(URLQueryItem(name: "endpointType", value: endpointType))
        }
        if let userIdType = userIdType {
            items.append(URLQueryItem(name: "userIdType", value: userIdType))
        }
        if let chainID = chainID {
            items.append(URLQueryItem(name: "chainID", value: String(chainID)))
        }
        if let userDefinedData = userDefinedData {
            items.append(URLQueryItem(name: "userDefinedData", value: userDefinedData))
        }
        if let selfDefinedData = selfDefinedData {
            items.append(URLQueryItem(name: "selfDefinedData", value: selfDefinedData))
        }
        components.queryItems = items
        return components.percentEncodedQuery ?? ""
    }
}

public protocol SelfSdkCallback: AnyObject {
    func onSuccess(result: [String: Any])
    func onFailure(error: Error)
    func onCancelled()
}
