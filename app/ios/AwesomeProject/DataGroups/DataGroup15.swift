
import Foundation
import OpenSSL

@available(iOS 13, macOS 10.15, *)
public class DataGroup15 : DataGroup {
    
    public private(set) var rsaPublicKey : OpaquePointer?
    public private(set) var ecdsaPublicKey : OpaquePointer?
    
    deinit {
        if ( ecdsaPublicKey != nil ) {
            EVP_PKEY_free(ecdsaPublicKey);
        }
        if ( rsaPublicKey != nil ) {
            EVP_PKEY_free(rsaPublicKey);
        }
    }
    
    required init( _ data : [UInt8] ) throws {
        try super.init(data)
        datagroupType = .DG15
    }
    
    
    override func parse(_ data: [UInt8]) throws {
        
        // the public key can either be in EC (elliptic curve) or RSA format
        // Try ec first and if this fails try RSA
        // Note - this will be improved in a later version to read the ASN1 body to
        // check the actual type
        if let key = try? OpenSSLUtils.readECPublicKey( data:body ) {
            // NOTE We are responsible for freeing the key!
            ecdsaPublicKey = key
        } else if let key = try? OpenSSLUtils.readRSAPublicKey( data:body ) {
            
            rsaPublicKey = key
        }
    }
}
