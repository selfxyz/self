// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

//
//  PassportReader.swift
//  OpenPassport
//
//  Created by Y E on 27/07/2023.
//

import Foundation
import React
#if !E2E_TESTING
import NFCPassportReader
#endif
import Security
import Mixpanel
import Sentry

#if !E2E_TESTING
@available(iOS 13, macOS 10.15, *)
extension CertificateType {
    func stringValue() -> String {
        switch self {
            case .documentSigningCertificate:
                return "documentSigningCertificate"
            case .issuerSigningCertificate:
                return "issuerSigningCertificate"
        }
    }
}
#endif

// Helper function to map the keys of a dictionary
extension Dictionary {
    func mapKeys<T: Hashable>(_ transform: (Key) -> T) -> Dictionary<T, Value> {
        Dictionary<T, Value>(uniqueKeysWithValues: map { (transform($0.key), $0.value) })
    }
}

#if !E2E_TESTING
@available(iOS 15, *)
@objc(PassportReader)
class PassportReader: NSObject {
    private var passportReader: NFCPassportReader.PassportReader

    override init() {
        self.passportReader = NFCPassportReader.PassportReader()
        super.init()
    }

    private var analytics: SelfAnalytics?
    private var currentSessionId: String?

    private func logNfc(level: SentryLevel, message: String, stage: String, useCANBool: Bool, sessionId: String, extras: [String: Any] = [:]) {
        let data: [String: Any] = [
            "session_id": sessionId,
            "platform": "ios",
            "scan_type": useCANBool ? "can" : "mrz",
            "stage": stage
        ].merging(extras) { (_, new) in new }

        if level == .error {
            // For errors, capture a message (this will include all previous breadcrumbs)
            SentrySDK.configureScope { scope in
                scope.setTag(value: sessionId, key: "session_id")
                scope.setTag(value: "ios", key: "platform")
                scope.setTag(value: useCANBool ? "can" : "mrz", key: "scan_type")
                scope.setTag(value: stage, key: "stage")
                for (key, value) in extras {
                    scope.setExtra(value: value, key: key)
                }
            }
            SentrySDK.capture(message: message)
        } else {
            // For info/warn, add as breadcrumb only
            let breadcrumb = Breadcrumb(level: level, category: "nfc")
            breadcrumb.message = message
            breadcrumb.data = data.mapValues { "\($0)" }
            SentrySDK.addBreadcrumb(breadcrumb)
        }
    }

    @objc(configure:enableDebugLogs:)
    func configure(token: String, enableDebugLogs: Bool) {
        let analytics = SelfAnalytics(token: token, enableDebugLogs: enableDebugLogs)
        self.analytics = analytics
        self.passportReader = NFCPassportReader.PassportReader(analytics: analytics)
    }

    @objc(trackEvent:properties:)
    func trackEvent(_ name: String, properties: [String: Any]?) {
        if let mpProps = properties as? Properties {
            analytics?.trackEvent(name, properties: mpProps)
        } else {
            analytics?.trackEvent(name, properties: nil)
        }
    }

    @objc(flush)
    func flush() {
        analytics?.flush()
    }

    func getMRZKey(passportNumber: String, dateOfBirth: String, dateOfExpiry: String ) -> String {

    // Pad fields if necessary
    let pptNr = pad( passportNumber, fieldLength:9)
    let dob = pad( dateOfBirth, fieldLength:6)
    let exp = pad( dateOfExpiry, fieldLength:6)

    // Calculate checksums
    let passportNrChksum = calcCheckSum(pptNr)
    let dateOfBirthChksum = calcCheckSum(dob)
    let expiryDateChksum = calcCheckSum(exp)

    let mrzKey = "\(pptNr)\(passportNrChksum)\(dob)\(dateOfBirthChksum)\(exp)\(expiryDateChksum)"

    return mrzKey
  }

  func pad( _ value : String, fieldLength:Int ) -> String {
    // Pad out field lengths with < if they are too short
    let paddedValue = (value + String(repeating: "<", count: fieldLength)).prefix(fieldLength)
    return String(paddedValue)
  }

