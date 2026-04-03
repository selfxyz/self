// SPDX-License-Identifier: BUSL-1.1

import Foundation
import Security

final class CryptoHandler: BridgeHandler {
    let domain: BridgeDomain = .crypto

    func handle(method: String, params: [String: Any]?) async throws -> Any? {
        switch method {
        case "generateKey":
            guard let keyRef = params?["keyRef"] as? String else {
                throw BridgeHandlerError.missingParam("keyRef")
            }
            try generateKey(keyRef: keyRef)
            return ["keyRef": keyRef, "success": true]

        case "getPublicKey":
            guard let keyRef = params?["keyRef"] as? String else {
                throw BridgeHandlerError.missingParam("keyRef")
            }
            guard let publicKey = getPublicKey(keyRef: keyRef) else {
                throw BridgeHandlerError.operationFailed("Key not found: \(keyRef)")
            }
            return ["publicKey": publicKey]

        case "sign":
            guard let keyRef = params?["keyRef"] as? String else {
                throw BridgeHandlerError.missingParam("keyRef")
            }
            guard let dataB64 = params?["data"] as? String else {
                throw BridgeHandlerError.missingParam("data")
            }
            guard let signature = sign(keyRef: keyRef, data: dataB64) else {
                throw BridgeHandlerError.operationFailed("Signing failed for key: \(keyRef)")
            }
            return ["signature": signature]

        default:
            throw BridgeHandlerError.unknownMethod(method)
        }
    }

    private func generateKey(keyRef: String) throws {
        // Delete existing key if present
        deleteKey(keyRef: keyRef)

        let attributes: [String: Any] = [
            kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom,
            kSecAttrKeySizeInBits as String: 256,
            kSecPrivateKeyAttrs as String: [
                kSecAttrIsPermanent as String: true,
                kSecAttrApplicationTag as String: keyRef.data(using: .utf8)!,
                kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
            ]
        ]

        var error: Unmanaged<CFError>?
        guard SecKeyCreateRandomKey(attributes as CFDictionary, &error) != nil else {
            let desc = error?.takeRetainedValue().localizedDescription ?? "Unknown error"
            throw BridgeHandlerError.operationFailed("Key generation failed: \(desc)")
        }
    }

    private func getPublicKey(keyRef: String) -> String? {
        guard let privateKey = loadPrivateKey(keyRef: keyRef) else { return nil }
        guard let publicKey = SecKeyCopyPublicKey(privateKey) else { return nil }

        var error: Unmanaged<CFError>?
        guard let publicKeyData = SecKeyCopyExternalRepresentation(publicKey, &error) as Data? else {
            return nil
        }
        return publicKeyData.base64EncodedString()
    }

    private func sign(keyRef: String, data: String) -> String? {
        guard let privateKey = loadPrivateKey(keyRef: keyRef),
              let dataBytes = Data(base64Encoded: data) else {
            return nil
        }

        var error: Unmanaged<CFError>?
        guard let signature = SecKeyCreateSignature(
            privateKey,
            .ecdsaSignatureMessageX962SHA256,
            dataBytes as CFData,
            &error
        ) as Data? else {
            return nil
        }
        return signature.base64EncodedString()
    }

    private func loadPrivateKey(keyRef: String) -> SecKey? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassKey,
            kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom,
            kSecAttrApplicationTag as String: keyRef.data(using: .utf8)!,
            kSecReturnRef as String: true
        ]

        var result: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        guard status == errSecSuccess, let result else { return nil }
        // swiftlint:disable:next force_cast
        return (result as! SecKey)
    }

    private func deleteKey(keyRef: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassKey,
            kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom,
            kSecAttrApplicationTag as String: keyRef.data(using: .utf8)!
        ]
        SecItemDelete(query as CFDictionary)
    }
}
