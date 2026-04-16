// SPDX-License-Identifier: BUSL-1.1

import Foundation
import Security
import SelfNativeShell

final class KeychainStorageProvider: SecureStorageProvider {
    private let service = "xyz.self.sdk"

    func get(key: String) throws -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        if status == errSecItemNotFound { return nil }
        guard status == errSecSuccess, let data = result as? Data else {
            throw NSError(domain: "KeychainStorageProvider", code: Int(status), userInfo: [NSLocalizedDescriptionKey: "Keychain get failed: \(status)"])
        }
        return String(data: data, encoding: .utf8)
    }

    func set(key: String, value: String) throws {
        guard let data = value.data(using: .utf8) else {
            throw NSError(domain: "KeychainStorageProvider", code: -1, userInfo: [NSLocalizedDescriptionKey: "Failed to encode value"])
        }

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key
        ]

        let attributes: [String: Any] = [
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        ]

        let updateStatus = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)

        if updateStatus == errSecItemNotFound {
            var addQuery = query
            addQuery[kSecValueData as String] = data
            addQuery[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlockedThisDeviceOnly
            let addStatus = SecItemAdd(addQuery as CFDictionary, nil)
            guard addStatus == errSecSuccess else {
                throw NSError(domain: "KeychainStorageProvider", code: Int(addStatus), userInfo: [NSLocalizedDescriptionKey: "Keychain set failed: \(addStatus)"])
            }
        } else if updateStatus != errSecSuccess {
            throw NSError(domain: "KeychainStorageProvider", code: Int(updateStatus), userInfo: [NSLocalizedDescriptionKey: "Keychain update failed: \(updateStatus)"])
        }
    }

    func remove(key: String) throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key
        ]
        SecItemDelete(query as CFDictionary)
    }
}
