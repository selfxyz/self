// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import Foundation
import CryptoKit
import Security

/// Crypto bridge using CryptoKit for signing operations.
/// Hashing stays in the WebView (Web Crypto API) — only signing comes through the bridge.
public class CryptoBridge: NativeBridgeHandler {

    public let domain = "crypto"

    public init() {}

    public func handle(
        method: String,
        params: [String: Any],
        completion: @escaping (Result<Any?, BridgeHandlerError>) -> Void
    ) {
        switch method {
        case "sign":
            sign(params: params, completion: completion)
        case "generateKey":
            generateKey(params: params, completion: completion)
        case "getPublicKey":
            getPublicKey(params: params, completion: completion)
        default:
            completion(.failure(BridgeHandlerError(
                code: "UNKNOWN_METHOD",
                message: "Unknown crypto method: \(method)"
            )))
        }
    }

    // MARK: - Signing

    private func sign(
        params: [String: Any],
        completion: @escaping (Result<Any?, BridgeHandlerError>) -> Void
    ) {
        guard let dataBase64 = params["data"] as? String,
              let data = Data(base64Encoded: dataBase64),
              let keyRef = params["keyRef"] as? String
        else {
            completion(.failure(BridgeHandlerError(code: "MISSING_PARAM", message: "data and keyRef are required")))
            return
        }

        // Retrieve key from Keychain
        let query: [String: Any] = [
            kSecClass as String: kSecClassKey,
            kSecAttrApplicationTag as String: keyRef.data(using: .utf8)!,
            kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom,
            kSecReturnRef as String: true,
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        guard status == errSecSuccess, let privateKey = result else {
            completion(.failure(BridgeHandlerError(
                code: "KEY_NOT_FOUND",
                message: "Key not found: \(keyRef)"
            )))
            return
        }

        // Sign with ECDSA
        var error: Unmanaged<CFError>?
        guard let signature = SecKeyCreateSignature(
            privateKey as! SecKey,
            .ecdsaSignatureMessageX962SHA256,
            data as CFData,
            &error
        ) else {
            completion(.failure(BridgeHandlerError(
                code: "SIGN_FAILED",
                message: error?.takeRetainedValue().localizedDescription ?? "Signing failed"
            )))
            return
        }

        let signatureBase64 = (signature as Data).base64EncodedString()
        completion(.success(["signature": signatureBase64]))
    }

    // MARK: - Key Generation

    private func generateKey(
        params: [String: Any],
        completion: @escaping (Result<Any?, BridgeHandlerError>) -> Void
    ) {
        guard let keyRef = params["keyRef"] as? String else {
            completion(.failure(BridgeHandlerError(code: "MISSING_PARAM", message: "keyRef is required")))
            return
        }

        let attributes: [String: Any] = [
            kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom,
            kSecAttrKeySizeInBits as String: 256,
            kSecPrivateKeyAttrs as String: [
                kSecAttrIsPermanent as String: true,
                kSecAttrApplicationTag as String: keyRef.data(using: .utf8)!,
                kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
            ],
        ]

        var error: Unmanaged<CFError>?
        guard let privateKey = SecKeyCreateRandomKey(attributes as CFDictionary, &error) else {
            completion(.failure(BridgeHandlerError(
                code: "KEY_GEN_FAILED",
                message: error?.takeRetainedValue().localizedDescription ?? "Key generation failed"
            )))
            return
        }

        guard let publicKey = SecKeyCopyPublicKey(privateKey) else {
            completion(.failure(BridgeHandlerError(code: "KEY_GEN_FAILED", message: "Could not extract public key")))
            return
        }

        guard let publicKeyData = SecKeyCopyExternalRepresentation(publicKey, &error) else {
            completion(.failure(BridgeHandlerError(
                code: "KEY_GEN_FAILED",
                message: "Could not export public key"
            )))
            return
        }

        let publicKeyBase64 = (publicKeyData as Data).base64EncodedString()
        completion(.success(["publicKey": publicKeyBase64, "keyRef": keyRef]))
    }

    // MARK: - Get Public Key

    private func getPublicKey(
        params: [String: Any],
        completion: @escaping (Result<Any?, BridgeHandlerError>) -> Void
    ) {
        guard let keyRef = params["keyRef"] as? String else {
            completion(.failure(BridgeHandlerError(code: "MISSING_PARAM", message: "keyRef is required")))
            return
        }

        let query: [String: Any] = [
            kSecClass as String: kSecClassKey,
            kSecAttrApplicationTag as String: keyRef.data(using: .utf8)!,
            kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom,
            kSecReturnRef as String: true,
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        guard status == errSecSuccess, let privateKey = result else {
            completion(.failure(BridgeHandlerError(code: "KEY_NOT_FOUND", message: "Key not found: \(keyRef)")))
            return
        }

        guard let publicKey = SecKeyCopyPublicKey(privateKey as! SecKey) else {
            completion(.failure(BridgeHandlerError(code: "KEY_NOT_FOUND", message: "Could not extract public key")))
            return
        }

        var error: Unmanaged<CFError>?
        guard let publicKeyData = SecKeyCopyExternalRepresentation(publicKey, &error) else {
            completion(.failure(BridgeHandlerError(code: "KEY_NOT_FOUND", message: "Could not export public key")))
            return
        }

        let publicKeyBase64 = (publicKeyData as Data).base64EncodedString()
        completion(.success(["publicKey": publicKeyBase64]))
    }
}
