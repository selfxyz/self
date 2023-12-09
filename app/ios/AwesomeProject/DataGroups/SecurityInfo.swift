
import Foundation
import OpenSSL

@available(iOS 13, macOS 10.15,*)
public class SecurityInfo {
    // Active Authentication OID
    static let ID_AA_OID = "2.23.136.1.1.5"

    // Active Authentication Signature Algorithm OIDS
    // Specified in BSI TR 03111 Section 5.2.1.
    static let ECDSA_PLAIN_SIGNATURES = "0.4.0.127.0.7.1.1.4.1";
    static let ECDSA_PLAIN_SHA1_OID = ECDSA_PLAIN_SIGNATURES + ".1"; // 0.4.0.127.0.7.1.1.4.1.1, ecdsa-plain-SHA1
    static let ECDSA_PLAIN_SHA224_OID = ECDSA_PLAIN_SIGNATURES + ".2"; // 0.4.0.127.0.7.1.1.4.1.2, ecdsa-plain-SHA224
    static let ECDSA_PLAIN_SHA256_OID = ECDSA_PLAIN_SIGNATURES + ".3"; // 0.4.0.127.0.7.1.1.4.1.3, ecdsa-plain-SHA256
    static let ECDSA_PLAIN_SHA384_OID = ECDSA_PLAIN_SIGNATURES + ".4"; // 0.4.0.127.0.7.1.1.4.1.4, ecdsa-plain-SHA384
    static let ECDSA_PLAIN_SHA512_OID = ECDSA_PLAIN_SIGNATURES + ".5"; // 0.4.0.127.0.7.1.1.4.1.5, ecdsa-plain-SHA512
    static let ECDSA_PLAIN_RIPEMD160_OID = ECDSA_PLAIN_SIGNATURES + ".6"; // 0.4.0.127.0.7.1.1.4.1.6, ecdsa-plain-RIPEMD160
    
    // Chip Authentication Public Key OIDS
    static let ID_PK_DH_OID = "0.4.0.127.0.7.2.2.1.1"
    static let ID_PK_ECDH_OID = "0.4.0.127.0.7.2.2.1.2"
    
    // Chip Authentication OIDS
    static let ID_CA_DH_3DES_CBC_CBC_OID = "0.4.0.127.0.7.2.2.3.1.1"
    static let ID_CA_ECDH_3DES_CBC_CBC_OID = "0.4.0.127.0.7.2.2.3.2.1"
    static let ID_CA_DH_AES_CBC_CMAC_128_OID = "0.4.0.127.0.7.2.2.3.1.2"
    static let ID_CA_DH_AES_CBC_CMAC_192_OID = "0.4.0.127.0.7.2.2.3.1.3"
    static let ID_CA_DH_AES_CBC_CMAC_256_OID = "0.4.0.127.0.7.2.2.3.1.4"
    static let ID_CA_ECDH_AES_CBC_CMAC_128_OID = "0.4.0.127.0.7.2.2.3.2.2"
    static let ID_CA_ECDH_AES_CBC_CMAC_192_OID = "0.4.0.127.0.7.2.2.3.2.3"
    static let ID_CA_ECDH_AES_CBC_CMAC_256_OID = "0.4.0.127.0.7.2.2.3.2.4"
    

    // PACE OIDS
    static let ID_BSI = "0.4.0.127.0.7"
    static let ID_PACE = ID_BSI + ".2.2.4"
    static let ID_PACE_DH_GM = ID_PACE + ".1"
    static let ID_PACE_DH_GM_3DES_CBC_CBC = ID_PACE_DH_GM + ".1"; // 0.4.0.127.0.7.2.2.4.1.1, id-PACE-DH-GM-3DES-CBC-CBC
    static let ID_PACE_DH_GM_AES_CBC_CMAC_128 = ID_PACE_DH_GM + ".2"; // 0.4.0.127.0.7.2.2.4.1.2, id-PACE-DH-GM-AES-CBC-CMAC-128
    static let ID_PACE_DH_GM_AES_CBC_CMAC_192 = ID_PACE_DH_GM + ".3"; // 0.4.0.127.0.7.2.2.4.1.3, id-PACE-DH-GM-AES-CBC-CMAC-192
    static let ID_PACE_DH_GM_AES_CBC_CMAC_256 = ID_PACE_DH_GM + ".4"; // 0.4.0.127.0.7.2.2.4.1.4, id-PACE-DH-GM-AES-CBC-CMAC-256
    
    static let ID_PACE_ECDH_GM = ID_PACE + ".2"
    static let ID_PACE_ECDH_GM_3DES_CBC_CBC = ID_PACE_ECDH_GM + ".1"; // 0.4.0.127.0.7.2.2.4.2.1, id-PACE-ECDH-GM-3DES-CBC-CBC
    static let ID_PACE_ECDH_GM_AES_CBC_CMAC_128 = ID_PACE_ECDH_GM + ".2"; // 0.4.0.127.0.7.2.2.4.2.2, id-PACE-ECDH-GM-AES-CBC-CMAC-128
    static let ID_PACE_ECDH_GM_AES_CBC_CMAC_192 = ID_PACE_ECDH_GM + ".3"; // 0.4.0.127.0.7.2.2.4.2.3, id-PACE-ECDH-GM-AES-CBC-CMAC-192
    static let ID_PACE_ECDH_GM_AES_CBC_CMAC_256 = ID_PACE_ECDH_GM + ".4"; // 0.4.0.127.0.7.2.2.4.2.4, id-PACE-ECDH-GM-AES-CBC-CMAC-256
    
