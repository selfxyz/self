// SPDX-License-Identifier: BUSL-1.1

import Foundation
import Security

final class SecureStorageHandler: BridgeHandler {
    let domain: BridgeDomain = .secureStorage

    // requireBiometric is intentionally ignored — device lock provides sufficient security per spec
    private let service = "xyz.self.sdk"

    func handle(method: String, params: [String: Any]?) async throws -> Any? {
        switch method {
        case "get":
            guard let key = params?["key"] as? String else {
                throw BridgeHandlerError.missingParam("key")
            }
            let value = get(key: key)
            return ["value": value as Any]

        case "set":
            guard let key = params?["key"] as? String else {
                throw BridgeHandlerError.missingParam("key")
            }
            guard let value = params?["value"] as? String else {
                throw BridgeHandlerError.missingParam("value")
            }
            try set(key: key, value: value)
            return nil

        case "remove":
            guard let key = params?["key"] as? String else {
                throw BridgeHandlerError.missingParam("key")
            }
            remove(key: key)
            return nil

        default:
            throw BridgeHandlerError.unknownMethod(method)
        }
    }

    private func get(key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        guard status == errSecSuccess, let data = result as? Data else {
            return nil
        }
        return String(data: data, encoding: .utf8)
    }

    private func set(key: String, value: String) throws {
        guard let data = value.data(using: .utf8) else {
            throw BridgeHandlerError.operationFailed("Failed to encode value")
        }

        // Remove existing item first
        remove(key: key)

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        ]

        let status = SecItemAdd(query as CFDictionary, nil)
        guard status == errSecSuccess else {
            throw BridgeHandlerError.operationFailed("Keychain set failed: \(status)")
        }
    }

    private func remove(key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key
        ]
        SecItemDelete(query as CFDictionary)
    }
}
