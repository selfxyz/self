# Common KMP Library — Port `@selfxyz/common` Utilities to Pure Kotlin

## Overview

Port the core math, cryptographic hashing, tree operations, passport parsing, and certificate parsing from TypeScript (`common/src/utils/`) to pure Kotlin in `commonMain`. This library has **zero platform dependencies** — no `expect`/`actual`, no Android/iOS APIs. Everything is pure Kotlin math that compiles for JVM, iOS, JS, and WASM targets.

This is the foundation layer that both [SPEC-PROVING-CLIENT.md](./SPEC-PROVING-CLIENT.md) and a future browser extension depend on.

**Prerequisites**: None (this is the leaf dependency).

---

## Why Pure `commonMain`

Every function in this library is deterministic math: hash bytes, build trees, parse ASN.1, pack field elements. None of it touches platform APIs (no file system, no networking, no UI). By keeping it in `commonMain` as pure Kotlin:

- Adding `jsMain` or `wasmMain` later for a browser extension costs zero porting effort for this layer
- Unit tests run on JVM (`commonTest`) with fast iteration
- Identical outputs are guaranteed across all platforms

The only exception is SHA hashing (SHA-1, SHA-256, SHA-384, SHA-512) which could use platform implementations for performance, but a pure Kotlin implementation works fine and avoids any `expect`/`actual` complexity.

---

## Module Structure

```
packages/kmp-sdk/shared/src/commonMain/kotlin/xyz/self/sdk/common/
  hash/
    Poseidon.kt                   — Poseidon hash (1–16 input variants)
    PoseidonConstants.kt          — Round constants and mixing matrices (BN254)
    FlexiblePoseidon.kt           — Dynamic variant selection + chunked hashing
    Sha.kt                        — SHA-1/224/256/384/512 (pure Kotlin or expect/actual)
    ShaPad.kt                     — SHA padding for circuit inputs
  math/
    BigIntField.kt                — Field arithmetic over BN254 prime
    BytePacking.kt                — packBytes, splitToWords, hexToDecimal, num2Bits
  trees/
    LeanIMT.kt                    — Lean Incremental Merkle Tree (import, indexOf, generateProof)
    SparseMerkleTree.kt           — Sparse Merkle Tree (import, add, createProof)
    MerkleProof.kt                — Proof data structures
    LeafGenerators.kt             — OFAC leaf functions (name, DOB, country, passport number)
    TreeConstants.kt              — Depth constants
  passport/
    PassportDataParser.kt         — initPassportDataParsing (metadata extraction)
    MrzFormatter.kt               — formatMrz (DER/TLV encoding)
    CommitmentGenerator.kt        — generateCommitment (Poseidon-5)
    NullifierGenerator.kt         — generateNullifier
    DscLeaf.kt                    — getLeafDscTree (DSC + CSCA leaf hashing)
    SelectorGenerator.kt          — getSelectorDg1 (attribute → MRZ position mapping)
    SignatureExtractor.kt         — Extract r,s from DER-encoded ECDSA signatures
  certificate/
    Asn1Parser.kt                 — Minimal ASN.1 DER parser (Tag-Length-Value)
    X509CertificateParser.kt      — parseCertificateSimple → CertificateData
    OidResolver.kt                — OID → algorithm/curve name mapping
    CscaLookup.kt                 — getCSCAFromSKI (find issuer cert by SKI)
  models/
    CertificateData.kt            — Parsed certificate with pub key details
    PassportMetadata.kt           — Metadata extracted from passport data
    FieldElement.kt               — BigInt wrapper for BN254 field elements
  constants/
    Constants.kt                  — Tree depths, max padded sizes, attestation IDs
    SkiPem.kt                     — SKI → CSCA PEM mapping (prod + staging)
```

Test mirror:
```
packages/kmp-sdk/shared/src/commonTest/kotlin/xyz/self/sdk/common/
  hash/
    PoseidonTest.kt               — Known test vectors from poseidon-lite
    FlexiblePoseidonTest.kt       — packBytesAndPoseidon roundtrips
    ShaPadTest.kt                 — Padding output verification
  math/
    BytePackingTest.kt            — packBytes, splitToWords test vectors
  trees/
    LeanIMTTest.kt                — Import, indexOf, generateProof
    SparseMerkleTreeTest.kt       — Add, createProof, membership/non-membership
    LeafGeneratorsTest.kt         — Known leaf values
  passport/
    PassportDataParserTest.kt     — Parse mock passports, verify metadata
    CommitmentGeneratorTest.kt    — Known commitment hashes
    MrzFormatterTest.kt           — TLV encoding verification
  certificate/
    Asn1ParserTest.kt             — Parse known DER structures
    X509CertificateParserTest.kt  — Parse real DSC/CSCA certificates
```

---

## Detailed Component Specs

### 1. Poseidon Hash

Port of `poseidon-lite` npm package. The Poseidon hash operates over the BN254 scalar field.

#### Field Prime

```kotlin
object BN254 {
    val PRIME = "21888242871839275222246405745257275088548364400416034343698204186575808495617".toBigInteger()
}
```

#### Algorithm

```kotlin
/**
 * Poseidon hash function over BN254 field.
 *
 * @param inputs 1–16 field elements
 * @return Single field element hash
 */
fun poseidon(inputs: List<BigInteger>): BigInteger {
    require(inputs.size in 1..16) { "Poseidon supports 1-16 inputs, got ${inputs.size}" }

    val t = inputs.size + 1  // State width = inputs + capacity
    val nRoundsF = 8         // Full rounds (4 before + 4 after partial rounds)
    val nRoundsP = PARTIAL_ROUNDS[inputs.size - 1]  // Varies by input count

    // Initialize state: [0, input_0, input_1, ..., input_n]
    val state = mutableListOf(BigInteger.ZERO)
    state.addAll(inputs.map { it.mod(BN254.PRIME) })

    val C = getRoundConstants(t)  // Round constants for width t
    val M = getMixingMatrix(t)    // MDS mixing matrix for width t

    for (round in 0 until nRoundsF + nRoundsP) {
        // Add round constants
        for (i in 0 until t) {
            state[i] = (state[i] + C[round * t + i]).mod(BN254.PRIME)
        }

        // S-box: x^5 mod p
        if (round < nRoundsF / 2 || round >= nRoundsF / 2 + nRoundsP) {
            // Full round: apply S-box to all elements
            for (i in 0 until t) {
                state[i] = pow5(state[i])
            }
        } else {
            // Partial round: apply S-box only to first element
            state[0] = pow5(state[0])
        }

        // Linear mixing: state = M * state
        val newState = MutableList(t) { BigInteger.ZERO }
        for (i in 0 until t) {
            for (j in 0 until t) {
                newState[i] = (newState[i] + M[i][j] * state[j]).mod(BN254.PRIME)
            }
        }
        for (i in 0 until t) state[i] = newState[i]
    }

    return state[0]  // Output is first element
}

private fun pow5(v: BigInteger): BigInteger {
    val v2 = (v * v).mod(BN254.PRIME)
    return (v * v2 * v2).mod(BN254.PRIME)
}
```

#### Round Constants

Partial rounds per input count (from `poseidon-lite`):

```kotlin
val PARTIAL_ROUNDS = intArrayOf(
    56, 57, 56, 60, 60, 63, 64, 63, 60, 66, 60, 65, 70, 60, 64, 68
)
// Index 0 = poseidon1 (56 partial rounds)
// Index 1 = poseidon2 (57 partial rounds)
// ...
// Index 15 = poseidon16 (68 partial rounds)
```