  func calcCheckSum( _ checkString : String ) -> Int {
    let characterDict  = ["0" : "0", "1" : "1", "2" : "2", "3" : "3", "4" : "4", "5" : "5", "6" : "6", "7" : "7", "8" : "8", "9" : "9", "<" : "0", " " : "0", "A" : "10", "B" : "11", "C" : "12", "D" : "13", "E" : "14", "F" : "15", "G" : "16", "H" : "17", "I" : "18", "J" : "19", "K" : "20", "L" : "21", "M" : "22", "N" : "23", "O" : "24", "P" : "25", "Q" : "26", "R" : "27", "S" : "28","T" : "29", "U" : "30", "V" : "31", "W" : "32", "X" : "33", "Y" : "34", "Z" : "35"]

    var sum = 0
    var m = 0
    let multipliers : [Int] = [7, 3, 1]
    for c in checkString {
      guard let lookup = characterDict["\(c)"],
            let number = Int(lookup) else { return 0 }
      let product = number * multipliers[m]
      sum += product
      m = (m+1) % 3
    }

    return (sum % 10)
  }

  @objc(scanPassport:dateOfBirth:dateOfExpiry:canNumber:useCan:skipPACE:skipCA:extendedMode:usePacePolling:sessionId:resolve:reject:)
  func scanPassport(
    _ passportNumber: String,
    dateOfBirth: String,
    dateOfExpiry: String,
    canNumber: String,
    useCan: NSNumber,
    skipPACE: NSNumber,
    skipCA: NSNumber,
    extendedMode: NSNumber,
    usePacePolling: NSNumber,
    sessionId: String,
    resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
   let useCANBool = useCan.boolValue
   let skipPACEBool = skipPACE.boolValue
   let skipCABool = skipCA.boolValue
   let extendedModeBool = extendedMode.boolValue
   let usePacePollingBool = usePacePolling.boolValue
   self.currentSessionId = sessionId
   logNfc(level: .info, message: "scan_start", stage: "start", useCANBool: useCANBool, sessionId: sessionId)

    let customMessageHandler : (NFCViewDisplayMessage)->String? = { (displayMessage) in
      switch displayMessage {
        case .requestPresentPassport:
          return "Hold your iPhone against an NFC enabled passport."
        default:
          // Return nil for all other messages so we use the provided default
          return nil
      }
    }

    Task { [weak self] in
      guard let self = self else {
        return
      }

      NativeLoggerBridge.logInfo(category: "NFC", message: "NFC passport scan started", data: [
        "passportNumber": passportNumber,
        "useCAN": useCANBool,
        "skipPACE": skipPACEBool,
        "skipCA": skipCABool,
        "extendedMode": extendedModeBool,
        "usePacePolling": usePacePollingBool
      ])

      do {
        let password: String
        var passwordType:PACEPasswordType
        if useCANBool {
          if canNumber.count != 6 {
            reject("E_PASSPORT_READ", "CAN number must be 6 digits", nil)
            return
          }
          password = canNumber
          passwordType = PACEPasswordType.can
        } else {
          password = getMRZKey( passportNumber: passportNumber, dateOfBirth: dateOfBirth, dateOfExpiry: dateOfExpiry)
          passwordType = PACEPasswordType.mrz
        }
        // let masterListURL = Bundle.main.url(forResource: "masterList", withExtension: ".pem")
        // passportReader.setMasterListURL( masterListURL! )

        let passport = try await self.passportReader.readPassport(
          password: password,
          type: passwordType,
          tags: [.COM, .DG1, .SOD],
          skipCA: skipCABool,
          skipPACE: skipPACEBool,
          useExtendedMode: extendedModeBool,
          usePacePolling: usePacePollingBool,
          customDisplayMessage: customMessageHandler
        )

        var ret = [String:String]()
        //print("documentType", passport.documentType)

        ret["documentType"] = passport.documentType
        ret["documentSubType"] = passport.documentSubType
        ret["documentNumber"] = passport.documentNumber
        ret["issuingAuthority"] = passport.issuingAuthority
        ret["documentExpiryDate"] = passport.documentExpiryDate
        ret["dateOfBirth"] = passport.dateOfBirth
        ret["gender"] = passport.gender
        ret["nationality"] = passport.nationality
        ret["lastName"] = passport.lastName
        ret["firstName"] = passport.firstName
        ret["passportMRZ"] = passport.passportMRZ
        ret["placeOfBirth"] = passport.placeOfBirth
        ret["residenceAddress"] = passport.residenceAddress
        ret["phoneNumber"] = passport.phoneNumber
        ret["personalNumber"] = passport.personalNumber

        // let passportPhotoData = passport.passportPhoto // [UInt8]
        // if let passportPhotoData = passport.passportPhoto {
        //   let data = Data(passportPhotoData)
        //   let base64String = data.base64EncodedString()

        //   ret["passportPhoto"] = base64String
        // }

        // documentSigningCertificate
        // countrySigningCertificate

        if let serializedDocumentSigningCertificate = serializeX509Wrapper(passport.documentSigningCertificate) {
          ret["documentSigningCertificate"] = serializedDocumentSigningCertificate
        }

        if let serializedCountrySigningCertificate = serializeX509Wrapper(passport.countrySigningCertificate) {
          ret["countrySigningCertificate"] = serializedCountrySigningCertificate
        }
        //print("passport.documentSigningCertificate", passport.documentSigningCertificate)
        //print("passport.countrySigningCertificate", passport.countrySigningCertificate)

        ret["LDSVersion"] = passport.LDSVersion
        ret["dataGroupsPresent"] = passport.dataGroupsPresent.joined(separator: ", ")

        //print("passport.LDSVersion", passport.LDSVersion)

        // ret["dataGroupsAvailable"] = passport.dataGroupsAvailable.map(dataGroupIdToString)

        //print("passport.dataGroupsAvailable", passport.dataGroupsAvailable)
        //print("passport.dataGroupsRead", passport.dataGroupsRead)
        //print("passport.dataGroupHashes", passport.dataGroupHashes)

        // do {
        //   let dataGroupsReadData = try JSONSerialization.data(withJSONObject: passport.dataGroupsRead.mapValues { self.convertDataGroupToSerializableFormat($0) }, options: [])
        //   let dataGroupsReadJsonString = String(data: dataGroupsReadData, encoding: .utf8) ?? ""
        //   ret["dataGroupsRead"] = dataGroupsReadJsonString
        // } catch {
        //   //print("Error serializing dataGroupsRead: \(error)")
        // }

        // ret["dataGroupsRead"] = passport.dataGroupsRead.mapValues { convertDataGroupToSerializableFormat($0) }
        do {
            let dataGroupHashesDict = passport.dataGroupHashes.mapKeys { "\($0)" }
            let serializableDataGroupHashes = dataGroupHashesDict.mapValues { convertDataGroupHashToSerializableFormat($0) }
            let dataGroupHashesData = try JSONSerialization.data(withJSONObject: serializableDataGroupHashes, options: [])
            let dataGroupHashesJsonString = String(data: dataGroupHashesData, encoding: .utf8) ?? ""
            ret["dataGroupHashes"] = dataGroupHashesJsonString
        } catch {
            //print("Error serializing dataGroupHashes: \(error)")
        }


        // cardAccess
        // BACStatus
        // PACEStatus
        // chipAuthenticationStatus
        ret["passportCorrectlySigned"] = String(passport.passportCorrectlySigned)
        ret["documentSigningCertificateVerified"] = String(passport.documentSigningCertificateVerified)
        ret["passportDataNotTampered"] = String(passport.passportDataNotTampered)
        ret["activeAuthenticationPassed"] = String(passport.activeAuthenticationPassed)
        ret["activeAuthenticationChallenge"] = encodeByteArrayToHexString(passport.activeAuthenticationChallenge)
        ret["activeAuthenticationSignature"] = encodeByteArrayToHexString(passport.activeAuthenticationSignature)
        ret["verificationErrors"] = encodeErrors(passport.verificationErrors).joined(separator: ", ")

        ret["isPACESupported"] = String(passport.isPACESupported)
        ret["isChipAuthenticationSupported"] = String(passport.isChipAuthenticationSupported)

        // passportImage
        // signatureImage

        // activeAuthenticationSupported

        //print("passport.certificateSigningGroups", passport.certificateSigningGroups)

        // ret["certificateSigningGroups"] = passport.certificateSigningGroups.mapKeys(certificateTypeToString).mapValues(encodeX509WrapperToJsonString)
        // if let passportDataElements = passport.passportDataElements {
        //   ret["passportDataElements"] = passportDataElements
        // } else {
        //   ret["passportDataElements"] = [:]
        // }

        do {
          // although this line won't be reached if there is an error, Its better to handle it here instead of crashing the app
          if let sod = try passport.getDataGroup(DataGroupId.SOD) as? SOD {
             // ret["concatenatedDataHashes"] = try sod.getEncapsulatedContent().base64EncodedString() // this is what we call concatenatedDataHashes, not the true eContent
            ret["eContentBase64"] = try sod.getEncapsulatedContent().base64EncodedString() // this is what we call concatenatedDataHashes, not the true eContent

            ret["signatureAlgorithm"] = try sod.getSignatureAlgorithm()
            ret["encapsulatedContentDigestAlgorithm"] = try sod.getEncapsulatedContentDigestAlgorithm()

            let messageDigestFromSignedAttributes = try sod.getMessageDigestFromSignedAttributes()
            let signedAttributes = try sod.getSignedAttributes()
            //print("messageDigestFromSignedAttributes", messageDigestFromSignedAttributes)

            ret["signedAttributes"] = signedAttributes.base64EncodedString()
            // if let pubKey = convertOpaquePointerToSecKey(opaquePointer: sod.pubKey),
            //   let serializedPublicKey = serializePublicKey(pubKey) {
            //     ret["publicKeyBase64"] = serializedPublicKey
            // } else {
            //     // Handle the case where pubKey is nil
            // }

            if let serializedSignature = serializeSignature(from: sod) {
              ret["signatureBase64"] = serializedSignature
            }
          } else {
            print("SOD not found or could not be cast to SOD")
            reject("E_PASSPORT_READ", "SODNotFound : SOD not found or could not be cast to SOD", nil)
            return
          }

        } catch {
          //print("Error serializing SOD data: \(error)")
          reject("E_PASSPORT_READ", error.localizedDescription, error)
        }

        let stringified = String(data: try JSONEncoder().encode(ret), encoding: .utf8)
        logNfc(level: .info, message: "scan_success", stage: "complete", useCANBool: useCANBool, sessionId: sessionId)
        resolve(stringified)
      } catch {
        logNfc(level: .warning, message: "scan_failed", stage: "error", useCANBool: useCANBool, sessionId: sessionId, extras: ["error": error.localizedDescription])
        reject("E_PASSPORT_READ", error.localizedDescription, error)
      }
    }
  }

