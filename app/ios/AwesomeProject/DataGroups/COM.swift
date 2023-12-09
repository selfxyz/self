import Foundation

@available(iOS 13, macOS 10.15, *)
public class COM : DataGroup {
    public private(set) var version : String = "Unknown"
    public private(set) var unicodeVersion : String = "Unknown"
    public private(set) var dataGroupsPresent : [String] = []
    
    required init( _ data : [UInt8] ) throws {
        try super.init(data)
        datagroupType = .COM
    }
    
    override func parse(_ data: [UInt8]) throws {
        var tag = try getNextTag()
        if tag != 0x5F01 {
            throw NFCPassportReaderError.InvalidResponse
        }
        
        // Version is 4 bytes (ascii) - AABB
        // AA is major number, BB is minor number
        // e.g.  48 49 48 55 -> 01 07 -> 1.7
        var versionBytes = try getNextValue()
        if versionBytes.count == 4 {
            let aa = Int( String(cString: Array(versionBytes[0..<2] + [0]) )) ?? -1
            let bb = Int( String(cString: Array(versionBytes[2...] + [0])) ) ?? -1
            if aa != -1 && bb != -1 {
                version = "\(aa).\(bb)"
            }
        }
        tag = try getNextTag()
        if tag != 0x5F36 {
            throw NFCPassportReaderError.InvalidResponse
        }
        
        versionBytes = try getNextValue()
        if versionBytes.count == 6 {
            let aa = Int( String(cString: Array(versionBytes[0..<2] + [0])) ) ?? -1
            let bb = Int( String(cString: Array(versionBytes[2..<4] + [0])) ) ?? -1
            let cc = Int( String(cString: Array(versionBytes[4...]) + [0]) ) ?? -1
            if aa != -1 && bb != -1 && cc != -1 {
                unicodeVersion = "\(aa).\(bb).\(cc)"
            }
        }
        
        tag = try getNextTag()
        if tag != 0x5C {
            throw NFCPassportReaderError.InvalidResponse
        }
        
        let vals = try getNextValue()
        for v in vals {
            if let index = DataGroupParser.tags.firstIndex(of: v) {
                dataGroupsPresent.append( DataGroupParser.dataGroupNames[index] )
            }
        }
        Log.debug( "DG Found - \(dataGroupsPresent)" )
    }
}