The round constants (C) and mixing matrices (M) are large — ~50KB of BigInteger constants total. These are generated by the Grain LFSR:
```
generate_parameters_grain.sage 1 0 254 {t} 8 {nRoundsP} 0x30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000001
```

**Implementation approach**: Store constants as base64-encoded strings in `PoseidonConstants.kt` (matching `poseidon-lite`'s format), decode lazily on first use.

#### Convenience Functions

```kotlin
fun poseidon2(a: BigInteger, b: BigInteger): BigInteger = poseidon(listOf(a, b))
fun poseidon3(a: BigInteger, b: BigInteger, c: BigInteger): BigInteger = poseidon(listOf(a, b, c))
fun poseidon5(inputs: List<BigInteger>): BigInteger = poseidon(inputs)
// ... poseidon1 through poseidon16
```

#### `flexiblePoseidon` and `packBytesAndPoseidon`

```kotlin
/**
 * Dynamically selects Poseidon variant based on input count.
 */
fun flexiblePoseidon(inputs: List<BigInteger>): BigInteger {
    require(inputs.size in 1..16) { "flexiblePoseidon supports 1-16 inputs" }
    return poseidon(inputs)
}

/**
 * Pack byte array into field elements and hash with Poseidon.
 * Bytes are chunked into 31-byte groups, each becoming a field element.
 * If >16 chunks, uses chunked hashing (poseidon16 per group, then combine).
 *
 * Port of packBytesAndPoseidon from common/src/utils/hash.ts
 */
fun packBytesAndPoseidon(bytes: List<Int>): BigInteger {
    val packed = packBytesArray(bytes)
    return customHasher(packed)
}

/**
 * Chunked Poseidon hashing for large inputs.
 * For ≤16 elements: direct flexiblePoseidon
 * For >16 elements: chunk into groups of 16, hash each, then hash results
 */
fun customHasher(elements: List<BigInteger>): BigInteger {
    if (elements.size <= 16) {
        return flexiblePoseidon(elements)
    }

    val chunks = elements.chunked(16)
    val chunkHashes = chunks.map { chunk ->
        if (chunk.size == 16) poseidon(chunk)
        else flexiblePoseidon(chunk)
    }

    return if (chunkHashes.size <= 16) {
        flexiblePoseidon(chunkHashes)
    } else {
        customHasher(chunkHashes)  // Recursive for very large inputs
    }
}
```

#### Testing

```kotlin
class PoseidonTest {
    @Test
    fun `poseidon2 known vector`() {
        // Generate test vectors by running the TypeScript:
        //   import { poseidon2 } from 'poseidon-lite'
        //   console.log(poseidon2([1n, 2n]).toString())
        val result = poseidon2(BigInteger.ONE, BigInteger.TWO)
        assertEquals("7853200120776062878684798364095072458815029376092732009249414926327459813530".toBigInteger(), result)
    }

    @Test
    fun `poseidon5 known vector`() {
        val result = poseidon5(listOf(1, 2, 3, 4, 5).map { it.toBigInteger() })
        // Compare with TypeScript output
        assertEquals(EXPECTED_POSEIDON5_VECTOR, result)
    }

    @Test
    fun `packBytesAndPoseidon matches TypeScript`() {
        // Test with known MRZ bytes
        val mrzBytes = "P<FRADUPONT<<JEAN<<<<<<<<<<<<<<<<<<<<<<<<<<<".map { it.code }
        val result = packBytesAndPoseidon(mrzBytes)
        assertEquals(EXPECTED_MRZ_HASH, result)
    }

    @Test
    fun `poseidon field overflow wraps correctly`() {
        // Input larger than field prime should be reduced mod p
        val large = BN254.PRIME + BigInteger.ONE
        val result = poseidon2(large, BigInteger.ZERO)
        val expected = poseidon2(BigInteger.ONE, BigInteger.ZERO)
        assertEquals(expected, result)
    }
}
```

**Test vector generation strategy**: Write a small TypeScript script that computes all needed test vectors and outputs them as Kotlin constants. Run once, embed in test files.

---

### 2. Byte Packing Utilities

Port of `common/src/utils/bytes.ts`.

```kotlin
object BytePacking {
    const val MAX_BYTES_IN_FIELD = 31  // 31 bytes < 254 bits (BN254 field)

    /**
     * Pack a byte array into field elements (31 bytes each).
     * Each chunk is packed little-endian: byte[0] + byte[1]*256 + byte[2]*65536 + ...
     *
     * Port of packBytesArray from common/src/utils/bytes.ts
     */
    fun packBytesArray(unpacked: List<Int>): List<BigInteger> {
        val result = mutableListOf<BigInteger>()
        for (chunk in unpacked.chunked(MAX_BYTES_IN_FIELD)) {
            var packed = BigInteger.ZERO
            for ((i, byte) in chunk.withIndex()) {
                packed = packed + (byte.toBigInteger() shl (i * 8))
            }
            result.add(packed)
        }
        return result
    }

    /**
     * Split a BigInt into k words of n bits each.
     * Used for formatting RSA keys and signatures for circuit inputs.
     *
     * Port of splitToWords from common/src/utils/bytes.ts
     */
    fun splitToWords(number: BigInteger, wordSize: Int, numWords: Int): List<String> {
        val mask = (BigInteger.ONE shl wordSize) - BigInteger.ONE
        return (0 until numWords).map { i ->
            ((number shr (i * wordSize)) and mask).toString()
        }
    }

    /**
     * Convert hex string to decimal string.
     */
    fun hexToDecimal(hex: String): String {
        return BigInteger(hex, 16).toString()
    }

    /**
     * Convert hex string to signed byte array (values -128 to 127).
     */
    fun hexToSignedBytes(hex: String): List<Int> {
        val cleanHex = hex.removePrefix("0x")
        return cleanHex.chunked(2).map { it.toInt(16).toByte().toInt() }
    }

    /**
     * Convert number to n-bit binary array (LSB first).
     */
    fun num2Bits(numBits: Int, value: BigInteger): List<BigInteger> {
        return (0 until numBits).map { i ->
            (value shr i) and BigInteger.ONE
        }
    }

    /**
     * Convert byte array to decimal string via BigInt.
     */
    fun bytesToBigDecimal(bytes: List<Int>): String {
        var result = BigInteger.ZERO
        for (byte in bytes) {
            result = (result shl 8) + (byte and 0xFF).toBigInteger()
        }
        return result.toString()
    }
}
```

#### Testing

```kotlin
class BytePackingTest {
    @Test
    fun `packBytesArray packs 31 bytes into one field element`() {
        val bytes = (1..31).toList()
        val packed = BytePacking.packBytesArray(bytes)
        assertEquals(1, packed.size)
        // Verify: 1 + 2*256 + 3*65536 + ...
    }

    @Test
    fun `packBytesArray splits at 31-byte boundary`() {
        val bytes = (0..62).toList()  // 63 bytes = 3 chunks (31 + 31 + 1)
        val packed = BytePacking.packBytesArray(bytes)
        assertEquals(3, packed.size)
    }

    @Test
    fun `splitToWords decomposes RSA modulus correctly`() {
        val n = BigInteger("65537")
        val words = BytePacking.splitToWords(n, wordSize = 8, numWords = 4)
        assertEquals(listOf("1", "0", "1", "0"), words)  // 65537 = 0x10001
    }

    @Test
    fun `num2Bits converts correctly`() {
        val bits = BytePacking.num2Bits(8, BigInteger.valueOf(5))
        // 5 = 101 in binary, LSB first = [1, 0, 1, 0, 0, 0, 0, 0]
        assertEquals(BigInteger.ONE, bits[0])
        assertEquals(BigInteger.ZERO, bits[1])
        assertEquals(BigInteger.ONE, bits[2])
    }
}
```

---

### 3. SHA Padding

Port of `common/src/utils/shaPad.ts`. Used to prepare data for circuit SHA verification.

```kotlin
object ShaPad {
    /**
     * SHA-1/SHA-224/SHA-256 padding (512-bit blocks).
     *
     * 1. Append 0x80
     * 2. Pad with zeros until (length_bits + 64) % 512 == 0
     * 3. Append 64-bit big-endian message length
     * 4. Zero-pad to maxShaBytes
     *
     * @param message Input byte array
     * @param maxShaBytes Maximum padded output size
     * @return Pair of (padded bytes, actual message bit length)
     */
    fun shaPad(message: List<Int>, maxShaBytes: Int): Pair<List<Int>, Int> {
        val msgLen = message.size
        val bitLen = msgLen * 8

        val result = message.toMutableList()
        result.add(0x80)

        // Pad to 512-bit boundary (minus 64 bits for length)
        while ((result.size * 8 + 64) % 512 != 0) {
            result.add(0)
        }

        // Append 64-bit big-endian message length
        for (i in 56 downTo 0 step 8) {
            result.add((bitLen.toLong() shr i).toInt() and 0xFF)
        }

        // Zero-pad to maxShaBytes
        while (result.size < maxShaBytes) {
            result.add(0)
        }

        return Pair(result, bitLen)
    }

    /**
     * SHA-384/SHA-512 padding (1024-bit blocks).
     *
     * Same as shaPad but:
     * - Uses 128-bit message length
     * - Pads to 1024-bit block boundary
     */
    fun sha384_512Pad(message: List<Int>, maxShaBytes: Int): Pair<List<Int>, Int> {
        val msgLen = message.size
        val bitLen = msgLen * 8

        val result = message.toMutableList()
        result.add(0x80)

        // Pad to 1024-bit boundary (minus 128 bits for length)
        while ((result.size * 8 + 128) % 1024 != 0) {
            result.add(0)
        }

        // Append 128-bit big-endian message length (upper 64 bits are zero for our sizes)
        for (i in 0 until 8) result.add(0)  // Upper 64 bits
        for (i in 56 downTo 0 step 8) {
            result.add((bitLen.toLong() shr i).toInt() and 0xFF)
        }

        // Zero-pad to maxShaBytes
        while (result.size < maxShaBytes) {
            result.add(0)
        }

        return Pair(result, bitLen)
    }

    /**
     * Select correct padding function based on hash algorithm.
     */
    fun pad(hashAlgorithm: String): (List<Int>, Int) -> Pair<List<Int>, Int> {
        return when (hashAlgorithm.lowercase()) {
            "sha1", "sha224", "sha256" -> ::shaPad
            "sha384", "sha512" -> ::sha384_512Pad
            else -> throw IllegalArgumentException("Unsupported hash algorithm: $hashAlgorithm")
        }
    }
}
```

#### Testing

```kotlin
class ShaPadTest {
    @Test
    fun `sha256 padding appends 0x80 and length`() {
        val msg = listOf(0x61, 0x62, 0x63)  // "abc"
        val (padded, bitLen) = ShaPad.shaPad(msg, 64)
        assertEquals(24, bitLen)
        assertEquals(0x80, padded[3])
        // Last 8 bytes = 64-bit big-endian length = 24 = 0x18
        assertEquals(0x18, padded[63])
    }

    @Test
    fun `sha384 padding uses 1024-bit blocks`() {
        val msg = (0 until 100).map { it and 0xFF }
        val (padded, _) = ShaPad.sha384_512Pad(msg, 256)
        assertEquals(256, padded.size)
        // Verify block alignment
        assertTrue((padded.indexOf(0x80) * 8 + 128) <= padded.size * 8)
    }
}
```

---

### 4. LeanIMT (Lean Incremental Merkle Tree)

Port of `@openpassport/zk-kit-lean-imt`. Used for commitment tree and DSC tree lookups.

```kotlin
/**
 * Lean Incremental Merkle Tree — binary hash tree with ordered insertion.
 *
 * Serialization format: JSON object with "nodes" array of arrays of BigInt strings.
 * Level 0 = leaves, Level n = root.
 *
 * Used for:
 *   - Commitment tree: user registration lookups (depth 33)
 *   - DSC tree: document signing certificate lookups (depth 21)
 */
class LeanIMT(
    private val hashFn: (BigInteger, BigInteger) -> BigInteger,
) {
    private val nodes: MutableList<MutableList<BigInteger>> = mutableListOf()

    val root: BigInteger
        get() = if (nodes.isEmpty()) BigInteger.ZERO
                else nodes.last().firstOrNull() ?: BigInteger.ZERO

    val size: Int
        get() = if (nodes.isEmpty()) 0 else nodes[0].size

    /**
     * Find the index of a leaf in the tree.
     * @return Index (0-based) or -1 if not found
     */
    fun indexOf(leaf: BigInteger): Int {
        if (nodes.isEmpty()) return -1
        return nodes[0].indexOf(leaf)
    }

    /**
     * Generate an inclusion proof for a leaf at the given index.
     * @return MerkleProof with siblings and path indices
     */
    fun generateProof(index: Int): LeanIMTProof {
        require(index in 0 until size) { "Index $index out of range [0, $size)" }

        val siblings = mutableListOf<BigInteger>()
        val pathIndices = mutableListOf<Int>()
        var currentIndex = index

        for (level in 0 until nodes.size - 1) {
            val siblingIndex = if (currentIndex % 2 == 0) currentIndex + 1 else currentIndex - 1
            pathIndices.add(currentIndex % 2)

            if (siblingIndex < nodes[level].size) {
                siblings.add(nodes[level][siblingIndex])
            } else {
                siblings.add(BigInteger.ZERO)  // Padding for incomplete level
            }
            currentIndex /= 2
        }

        return LeanIMTProof(
            root = root,
            leaf = nodes[0][index],
            siblings = siblings,
            pathIndices = pathIndices,
        )
    }

    companion object {
        /**
         * Import a tree from serialized JSON string.
         * Format: {"nodes": [["leaf0", "leaf1", ...], ["node0", ...], ..., ["root"]]}
         */
        fun import(
            hashFn: (BigInteger, BigInteger) -> BigInteger,
            serialized: String,
        ): LeanIMT {
            val tree = LeanIMT(hashFn)
            val json = Json.parseToJsonElement(serialized).jsonObject
            val nodesArray = json["nodes"]?.jsonArray
                ?: throw IllegalArgumentException("Missing 'nodes' in serialized tree")

            for (level in nodesArray) {
                val levelNodes = level.jsonArray.map { it.jsonPrimitive.content.toBigInteger() }
                tree.nodes.add(levelNodes.toMutableList())
            }
            return tree
        }
    }
}

data class LeanIMTProof(
    val root: BigInteger,
    val leaf: BigInteger,
    val siblings: List<BigInteger>,
    val pathIndices: List<Int>,
)
```

#### `generateMerkleProof` wrapper (matches TypeScript API)

```kotlin
/**
 * Generate Merkle proof padded to a fixed depth.
 * Port of generateMerkleProof from common/src/utils/trees.ts
 */
fun generateMerkleProof(
    tree: LeanIMT,
    index: Int,
    maxLeafDepth: Int,
): PaddedMerkleProof {
    val proof = tree.generateProof(index)

    // Pad siblings and path to maxLeafDepth
    val paddedSiblings = proof.siblings.toMutableList()
    val paddedPath = proof.pathIndices.toMutableList()
    while (paddedSiblings.size < maxLeafDepth) {
        paddedSiblings.add(BigInteger.ZERO)
        paddedPath.add(0)
    }

    return PaddedMerkleProof(
        root = proof.root,
        siblings = paddedSiblings,
        path = paddedPath,
        leafDepth = proof.siblings.size,
    )
}

data class PaddedMerkleProof(
    val root: BigInteger,
    val siblings: List<BigInteger>,
    val path: List<Int>,
    val leafDepth: Int,
)
```

#### Testing

```kotlin
class LeanIMTTest {
    private val hashFn = { a: BigInteger, b: BigInteger -> poseidon2(a, b) }

    @Test
    fun `import and indexOf finds existing leaf`() {
        // Serialize a small tree in TypeScript, import here
        val serialized = """{"nodes":[["1","2","3","4"],["${poseidon2(1.bi, 2.bi)}","${poseidon2(3.bi, 4.bi)}"],["${poseidon2(poseidon2(1.bi, 2.bi), poseidon2(3.bi, 4.bi))}"]]}"""
        val tree = LeanIMT.import(hashFn, serialized)

        assertEquals(0, tree.indexOf(BigInteger.ONE))
        assertEquals(2, tree.indexOf(3.toBigInteger()))
        assertEquals(-1, tree.indexOf(99.toBigInteger()))
    }

    @Test
    fun `generateProof creates valid inclusion proof`() {
        // Import tree, generate proof, verify manually
        val tree = LeanIMT.import(hashFn, KNOWN_TREE_JSON)
        val proof = tree.generateProof(0)

        // Verify: hash up the path and check root matches
        var current = proof.leaf
        for (i in proof.siblings.indices) {
            current = if (proof.pathIndices[i] == 0)
                hashFn(current, proof.siblings[i])
            else
                hashFn(proof.siblings[i], current)
        }
        assertEquals(tree.root, current)
    }

    @Test
    fun `import real commitment tree from staging API`() {
        // Use a snapshot of a real serialized tree for integration testing
        val tree = LeanIMT.import(hashFn, STAGING_COMMITMENT_TREE_SNAPSHOT)
        assertTrue(tree.size > 0)
        assertNotEquals(BigInteger.ZERO, tree.root)
    }
}
```

---

### 5. Sparse Merkle Tree (SMT)

Port of `@openpassport/zk-kit-smt`. Used for OFAC sanctions list checking.

```kotlin
/**
 * Sparse Merkle Tree — key-value tree supporting membership and non-membership proofs.
 *
 * Hash function takes 2 children (internal nodes) or 3 elements (leaf: key, value, 1).
 * Tree depth is fixed (OFAC_TREE_LEVELS = 64).
 *
 * Used for OFAC sanctions checking:
 *   - nameAndDob tree
 *   - nameAndYob tree
 *   - passportNoAndNationality tree (passport only)
 */
class SparseMerkleTree(
    private val hashFn: (List<BigInteger>) -> BigInteger,
    private val bigNumbers: Boolean = true,
) {
    private val nodes: MutableMap<String, BigInteger> = mutableMapOf()
    private val entries: MutableMap<String, Pair<BigInteger, BigInteger>> = mutableMapOf()
    var root: BigInteger = BigInteger.ZERO
        private set

    fun add(key: BigInteger, value: BigInteger) { /* ... */ }

    /**
     * Create a membership or non-membership proof.
     *
     * @return SmtProof with entry, closest leaf, siblings, root, and membership flag
     */
    fun createProof(key: BigInteger): SmtProof { /* ... */ }

    companion object {
        fun import(hashFn: (List<BigInteger>) -> BigInteger, serialized: String): SparseMerkleTree {
            // Deserialize from JSON
        }
    }
}

data class SmtProof(
    val entry: Pair<BigInteger, BigInteger>,         // (key, value) being proven
    val matchingEntry: Pair<BigInteger, BigInteger>?, // Closest existing entry (non-membership)
    val siblings: List<BigInteger>,
    val root: BigInteger,
    val membership: Boolean,                          // true = member, false = non-member
)
```

#### `generateSMTProof` wrapper

```kotlin
/**
 * Generate SMT proof padded to OFAC_TREE_LEVELS.
 * Port of generateSMTProof from common/src/utils/trees.ts
 */
fun generateSMTProof(
    smt: SparseMerkleTree,
    leaf: BigInteger,
): PaddedSmtProof {
    val proof = smt.createProof(leaf)

    // Pad siblings to OFAC_TREE_LEVELS, reversed
    val paddedSiblings = proof.siblings.reversed().toMutableList()
    while (paddedSiblings.size < OFAC_TREE_LEVELS) {
        paddedSiblings.add(BigInteger.ZERO)
    }

    return PaddedSmtProof(
        root = proof.root,
        closestLeaf = if (proof.matchingEntry != null)
            listOf(proof.matchingEntry.first, proof.matchingEntry.second)
        else
            listOf(BigInteger.ZERO, BigInteger.ZERO),
        siblings = paddedSiblings,
        leafDepth = proof.siblings.size,
    )
}
```

---

### 6. OFAC Leaf Generation

Port of leaf generation functions from `common/src/utils/trees.ts`.

```kotlin
object LeafGenerators {
    /**
     * Generate name + DOB leaf for OFAC SMT.
     * name: 39 MRZ characters (passport) or 30 (ID card)
     * dob: 6 MRZ characters (YYMMDD)
     *
     * Hash: poseidon3(nameHash, poseidon6(dob[0..5]))
     * Where nameHash = poseidon3(poseidon13(name[0..12]), poseidon13(name[13..25]), poseidon13(name[26..38]))
     */
    fun getNameDobLeaf(name: List<BigInteger>, dob: List<BigInteger>): BigInteger {
        val nameHash = getNameLeaf(name)
        val dobHash = poseidon(dob.take(6))  // poseidon6
        return poseidon3(nameHash, dobHash, BigInteger.ZERO)  // Or appropriate combination
    }

    /**
     * Generate name leaf hash.
     * Passport (39 chars): 3 chunks of 13 → poseidon13 each → poseidon3 combine
     * ID card (30 chars): 3 chunks of 10 → poseidon10 each → poseidon3 combine
     */
    fun getNameLeaf(name: List<BigInteger>): BigInteger {
        val chunkSize = if (name.size <= 30) 10 else 13
        val chunks = name.chunked(chunkSize)
        val chunkHashes = chunks.map { poseidon(it) }
        return poseidon(chunkHashes)
    }

    fun getNameYobLeaf(name: List<BigInteger>, yob: List<BigInteger>): BigInteger {
        val nameHash = getNameLeaf(name)
        val yobHash = poseidon(yob.take(2))  // poseidon2
        return poseidon3(nameHash, yobHash, BigInteger.ZERO)
    }

    fun getPassportNumberAndNationalityLeaf(
        passportNumber: List<BigInteger>,
        nationality: List<BigInteger>,
    ): BigInteger {
        // poseidon12: 9 passport digits + 3 nationality chars
        return poseidon(passportNumber.take(9) + nationality.take(3))
    }

    fun getCountryLeaf(countryFrom: List<BigInteger>, countryTo: List<BigInteger>): BigInteger {
        return poseidon(countryFrom.take(3) + countryTo.take(3))  // poseidon6
    }
}
```

---

### 7. MRZ Formatter

Port of `formatMrz` from `common/src/utils/passports/format.ts`.

```kotlin
object MrzFormatter {
    /**
     * Format raw MRZ string into DER/TLV-encoded byte array for DG1 hashing.
     *
     * Prepends ASN.1 tags:
     *   0x61 (DG1 tag) | length | 0x5F 0x1F (MRZ_INFO tag) | MRZ length | MRZ bytes
     *
     * @param mrz Raw MRZ string (88 chars for passport, 90 for ID card)
     * @return Byte array with TLV encoding
     */
    fun format(mrz: String): List<Int> {
        val mrzBytes = mrz.map { it.code }.toMutableList()

        when (mrz.length) {
            88 -> {
                mrzBytes.add(0, 88)      // MRZ data length
                mrzBytes.add(0, 0x1F)    // MRZ_INFO tag byte 2
                mrzBytes.add(0, 0x5F)    // MRZ_INFO tag byte 1
                mrzBytes.add(0, 91)      // Total content length
                mrzBytes.add(0, 0x61)    // DG1 tag
            }
            90 -> {
                mrzBytes.add(0, 90)
                mrzBytes.add(0, 0x1F)
                mrzBytes.add(0, 0x5F)
                mrzBytes.add(0, 93)
                mrzBytes.add(0, 0x61)
            }
            else -> throw IllegalArgumentException("Unsupported MRZ length: ${mrz.length}")
        }

        return mrzBytes
    }
}
```

#### Testing

```kotlin
class MrzFormatterTest {
    @Test
    fun `format passport MRZ adds correct TLV tags`() {
        val mrz = "P<FRADUPONT<<JEAN<PIERRE<<<<<<<<<<<<<<<<<<<<<12345678<6FRA8001014M3001011<<<<<<<<<<<<<<02"
        assertEquals(88, mrz.length)
        val formatted = MrzFormatter.format(mrz)
        assertEquals(93, formatted.size)  // 5 header bytes + 88 MRZ bytes
        assertEquals(0x61, formatted[0])  // DG1 tag
        assertEquals(0x5F, formatted[2])  // MRZ_INFO tag
        assertEquals(0x1F, formatted[3])
    }
}
```

---

### 8. Commitment Generator

Port of `generateCommitment` from `common/src/utils/passports/passport.ts`.

```kotlin
object CommitmentGenerator {
    /**
     * Generate commitment hash for passport/ID document.
     *
     * commitment = poseidon5(secret, attestation_id, dg1_packed_hash, eContent_packed_hash, dsc_hash)
     *
     * @param secret User's secret (decimal string)
     * @param attestationId "1" (passport), "2" (ID card), "3" (aadhaar), "4" (kyc)
     * @param passportData Parsed passport with MRZ, eContent, parsed certificates
     * @return Commitment as BigInteger
     */
    fun generate(
        secret: String,
        attestationId: String,
        mrz: String,
        eContent: ByteArray,
        eContentHashFunction: String,
        dscParsed: CertificateData,
        cscaParsed: CertificateData,
    ): BigInteger {
        // 1. Hash formatted MRZ
        val mrzBytes = MrzFormatter.format(mrz)
        val dg1PackedHash = packBytesAndPoseidon(mrzBytes)

        // 2. Hash eContent with the document's hash algorithm, then pack
        val eContentShaBytes = sha(eContentHashFunction, eContent)
        val eContentPackedHash = packBytesAndPoseidon(eContentShaBytes.map { it.toInt() and 0xFF })

        // 3. Compute DSC tree leaf
        val dscHash = DscLeaf.getLeafDscTree(dscParsed, cscaParsed)

        // 4. Poseidon-5 commitment
        return poseidon5(listOf(
            secret.toBigInteger(),
            attestationId.toBigInteger(),
            dg1PackedHash,
            eContentPackedHash,
            dscHash,
        ))
    }
}
```

---

### 9. DSC Tree Leaf

Port of `getLeafDscTree` from `common/src/utils/trees.ts`.

```kotlin
object DscLeaf {
    /**
     * Compute DSC tree leaf from parsed DSC and CSCA certificates.
     *
     * leaf = poseidon2(dscLeaf, cscaLeaf)
     * where:
     *   dscLeaf = poseidon2(packBytesAndPoseidon(shaPad(tbsBytes, maxDscBytes)), tbsLength)
     *   cscaLeaf = poseidon2(packBytesAndPoseidon(zeroPad(tbsBytes, maxCscaBytes)), tbsLength)
     */
    fun getLeafDscTree(dscParsed: CertificateData, cscaParsed: CertificateData): BigInteger {
        val dscLeaf = getLeaf(dscParsed, CertType.DSC)
        val cscaLeaf = getLeaf(cscaParsed, CertType.CSCA)
        return poseidon2(dscLeaf, cscaLeaf)
    }

    private fun getLeaf(cert: CertificateData, type: CertType): BigInteger {
        val tbsBytes = cert.tbsBytes
        val maxBytes = if (type == CertType.DSC) MAX_DSC_BYTES else MAX_CSCA_BYTES

        val padded = if (type == CertType.DSC) {
            // DSC: SHA-pad the TBS bytes
            val (paddedBytes, _) = ShaPad.pad(cert.hashAlgorithm)(tbsBytes, maxBytes)
            paddedBytes
        } else {
            // CSCA: Zero-pad the TBS bytes
            val result = tbsBytes.toMutableList()
            while (result.size < maxBytes) result.add(0)
            result
        }

        val hash = packBytesAndPoseidon(padded)
        return poseidon2(hash, tbsBytes.size.toBigInteger())
    }

    private enum class CertType { DSC, CSCA }
}
```

---

### 10. ASN.1 / X.509 Certificate Parser

Port of `parseCertificateSimple` from `common/src/utils/certificate_parsing/`.

**This is the most complex non-crypto component.** It needs a minimal ASN.1 DER parser.

```kotlin
/**
 * Minimal ASN.1 DER parser for X.509 certificate extraction.
 *
 * Only parses what we need:
 *   - TBS (To-Be-Signed) bytes
 *   - Public key (RSA modulus/exponent, ECDSA x/y/curve)
 *   - Signature algorithm OID
 *   - Subject Key Identifier (SKI) and Authority Key Identifier (AKI)
 *   - Validity dates
 *
 * NOT a general-purpose ASN.1 library — just enough for passport certificates.
 */
object Asn1Parser {
    /**
     * Parse a DER-encoded byte array into an ASN.1 element tree.
     */
    fun parse(der: ByteArray): Asn1Element { /* ... */ }

    /**
     * Extract TBS (To-Be-Signed) bytes from a certificate DER.
     * The TBS is the first SEQUENCE inside the outer SEQUENCE.
     */
    fun extractTbs(certDer: ByteArray): ByteArray { /* ... */ }
}

sealed class Asn1Element {
    data class Sequence(val elements: List<Asn1Element>) : Asn1Element()
    data class Integer(val value: BigInteger) : Asn1Element()
    data class BitString(val bytes: ByteArray, val unusedBits: Int) : Asn1Element()
    data class OctetString(val bytes: ByteArray) : Asn1Element()
    data class ObjectIdentifier(val oid: String) : Asn1Element()
    data class Utf8String(val value: String) : Asn1Element()
    data class PrintableString(val value: String) : Asn1Element()
    data class UtcTime(val value: String) : Asn1Element()
    data class GeneralizedTime(val value: String) : Asn1Element()
    data class ContextSpecific(val tag: Int, val bytes: ByteArray) : Asn1Element()
    data class Unknown(val tag: Int, val bytes: ByteArray) : Asn1Element()
}
```

```kotlin
/**
 * Parse X.509 certificate PEM into structured CertificateData.
 *
 * Port of parseCertificateSimple from common/src/utils/certificate_parsing/
 */
object X509CertificateParser {
    fun parse(pem: String): CertificateData {
        val der = pemToDer(pem)
        val root = Asn1Parser.parse(der) as Asn1Element.Sequence

        val tbs = root.elements[0] as Asn1Element.Sequence
        val tbsBytes = Asn1Parser.extractTbs(der)

        val signatureAlgorithmOid = extractSignatureAlgorithmOid(tbs)
        val publicKeyInfo = extractPublicKeyInfo(tbs)
        val validity = extractValidity(tbs)
        val extensions = extractExtensions(tbs)
        val ski = extractSki(extensions)
        val aki = extractAki(extensions)

        return CertificateData(
            tbsBytes = tbsBytes.map { it.toInt() and 0xFF },
            tbsBytesLength = tbsBytes.size.toString(),
            signatureAlgorithm = OidResolver.resolveSignatureAlgorithm(signatureAlgorithmOid),
            hashAlgorithm = OidResolver.resolveHashAlgorithm(signatureAlgorithmOid),
            publicKeyDetails = publicKeyInfo,
            subjectKeyIdentifier = ski ?: "",
            authorityKeyIdentifier = aki ?: "",
            validity = validity,
            rawPem = pem,
        )
    }

    private fun pemToDer(pem: String): ByteArray {
        val base64 = pem.lines()
            .filter { !it.startsWith("-----") }
            .joinToString("")
        return base64Decode(base64)
    }
}
```

#### OID Resolution

```kotlin
object OidResolver {
    private val signatureAlgorithms = mapOf(
        "1.2.840.113549.1.1.5" to "rsa",        // sha1WithRSAEncryption
        "1.2.840.113549.1.1.11" to "rsa",       // sha256WithRSAEncryption
        "1.2.840.113549.1.1.12" to "rsa",       // sha384WithRSAEncryption
        "1.2.840.113549.1.1.13" to "rsa",       // sha512WithRSAEncryption
        "1.2.840.113549.1.1.10" to "rsapss",    // RSASSA-PSS
        "1.2.840.10045.4.1" to "ecdsa",         // ecdsaWithSHA1
        "1.2.840.10045.4.3.2" to "ecdsa",       // ecdsaWithSHA256
        "1.2.840.10045.4.3.3" to "ecdsa",       // ecdsaWithSHA384
        "1.2.840.10045.4.3.4" to "ecdsa",       // ecdsaWithSHA512
    )

    private val curves = mapOf(
        "1.2.840.10045.3.1.7" to "secp256r1",
        "1.3.132.0.34" to "secp384r1",
        "1.3.132.0.35" to "secp521r1",
        "1.3.36.3.3.2.8.1.1.7" to "brainpoolP256r1",
        "1.3.36.3.3.2.8.1.1.9" to "brainpoolP320r1",
        "1.3.36.3.3.2.8.1.1.11" to "brainpoolP384r1",
        "1.3.36.3.3.2.8.1.1.13" to "brainpoolP512r1",
    )

    fun resolveSignatureAlgorithm(oid: String): String = signatureAlgorithms[oid] ?: "unknown"
    fun resolveCurve(oid: String): String = curves[oid] ?: "unknown"
    fun resolveHashAlgorithm(sigOid: String): String { /* map OID → sha256, etc */ }
}
```

#### Testing

```kotlin
class X509CertificateParserTest {
    @Test
    fun `parse RSA DSC certificate`() {
        val cert = X509CertificateParser.parse(KNOWN_RSA_DSC_PEM)
        assertEquals("rsa", cert.signatureAlgorithm)
        assertEquals("sha256", cert.hashAlgorithm)
        assertNotNull(cert.publicKeyDetails as? PublicKeyDetailsRSA)
        assertTrue(cert.tbsBytes.isNotEmpty())
    }

    @Test
    fun `parse ECDSA DSC certificate`() {
        val cert = X509CertificateParser.parse(KNOWN_ECDSA_DSC_PEM)
        assertEquals("ecdsa", cert.signatureAlgorithm)
        val ecDetails = cert.publicKeyDetails as PublicKeyDetailsECDSA
        assertEquals("secp256r1", ecDetails.curve)
        assertTrue(ecDetails.x.isNotEmpty())
        assertTrue(ecDetails.y.isNotEmpty())
    }

    @Test
    fun `extract SKI and AKI`() {
        val cert = X509CertificateParser.parse(KNOWN_DSC_PEM)
        assertTrue(cert.subjectKeyIdentifier.isNotEmpty())
        assertTrue(cert.authorityKeyIdentifier.isNotEmpty())
    }

    @Test
    fun `TBS bytes match TypeScript output`() {
        // Compare tbsBytes from Kotlin vs TypeScript for the same certificate
        val cert = X509CertificateParser.parse(TEST_CERT_PEM)
        assertEquals(EXPECTED_TBS_BYTES, cert.tbsBytes)
    }
}
```

---

### 11. Passport Data Parser

Port of `initPassportDataParsing` and `parsePassportData`.

```kotlin
object PassportDataParser {
    /**
     * Parse raw NFC scan output into structured PassportData with metadata.
     *
     * Extracts:
     *   - DG1 hash function and location in eContent
     *   - eContent hash algorithm
     *   - Signed attributes hash algorithm
     *   - Signature algorithm (RSA, ECDSA, RSA-PSS) with key details
     *   - CSCA certificate (if found via SKI lookup)
     *   - Country code from MRZ
     *
     * Port of initPassportDataParsing + parsePassportData
     */
    fun parse(
        mrz: String,
        eContent: ByteArray,
        signedAttr: ByteArray,
        dscPem: String,
        skiPem: Map<String, String>? = null,
    ): ParsedPassportData {
        val dscParsed = X509CertificateParser.parse(dscPem)

        // Extract country code from MRZ (positions 2-4 for passport)
        val countryCode = mrz.substring(2, 5).replace("<", "")

        // Find DG1 hash in eContent (try each hash algorithm)
        val (dg1HashFunction, dg1HashOffset, dg1HashSize) = findDg1HashInEContent(mrz, eContent)

        // Determine eContent hash algorithm
        val eContentHashFunction = findEContentHashFunction(eContent, signedAttr)

        // Determine signature algorithm (may require brute-force detection)
        val signedAttrHashFunction = findSignedAttrHashFunction(signedAttr)

        // Parse DSC certificate for algorithm details
        val signatureAlgorithm = dscParsed.signatureAlgorithm
        val curveOrExponent = when (val pk = dscParsed.publicKeyDetails) {
            is PublicKeyDetailsRSA -> pk.exponent
            is PublicKeyDetailsECDSA -> pk.curve
            is PublicKeyDetailsRSAPSS -> pk.exponent
        }

        // Look up CSCA by SKI
        val aki = dscParsed.authorityKeyIdentifier
        val cscaPem = skiPem?.get(aki)
        val cscaParsed = cscaPem?.let { X509CertificateParser.parse(it) }

        return ParsedPassportData(
            passportMetadata = PassportMetadata(
                countryCode = countryCode,
                cscaFound = cscaParsed != null,
                dg1HashFunction = dg1HashFunction,
                eContentHashFunction = eContentHashFunction,
                signedAttrHashFunction = signedAttrHashFunction,
                signatureAlgorithm = signatureAlgorithm,
                curveOrExponent = curveOrExponent,
                // ... other fields
            ),
            dscParsed = dscParsed,
            cscaParsed = cscaParsed,
        )
    }
}
```

---

### 12. Selector Generator

Port of `getSelectorDg1` from `common/src/utils/circuits/registerInputs.ts`. (Moved here from proving client spec since it's pure data mapping.)

```kotlin
object SelectorGenerator {
    private val passportPositions = mapOf(
        "issuing_state" to (2..4),
        "name" to (5..43),
        "passport_number" to (44..52),
        "nationality" to (54..56),
        "date_of_birth" to (57..62),
        "gender" to (64..64),
        "expiry_date" to (65..70),
    )

    private val idCardPositions = mapOf(
        "issuing_state" to (2..4),
        "passport_number" to (5..13),
        "date_of_birth" to (30..35),
        "gender" to (37..37),
        "expiry_date" to (38..43),
        "nationality" to (45..47),
        "name" to (60..89),
    )

    /**
     * Generate DG1 selector bit array marking which MRZ bytes to reveal.
     *
     * @param category passport (88 bits) or id_card (90 bits)
     * @param revealedAttributes List of attribute names to reveal
     * @return List of "0" and "1" strings
     */
    fun getDg1Selector(category: String, revealedAttributes: List<String>): List<String> {
        val size = if (category == "id_card") 90 else 88
        val positions = if (category == "id_card") idCardPositions else passportPositions
        val selector = MutableList(size) { "0" }

        for (attr in revealedAttributes) {
            if (attr in listOf("ofac", "excludedCountries", "minimumAge")) continue
            positions[attr]?.let { range ->
                for (i in range) selector[i] = "1"
            }
        }
        return selector
    }
}
```

---

## Constants

```kotlin
object Constants {
    // Tree depths
    const val DSC_TREE_DEPTH = 21
    const val CSCA_TREE_DEPTH = 12
    const val COMMITMENT_TREE_DEPTH = 33
    const val OFAC_TREE_LEVELS = 64

    // Max padded sizes (bytes)
    const val MAX_DSC_BYTES = 4000
    const val MAX_CSCA_BYTES = 4000
    const val MAX_PADDED_ECONTENT_LEN_SHA256 = 512
    const val MAX_PADDED_SIGNED_ATTR_LEN_SHA256 = 256

    // RSA word sizes for circuit inputs
    const val N_DSC = 32; const val K_DSC = 64           // 2048-bit
    const val N_DSC_3072 = 32; const val K_DSC_3072 = 96 // 3072-bit
    const val N_DSC_4096 = 32; const val K_DSC_4096 = 128 // 4096-bit
    const val N_DSC_ECDSA = 64; const val K_DSC_ECDSA = 4 // P-256

    // Attestation IDs
    const val PASSPORT_ATTESTATION_ID = "1"
    const val ID_CARD_ATTESTATION_ID = "2"
    const val AADHAAR_ATTESTATION_ID = "3"
    const val KYC_ATTESTATION_ID = "4"
}
```

---

## Chunking Guide

### Chunk 6A: Poseidon Hash + Byte Packing (start here, hardest)

**Goal**: Working Poseidon hash that produces identical outputs to `poseidon-lite`.

**Steps**:
1. Implement `BigIntField.kt` — modular arithmetic over BN254 prime
2. Extract round constants and mixing matrices from `poseidon-lite` npm package → `PoseidonConstants.kt`
3. Implement `Poseidon.kt` — core algorithm (pow5, addRoundConstants, mix)
4. Implement convenience functions (poseidon2 through poseidon16)
5. Implement `BytePacking.kt` — packBytesArray, splitToWords, etc.
6. Implement `FlexiblePoseidon.kt` — flexiblePoseidon, customHasher, packBytesAndPoseidon
7. **Test**: Compare Poseidon outputs against TypeScript for 50+ test vectors covering all variants (poseidon1 through poseidon16)
8. **Test**: packBytesAndPoseidon with known byte arrays matches TypeScript
9. Validate: `./gradlew :shared:jvmTest`

**Test vector generation**: Create a TypeScript script that outputs test vectors:
```typescript
// scripts/generate-poseidon-vectors.ts
import { poseidon1, poseidon2, ..., poseidon16 } from 'poseidon-lite'
const vectors = [
  { fn: 'poseidon2', inputs: [1n, 2n], output: poseidon2([1n, 2n]).toString() },
  { fn: 'poseidon2', inputs: [0n, 0n], output: poseidon2([0n, 0n]).toString() },
  // ... edge cases: max field element, zero, large values
]
console.log(JSON.stringify(vectors, null, 2))
```

**This is the highest-risk chunk** — if Poseidon outputs don't match, nothing downstream works.

### Chunk 6B: SHA Padding + MRZ Formatter

**Goal**: Circuit-compatible SHA padding and MRZ formatting.

**Steps**:
1. Implement `ShaPad.kt` — shaPad, sha384_512Pad
2. Implement `MrzFormatter.kt` — formatMrz with TLV encoding
3. Implement `Sha.kt` — SHA-1/256/384/512 (pure Kotlin or use `kotlinx-io` / third-party)
4. **Test**: SHA padding matches TypeScript for known inputs
5. **Test**: formatMrz produces correct byte arrays for 88-char and 90-char MRZ strings
6. Validate: `./gradlew :shared:jvmTest`

### Chunk 6C: LeanIMT + Sparse Merkle Tree

**Goal**: Tree data structures with import, lookup, and proof generation.

**Steps**:
1. Implement `LeanIMT.kt` — import from JSON, indexOf, generateProof
2. Implement `MerkleProof.kt` — padded proof generation wrapper
3. Implement `SparseMerkleTree.kt` — import, add, createProof
4. Implement `LeafGenerators.kt` — all OFAC leaf functions
5. Implement `TreeConstants.kt` — depth constants
6. **Test**: Import a snapshot of a real commitment tree, verify root hash
7. **Test**: indexOf finds known leaves, returns -1 for unknown
8. **Test**: generateProof creates verifiable proofs (hash up the path = root)
9. **Test**: SMT membership and non-membership proofs
10. **Test**: Leaf generators produce same values as TypeScript
11. Validate: `./gradlew :shared:jvmTest`

**Test fixture strategy**: Snapshot real trees from the staging API. Store as resource files in `commonTest/resources/`.

### Chunk 6D: ASN.1 Parser + Certificate Parser

**Goal**: Parse X.509 certificates from PEM into structured data.

**Steps**:
1. Implement `Asn1Parser.kt` — minimal DER parser (SEQUENCE, INTEGER, BIT STRING, OID, OCTET STRING, context-specific tags)
2. Implement `OidResolver.kt` — OID → algorithm/curve name mapping
3. Implement `X509CertificateParser.kt` — parseCertificateSimple
4. Implement `CscaLookup.kt` — SKI → CSCA PEM mapping
5. Implement `SignatureExtractor.kt` — extract r,s from DER ECDSA signatures
6. **Test**: Parse known RSA DSC certificate → verify modulus, exponent, TBS bytes
7. **Test**: Parse known ECDSA DSC certificate → verify x, y, curve
8. **Test**: Parse known RSA-PSS certificate → verify hash, mgf, salt length
9. **Test**: SKI/AKI extraction matches TypeScript
10. **Test**: TBS bytes match TypeScript output byte-for-byte
11. Validate: `./gradlew :shared:jvmTest`

**Test certificates**: Use mock certificates from `common/src/constants/mockCertificates.ts` and real DSC certificates from the staging API.

### Chunk 6E: Passport Data Parser + Commitment/Nullifier

**Goal**: End-to-end passport parsing and commitment generation.

**Steps**:
1. Implement `PassportDataParser.kt` — initPassportDataParsing equivalent
2. Implement `CommitmentGenerator.kt` — generateCommitment
3. Implement `NullifierGenerator.kt` — generateNullifier
4. Implement `DscLeaf.kt` — getLeafDscTree
5. Implement `SelectorGenerator.kt` — getDg1Selector
6. **Test**: Parse mock passport data → verify all metadata fields match TypeScript
7. **Test**: Generate commitment for known passport + secret → matches TypeScript
8. **Test**: Generate nullifier for known passport → matches TypeScript
9. **Test**: DSC tree leaf hash matches TypeScript
10. **Test**: Selector bits for known disclosure flags match TypeScript
11. **Integration test**: Parse mock passport → generate commitment → look up in imported tree
12. Validate: `./gradlew :shared:jvmTest`

**This chunk proves the entire pipeline works**: raw data → parsed metadata → hashed commitment → tree lookup.

---

## Testing Strategy

### Test Vector Generation

Create a one-time TypeScript script (`scripts/generate-kmp-test-vectors.ts`) that outputs all needed test vectors:

```typescript
// Run: npx ts-node scripts/generate-kmp-test-vectors.ts > test-vectors.json

import { poseidon2, poseidon5 } from 'poseidon-lite'
import { LeanIMT } from '@openpassport/zk-kit-lean-imt'
import { genAndInitMockPassportData } from '../common/src/utils/passports/mock'
import { generateCommitment } from '../common/src/utils/passports/passport'
import { packBytesAndPoseidon } from '../common/src/utils/hash'
import { formatMrz } from '../common/src/utils/passports/format'
import { parseCertificateSimple } from '../common/src/utils/certificate_parsing'

const vectors = {
  poseidon: [
    { inputs: ['1', '2'], output: poseidon2([1n, 2n]).toString() },
    // ... 50+ vectors for all poseidon1-16
  ],
  packBytesAndPoseidon: [
    { bytes: [1, 2, 3, 4, 5], output: packBytesAndPoseidon([1, 2, 3, 4, 5]).toString() },
    // ... various lengths
  ],
  formatMrz: [
    { mrz: "P<FRA...", output: formatMrz("P<FRA...") },
  ],
  commitment: [
    {
      secret: "12345",
      attestationId: "1",
      mrz: "P<FRA...",
      output: generateCommitment("12345", "1", mockPassport).toString()
    },
  ],
  certificates: [
    { pem: "-----BEGIN CERTIFICATE-----...", tbsBytes: [...], ski: "...", aki: "..." },
  ],
}

console.log(JSON.stringify(vectors, null, 2))
```

Store output in `packages/kmp-sdk/shared/src/commonTest/resources/test-vectors.json`. Load in tests.

### Test Categories

| Category | Count | What's Verified |
|----------|-------|-----------------|
| Poseidon hash | ~60 tests | All 16 variants, edge cases (zero, max field, overflow) |
| Byte packing | ~15 tests | packBytes, splitToWords, roundtrips |
| SHA padding | ~10 tests | SHA-256 and SHA-384 padding correctness |
| MRZ formatting | ~5 tests | 88-char passport, 90-char ID card, error cases |
| LeanIMT | ~15 tests | Import, indexOf, generateProof, root verification |
| SMT | ~10 tests | Import, membership proof, non-membership proof |
| Leaf generators | ~10 tests | Name, DOB, country, passport number leaves |
| ASN.1 parser | ~10 tests | Known DER structures, edge cases |
| Certificate parser | ~15 tests | RSA, ECDSA, RSA-PSS, SKI/AKI extraction, TBS bytes |
| Passport parser | ~10 tests | Metadata extraction for various algo combos |
| Commitment | ~10 tests | Known passport + secret → expected commitment |
| Nullifier | ~5 tests | Known passport → expected nullifier |
| DSC leaf | ~5 tests | Known certificates → expected leaf hash |
| Selector | ~10 tests | All attribute combos for passport and ID card |
| **Total** | **~190 tests** | |

### Cross-Platform Verification

Run the same `commonTest` suite on all targets:
```bash
./gradlew :shared:jvmTest          # Fast iteration
./gradlew :shared:iosSimulatorArm64Test  # Verify iOS
# Future: ./gradlew :shared:jsTest    # Verify browser extension compatibility
```

---

## Dependencies

### Build Dependencies

```kotlin
commonMain.dependencies {
    implementation(libs.kotlinx.serialization.json)  // Already present
    // No other dependencies — everything is pure Kotlin
}

commonTest.dependencies {
    implementation(libs.kotlin.test)
    implementation(libs.kotlinx.coroutines.test)  // Already present
}
```

**No additional library dependencies.** This is intentionally zero-dependency (beyond kotlinx-serialization for JSON parsing of tree data). SHA hashing can be implemented in pure Kotlin (~200 lines for SHA-256) to avoid any platform dependency.

If SHA performance matters, add `expect`/`actual` later — but for correctness-first, pure Kotlin is simpler.

### Spec Dependencies

- **None** — this is the leaf dependency
- **SPEC-PROVING-CLIENT.md** depends on this (chunks 4D, 4E, 4F use Poseidon, trees, commitment)
- **SPEC-MINIPAY-SAMPLE.md** depends on this indirectly (via proving client)
- **Future browser extension** depends on this directly

## Key TypeScript Reference Files

| TypeScript File | What to Port | Kotlin Target |
|---|---|---|
| `common/src/utils/hash.ts` | Poseidon wrappers, SHA, packBytesAndPoseidon | `hash/` package |
| `common/src/utils/bytes.ts` | packBytes, splitToWords, hexToDecimal | `math/BytePacking.kt` |
| `common/src/utils/shaPad.ts` | SHA-256 and SHA-384 padding | `hash/ShaPad.kt` |
| `common/src/utils/trees.ts` | LeanIMT operations, SMT operations, leaf generators, proof generation | `trees/` package |
| `common/src/utils/passports/passport.ts` | generateCommitment, generateNullifier, formatMrz | `passport/` package |
| `common/src/utils/passports/format.ts` | formatMrz, DG1 formatting | `passport/MrzFormatter.kt` |
| `common/src/utils/passports/passport_parsing/parsePassportData.ts` | Metadata extraction | `passport/PassportDataParser.kt` |
| `common/src/utils/certificate_parsing/parseCertificateSimple.ts` | X.509 parsing | `certificate/X509CertificateParser.kt` |
| `common/src/utils/certificate_parsing/oids.ts` | OID resolution | `certificate/OidResolver.kt` |
| `common/src/constants/constants.ts` | Tree depths, max sizes, attestation IDs | `constants/Constants.kt` |
| `common/src/constants/skiPem.ts` | SKI → CSCA PEM mapping | `constants/SkiPem.kt` |
| `poseidon-lite` (npm) | Poseidon algorithm + round constants | `hash/Poseidon.kt`, `hash/PoseidonConstants.kt` |
| `@openpassport/zk-kit-lean-imt` (npm) | LeanIMT data structure | `trees/LeanIMT.kt` |
| `@openpassport/zk-kit-smt` (npm) | Sparse Merkle Tree | `trees/SparseMerkleTree.kt` |