  // mrz ✅
  // dataHashes ✅
  // eContentBytes ✅
  // pubkey
  // signature ✅

// func convertOpaquePointerToSecKey(opaquePointer: OpaquePointer?) -> SecKey? {
//     guard let opaquePointer = opaquePointer else { return nil }

//     // Assuming the key is in DER format
//     // Replace with actual code to convert OpaquePointer to Data
//     let keyData = Data(bytes: opaquePointer, count: keyLength) // Replace `keyLength` with actual length of key data

//     let attributes: [String: Any] = [
//         kSecAttrKeyType as String: kSecAttrKeyTypeRSA, // or kSecAttrKeyTypeECSECPrimeRandom for ECDSA
//         kSecAttrKeyClass as String: kSecAttrKeyClassPublic
//     ]

//     var error: Unmanaged<CFError>?
//     let secKey = SecKeyCreateWithData(keyData as CFData, attributes as CFDictionary, &error)

//     if let error = error {
//         //print("Error creating SecKey: \(error.takeRetainedValue())")
//         return nil
//     }

//     return secKey
// }

func serializePublicKey(_ publicKey: SecKey) -> String? {
    var error: Unmanaged<CFError>?
    guard let publicKeyData = SecKeyCopyExternalRepresentation(publicKey, &error) as Data? else {
        //print("Error serializing public key: \(error!.takeRetainedValue() as Error)")
        return nil
    }
    return publicKeyData.base64EncodedString()
}

