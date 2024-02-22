import Foundation
import mopro

//let moproCircom = MoproCircom()

// Using zkey and generate_proof2

// let wasmPath = "./../../../../mopro-core/examples/circom/keccak256/target/keccak256_256_test_js/keccak256_256_test.wasm"
// let r1csPath = "./../../../../mopro-core/examples/circom/keccak256/target/keccak256_256_test.r1cs"

// Helper function to convert bytes to bits
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

do {
  // // Setup
  // let setupResult = try moproCircom.setup(wasmPath: wasmPath, r1csPath: r1csPath)
  // assert(!setupResult.provingKey.isEmpty, "Proving key should not be empty")

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

  // // Generate Proof
  let generateProofResult = try generateProof2(circuitInputs: inputs)
  // let generateProofResult = try moproCircom.generateProof(circuitInputs: inputs)
  assert(!generateProofResult.proof.isEmpty, "Proof should not be empty")

  // // Verify Proof
  assert(Data(expectedOutput) == generateProofResult.inputs, "Circuit outputs mismatch the expected outputs")

  let isValid = try verifyProof2(
    proof: generateProofResult.proof, publicInput: generateProofResult.inputs)
  assert(isValid, "Proof verification should succeed")

} catch let error as MoproError {
  print("MoproError: \(error)")
} catch {
  print("Unexpected error: \(error)")
}
