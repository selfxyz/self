// SPDX-License-Identifier: BUSL-1.1

import Foundation

final class SecureStorageHandler: BridgeHandler {
    let domain: BridgeDomain = .secureStorage

    private let provider: SecureStorageProvider

    init(provider: SecureStorageProvider) {
        self.provider = provider
    }

    func handle(method: String, params: [String: Any]?) async throws -> Any? {
        let result: Any?

        switch method {
        case "get":
            guard let key = params?["key"] as? String else {
                throw BridgeHandlerError.missingParam("key")
            }
            if let value = provider.get(key: key) {
                result = ["value": value]
            } else {
                result = ["value": NSNull()]
            }

        case "set":
            guard let key = params?["key"] as? String else {
                throw BridgeHandlerError.missingParam("key")
            }
            guard let value = params?["value"] as? String else {
                throw BridgeHandlerError.missingParam("value")
            }
            try provider.set(key: key, value: value)
            result = nil

        case "remove":
            guard let key = params?["key"] as? String else {
                throw BridgeHandlerError.missingParam("key")
            }
            try provider.remove(key: key)
            result = nil

        default:
            throw BridgeHandlerError.unknownMethod(method)
        }
        return result
    }
}