  func serializeSignature(from sod: SOD) -> String? {
    do {
      let signature = try sod.getSignature()
      return signature.base64EncodedString()
    } catch {
      //print("Error extracting signature: \(error)")
      return nil
    }
  }

  func serializeX509Wrapper(_ certificate: X509Wrapper?) -> String? {
    guard let certificate = certificate else { return nil }

    let itemsDict = certificate.getItemsAsDict()
    var certInfoStringKeys = [String: String]()

    // Convert CertificateItem keys to String keys
    for (key, value) in itemsDict {
      certInfoStringKeys[key.rawValue] = value
    }

    // Add PEM representation
    let certPEM = certificate.certToPEM()
    certInfoStringKeys["PEM"] = certPEM

    do {
      let jsonData = try JSONSerialization.data(withJSONObject: certInfoStringKeys, options: [])
      return String(data: jsonData, encoding: .utf8)
    } catch {
      //print("Error serializing X509Wrapper: \(error)")
      return nil
    }
  }

  func encodeX509WrapperToJsonString(_ certificate: X509Wrapper?) -> String? {
    guard let certificate = certificate else { return nil }
    let certificateItems = certificate.getItemsAsDict()

    // Convert certificate items to JSON
    do {
      let jsonData = try JSONSerialization.data(withJSONObject: certificateItems, options: [])
      return String(data: jsonData, encoding: .utf8)
    } catch {
      //print("Error serializing certificate items to JSON: \(error)")
      return nil
    }
  }

