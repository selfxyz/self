import Foundation

// SecurityInfos ::= SET of SecurityInfo
// SecurityInfo ::= SEQUENCE {
//    protocol OBJECT IDENTIFIER,
//    requiredData ANY DEFINED BY protocol,
//    optionalData ANY DEFINED BY protocol OPTIONAL
@available(iOS 13, macOS 10.15, *)
public class CardAccess {
    private var asn1 : ASN1Item!
    public private(set) var securityInfos : [SecurityInfo] = [SecurityInfo]()
    
    var paceInfo : PACEInfo? {
        get {
            return (securityInfos.filter { ($0 as? PACEInfo) != nil }).first as? PACEInfo
        }
    }
    
    required init( _ data : [UInt8] ) throws {
        let p = SimpleASN1DumpParser()
        asn1 = try p.parse(data: Data(data))
        
        // Bit of a hack at the moment - passing in the body - if we had a decent ASN1 parser then this would be better! ;)
        for i in 0 ..< asn1.getNumberOfChildren() {
            if let child = asn1.getChild(i),
               let secInfo = SecurityInfo.getInstance( object:child, body : data ) {
                securityInfos.append(secInfo)
            }
        }
    }
}
