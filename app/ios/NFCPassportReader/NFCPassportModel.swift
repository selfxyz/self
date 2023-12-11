//
//  NFCPassportModel.swift
//  NFCPassportReader
//
//  Created by Andy Qua on 29/10/2019.
//


import Foundation

#if os(iOS)
import UIKit
#endif


public enum PassportAuthenticationStatus {
    case notDone
    case success
    case failed
}

@available(iOS 13, macOS 10.15, *)
public class NFCPassportModel {
    
    public private(set) lazy var documentType : String = { return String( passportDataElements?["5F03"]?.first ?? "?" ) }()
    public private(set) lazy var documentSubType : String = { return String( passportDataElements?["5F03"]?.last ?? "?" ) }()
    public private(set) lazy var documentNumber : String = { return (passportDataElements?["5A"] ?? "?").replacingOccurrences(of: "<", with: "" ) }()
    public private(set) lazy var issuingAuthority : String = { return passportDataElements?["5F28"] ?? "?" }()
    public private(set) lazy var documentExpiryDate : String = { return passportDataElements?["59"] ?? "?" }()
    public private(set) lazy var dateOfBirth : String = { return passportDataElements?["5F57"] ?? "?" }()
    public private(set) lazy var gender : String = { return passportDataElements?["5F35"] ?? "?" }()
    public private(set) lazy var nationality : String = { return passportDataElements?["5F2C"] ?? "?" }()
    
    public private(set) lazy var lastName : String = {
        return names[0].replacingOccurrences(of: "<", with: " " )
    }()
    
    public private(set) lazy var firstName : String = {
        var name = ""
        for i in 1 ..< names.count {
            let fn = names[i].replacingOccurrences(of: "<", with: " " ).trimmingCharacters(in: CharacterSet.whitespacesAndNewlines)
            name += fn + " "
        }
        return name.trimmingCharacters(in: CharacterSet.whitespacesAndNewlines)
    }()
    
    public private(set) lazy var passportMRZ : String = { return passportDataElements?["5F1F"] ?? "NOT FOUND" }()
    
    // Extract fields from DG11 if present
    private lazy var names : [String] = {
        guard let dg11 = dataGroupsRead[.DG11] as? DataGroup11,
              let fullName = dg11.fullName?.components(separatedBy: "<<") else { return (passportDataElements?["5B"] ?? "?").components(separatedBy: "<<") }
        return fullName
    }()
    
    public private(set) lazy var placeOfBirth : String? = {
        guard let dg11 = dataGroupsRead[.DG11] as? DataGroup11,
              let placeOfBirth = dg11.placeOfBirth else { return nil }
        return placeOfBirth
    }()
    
    /// residence address
    public private(set) lazy var residenceAddress : String? = {
        guard let dg11 = dataGroupsRead[.DG11] as? DataGroup11,
              let address = dg11.address else { return nil }
        return address
    }()
    
    /// phone number
    public private(set) lazy var phoneNumber : String? = {
        guard let dg11 = dataGroupsRead[.DG11] as? DataGroup11,
              let telephone = dg11.telephone else { return nil }
        return telephone
    }()
    
    /// personal number
    public private(set) lazy var personalNumber : String? = {
        if let dg11 = dataGroupsRead[.DG11] as? DataGroup11,
           let personalNumber = dg11.personalNumber { return personalNumber }
        
        return (passportDataElements?["53"] ?? "?").replacingOccurrences(of: "<", with: "" )
    }()

    public private(set) lazy var documentSigningCertificate : X509Wrapper? = {
        return certificateSigningGroups[.documentSigningCertificate]
    }()

    public private(set) lazy var countrySigningCertificate : X509Wrapper? = {
        return certificateSigningGroups[.issuerSigningCertificate]
    }()
    
    // Extract data from COM
    public private(set) lazy var LDSVersion : String = {
        guard let com = dataGroupsRead[.COM] as? COM else { return "Unknown" }
        return com.version
    }()
    
    
    public private(set) lazy var dataGroupsPresent : [String] = {
        guard let com = dataGroupsRead[.COM] as? COM else { return [] }
        return com.dataGroupsPresent
    }()
    
    // Parsed datagroup hashes
    public private(set) var dataGroupsAvailable = [DataGroupId]()
    public private(set) var dataGroupsRead : [DataGroupId:DataGroup] = [:]
    public private(set) var dataGroupHashes = [DataGroupId: DataGroupHash]()

