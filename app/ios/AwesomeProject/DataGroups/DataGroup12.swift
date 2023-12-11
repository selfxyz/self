
import Foundation

@available(iOS 13, macOS 10.15, *)
public class DataGroup12 : DataGroup {
    
    public private(set) var issuingAuthority : String?
    public private(set) var dateOfIssue : String?
    public private(set) var otherPersonsDetails : String?
    public private(set) var endorsementsOrObservations : String?
    public private(set) var taxOrExitRequirements : String?
    public private(set) var frontImage : [UInt8]?
    public private(set) var rearImage : [UInt8]?
    public private(set) var personalizationTime : String?
    public private(set) var personalizationDeviceSerialNr : String?
    
    required init( _ data : [UInt8] ) throws {
        try super.init(data)
        datagroupType = .DG12
    }
    
    override func parse(_ data: [UInt8]) throws {
        var tag = try getNextTag()
        if tag != 0x5C {
            throw NFCPassportReaderError.InvalidResponse
        }
        
        // Skip the taglist - ideally we would check this but...
        let _ = try getNextValue()
        
        repeat {
            tag = try getNextTag()
            let val = try getNextValue()
            
            if tag == 0x5F19 {
                issuingAuthority = String( bytes:val, encoding:.utf8)
            } else if tag == 0x5F26 {
                dateOfIssue = parseDateOfIssue(value: val)
            } else if tag == 0xA0 {
                // Not yet handled
            } else if tag == 0x5F1B {
                endorsementsOrObservations = String( bytes:val, encoding:.utf8)
            } else if tag == 0x5F1C {
                taxOrExitRequirements = String( bytes:val, encoding:.utf8)
            } else if tag == 0x5F1D {
                frontImage = val
            } else if tag == 0x5F1E {
                rearImage = val
            } else if tag == 0x5F55 {
                personalizationTime = String( bytes:val, encoding:.utf8)
            } else if tag == 0x5F56 {
                personalizationDeviceSerialNr = String( bytes:val, encoding:.utf8)
            }
        } while pos < data.count
    }
    
    private func parseDateOfIssue(value: [UInt8]) -> String? {
        if value.count == 4 {
            return decodeBCD(value: value)
        } else {
            return decodeASCII(value: value)
        }
    }
    
    private func decodeASCII(value: [UInt8]) -> String? {
        return String(bytes:value, encoding:.utf8)
    }
    
    private func decodeBCD(value: [UInt8]) -> String? {
        value.map({ String(format: "%02X", $0) }).joined()
    }
}
