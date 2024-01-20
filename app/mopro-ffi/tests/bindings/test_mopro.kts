import uniffi.mopro.*

var wasmPath = "../mopro-core/examples/circom/multiplier2/target/multiplier2_js/multiplier2.wasm"
var r1csPath = "../mopro-core/examples/circom/multiplier2/target/multiplier2.r1cs"

try {
    var moproCircom = MoproCircom()
    var setupResult = moproCircom.setup(wasmPath, r1csPath)
    assert(setupResult.provingKey.size > 0) { "Proving key should not be empty" }

    val inputs = mutableMapOf<String, List<String>>()
    inputs["a"] = listOf("3")
    inputs["b"] = listOf("5")

    var generateProofResult = moproCircom.generateProof(inputs)
    assert(generateProofResult.proof.size > 0) { "Proof is empty" }
    var isValid = moproCircom.verifyProof(generateProofResult.proof, generateProofResult.inputs)
    assert(isValid) { "Proof is invalid" }
} catch (e: Exception) {
    println(e)
}
