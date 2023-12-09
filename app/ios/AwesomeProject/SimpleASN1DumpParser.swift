import Foundation
import OpenSSL

@available(iOS 13, macOS 10.15, *)
public class ASN1Item : CustomDebugStringConvertible {
    var pos : Int = -1
    var depth : Int = -1
    var headerLen : Int = -1
    var length : Int = -1
    var itemType : String = "" // Primative or Constructed (prim or cons)
    var type : String = "" // Actual type of the value ( object, set, etc)
    var value : String = ""
    var line : String = ""
    var parent : ASN1Item? = nil
    
    private var children = [ASN1Item] ()
    
    public init( line : String) {
        self.line = line
        
        let scanner = Scanner(string: line)
        
        let space = CharacterSet(charactersIn: " =:")
        let equals = CharacterSet(charactersIn: "= ")
        let colon = CharacterSet(charactersIn: ":")
        let end = CharacterSet(charactersIn: "\n")
        
        scanner.charactersToBeSkipped = space
        self.pos = scanner.scanInt() ?? -1
        _ = scanner.scanUpToCharacters(from: equals)
        self.depth = scanner.scanInt() ?? -1
        _ = scanner.scanUpToCharacters(from: equals)
        self.headerLen = scanner.scanInt() ?? -1
        _ = scanner.scanUpToCharacters(from: equals)
        self.length = scanner.scanInt() ?? -1
        self.itemType = scanner.scanUpToCharacters(from: colon) ?? ""
        let rest = scanner.scanUpToCharacters(from: end)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        
        if itemType == "cons" {
            type = rest

        } else {
            let items = rest.components(separatedBy: ":" ).filter{ !$0.isEmpty }
            self.type = items[0].trimmingCharacters(in: .whitespacesAndNewlines)
            if ( items.count > 1 ) {
                self.value = items[1].trimmingCharacters(in: .whitespacesAndNewlines)
            }
        }
    }
    
    func addChild( _ child : ASN1Item ) {
        child.parent = self
        self.children.append( child )
    }
    
    public func getChild( _ child : Int ) -> ASN1Item? {
        if ( child < children.count ) {
            return children[child]
        } else {
            return nil
        }
    }
    
    public func getNumberOfChildren() -> Int {
        return children.count
    }
    
    public var debugDescription: String {
        var ret = "pos:\(pos), d=\(depth), hl=\(headerLen), l=\(length): \(itemType): \(type) \(value)\n"
        children.forEach { ret += $0.debugDescription }
        return ret
    }
}

/// Very very basic ASN1 parser class - uses OpenSSL to dump an ASN1 structure to a string, and then parses that out into
/// a tree based hieracy of ASN1Item structures - depth based
@available(iOS 13, macOS 10.15, *)
public class SimpleASN1DumpParser {
    public init() {
        
    }
    
    public func parse( data: Data ) throws -> ASN1Item {
        var parsed : String = ""
        

        let _ = try data.withUnsafeBytes { (ptr) in
            guard let out = BIO_new(BIO_s_mem()) else { throw OpenSSLError.UnableToParseASN1("Unable to allocate output buffer") }
            defer { BIO_free(out) }
        
            let rc = ASN1_parse_dump(out, ptr.baseAddress?.assumingMemoryBound(to: UInt8.self), data.count, 0, 0)
            if rc == 0 {
                throw OpenSSLError.UnableToParseASN1("Failed to parse ASN1 Data")
            }
            
            parsed = OpenSSLUtils.bioToString(bio: out)
        }
        
        let lines = parsed.components(separatedBy: "\n")
        let topItem : ASN1Item? = parseLines( lines:lines)
        
        guard let ret = topItem else {
            throw OpenSSLError.UnableToParseASN1("Failed to format ASN1 Data")
        }
        
        return ret
    }
    
    func parseLines( lines : [String] ) -> ASN1Item? {
        var topItem : ASN1Item?

        var currentParent : ASN1Item?
        for line in lines {
            if line.trimmingCharacters(in: .whitespacesAndNewlines) == "" {
                continue
            }
            let item = ASN1Item(line: line)
            if item.depth == 0 {
                topItem = item
            } else if item.depth == currentParent!.depth {
                currentParent!.parent!.addChild( item )
            } else if item.depth > currentParent!.depth {
                currentParent!.addChild( item )
            } else {
                repeat {
                    currentParent = currentParent!.parent
                } while currentParent!.depth > item.depth-1 && currentParent!.depth != 0
                if currentParent!.depth == item.depth-1 {
                    currentParent!.addChild( item )
                }
            }
            currentParent = item
        }
        
        return topItem
    }
    
    public func test() {
        let lines = [
            "    0:d=0  hl=4 l= 758 cons: SET               ",
            "  662:d=1  hl=2 l=  18 cons: SEQUENCE          ",
            "  664:d=2  hl=2 l=  10 prim: OBJECT            :0.4.0.127.0.7.2.2.3.2.4",
            "  676:d=2  hl=2 l=   1 prim: INTEGER           :01",
            "  679:d=2  hl=2 l=   1 prim: INTEGER           :01",
            "  682:d=1  hl=2 l=  18 cons: SEQUENCE          ",
            "  684:d=2  hl=2 l=  10 prim: OBJECT            :0.4.0.127.0.7.2.2.3.2.1",
            "  696:d=2  hl=2 l=   1 prim: INTEGER           :01",
            "  699:d=2  hl=2 l=   1 prim: INTEGER           :02",
            "  702:d=1  hl=2 l=  13 cons: SEQUENCE          ",
            "  704:d=2  hl=2 l=   8 prim: OBJECT            :0.4.0.127.0.7.2.2.2",
            "  714:d=2  hl=2 l=   1 prim: INTEGER           :01",
            "  717:d=1  hl=2 l=  18 cons: SEQUENCE          ",
            "  719:d=2  hl=2 l=  10 prim: OBJECT            :0.4.0.127.0.7.2.2.4.2.4",
            "  731:d=2  hl=2 l=   1 prim: INTEGER           :02",
            "  734:d=2  hl=2 l=   1 prim: INTEGER           :0D",
            "  737:d=1  hl=2 l=  23 cons: SEQUENCE          ",
            "  739:d=2  hl=2 l=   6 prim: OBJECT            :2.23.136.1.1.5",
            "  747:d=2  hl=2 l=   1 prim: INTEGER           :01",
            "  750:d=2  hl=2 l=  10 prim: OBJECT            :0.4.0.127.0.7.1.1.4.1.3",
            ""
        ]
        
        let topItem = parseLines( lines:lines )
        print( topItem?.debugDescription ?? "" )
    }
}
