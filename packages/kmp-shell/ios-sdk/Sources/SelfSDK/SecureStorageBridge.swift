// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import Foundation
import Security

/// Secure storage bridge using iOS Keychain Services.
public class SecureStorageBridge: NativeBridgeHandler {

    public let domain = "secureStorage"

    private let serviceName: String

    public init(serviceName: String = "xyz.self.sdk") {
        self.serviceName = serviceName
    }

    public func handle(
        method: String,
        params: [String: Any],
        completion: @escaping (Result<Any?, BridgeHandlerError>) -> Void
    ) {
        guard let key = params["key"] as? String else {
            completion(.failure(BridgeHandlerError(code: "MISSING_PARAM", message: "key is required")))
            return
        }

        switch method {
        case "get":
            get(key: key, completion: completion)
        case "set":
            guard let value = params["value"] as? String else {
                completion(.failure(BridgeHandlerError(code: "MISSING_PARAM", message: "value is required")))
                return
            }
            set(key: key, value: value, completion: completion)
        case "remove":
            remove(key: key, completion: completion)
        default:
            completion(.failure(BridgeHandlerError(
                code: "UNKNOWN_METHOD",
                message: "Unknown secureStorage method: \(method)"
            )))
        }
    }

    // MARK: - Keychain Operations

    private func get(key: String, completion: @escaping (Result<Any?, BridgeHandlerError>) -> Void) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceName,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        if status == errSecSuccess, let data = result as? Data, let value = String(data: data, encoding: .utf8) {
            completion(.success(value))
        } else if status == errSecItemNotFound {
            completion(.success(NSNull()))
        } else {
            completion(.failure(BridgeHandlerError(
                code: "KEYCHAIN_ERROR",
                message: "Failed to read from keychain: \(status)"
            )))
        }
    }

    private func set(key: String, value: String, completion: @escaping (Result<Any?, BridgeHandlerError>) -> Void) {
        guard let data = value.data(using: .utf8) else {
            completion(.failure(BridgeHandlerError(code: "ENCODING_ERROR", message: "Failed to encode value")))
            return
        }

        // Try to update first
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceName,
            kSecAttrAccount as String: key,
        ]

        let attributes: [String: Any] = [
            kSecValueData as String: data,
        ]

        var status = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)

        if status == errSecItemNotFound {
            // Item doesn't exist, create it
            var newItem = query
            newItem[kSecValueData as String] = data
            newItem[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlockedThisDeviceOnly
            status = SecItemAdd(newItem as CFDictionary, nil)
        }

        if status == errSecSuccess {
            completion(.success(["success": true]))
        } else {
            completion(.failure(BridgeHandlerError(
                code: "KEYCHAIN_ERROR",
                message: "Failed to write to keychain: \(status)"
            )))
        }
    }

    private func remove(key: String, completion: @escaping (Result<Any?, BridgeHandlerError>) -> Void) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceName,
            kSecAttrAccount as String: key,
        ]

        let status = SecItemDelete(query as CFDictionary)

        if status == errSecSuccess || status == errSecItemNotFound {
            completion(.success(["success": true]))
        } else {
            completion(.failure(BridgeHandlerError(
                code: "KEYCHAIN_ERROR",
                message: "Failed to delete from keychain: \(status)"
            )))
        }
    }
}