    public internal(set) var cardAccess : CardAccess?
    public internal(set) var BACStatus : PassportAuthenticationStatus = .notDone
    public internal(set) var PACEStatus : PassportAuthenticationStatus = .notDone
    public internal(set) var chipAuthenticationStatus : PassportAuthenticationStatus = .notDone

    public private(set) var passportCorrectlySigned : Bool = false
    public private(set) var documentSigningCertificateVerified : Bool = false
    public private(set) var passportDataNotTampered : Bool = false
    public private(set) var activeAuthenticationPassed : Bool = false
    public private(set) var activeAuthenticationChallenge : [UInt8] = []
    public private(set) var activeAuthenticationSignature : [UInt8] = []
    public private(set) var verificationErrors : [Error] = []

    public var isPACESupported : Bool {
        get {
            if cardAccess?.paceInfo != nil {
                return true
            } else {
                // We may not have stored the cardAccess so check the DG14
                if let dg14 = dataGroupsRead[.DG14] as? DataGroup14,
                   (dg14.securityInfos.filter { ($0 as? PACEInfo) != nil }).count > 0 {
                    return true
                }
                return false
            }
        }
    }
    
    public var isChipAuthenticationSupported : Bool {
        get {
            if let dg14 = dataGroupsRead[.DG14] as? DataGroup14,
               (dg14.securityInfos.filter { ($0 as? ChipAuthenticationPublicKeyInfo) != nil }).count > 0 {
                
                return true
            } else {
                return false
            }
        }
    }

#if os(iOS)
    public var passportImage : UIImage? {
        guard let dg2 = dataGroupsRead[.DG2] as? DataGroup2 else { return nil }
        
        return dg2.getImage()
    }

    public var signatureImage : UIImage? {
        guard let dg7 = dataGroupsRead[.DG7] as? DataGroup7 else { return nil }
        
        return dg7.getImage()
    }
#endif

    public var activeAuthenticationSupported : Bool {
        guard let dg15 = dataGroupsRead[.DG15] as? DataGroup15 else { return false }
        if dg15.ecdsaPublicKey != nil || dg15.rsaPublicKey != nil {
            return true
        }
        return false
    }

    private var certificateSigningGroups : [CertificateType:X509Wrapper] = [:]

    private var passportDataElements : [String:String]? {
        guard let dg1 = dataGroupsRead[.DG1] as? DataGroup1 else { return nil }
        
        return dg1.elements
    }
        
    
    public init() {
        
    }
    
    public init( from dump: [String:String] ) {
        var AAChallenge : [UInt8]?
        var AASignature : [UInt8]?
        for (key,value) in dump {
            if let data = Data(base64Encoded: value) {
                let bin = [UInt8](data)
                if key == "AASignature" {
                    AASignature = bin
                } else if key == "AAChallenge" {
                    AAChallenge = bin
                } else {
                    do {
                        let dg = try DataGroupParser().parseDG(data: bin)
                        let dgId = DataGroupId.getIDFromName(name:key)
                        self.addDataGroup( dgId, dataGroup:dg )
                    } catch {
                        Log.error("Failed to import Datagroup - \(key) from dump - \(error)" )
                    }
                }
            }
        }

        // See if we have Active Auth info in the dump
        if let challenge = AAChallenge, let signature = AASignature {
            verifyActiveAuthentication(challenge: challenge, signature: signature)
        }
    }
    
    public func addDataGroup(_ id : DataGroupId, dataGroup: DataGroup ) {
        self.dataGroupsRead[id] = dataGroup
        if id != .COM && id != .SOD {
            self.dataGroupsAvailable.append( id )
        }
    }

    public func getDataGroup( _ id : DataGroupId ) -> DataGroup? {
        return dataGroupsRead[id]
    }

    /// Dumps the passport data
    /// - Parameters:
    ///    selectedDataGroups - the Data Groups to be exported (if they are present in the passport)
    ///    includeActiveAutheticationData - Whether to include the Active Authentication challenge and response (if supported and retrieved)
    /// - Returns: dictionary of DataGroup ids and Base64 encoded data
    public func dumpPassportData( selectedDataGroups : [DataGroupId], includeActiveAuthenticationData : Bool = false) -> [String:String] {
        var ret = [String:String]()
        for dg in selectedDataGroups {
            if let dataGroup = self.dataGroupsRead[dg] {
                let val = Data(dataGroup.data)
                let base64 = val.base64EncodedString()
                ret[dg.getName()] = base64
            }
        }
        if includeActiveAuthenticationData && self.activeAuthenticationSupported {
            ret["AAChallenge"] = Data(activeAuthenticationChallenge).base64EncodedString()
            ret["AASignature"] = Data(activeAuthenticationSignature).base64EncodedString()
        }
        return ret
    }

