// SPDX-License-Identifier: BUSL-1.1

import Foundation

public struct SelfSdkConfig {
    public let teeUrl: String
    public let verificationId: String
    public let userId: String
    public let isDebugMode: Bool

    public init(
        teeUrl: String,
        verificationId: String,
        userId: String,
        isDebugMode: Bool = false
    ) {
        self.teeUrl = teeUrl
        self.verificationId = verificationId
        self.userId = userId
        self.isDebugMode = isDebugMode
    }

    func toQueryParams() -> String {
        var components = URLComponents()
        components.queryItems = [
            URLQueryItem(name: "teeUrl", value: teeUrl),
            URLQueryItem(name: "verificationId", value: verificationId),
            URLQueryItem(name: "userId", value: userId)
        ]
        return components.percentEncodedQuery ?? ""
    }
}

public protocol SelfSdkCallback: AnyObject {
    func onSuccess(result: [String: Any])
    func onFailure(error: Error)
    func onCancelled()
}
