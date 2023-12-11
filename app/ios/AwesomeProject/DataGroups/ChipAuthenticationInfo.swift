import Foundation

@available(iOS 13, macOS 10.15, *)
public class ChipAuthenticationInfo : SecurityInfo {
    
    var oid : String
    var version : Int
    var keyId : Int?
    
    static func checkRequiredIdentifier(_ oid : String) -> Bool {
        return ID_CA_DH_3DES_CBC_CBC_OID == oid
            || ID_CA_ECDH_3DES_CBC_CBC_OID == oid
            || ID_CA_DH_AES_CBC_CMAC_128_OID == oid
            || ID_CA_DH_AES_CBC_CMAC_192_OID == oid
            || ID_CA_DH_AES_CBC_CMAC_256_OID == oid
            || ID_CA_ECDH_AES_CBC_CMAC_128_OID == oid
            || ID_CA_ECDH_AES_CBC_CMAC_192_OID == oid
            || ID_CA_ECDH_AES_CBC_CMAC_256_OID == oid
    }
    
    init(oid: String, version: Int, keyId: Int? = nil) {
        self.oid = oid
        self.version = version
        self.keyId = keyId
    }
    
    public override func getObjectIdentifier() -> String {
        return oid
    }
    
    public override func getProtocolOIDString() -> String {
        return ChipAuthenticationInfo.toProtocolOIDString(oid:oid)
    }
    
    // The keyid refers to a specific key if there are multiple otherwise if not set, only one key is present so set to 0
    public func getKeyId() -> Int {
        return keyId ?? 0
    }
    
    /// Returns the key agreement algorithm - DH or ECDH for the given Chip Authentication oid
    /// - Parameter oid: the object identifier
    /// - Returns: key agreement algorithm
    /// - Throws: InvalidDataPassed error if invalid oid specified
    public static func toKeyAgreementAlgorithm( oid : String ) throws -> String {
        if ID_CA_DH_3DES_CBC_CBC_OID == oid
            || ID_CA_DH_AES_CBC_CMAC_128_OID == oid
            || ID_CA_DH_AES_CBC_CMAC_192_OID == oid
            || ID_CA_DH_AES_CBC_CMAC_256_OID == oid {
            return "DH";
        } else if ID_CA_ECDH_3DES_CBC_CBC_OID == oid
                    || ID_CA_ECDH_AES_CBC_CMAC_128_OID == oid
                    || ID_CA_ECDH_AES_CBC_CMAC_192_OID == oid
                    || ID_CA_ECDH_AES_CBC_CMAC_256_OID == oid {
            return "ECDH";
        }
        
        throw NFCPassportReaderError.InvalidDataPassed( "Unable to lookup key agreement algorithm - invalid oid" )
    }
    
    /// Returns the cipher algorithm - DESede or AES for the given Chip Authentication oid
    /// - Parameter oid: the object identifier
    /// - Returns: the cipher algorithm type
    /// - Throws: InvalidDataPassed error if invalid oid specified
    public static func toCipherAlgorithm( oid : String ) throws -> String {
        if ID_CA_DH_3DES_CBC_CBC_OID == oid
            || ID_CA_ECDH_3DES_CBC_CBC_OID == oid {
            return "DESede";
        } else if ID_CA_DH_AES_CBC_CMAC_128_OID == oid
                    || ID_CA_DH_AES_CBC_CMAC_192_OID == oid
                    || ID_CA_DH_AES_CBC_CMAC_256_OID == oid
                    || ID_CA_ECDH_AES_CBC_CMAC_128_OID == oid
                    || ID_CA_ECDH_AES_CBC_CMAC_192_OID == oid
                    || ID_CA_ECDH_AES_CBC_CMAC_256_OID == oid {
            return "AES";
        }
        throw NFCPassportReaderError.InvalidDataPassed( "Unable to lookup cipher algorithm - invalid oid" )
    }
    
    /// Returns the key length in bits (128, 192, or 256) for the given Chip Authentication oid
    /// - Parameter oid: the object identifier
    /// - Returns: the key length in bits
    /// - Throws: InvalidDataPassed error if invalid oid specified
    public static func toKeyLength( oid : String ) throws -> Int {
        if ID_CA_DH_3DES_CBC_CBC_OID == oid
            || ID_CA_ECDH_3DES_CBC_CBC_OID == oid
            || ID_CA_DH_AES_CBC_CMAC_128_OID == oid
            || ID_CA_ECDH_AES_CBC_CMAC_128_OID == oid {
            return 128;
        } else if ID_CA_DH_AES_CBC_CMAC_192_OID == oid
                    || ID_CA_ECDH_AES_CBC_CMAC_192_OID == oid {
            return 192;
        } else if ID_CA_DH_AES_CBC_CMAC_256_OID == oid
                    || ID_CA_ECDH_AES_CBC_CMAC_256_OID == oid {
            return 256;
        }
        
        throw NFCPassportReaderError.InvalidDataPassed( "Unable to get key length - invalid oid" )
    }
    
    private static func toProtocolOIDString(oid : String) -> String {
        if ID_CA_DH_3DES_CBC_CBC_OID == oid {
            return "id-CA-DH-3DES-CBC-CBC"
        }
        if ID_CA_DH_AES_CBC_CMAC_128_OID == oid {
            return "id-CA-DH-AES-CBC-CMAC-128"
        }
        if ID_CA_DH_AES_CBC_CMAC_192_OID == oid {
            return "id-CA-DH-AES-CBC-CMAC-192"
        }
        if ID_CA_DH_AES_CBC_CMAC_256_OID == oid {
            return "id-CA-DH-AES-CBC-CMAC-256"
        }
        if ID_CA_ECDH_3DES_CBC_CBC_OID == oid {
            return "id-CA-ECDH-3DES-CBC-CBC"
        }
        if ID_CA_ECDH_AES_CBC_CMAC_128_OID == oid {
            return "id-CA-ECDH-AES-CBC-CMAC-128"
        }
        if ID_CA_ECDH_AES_CBC_CMAC_192_OID == oid {
            return "id-CA-ECDH-AES-CBC-CMAC-192"
        }
        if ID_CA_ECDH_AES_CBC_CMAC_256_OID == oid {
            return "id-CA-ECDH-AES-CBC-CMAC-256"
        }
        
        return oid
    }
}