    public func getHashesForDatagroups( hashAlgorythm: String ) -> [DataGroupId:[UInt8]]  {
        var ret = [DataGroupId:[UInt8]]()
        
        for (key, value) in dataGroupsRead {
            if hashAlgorythm == "SHA1" {
                ret[key] = calcSHA1Hash(value.body)
            } else if hashAlgorythm == "SHA224" {
                ret[key] = calcSHA224Hash(value.body)
            } else if hashAlgorythm == "SHA256" {
                ret[key] = calcSHA256Hash(value.body)
            } else if hashAlgorythm == "SHA384" {
                ret[key] = calcSHA384Hash(value.body)
            } else if hashAlgorythm == "SHA512" {
                ret[key] = calcSHA512Hash(value.body)
            }
        }
        
        return ret
    }
    
            
    /// This method performs the passive authentication
    /// Passive Authentication : Two Parts:
    /// Part 1 - Has the SOD (Security Object Document) been signed by a valid country signing certificate authority (CSCA)?
    /// Part 2 - has it been tampered with (e.g. hashes of Datagroups match those in the SOD?
    ///        guard let sod = model.getDataGroup(.SOD) else { return }
    ///
    /// - Parameter masterListURL: the path to the masterlist to try to verify the document signing certiifcate in the SOD
    /// - Parameter useCMSVerification: Should we use OpenSSL CMS verification to verify the SOD content
    ///         is correctly signed by the document signing certificate OR should we do this manully based on RFC5652
    ///         CMS fails under certain circumstances (e.g. hashes are SHA512 whereas content is signed with SHA256RSA).
    ///         Currently defaulting to manual verification - hoping this will replace the CMS verification totally
    ///         CMS Verification currently there just in case
    public func verifyPassport( masterListURL: URL?, useCMSVerification : Bool = false ) {
        if let masterListURL = masterListURL {
            do {
                try validateAndExtractSigningCertificates( masterListURL: masterListURL )
            } catch let error {
                verificationErrors.append( error )
            }
        }
        
        do {
            try ensureReadDataNotBeenTamperedWith( useCMSVerification : useCMSVerification )
        } catch let error {
            verificationErrors.append( error )
        }
    }
    