    static let ID_PACE_DH_IM = ID_PACE + ".3"
    static let ID_PACE_DH_IM_3DES_CBC_CBC = ID_PACE_DH_IM + ".1"; // 0.4.0.127.0.7.2.2.4.3.1, id-PACE-DH-IM-3DES-CBC-CBC
    static let ID_PACE_DH_IM_AES_CBC_CMAC_128 = ID_PACE_DH_IM + ".2"; // 0.4.0.127.0.7.2.2.4.3.2, id-PACE-DH-IM-AES-CBC-CMAC-128
    static let ID_PACE_DH_IM_AES_CBC_CMAC_192 = ID_PACE_DH_IM + ".3"; // 0.4.0.127.0.7.2.2.4.3.3, id-PACE-DH-IM-AES-CBC-CMAC-192
    static let ID_PACE_DH_IM_AES_CBC_CMAC_256 = ID_PACE_DH_IM + ".4"; // 0.4.0.127.0.7.2.2.4.3.4, id-PACE-DH-IM-AES-CBC-CMAC-256
    
    static let ID_PACE_ECDH_IM = ID_PACE + ".4"
    static let ID_PACE_ECDH_IM_3DES_CBC_CBC = ID_PACE_ECDH_IM + ".1"; // 0.4.0.127.0.7.2.2.4.4.1, id-PACE-ECDH-IM-3DES-CBC-CBC
    static let ID_PACE_ECDH_IM_AES_CBC_CMAC_128 = ID_PACE_ECDH_IM + ".2"; // 0.4.0.127.0.7.2.2.4.4.2, id-PACE-ECDH-IM-AES-CBC-CMAC-128
    static let ID_PACE_ECDH_IM_AES_CBC_CMAC_192 = ID_PACE_ECDH_IM + ".3"; // 0.4.0.127.0.7.2.2.4.4.3, id-PACE-ECDH-IM-AES-CBC-CMAC-192
    static let ID_PACE_ECDH_IM_AES_CBC_CMAC_256 = ID_PACE_ECDH_IM + ".4"; // 0.4.0.127.0.7.2.2.4.4.4, id-PACE-ECDH-IM-AES-CBC-CMAC-256
    
    static let ID_PACE_ECDH_CAM = ID_PACE + ".6"
    static let ID_PACE_ECDH_CAM_AES_CBC_CMAC_128 = ID_PACE_ECDH_CAM + ".2"; // 0.4.0.127.0.7.2.2.4.6.2, id-PACE-ECDH-CAM-AES-CBC-CMAC-128
    static let ID_PACE_ECDH_CAM_AES_CBC_CMAC_192 = ID_PACE_ECDH_CAM + ".3"; // 0.4.0.127.0.7.2.2.4.6.3, id-PACE-ECDH-CAM-AES-CBC-CMAC-192
    static let ID_PACE_ECDH_CAM_AES_CBC_CMAC_256 = ID_PACE_ECDH_CAM + ".4"; // 0.4.0.127.0.7.2.2.4.6.4, id-PACE-ECDH-CAM-AES-CBC-CMAC-256

    public func getObjectIdentifier() -> String {
        preconditionFailure("This method must be overridden")
    }
    
    public func getProtocolOIDString() -> String {
        preconditionFailure("This method must be overridden")
    }
    
    static func getInstance( object : ASN1Item, body: [UInt8] ) -> SecurityInfo? {
        let oid = object.getChild(0)?.value ?? ""
        let requiredData = object.getChild(1)!
        var optionalData : ASN1Item? = nil
        if (object.getNumberOfChildren() == 3) {
            optionalData = object.getChild(2)
        }
        
        if ChipAuthenticationPublicKeyInfo.checkRequiredIdentifier(oid) {
            
            let keyData : [UInt8] = [UInt8](body[requiredData.pos ..< requiredData.pos+requiredData.headerLen+requiredData.length])
            
            var subjectPublicKeyInfo : OpaquePointer? = nil
            let _ = keyData.withUnsafeBytes { (ptr) in
                var newPtr = ptr.baseAddress?.assumingMemoryBound(to: UInt8.self)
                
                subjectPublicKeyInfo = d2i_PUBKEY(nil, &newPtr, keyData.count)
            }
            
            if let subjectPublicKeyInfo = subjectPublicKeyInfo {
                                
                if optionalData == nil {
                    return ChipAuthenticationPublicKeyInfo(oid:oid, pubKey:subjectPublicKeyInfo);
                } else {
                    let keyId = Int(optionalData!.value, radix: 16)
                    return ChipAuthenticationPublicKeyInfo(oid:oid, pubKey:subjectPublicKeyInfo, keyId: keyId);
                }
                
            }
        } else if ChipAuthenticationInfo.checkRequiredIdentifier(oid) {
            let version = Int(requiredData.value) ?? -1
            if let optionalData = optionalData {
                let keyId = Int(optionalData.value, radix: 16)
                return ChipAuthenticationInfo(oid: oid, version: version, keyId: keyId);
            } else {
                return ChipAuthenticationInfo(oid: oid, version: version);
            }
        } else if PACEInfo.checkRequiredIdentifier(oid) {
            let version = Int(requiredData.value) ?? -1
            var parameterId : Int? = nil
            
            if let optionalData = optionalData {
                parameterId = Int(optionalData.value, radix:16)
            }
            return PACEInfo(oid: oid, version: version, parameterId: parameterId);
        } else if ActiveAuthenticationInfo.checkRequiredIdentifier(oid) {
            let version = Int(requiredData.value) ?? -1
            if let optionalData = optionalData {
                return ActiveAuthenticationInfo(oid: oid, version: version, signatureAlgorithmOID: optionalData.value)
            } else {
                return ActiveAuthenticationInfo(oid: oid, version: version)
            }
        }
        return nil
    }
}
