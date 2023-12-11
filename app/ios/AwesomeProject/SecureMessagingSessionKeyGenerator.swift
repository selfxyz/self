import Foundation

import CryptoKit

@available(iOS 13, macOS 10.15, *)
class SecureMessagingSessionKeyGenerator {
    static let NO_PACE_KEY_REFERENCE : UInt8 = 0x00
    enum SMSMode : UInt8 {
        case ENC_MODE = 0x1;
        case MAC_MODE = 0x2;
        case PACE_MODE = 0x3;
    }
    
    /// Derives the ENC or MAC key for BAC from the keySeed.
    /// - Parameter keySeed the key seed.
    /// - Parameter mode either <code>ENC_MODE</code> or <code>MAC_MODE</code>
    /// - Returns the key.
    /// - Throws InvalidDataPassed on data error
    func deriveKey( keySeed : [UInt8], mode : SMSMode) throws -> [UInt8] {
        return try deriveKey(keySeed: keySeed, cipherAlgName: "DESede", keyLength: 128, mode: mode);
    }
    
    /// Derives the ENC or MAC key for BAC or PACE or CA.
    /// - Parameter keySeed the key seed.
    /// - Parameter cipherAlgName either AES or DESede
    /// - Parameter keyLength key length in bits
    /// - Parameter mode either {@code ENC_MODE}, {@code MAC_MODE}, or {@code PACE_MODE}
    /// - Returns the key.
    /// - Throws InvalidDataPassed on data error
    func deriveKey(keySeed : [UInt8], cipherAlgName :String, keyLength : Int, mode : SMSMode) throws  -> [UInt8] {
        return try deriveKey(keySeed: keySeed, cipherAlgName: cipherAlgName, keyLength: keyLength, nonce: nil, mode: mode);
    }
    
    /// Derives the ENC or MAC key for BAC or PACE or CA.
    /// - Parameter keySeed the shared secret, as octets
    /// - Parameter cipherAlg in Java mnemonic notation (for example "DESede", "AES")
    /// - Parameter keyLength length in bits
    /// - Parameter nonce optional nonce or <code>nil</code>
    /// - Parameter mode the mode either {@code ENC}, {@code MAC}, or {@code PACE} mode
    /// - Returns the key.
    /// - Throws InvalidDataPassed on data error
    func deriveKey(keySeed : [UInt8], cipherAlgName :String, keyLength : Int, nonce : [UInt8]? = nil, mode : SMSMode) throws -> [UInt8]  {
        return try deriveKey(keySeed: keySeed, cipherAlgName: cipherAlgName, keyLength: keyLength, nonce: nonce, mode: mode, paceKeyReference: SecureMessagingSessionKeyGenerator.NO_PACE_KEY_REFERENCE);
    }

 /// Derives the ENC or MAC key for BAC or PACE or CA.
    /// - Parameter keySeed the shared secret, as octets
    /// - Parameter cipherAlg in Java mnemonic notation (for example "DESede", "AES")
    /// - Parameter keyLength length in bits
    /// - Parameter nonce optional nonce or <code>null</code>
    /// - Parameter mode the mode either {@code ENC}, {@code MAC}, or {@code PACE} mode
    /// - Parameter paceKeyReference Key Reference For Pace Protocol
    /// - Returns the key.
    /// - Throws InvalidDataPassed on data error
    func deriveKey(keySeed : [UInt8], cipherAlgName :String, keyLength : Int, nonce : [UInt8]?, mode : SMSMode, paceKeyReference : UInt8) throws ->  [UInt8] {
        let digestAlgo = try inferDigestAlgorithmFromCipherAlgorithmForKeyDerivation(cipherAlg: cipherAlgName, keyLength: keyLength);
        
        let modeArr : [UInt8] = [0x00, 0x00, 0x00, mode.rawValue]
        var dataEls = [Data(keySeed)]
        if let nonce = nonce {
            dataEls.append( Data(nonce) )
        }
        dataEls.append( Data(modeArr) )
        let hashResult = try getHash(algo: digestAlgo, dataElements: dataEls)
        
        var keyBytes : [UInt8]
        if cipherAlgName == "DESede" || cipherAlgName == "3DES" {
            // TR-SAC 1.01, 4.2.1.
            switch(keyLength) {
                case 112, 128:
                    // Copy E (Octects 1 to 8), D (Octects 9 to 16), E (again Octects 1 to 8), 112-bit 3DES key
                    keyBytes = [UInt8](hashResult[0..<16] + hashResult[0..<8])
                    break;
                default:
                    throw NFCPassportReaderError.InvalidDataPassed("Can only use DESede with 128-but key length")
            }
        } else if cipherAlgName.lowercased() == "aes" || cipherAlgName.lowercased().hasPrefix("aes") {
            // TR-SAC 1.01, 4.2.2.
            switch(keyLength) {
                case 128:
                    keyBytes = [UInt8](hashResult[0..<16]) // NOTE: 128 = 16 * 8
                case 192:
                    keyBytes = [UInt8](hashResult[0..<24]) // NOTE: 192 = 24 * 8
                case 256:
                    keyBytes = [UInt8](hashResult[0..<32]) // NOTE: 256 = 32 * 8
                default:
                    throw NFCPassportReaderError.InvalidDataPassed("Can only use AES with 128-bit, 192-bit key or 256-bit length")
            }
        } else {
            throw NFCPassportReaderError.InvalidDataPassed( "Unsupported cipher algorithm used" )
        }
        
        return keyBytes
    }
    
    func inferDigestAlgorithmFromCipherAlgorithmForKeyDerivation( cipherAlg : String, keyLength : Int) throws -> String {
        if cipherAlg == "DESede" || cipherAlg == "AES-128" {
            return "SHA1";
        }
        if cipherAlg == "AES" && keyLength == 128 {
            return "SHA1";
        }
        if cipherAlg == "AES-256" || cipherAlg ==  "AES-192" {
            return "SHA256";
        }
        if cipherAlg == "AES" && (keyLength == 192 || keyLength == 256) {
            return "SHA256";
        }
        
        throw NFCPassportReaderError.InvalidDataPassed("Unsupported cipher algorithm or key length")
    }
    
    /// This generates a SHA-X hash based on the passed in algo.
    /// There must be a more generic way to do this?
    func  getHash(algo: String, dataElements:[Data] ) throws -> [UInt8] {
        var hash : [UInt8]
        
        let algo = algo.lowercased()
        if algo == "sha1" {
            var hasher = Insecure.SHA1()
            for d in dataElements {
                hasher.update( data:d )
            }
            hash = Array(hasher.finalize())
        } else if algo == "sha256" {
            var hasher = SHA256()
            for d in dataElements {
                hasher.update( data:d )
            }
            hash = Array(hasher.finalize())
        } else if algo == "sha384" {
            var hasher = SHA384()
            for d in dataElements {
                hasher.update( data:d )
            }
            hash = Array(hasher.finalize())
        } else if algo == "sha512" {
            var hasher = SHA512()
            for d in dataElements {
                hasher.update( data:d )
            }
            hash = Array(hasher.finalize())
        } else {
            throw NFCPassportReaderError.InvalidHashAlgorithmSpecified
        }
        
        return hash
    }
}