    public func verifyActiveAuthentication( challenge: [UInt8], signature: [UInt8] ) {
        self.activeAuthenticationChallenge = challenge
        self.activeAuthenticationSignature = signature
        
        Log.verbose( "Active Authentication")
        Log.verbose( "   challange - \(binToHexRep(challenge))")
        Log.verbose( "   signature - \(binToHexRep(signature))")

        // Get AA Public key
        self.activeAuthenticationPassed = false
        guard  let dg15 = self.dataGroupsRead[.DG15] as? DataGroup15 else { return }
        if let rsaKey = dg15.rsaPublicKey {
            do {
                var decryptedSig = try OpenSSLUtils.decryptRSASignature(signature: Data(signature), pubKey: rsaKey)
                
                // Decrypted signature compromises of header (6A), Message, Digest hash, Trailer
                // Trailer can be 1 byte (BC - SHA-1 hash) or 2 bytes (xxCC) - where xx identifies the hash algorithm used
                
                // if the last byte of the digest is 0xBC, then this uses dedicated hash function 3 (SHA-1),
                // If the last byte is 0xCC, then the preceding byte tells you which hash function
                // should be used (currently not yet implemented!)
                // See ISO/IEC9796-2 for details on the verification and ISO/IEC 10118-3 for the dedicated hash functions!
                var hashTypeByte = decryptedSig.popLast() ?? 0x00
                if hashTypeByte == 0xCC {
                    hashTypeByte = decryptedSig.popLast() ?? 0x00
                }
                var hashType : String = ""
                var hashLength = 0

                switch hashTypeByte {
                    case 0xBC, 0x33:
                        hashType = "SHA1"
                        hashLength = 20  // 160 bits for SHA-1 -> 20 bytes
                    case 0x34:
                        hashType = "SHA256"
                        hashLength = 32  // 256 bits for SHA-256 -> 32 bytes
                    case 0x35:
                        hashType = "SHA512"
                        hashLength = 64  // 512 bits for SHA-512 -> 64 bytes
                    case 0x36:
                        hashType = "SHA384"
                        hashLength = 48  // 384 bits for SHA-384 -> 48 bytes
                    case 0x38:
                        hashType = "SHA224"
                        hashLength = 28  // 224 bits for SHA-224 -> 28 bytes
                    default:
                        Log.error( "Error identifying Active Authentication RSA message digest hash algorithm" )
                        return
                }
                
                let message = [UInt8](decryptedSig[1 ..< (decryptedSig.count-hashLength)])
                let digest = [UInt8](decryptedSig[(decryptedSig.count-hashLength)...])

                // Concatenate the challenge to the end of the message
                let fullMsg = message + challenge
                
                // Then generate the hash
                let msgHash : [UInt8] = try calcHash(data: fullMsg, hashAlgorithm: hashType)
                
                // Check hashes match
                if msgHash == digest {
                    self.activeAuthenticationPassed = true
                    Log.debug( "Active Authentication (RSA) successful" )
                } else {
                    Log.error( "Error verifying Active Authentication RSA signature - Hash doesn't match" )
                }
            } catch {
                Log.error( "Error verifying Active Authentication RSA signature - \(error)" )
            }
        } else if let ecdsaPublicKey = dg15.ecdsaPublicKey {
            var digestType = ""
            if let dg14 = dataGroupsRead[.DG14] as? DataGroup14,
               let aa = dg14.securityInfos.compactMap({ $0 as? ActiveAuthenticationInfo }).first {
                digestType = aa.getSignatureAlgorithmOIDString() ?? ""
            }
            
            if OpenSSLUtils.verifyECDSASignature( publicKey:ecdsaPublicKey, signature: signature, data: challenge, digestType: digestType ) {
                self.activeAuthenticationPassed = true
                Log.debug( "Active Authentication (ECDSA) successful" )
            } else {
                Log.error( "Error verifying Active Authentication ECDSA signature" )
            }
        }
    }
    
    // Check if signing certificate is on the revocation list
    // We do this by trying to build a trust chain of the passport certificate against the ones in the revocation list
    // and if we are successful then its been revoked.
    // NOTE - NOT USED YET AS NOT ABLE TO TEST
    func hasCertBeenRevoked( revocationListURL : URL ) -> Bool {
        var revoked = false
        do {
            try validateAndExtractSigningCertificates( masterListURL: revocationListURL )
            
            // Certificate chain found - which means certificate is on revocation list
            revoked = true
        } catch {
            // No chain found - certificate not revoked
        }
        
        return revoked
    }

    private func validateAndExtractSigningCertificates( masterListURL: URL ) throws {
        self.passportCorrectlySigned = false
        
        guard let sod = getDataGroup(.SOD) else {
            throw PassiveAuthenticationError.SODMissing("No SOD found" )
        }

        let data = Data(sod.body)
        let cert = try OpenSSLUtils.getX509CertificatesFromPKCS7( pkcs7Der: data ).first!
        self.certificateSigningGroups[.documentSigningCertificate] = cert

        let rc = OpenSSLUtils.verifyTrustAndGetIssuerCertificate( x509:cert, CAFile: masterListURL )
        switch rc {
        case .success(let csca):
            self.certificateSigningGroups[.issuerSigningCertificate] = csca
        case .failure(let error):
            throw error
        }
                
        Log.debug( "Passport passed SOD Verification" )
        self.passportCorrectlySigned = true

    }

