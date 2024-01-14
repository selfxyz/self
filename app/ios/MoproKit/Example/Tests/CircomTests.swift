@testable import MoproKit
import XCTest

final class CircomTests: XCTestCase {

    let moproCircom = MoproKit.MoproCircom()
    
    func testMultiplier() {
        let wasmPath = Bundle.main.path(forResource: "multiplier2", ofType: "wasm")!
        let r1csPath = Bundle.main.path(forResource: "multiplier2", ofType: "r1cs")!
        XCTAssertNoThrow(try moproCircom.setup(wasmPath: wasmPath, r1csPath: r1csPath), "Mopro circom setup failed")
        
        do {
            var inputs = [String: [String]]()
            let a = 3
            let b = 5
            let c = a*b
            inputs["a"] = [String(a)]
            inputs["b"] = [String(b)]
            let outputs: [String] = [String(c), String(a)]
            let expectedOutput: [UInt8] = serializeOutputs(outputs)
            
            // Generate Proof
            let generateProofResult = try moproCircom.generateProof(circuitInputs: inputs)
            XCTAssertFalse(generateProofResult.proof.isEmpty, "Proof should not be empty")
            XCTAssertEqual(Data(expectedOutput), generateProofResult.inputs, "Circuit outputs mismatch the expected outputs")

            let isValid = try moproCircom.verifyProof(proof: generateProofResult.proof, publicInput: generateProofResult.inputs)
            XCTAssertTrue(isValid, "Proof verification should succeed")
        } catch let error as MoproError {
            print("MoproError: \(error)")
        } catch {
            print("Unexpected error: \(error)")
        }
    }
    
    func testKeccak256() {
        let wasmPath = Bundle.main.path(forResource: "keccak256_256_test", ofType: "wasm")!
        let r1csPath = Bundle.main.path(forResource: "keccak256_256_test", ofType: "r1cs")!
        XCTAssertNoThrow(try moproCircom.setup(wasmPath: wasmPath, r1csPath: r1csPath), "Mopro circom setup failed")
        
        do {
            // Prepare inputs
            let inputVec: [UInt8] = [
                116, 101, 115, 116, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                0, 0, 0, 0, 0, 0,
            ]
            let bits = bytesToBits(bytes: inputVec)
            var inputs = [String: [String]]()
            inputs["in"] = bits

            // Expected outputs
            let outputVec: [UInt8] = [
                37, 17, 98, 135, 161, 178, 88, 97, 125, 150, 143, 65, 228, 211, 170, 133, 153, 9, 88,
                212, 4, 212, 175, 238, 249, 210, 214, 116, 170, 85, 45, 21,
            ]
            let outputBits: [String] = bytesToBits(bytes: outputVec)
            let expectedOutput: [UInt8] = serializeOutputs(outputBits)

            // Generate Proof
            let generateProofResult = try moproCircom.generateProof(circuitInputs: inputs)
            XCTAssertFalse(generateProofResult.proof.isEmpty, "Proof should not be empty")
            XCTAssertEqual(Data(expectedOutput), generateProofResult.inputs, "Circuit outputs mismatch the expected outputs")
            
            let isValid = try moproCircom.verifyProof(proof: generateProofResult.proof, publicInput: generateProofResult.inputs)
            XCTAssertTrue(isValid, "Proof verification should succeed")
        } catch let error as MoproError {
            print("MoproError: \(error)")
        } catch {
            print("Unexpected error: \(error)")
        }
    }
}

func bytesToBits(bytes: [UInt8]) -> [String] {
    var bits = [String]()
    for byte in bytes {
        for j in 0..<8 {
            let bit = (byte >> j) & 1
            bits.append(String(bit))
        }
    }
    return bits
}

func serializeOutputs(_ stringArray: [String]) -> [UInt8] {
    var bytesArray: [UInt8] = []
    let length = stringArray.count
    var littleEndianLength = length.littleEndian
    let targetLength = 32
    withUnsafeBytes(of: &littleEndianLength) {
        bytesArray.append(contentsOf: $0)
    }
    for value in stringArray {
        // TODO: should handle 254-bit input
        var littleEndian = Int32(value)!.littleEndian
        var byteLength = 0
        withUnsafeBytes(of: &littleEndian) {
            bytesArray.append(contentsOf: $0)
            byteLength = byteLength + $0.count
        }
        if byteLength < targetLength {
            let paddingCount = targetLength - byteLength
            let paddingArray = [UInt8](repeating: 0, count: paddingCount)
            bytesArray.append(contentsOf: paddingArray)
        }
    }
    return bytesArray
}