  func encodeByteArrayToHexString(_ byteArray: [UInt8]) -> String {
    return byteArray.map { String(format: "%02x", $0) }.joined()
  }

  func encodeErrors(_ errors: [Error]) -> [String] {
    return errors.map { $0.localizedDescription }
  }

  func convertDataGroupHashToSerializableFormat(_ dataGroupHash: DataGroupHash) -> [String: Any] {
    return [
      "id": dataGroupHash.id,
      "sodHash": dataGroupHash.sodHash,
      "computedHash": dataGroupHash.computedHash,
      "match": dataGroupHash.match
    ]
  }

  func dataGroupIdToString(_ id: DataGroupId) -> String {
    return String(id.rawValue) // or any other method to get a string representation
  }

  func certificateTypeToString(_ type: CertificateType) -> String {
      return type.stringValue()
  }

  func convertDataGroupToSerializableFormat(_ dataGroup: DataGroup) -> [String: Any] {
    return [
      "datagroupType": dataGroupIdToString(dataGroup.datagroupType),
      "body": encodeByteArrayToHexString(dataGroup.body),
      "data": encodeByteArrayToHexString(dataGroup.data)
    ]
  }

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return true
  }
}
#else
// E2E Testing stub implementation
@available(iOS 15, *)
@objc(PassportReader)
class PassportReader: NSObject {
    override init() {
        super.init()
    }

    @objc(configure:enableDebugLogs:)
    func configure(token: String, enableDebugLogs: Bool) {
        // No-op for E2E testing
    }

    @objc(scanPassport:dateOfBirth:dateOfExpiry:canNumber:useCan:skipPACE:skipCA:extendedMode:usePacePolling:sessionId:resolve:reject:)
    func scanPassport(
        _ passportNumber: String,
        dateOfBirth: String,
        dateOfExpiry: String,
        canNumber: String,
        useCan: NSNumber,
        skipPACE: NSNumber,
        skipCA: NSNumber,
        extendedMode: NSNumber,
        usePacePolling: NSNumber,
        sessionId: String,
        resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        reject("E2E_TESTING", "NFC scanning not available in E2E testing mode", nil)
    }

    @objc
    static func requiresMainQueueSetup() -> Bool {
        return true
    }
}
#endif