    private func ensureReadDataNotBeenTamperedWith( useCMSVerification: Bool ) throws  {
        guard let sod = getDataGroup(.SOD) as? SOD else {
            throw PassiveAuthenticationError.SODMissing("No SOD found" )
        }

        // Get SOD Content and verify that its correctly signed by the Document Signing Certificate
        var signedData : Data
        documentSigningCertificateVerified = false
        do {
            if useCMSVerification {
                signedData = try OpenSSLUtils.verifyAndReturnSODEncapsulatedDataUsingCMS(sod: sod)
            } else {
                signedData = try OpenSSLUtils.verifyAndReturnSODEncapsulatedData(sod: sod)
            }
            documentSigningCertificateVerified = true
        } catch {
            signedData = try sod.getEncapsulatedContent()
        }
                
        // Now Verify passport data by comparing compare Hashes in SOD against
        // computed hashes to ensure data not been tampered with
        passportDataNotTampered = false
        let asn1Data = try OpenSSLUtils.ASN1Parse( data: signedData )
        let (sodHashAlgorythm, sodHashes) = try parseSODSignatureContent( asn1Data )
        
        var errors : String = ""
        // pour chaque dataGroupsRead, il faut que le hash sodHashVal parsé du eContent (signedData) soit égal
        // au computedHashVal qui sort du dataGroupsRead
        for (id,dgVal) in dataGroupsRead {
            guard let sodHashVal = sodHashes[id] else {
                // SOD and COM don't have hashes so these aren't errors
                if id != .SOD && id != .COM {
                    errors += "DataGroup \(id) is missing!\n"
                }
                continue
            }
            
            let computedHashVal = binToHexRep(dgVal.hash(sodHashAlgorythm))
            
            var match = true
            if computedHashVal != sodHashVal {
                errors += "\(id) invalid hash:\n  SOD hash:\(sodHashVal)\n   Computed hash:\(computedHashVal)\n"
                match = false
            }

            dataGroupHashes[id] = DataGroupHash(id: id.getName(), sodHash:sodHashVal, computedHash:computedHashVal, match:match)
        }
        
        if errors != "" {
            Log.error( "HASH ERRORS - \(errors)" )
            throw PassiveAuthenticationError.InvalidDataGroupHash(errors)
        }
        
        Log.debug( "Passport passed Datagroup Tampering check" )
        passportDataNotTampered = true
    }
    
    
    /// Parses an text ASN1 structure, and extracts the Hash Algorythm and Hashes contained from the Octect strings
    /// - Parameter content: the text ASN1 stucure format
    /// - Returns: The Hash Algorythm used - either SHA1 or SHA256, and a dictionary of hashes for the datagroups (currently only DG1 and DG2 are handled)
    private func parseSODSignatureContent( _ content : String ) throws -> (String, [DataGroupId : String]){
        var currentDG = ""
        var sodHashAlgo = ""
        var sodHashes :  [DataGroupId : String] = [:]
        
        let lines = content.components(separatedBy: "\n")
        
        let dgList : [DataGroupId] = [.COM,.DG1,.DG2,.DG3,.DG4,.DG5,.DG6,.DG7,.DG8,.DG9,.DG10,.DG11,.DG12,.DG13,.DG14,.DG15,.DG16,.SOD]

        for line in lines {
            if line.contains( "d=2" ) && line.contains( "OBJECT" ) {
                if line.contains( "sha1" ) {
                    sodHashAlgo = "SHA1"
                } else if line.contains( "sha224" ) {
                    sodHashAlgo = "SHA224"
                } else if line.contains( "sha256" ) {
                    sodHashAlgo = "SHA256"
                } else if line.contains( "sha384" ) {
                    sodHashAlgo = "SHA384"
                } else if line.contains( "sha512" ) {
                    sodHashAlgo = "SHA512"
                }
            } else if line.contains("d=3" ) && line.contains( "INTEGER" ) {
                if let range = line.range(of: "INTEGER") {
                    let substr = line[range.upperBound..<line.endIndex]
                    if let r2 = substr.range(of: ":") {
                        currentDG = String(line[r2.upperBound...])
                    }
                }
                
            } else if line.contains("d=3" ) && line.contains( "OCTET STRING" ) {
                if let range = line.range(of: "[HEX DUMP]:") {
                    let val = line[range.upperBound..<line.endIndex]
                    if currentDG != "", let id = Int(currentDG, radix:16) {
                        sodHashes[dgList[id]] = String(val)
                        currentDG = ""
                    }
                }
            }
        }
        
        if sodHashAlgo == "" {
            throw PassiveAuthenticationError.UnableToParseSODHashes("Unable to find hash algorythm used" )
        }
        if sodHashes.count == 0 {
            throw PassiveAuthenticationError.UnableToParseSODHashes("Unable to extract hashes" )
        }

        Log.debug( "Parse SOD - Using Algo - \(sodHashAlgo)" )
        Log.debug( "      - Hashes     - \(sodHashes)" )
        
        return (sodHashAlgo, sodHashes)
    }
}
