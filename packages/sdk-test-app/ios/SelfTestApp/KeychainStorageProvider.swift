// SPDX-License-Identifier: BUSL-1.1

import Foundation
import Security
import SelfNativeShell

final class KeychainStorageProvider: SecureStorageProvider {
    private let service = "xyz.self.sdk"

    func get(key: String) -> String? {
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

    func set(key: String, value: String) throws {
        guard let data = value.data(using: .utf8) else {
            throw NSError(domain: "KeychainStorageProvider", code: -1, userInfo: [NSLocalizedDescriptionKey: "Failed to encode value"])
        }

        try remove(key: key)

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        ]

        let status = SecItemAdd(query as CFDictionary, nil)
        guard status == errSecSuccess else {
            throw NSError(domain: "KeychainStorageProvider", code: Int(status), userInfo: [NSLocalizedDescriptionKey: "Keychain set failed: \(status)"])
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
