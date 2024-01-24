import mopro
import Foundation

let moproCircom = MoproCircom()

let wasmPath = "./../../../../mopro-core/examples/circom/multiplier2/target/multiplier2_js/multiplier2.wasm"
let r1csPath = "./../../../../mopro-core/examples/circom/multiplier2/target/multiplier2.r1cs"

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

do {
    // Setup
    let setupResult = try moproCircom.setup(wasmPath: wasmPath, r1csPath: r1csPath)
    assert(!setupResult.provingKey.isEmpty, "Proving key should not be empty")

    // Prepare inputs
    var inputs = [String: [String]]()
    let a = 3
    let b = 5
    let c = a*b
    inputs["a"] = [String(a)]
    inputs["b"] = [String(b)]

    // Expected outputs
    let outputs: [String] = [String(c), String(a)]
    let expectedOutput: [UInt8] = serializeOutputs(outputs)

    // Generate Proof
    let generateProofResult = try moproCircom.generateProof(circuitInputs: inputs)
    assert(!generateProofResult.proof.isEmpty, "Proof should not be empty")

    // Verify Proof
    assert(Data(expectedOutput) == generateProofResult.inputs, "Circuit outputs mismatch the expected outputs")

    let isValid = try moproCircom.verifyProof(proof: generateProofResult.proof, publicInput: generateProofResult.inputs)
    assert(isValid, "Proof verification should succeed")

} catch let error as MoproError {
    print("MoproError: \(error)")
} catch {
    print("Unexpected error: \(error)")
}
