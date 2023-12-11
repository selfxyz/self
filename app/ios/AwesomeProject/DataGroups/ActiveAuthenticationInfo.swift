import Foundation

@available(iOS 13, macOS 10.15, *)
public class ActiveAuthenticationInfo : SecurityInfo {

    var oid : String
    var version : Int
    var signatureAlgorithmOID : String?

    static func checkRequiredIdentifier(_ oid : String) -> Bool {
        return ID_AA_OID == oid
    }

    init(oid: String, version: Int, signatureAlgorithmOID: String? = nil) {
        self.oid = oid
        self.version = version
        self.signatureAlgorithmOID = signatureAlgorithmOID
    }

    public override func getObjectIdentifier() -> String {
        return oid
    }

    public override func getProtocolOIDString() -> String {
        return ActiveAuthenticationInfo.toProtocolOIDString(oid:oid)
    }

    public func getSignatureAlgorithmOIDString() -> String? {
        return ActiveAuthenticationInfo.toSignatureAlgorithmOIDString(oid: signatureAlgorithmOID)
    }

    private static func toProtocolOIDString(oid : String) -> String {
        if ID_AA_OID == oid {
            return "id-AA"
        }

        return oid
    }

    private static func toSignatureAlgorithmOIDString(oid: String?) -> String? {
        if (ECDSA_PLAIN_SHA1_OID == oid) {
            return "ecdsa-plain-SHA1";
        }
        if (ECDSA_PLAIN_SHA224_OID == oid) {
            return "ecdsa-plain-SHA224";
        }
        if (ECDSA_PLAIN_SHA256_OID == oid) {
            return "ecdsa-plain-SHA256";
        }
        if (ECDSA_PLAIN_SHA384_OID == oid) {
            return "ecdsa-plain-SHA384";
        }
        if (ECDSA_PLAIN_SHA512_OID == oid) {
            return "ecdsa-plain-SHA512";
        }
        if (ECDSA_PLAIN_RIPEMD160_OID == oid) {
            return "ecdsa-plain-RIPEMD160";
        }

        return nil
    }
}
