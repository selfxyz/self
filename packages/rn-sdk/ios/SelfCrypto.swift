// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import Foundation
import Security

// Bridged via @objc to React's RCTPromiseResolveBlock / RCTPromiseRejectBlock in SelfCrypto.m.
typealias RCTPromiseResolveBlock = (Any?) -> Void
typealias RCTPromiseRejectBlock = (String?, String?, Error?) -> Void

/**
 Native module backing CryptoHandler in @selfxyz/rn-sdk.

 Algorithm choices intentionally mirror packages/native-shell-ios/
 CryptoHandler.swift so signatures produced under any shell verify identically:
   - EC keys, P-256 (kSecAttrKeyTypeECSECPrimeRandom, 256-bit)
   - Stored in keychain, application-tag = keyRef bytes
   - kSecAttrAccessibleWhenUnlockedThisDeviceOnly
   - ECDSA signature, .ecdsaSignatureMessageX962SHA256
   - Public key encoded via SecKeyCopyExternalRepresentation (X9.63)
   - Base64 standard encoding for transport
 */
@objc(SelfCrypto)
class SelfCrypto: NSObject {

  @objc
  static func requiresMainQueueSetup() -> Bool { false }

  @objc(generateKey:resolver:rejecter:)
  func generateKey(
    keyRef: NSString,
    resolver: RCTPromiseResolveBlock,
    rejecter: RCTPromiseRejectBlock
  ) {
    let keyRefString = keyRef as String
    guard let tagData = keyRefString.data(using: .utf8) else {
      rejecter("INVALID_PARAMS", "keyRef must be utf8-encodable", nil as Error?)
      return
    }

    deleteKey(tag: tagData)

    let attributes: [String: Any] = [
      kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom,
      kSecAttrKeySizeInBits as String: 256,
      kSecPrivateKeyAttrs as String: [
        kSecAttrIsPermanent as String: true,
        kSecAttrApplicationTag as String: tagData,
        kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
      ]
    ]

    var error: Unmanaged<CFError>?
    guard SecKeyCreateRandomKey(attributes as CFDictionary, &error) != nil else {
      let desc = error?.takeRetainedValue().localizedDescription ?? "unknown"
      rejecter("KEYGEN_FAILED", "Key generation failed: \(desc)", nil as Error?)
      return
    }

    resolver(["keyRef": keyRefString])
  }

  @objc(getPublicKey:resolver:rejecter:)
  func getPublicKey(
    keyRef: NSString,
    resolver: RCTPromiseResolveBlock,
    rejecter: RCTPromiseRejectBlock
  ) {
    let keyRefString = keyRef as String
    guard let tagData = keyRefString.data(using: .utf8) else {
      rejecter("INVALID_PARAMS", "keyRef must be utf8-encodable", nil as Error?)
      return
    }

    guard let privateKey = loadPrivateKey(tag: tagData) else {
      rejecter("KEY_NOT_FOUND", "Key not found: \(keyRefString)", nil as Error?)
      return
    }
    guard let publicKey = SecKeyCopyPublicKey(privateKey) else {
      rejecter("PUBKEY_FAILED", "Could not derive public key", nil as Error?)
      return
    }

    var error: Unmanaged<CFError>?
    guard let publicKeyData = SecKeyCopyExternalRepresentation(publicKey, &error) as Data? else {
      let desc = error?.takeRetainedValue().localizedDescription ?? "unknown"
      rejecter("PUBKEY_FAILED", "External representation failed: \(desc)", nil as Error?)
      return
    }

    resolver(["publicKey": publicKeyData.base64EncodedString()])
  }

  @objc(sign:dataBase64:resolver:rejecter:)
  func sign(
    keyRef: NSString,
    dataBase64: NSString,
    resolver: RCTPromiseResolveBlock,
    rejecter: RCTPromiseRejectBlock
  ) {
    let keyRefString = keyRef as String
    let dataString = dataBase64 as String
    guard let tagData = keyRefString.data(using: .utf8) else {
      rejecter("INVALID_PARAMS", "keyRef must be utf8-encodable", nil as Error?)
      return
    }
    guard let dataBytes = Data(base64Encoded: dataString) else {
      rejecter("INVALID_PARAMS", "data must be valid base64", nil as Error?)
      return
    }
    guard let privateKey = loadPrivateKey(tag: tagData) else {
      rejecter("KEY_NOT_FOUND", "Key not found: \(keyRefString)", nil as Error?)
      return
    }

    var error: Unmanaged<CFError>?
    guard let signature = SecKeyCreateSignature(
      privateKey,
      .ecdsaSignatureMessageX962SHA256,
      dataBytes as CFData,
      &error
    ) as Data? else {
      let desc = error?.takeRetainedValue().localizedDescription ?? "unknown"
      rejecter("SIGN_FAILED", "Signing failed: \(desc)", nil as Error?)
      return
    }

    resolver(["signature": signature.base64EncodedString()])
  }

  // MARK: - Internals

  private func loadPrivateKey(tag: Data) -> SecKey? {
    let query: [String: Any] = [
      kSecClass as String: kSecClassKey,
      kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom,
      kSecAttrApplicationTag as String: tag,
      kSecReturnRef as String: true
    ]
    var result: CFTypeRef?
    let status = SecItemCopyMatching(query as CFDictionary, &result)
    guard status == errSecSuccess, let result else { return nil }
    return (result as! SecKey)
  }

  private func deleteKey(tag: Data) {
    let query: [String: Any] = [
      kSecClass as String: kSecClassKey,
      kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom,
      kSecAttrApplicationTag as String: tag
    ]
    SecItemDelete(query as CFDictionary)
  }
}
