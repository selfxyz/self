// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import Foundation
import Security

/// Swift implementation of CryptoProvider using Security framework (Secure Enclave/Keychain).
/// Generates EC P-256 keys, signs with ECDSA-SHA256, and stores in Keychain.
@objcMembers
public class CryptoProviderImpl: NSObject {

    public override init() {
        super.init()
    }

    public func generateKey(keyRef: String) {
        // Delete any existing key with this ref
        deleteKey(keyRef: keyRef)

        let tag = keyRef.data(using: .utf8)!

        let attributes: [String: Any] = [
            kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom,
            kSecAttrKeySizeInBits as String: 256,
            kSecPrivateKeyAttrs as String: [
                kSecAttrIsPermanent as String: true,
                kSecAttrApplicationTag as String: tag,
                kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
            ],
        ]

        var error: Unmanaged<CFError>?
        guard SecKeyCreateRandomKey(attributes as CFDictionary, &error) != nil else {
            let errorDesc = error?.takeRetainedValue().localizedDescription ?? "Unknown error"
            NSLog("SelfSDK-Crypto: Key generation failed: %@", errorDesc)
            return
        }
    }

    public func getPublicKey(keyRef: String) -> String? {
        guard let privateKey = loadPrivateKey(keyRef: keyRef) else { return nil }
        guard let publicKey = SecKeyCopyPublicKey(privateKey) else { return nil }

        var error: Unmanaged<CFError>?
        guard let publicKeyData = SecKeyCopyExternalRepresentation(publicKey, &error) as Data? else {
            return nil
        }

        return publicKeyData.base64EncodedString()
    }

    public func sign(keyRef: String, data: String) -> String? {
        guard let privateKey = loadPrivateKey(keyRef: keyRef) else { return nil }
        guard let dataBytes = Data(base64Encoded: data) else { return nil }

        var error: Unmanaged<CFError>?
        guard let signature = SecKeyCreateSignature(
            privateKey,
            .ecdsaSignatureMessageX962SHA256,
            dataBytes as CFData,
            &error
        ) as Data? else {
            let errorDesc = error?.takeRetainedValue().localizedDescription ?? "Unknown error"
            NSLog("SelfSDK-Crypto: Signing failed: %@", errorDesc)
            return nil
        }

        return signature.base64EncodedString()
    }

    public func deleteKey(keyRef: String) {
        let tag = keyRef.data(using: .utf8)!

        let query: [String: Any] = [
            kSecClass as String: kSecClassKey,
            kSecAttrApplicationTag as String: tag,
            kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom,
        ]

        SecItemDelete(query as CFDictionary)
    }

    // MARK: - Private helpers

    private func loadPrivateKey(keyRef: String) -> SecKey? {
        let tag = keyRef.data(using: .utf8)!

        let query: [String: Any] = [
            kSecClass as String: kSecClassKey,
            kSecAttrApplicationTag as String: tag,
            kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom,
            kSecReturnRef as String: true,
        ]

        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)

        guard status == errSecSuccess else { return nil }
        return (item as! SecKey)
    }
}
