# Native Proving Client — KMP `commonMain` Implementation Spec

## Overview

Port the TypeScript proving machine (`packages/mobile-sdk-alpha/src/proving/provingMachine.ts`) to native Kotlin in `commonMain`, enabling headless proof generation without a WebView. This is the foundation for:

1. **MiniPay integration** — crypto wallet needs native SDK, no WebView for sensitive operations
2. **Browser extension** — adding `jsMain` or `wasmMain` targets later gives the same proving logic for free

The proving client lives entirely in `commonMain` so it works on Android, iOS, and future JS/WASM targets.

**Prerequisites**: [SPEC-PERSON2-KMP.md](./SPEC-PERSON2-KMP.md) (bridge protocol, common models).

---

## Architecture

### Current TypeScript Stack

```
provingMachine.ts (XState state machine + Zustand store)
  → Circuit input generators (generateTEEInputs*)
  → TEE WebSocket connection (openpassport_hello, attestation, submit)
  → ECDH key exchange + AES-256-GCM encryption
  → Socket.IO status polling (queued → processing → success/failure)
  → Protocol data fetching (trees, circuits, DNS mapping)
  → Document validation (commitment lookup, nullifier check, DSC-in-tree)
```

### Target Kotlin Structure

```
packages/kmp-sdk/shared/src/commonMain/kotlin/xyz/self/sdk/
  proving/
    ProvingClient.kt              — Public API: prove(passportData, request) → ProofResult
    ProvingStateMachine.kt        — State machine (sealed class states, coroutine-based)
    CircuitInputGenerator.kt      — Generate TEE circuit inputs from passport data
    CircuitNameResolver.kt        — Map document metadata to circuit names
    TeeConnection.kt              — WebSocket client for TEE prover (JSON-RPC)
    TeeAttestation.kt             — JWT attestation validation, PCR0 mapping
    PayloadEncryption.kt          — ECDH P-256 + AES-256-GCM
    ProtocolDataStore.kt          — Fetch/cache DSC trees, CSCA trees, circuits, commitment trees
    DocumentValidator.kt          — Check registration, nullification, DSC-in-tree
    StatusListener.kt             — Socket.IO status polling for proof completion
  models/
    ProofResult.kt                — Proof UUID, status, claims
    CircuitType.kt                — dsc, register, disclose
    DocumentCategory.kt           — passport, id_card, aadhaar, kyc
    TeeMessage.kt                 — WebSocket JSON-RPC message types
    ProtocolData.kt               — Trees, circuits, DNS mapping models
    PayloadModels.kt              — TEEPayload, TEEPayloadDisclose, EncryptedPayload
    ProvingState.kt               — State machine states (sealed class)
    EndpointType.kt               — celo, staging_celo, https
```

---

## Module Dependencies

### `build.gradle.kts` additions (commonMain)

```kotlin
commonMain.dependencies {
    // Existing
    implementation(libs.kotlinx.coroutines.core)
    implementation(libs.kotlinx.serialization.json)

    // NEW — HTTP client (KMP-compatible)
    implementation("io.ktor:ktor-client-core:3.0.3")
    implementation("io.ktor:ktor-client-content-negotiation:3.0.3")
    implementation("io.ktor:ktor-serialization-kotlinx-json:3.0.3")

    // NEW — WebSocket support
    implementation("io.ktor:ktor-client-websockets:3.0.3")
}

val androidMain by getting {
    dependencies {
        // Ktor engine
        implementation("io.ktor:ktor-client-okhttp:3.0.3")
        // Crypto (BouncyCastle already present for NFC)
        implementation("org.bouncycastle:bcprov-jdk18on:1.78.1")
    }
}

val iosMain by getting {
    dependencies {
        // Ktor engine
        implementation("io.ktor:ktor-client-darwin:3.0.3")
    }
}
```

### Platform-specific Crypto

| Operation | Android | iOS |
|-----------|---------|-----|
| ECDH P-256 | BouncyCastle `ECDHBasicAgreement` | `SecKeyCreateRandomKey` + `SecKeyCopyKeyExchangeResult` |
| AES-256-GCM | `javax.crypto.Cipher` | `CCCryptorGCM` (CommonCrypto) |
| SHA-256 | `java.security.MessageDigest` | `CC_SHA256` (CommonCrypto) |
| RSA verify | `java.security.Signature` | `SecKeyVerifySignature` |
| X.509 parse | `java.security.cert.CertificateFactory` | `SecCertificateCreateWithData` |
| Random bytes | `java.security.SecureRandom` | `SecRandomCopyBytes` |

Define `expect`/`actual` for these in a `crypto/` package:

```kotlin
// commonMain
expect object PlatformCrypto {
    fun generateEcdhKeyPair(): EcdhKeyPair
    fun deriveSharedSecret(privateKey: ByteArray, peerPublicKey: ByteArray): ByteArray
    fun encryptAesGcm(plaintext: ByteArray, key: ByteArray, iv: ByteArray): AesGcmResult
    fun sha256(data: ByteArray): ByteArray
    fun verifyRsaSha256(publicKey: ByteArray, data: ByteArray, signature: ByteArray): Boolean
    fun randomBytes(size: Int): ByteArray
    fun parseX509Certificate(pem: String): X509CertificateInfo
}

data class EcdhKeyPair(val publicKey: ByteArray, val privateKey: ByteArray)
data class AesGcmResult(val ciphertext: ByteArray, val authTag: ByteArray)
data class X509CertificateInfo(
    val subjectCN: String?,
    val issuerCN: String?,
    val publicKeyBytes: ByteArray,
    val signatureBytes: ByteArray,
    val encoded: ByteArray,
)
```

---

## Detailed Component Specs

### 1. `ProvingClient.kt` — Public API

The main entry point for headless proof generation. Replaces the need for a WebView.

```kotlin
package xyz.self.sdk.proving

import xyz.self.sdk.models.*

/**
 * Native proving client — generates zero-knowledge proofs without a WebView.
 *
 * Usage:
 *   val client = ProvingClient(config)
 *   val result = client.prove(passportData, request)
 */
class ProvingClient(
    private val config: ProvingConfig,
) {
    private val protocolStore = ProtocolDataStore(config)
    private val stateMachine = ProvingStateMachine()

    /**
     * Run the full proving flow: fetch data → validate → connect TEE → prove → return result.
     *
     * @param document Parsed passport/ID document from NFC scan
     * @param request Verification request parameters (scope, disclosures, endpoint)
     * @param secret User's secret key (loaded from secure storage)
     * @param onStateChange Optional callback for UI progress updates
     * @return ProofResult on success
     * @throws ProvingException on failure
     */
    suspend fun prove(
        document: IDDocument,
        request: ProvingRequest,
        secret: String,
        onStateChange: ((ProvingState) -> Unit)? = null,
    ): ProofResult {
        return stateMachine.run(
            document = document,
            request = request,
            secret = secret,
            protocolStore = protocolStore,
            config = config,
            onStateChange = onStateChange,
        )
    }
}

data class ProvingConfig(
    val environment: Environment = Environment.PROD,
    val debug: Boolean = false,
)

enum class Environment {
    PROD, STG;

    val apiBaseUrl: String get() = when (this) {
        PROD -> "https://api.self.xyz"
        STG -> "https://api.staging.self.xyz"
    }

    val wsRelayerUrl: String get() = when (this) {
        PROD -> "wss://websocket.self.xyz"
        STG -> "wss://websocket.staging.self.xyz"
    }
}
```

### 2. `ProvingStateMachine.kt` — State Machine

Port of the XState machine. Uses Kotlin sealed classes instead of XState/Zustand.

#### State Definitions

```kotlin
sealed class ProvingState {
    data object Idle : ProvingState()
    data object ParsingDocument : ProvingState()          // DSC circuit only
    data object FetchingData : ProvingState()
    data object ValidatingDocument : ProvingState()
    data class ConnectingTee(val attempt: Int = 1) : ProvingState()
    data object ReadyToProve : ProvingState()
    data object Proving : ProvingState()
    data object PostProving : ProvingState()
    data class Completed(val result: ProofResult) : ProvingState()
    data class Error(val code: String, val reason: String) : ProvingState()
    data class DocumentNotSupported(val details: String) : ProvingState()
    data class AlreadyRegistered(val csca: String?) : ProvingState()
    data class AccountRecoveryChoice(val nullifier: String) : ProvingState()
    data class PassportDataNotFound(val details: String) : ProvingState()
}
```

#### State Machine Runner

```kotlin
class ProvingStateMachine {
    private var currentState: ProvingState = ProvingState.Idle

    suspend fun run(
        document: IDDocument,
        request: ProvingRequest,
        secret: String,
        protocolStore: ProtocolDataStore,
        config: ProvingConfig,
        onStateChange: ((ProvingState) -> Unit)?,
    ): ProofResult {
        fun transition(state: ProvingState) {
            currentState = state
            onStateChange?.invoke(state)
        }

        try {
            // Step 1: Determine circuit type sequence
            val circuitSequence = determineCircuitSequence(document, request)

            for (circuitType in circuitSequence) {
                // Step 2: Fetch protocol data
                transition(ProvingState.FetchingData)
                val protocolData = protocolStore.fetchAll(
                    environment = config.environment,
                    documentCategory = document.documentCategory,
                    dscSki = document.dscAuthorityKeyIdentifier,
                )

                // Step 3: Validate document
                transition(ProvingState.ValidatingDocument)
                val validation = DocumentValidator.validate(
                    document = document,
                    secret = secret,
                    circuitType = circuitType,
                    protocolData = protocolData,
                    environment = config.environment,
                )
                when (validation) {
                    is ValidationResult.Supported -> { /* continue */ }
                    is ValidationResult.AlreadyRegistered -> {
                        transition(ProvingState.AlreadyRegistered(validation.csca))
                        continue  // Skip to next circuit in sequence
                    }
                    is ValidationResult.NotSupported -> {
                        transition(ProvingState.DocumentNotSupported(validation.details))
                        throw ProvingException("DOCUMENT_NOT_SUPPORTED", validation.details)
                    }
                    is ValidationResult.NotRegistered -> {
                        transition(ProvingState.PassportDataNotFound(validation.details))
                        throw ProvingException("NOT_REGISTERED", validation.details)
                    }
                    is ValidationResult.AccountRecovery -> {
                        transition(ProvingState.AccountRecoveryChoice(validation.nullifier))
                        throw ProvingException("ACCOUNT_RECOVERY", "Document nullified, recovery needed")
                    }
                }

                // Step 4: Connect to TEE
                transition(ProvingState.ConnectingTee())
                val teeConnection = TeeConnection(config)
                val session = teeConnection.connect(
                    circuitName = CircuitNameResolver.resolve(document, circuitType),
                    wsUrl = protocolData.resolveWebSocketUrl(circuitType, document),
                    onReconnect = { attempt -> transition(ProvingState.ConnectingTee(attempt)) },
                )

                // Step 5: Generate inputs + encrypt + submit
                transition(ProvingState.Proving)
                val inputs = CircuitInputGenerator.generate(
                    document = document,
                    secret = secret,
                    circuitType = circuitType,
                    protocolData = protocolData,
                    request = request,
                )
                val payload = PayloadBuilder.build(inputs, circuitType, document, request)
                val encrypted = PayloadEncryption.encrypt(
                    payload = payload,
                    sharedKey = session.sharedKey,
                )
                val proofUuid = teeConnection.submitProof(session, encrypted)

                // Step 6: Wait for result via Socket.IO
                val status = StatusListener.awaitResult(
                    uuid = proofUuid,
                    environment = config.environment,
                )

                // Step 7: Post-proving
                transition(ProvingState.PostProving)
                if (status.isSuccess) {
                    if (circuitType == CircuitType.REGISTER) {
                        // Mark document as registered (caller should persist this)
                    }
                } else {
                    throw ProvingException(status.errorCode ?: "PROVE_FAILED", status.reason ?: "Proof generation failed")
                }
            }

            val result = ProofResult(success = true, circuitType = circuitSequence.last())
            transition(ProvingState.Completed(result))
            return result

        } catch (e: ProvingException) {
            transition(ProvingState.Error(e.code, e.message ?: "Unknown error"))
            throw e
        }
    }

    /**
     * Determine the sequence of circuits to prove.
     * DSC flow: [DSC, REGISTER]
     * Register flow: [REGISTER]
     * Disclose flow: [DISCLOSE]
     */
    private fun determineCircuitSequence(document: IDDocument, request: ProvingRequest): List<CircuitType> {
        return when (request.circuitType) {
            CircuitType.DSC -> listOf(CircuitType.DSC, CircuitType.REGISTER)
            CircuitType.REGISTER -> listOf(CircuitType.REGISTER)
            CircuitType.DISCLOSE -> listOf(CircuitType.DISCLOSE)
        }
    }
}
```

**Key difference from TypeScript**: The TS version uses XState actor + Zustand store with event-driven transitions. The Kotlin version uses a linear `suspend fun` with structured concurrency — simpler, easier to test, and natural for Kotlin coroutines.

---

### 3. `CircuitInputGenerator.kt` — Generate TEE Circuit Inputs

Port of `generateTEEInputsRegister`, `generateTEEInputsDSC`, `generateTEEInputsDiscloseStateless`.

```kotlin
object CircuitInputGenerator {
    /**
     * Generate circuit inputs based on document type and circuit type.
     *
     * @return Circuit inputs as a JsonElement tree (to be serialized and encrypted)
     */
    suspend fun generate(
        document: IDDocument,
        secret: String,
        circuitType: CircuitType,
        protocolData: ProtocolData,
        request: ProvingRequest,
    ): CircuitInputs {
        return when (circuitType) {
            CircuitType.REGISTER -> generateRegisterInputs(document, secret, protocolData)
            CircuitType.DSC -> generateDscInputs(document, protocolData)
            CircuitType.DISCLOSE -> generateDiscloseInputs(document, secret, protocolData, request)
        }
    }
}
```

#### TypeScript Functions → Kotlin Equivalents

| TypeScript Function | Kotlin Equivalent | Location |
|---|---|---|
| `generateTEEInputsRegister(secret, passportData, dscTree, env)` | `CircuitInputGenerator.generateRegisterInputs()` | `CircuitInputGenerator.kt` |
| `generateTEEInputsDSC(passportData, cscaTree, env)` | `CircuitInputGenerator.generateDscInputs()` | `CircuitInputGenerator.kt` |
| `generateTEEInputsDiscloseStateless(secret, passportData, selfApp, getTree)` | `CircuitInputGenerator.generateDiscloseInputs()` | `CircuitInputGenerator.kt` |
| `generateCircuitInputsRegister(secret, passportData, dscTree)` | Internal to `generateRegisterInputs` | Port from `common/src/utils/circuits/registerInputs.ts` |
| `generateCircuitInputsDSC(passportData, cscaTree)` | Internal to `generateDscInputs` | Port from `common/src/utils/circuits/registerInputs.ts` |
| `generateCircuitInputsVCandDisclose(...)` | Internal to `generateDiscloseInputs` | Port from `common/src/utils/circuits/registerInputs.ts` |
| `getSelectorDg1(documentCategory, disclosures)` | `SelectorGenerator.getDg1Selector()` | New helper |
| `generateCommitment(secret, attestationId, passportData)` | `CommitmentGenerator.generate()` | New helper |
| `packBytesAndPoseidon(bytes)` | `PoseidonUtils.packBytesAndHash()` | New helper |
| `formatMrz(mrz)` | `MrzFormatter.format()` | New helper |

#### Document-Specific Input Generation

**Register — Passport/ID Card:**
```kotlin
private fun generateRegisterInputs(document: IDDocument, secret: String, protocolData: ProtocolData): CircuitInputs {
    val passportData = document as PassportData
    val dscTree = protocolData.dscTree

    // Port of generateCircuitInputsRegister from common/src/utils/circuits/registerInputs.ts
    val commitment = CommitmentGenerator.generate(secret, passportData.attestationId, passportData)
    // ... format MRZ, hash eContent, generate Merkle proofs
    // Return structured circuit inputs
}
```

**Register — Aadhaar:**
```kotlin
// Port of prepareAadhaarRegisterData
// Uses different input structure: QR data, public keys list
```

**Register — KYC:**
```kotlin
// Port of generateKycRegisterInput
// Uses serializedApplicantInfo, signature, pubkey
```

**DSC:**
```kotlin
private fun generateDscInputs(document: IDDocument, protocolData: ProtocolData): CircuitInputs {
    val passportData = document as PassportData
    val cscaTree = protocolData.cscaTree

    // Port of generateCircuitInputsDSC
    // 1. Extract DSC signature from passport
    // 2. Parse CSCA certificate
    // 3. Get CSCA public key
    // 4. Generate Merkle proof for CSCA in CSCA tree
    // 5. Format signature and keys for circuit
}
```

**Disclose — Passport/ID Card:**
```kotlin
private fun generateDiscloseInputs(
    document: IDDocument,
    secret: String,
    protocolData: ProtocolData,
    request: ProvingRequest,
): CircuitInputs {
    val passportData = document as PassportData

    // 1. Generate selector bits for disclosed attributes
    val selectorDg1 = SelectorGenerator.getDg1Selector(document.documentCategory, request.disclosures)

    // 2. Load OFAC sparse merkle trees
    val ofacTrees = protocolData.ofacTrees

    // 3. Load commitment tree (LeanIMT)
    val commitmentTree = protocolData.commitmentTree

    // 4. Port of generateCircuitInputsVCandDisclose
    // Inputs: secret, attestation_id, passportData, scope_hash,
    //         selector_dg1, selector_older_than, tree, majority,
    //         passportNoAndNationalitySMT, nameAndDobSMT, nameAndYobSMT,
    //         selector_ofac, excludedCountries, userIdentifierHash
}
```

#### Selector Bit Array Generation

Port of `getSelectorDg1` — maps disclosure flags to MRZ byte positions:

```kotlin
object SelectorGenerator {
    // Passport MRZ (88 bytes)
    private val passportPositions = mapOf(
        "issuing_state" to (2..4),
        "name" to (5..43),
        "passport_number" to (44..52),
        "nationality" to (54..56),
        "date_of_birth" to (57..62),
        "gender" to (64..64),
        "expiry_date" to (65..70),
    )

    // ID Card MRZ (90 bytes)
    private val idCardPositions = mapOf(
        "issuing_state" to (2..4),
        "passport_number" to (5..13),
        "date_of_birth" to (30..35),
        "gender" to (37..37),
        "expiry_date" to (38..43),
        "nationality" to (45..47),
        "name" to (60..89),
    )

    fun getDg1Selector(category: DocumentCategory, disclosures: Disclosures): List<String> {
        val size = if (category == DocumentCategory.ID_CARD) 90 else 88
        val positions = if (category == DocumentCategory.ID_CARD) idCardPositions else passportPositions
        val selector = MutableList(size) { "0" }

        disclosures.revealedAttributes.forEach { attr ->
            positions[attr]?.let { range ->
                for (i in range) selector[i] = "1"
            }
        }
        return selector
    }
}
```

---

### 4. `CircuitNameResolver.kt` — Map Document to Circuit Name

Port of `getCircuitNameFromPassportData`:

```kotlin
object CircuitNameResolver {
    /**
     * Resolve circuit name from document metadata.
     *
     * Examples:
     *   register_sha256_sha256_sha256_ecdsa_secp256r1
     *   dsc_sha256_ecdsa_secp256r1
     *   vc_and_disclose
     *   register_aadhaar
     */
    fun resolve(document: IDDocument, circuitType: CircuitType): String {
        return when (document.documentCategory) {
            DocumentCategory.AADHAAR -> when (circuitType) {
                CircuitType.REGISTER -> "register_aadhaar"
                CircuitType.DISCLOSE -> "vc_and_disclose_aadhaar"
                CircuitType.DSC -> throw IllegalArgumentException("Aadhaar has no DSC circuit")
            }
            DocumentCategory.KYC -> when (circuitType) {
                CircuitType.REGISTER -> "register_kyc"
                CircuitType.DISCLOSE -> "vc_and_disclose_kyc"
                CircuitType.DSC -> throw IllegalArgumentException("KYC has no DSC circuit")
            }
            DocumentCategory.PASSPORT, DocumentCategory.ID_CARD -> {
                val metadata = (document as PassportData).passportMetadata
                    ?: throw ProvingException("METADATA_MISSING", "Passport metadata required")
                when (circuitType) {
                    CircuitType.REGISTER -> buildRegisterCircuitName(metadata, document.documentCategory)
                    CircuitType.DSC -> buildDscCircuitName(metadata)
                    CircuitType.DISCLOSE -> if (document.documentCategory == DocumentCategory.PASSPORT)
                        "vc_and_disclose" else "vc_and_disclose_id"
                }
            }
        }
    }

    /**
     * Build register circuit name from passport metadata.
     * Format: register_{dgHash}_{eContentHash}_{signedAttrHash}_{sigAlg}_{curveOrExp}[_{saltLen}][_{bits}]
     */
    private fun buildRegisterCircuitName(metadata: PassportMetadata, category: DocumentCategory): String {
        val prefix = if (category == DocumentCategory.ID_CARD) "register_id" else "register"
        val parts = mutableListOf(
            prefix,
            metadata.dg1HashFunction,
            metadata.eContentHashFunction,
            metadata.signedAttrHashFunction,
            metadata.signatureAlgorithm,
            metadata.curveOrExponent,
        )
        metadata.saltLength?.let { parts.add(it) }
        metadata.signatureAlgorithmBits?.let { parts.add(it) }
        return parts.joinToString("_")
    }

    /**
     * Build DSC circuit name from passport metadata.
     * Format: dsc_{hash}_{sigAlg}_{curve} (ECDSA)
     *         dsc_{hash}_{sigAlg}_{exp}_{bits} (RSA)
     *         dsc_{hash}_{sigAlg}_{exp}_{saltLen}_{bits} (RSA-PSS)
     */
    private fun buildDscCircuitName(metadata: PassportMetadata): String {
        // Similar construction logic
        val parts = mutableListOf("dsc", metadata.cscaHashFunction, metadata.cscaSignatureAlgorithm, metadata.cscaCurveOrExponent)
        metadata.cscaSaltLength?.let { parts.add(it) }
        metadata.cscaSignatureAlgorithmBits?.let { parts.add(it) }
        return parts.joinToString("_")
    }
}
```

#### Mapping Key Resolution

Port of `getMappingKey` — maps (circuitType, documentCategory) to protocol store keys:

```kotlin
object MappingKeyResolver {
    fun resolve(circuitType: CircuitType, category: DocumentCategory): String = when (category) {
        DocumentCategory.PASSPORT -> when (circuitType) {
            CircuitType.REGISTER -> "REGISTER"
            CircuitType.DSC -> "DSC"
            CircuitType.DISCLOSE -> "DISCLOSE"
        }
        DocumentCategory.ID_CARD -> when (circuitType) {
            CircuitType.REGISTER -> "REGISTER_ID"
            CircuitType.DSC -> "DSC_ID"
            CircuitType.DISCLOSE -> "DISCLOSE_ID"
        }
        DocumentCategory.AADHAAR -> when (circuitType) {
            CircuitType.REGISTER -> "REGISTER_AADHAAR"
            CircuitType.DISCLOSE -> "DISCLOSE_AADHAAR"
            CircuitType.DSC -> throw IllegalArgumentException("Aadhaar has no DSC")
        }
        DocumentCategory.KYC -> when (circuitType) {
            CircuitType.REGISTER -> "REGISTER_KYC"
            CircuitType.DISCLOSE -> "DISCLOSE_KYC"
            CircuitType.DSC -> throw IllegalArgumentException("KYC has no DSC")
        }
    }
}
```

---

### 5. `TeeConnection.kt` — WebSocket Client for TEE

Port of WebSocket handling from `provingMachine.ts`.

```kotlin
class TeeConnection(private val config: ProvingConfig) {
    private var ws: WebSocketSession? = null
    private val client = HttpClient { install(WebSockets) }

    /**
     * Connect to TEE WebSocket, perform hello + attestation handshake.
     *
     * @return TeeSession with shared key and connection UUID
     */
    suspend fun connect(
        circuitName: String,
        wsUrl: String,
        onReconnect: ((Int) -> Unit)? = null,
    ): TeeSession {
        val ecdhKeyPair = PlatformCrypto.generateEcdhKeyPair()
        val connectionUuid = generateUuid()

        return withRetry(maxAttempts = 3, onRetry = onReconnect) {
            val session = client.webSocketSession(wsUrl)
            ws = session

            // Step 1: Send hello
            val helloMessage = buildJsonObject {
                put("jsonrpc", "2.0")
                put("method", "openpassport_hello")
                put("id", 1)
                putJsonObject("params") {
                    putJsonArray("user_pubkey") {
                        ecdhKeyPair.publicKey.forEach { add(it.toInt()) }
                    }
                    put("uuid", connectionUuid)
                }
            }
            session.send(Frame.Text(Json.encodeToString(helloMessage)))

            // Step 2: Wait for attestation response
            val attestationFrame = session.incoming.receive() as Frame.Text
            val response = Json.parseToJsonElement(attestationFrame.readText()).jsonObject
            val result = response["result"]?.jsonObject
                ?: throw ProvingException("TEE_ERROR", "No result in attestation response")

            val attestationToken = result["attestation"]?.jsonPrimitive?.content
                ?: throw ProvingException("TEE_ERROR", "No attestation token")

            // Step 3: Validate attestation
            val attestation = TeeAttestation.validate(attestationToken, config.debug)

            // Step 4: Verify client pubkey matches
            if (!ecdhKeyPair.publicKey.contentEquals(attestation.userPubkey)) {
                throw ProvingException("TEE_ERROR", "User public key mismatch in attestation")
            }

            // Step 5: Check PCR0 mapping
            TeeAttestation.checkPcr0(attestation.imageHash, config.environment)

            // Step 6: Derive shared key via ECDH
            val sharedKey = PlatformCrypto.deriveSharedSecret(
                ecdhKeyPair.privateKey,
                attestation.serverPubkey,
            )

            TeeSession(
                ws = session,
                sharedKey = sharedKey,
                connectionUuid = connectionUuid,
            )
        }
    }

    /**
     * Submit encrypted proof request to TEE.
     *
     * @return UUID for status polling
     */
    suspend fun submitProof(session: TeeSession, encrypted: EncryptedPayload): String {
        val submitMessage = buildJsonObject {
            put("jsonrpc", "2.0")
            put("method", "openpassport_submit_request")
            put("id", 2)
            putJsonObject("params") {
                put("uuid", session.connectionUuid)
                putJsonArray("nonce") { encrypted.nonce.forEach { add(it.toInt()) } }
                putJsonArray("cipher_text") { encrypted.ciphertext.forEach { add(it.toInt()) } }
                putJsonArray("auth_tag") { encrypted.authTag.forEach { add(it.toInt()) } }
            }
        }
        session.ws.send(Frame.Text(Json.encodeToString(submitMessage)))

        // Wait for ACK with status UUID
        val ackFrame = session.ws.incoming.receive() as Frame.Text
        val ackResponse = Json.parseToJsonElement(ackFrame.readText()).jsonObject
        val statusUuid = ackResponse["result"]?.jsonPrimitive?.content
            ?: throw ProvingException("TEE_ERROR", "No UUID in submit ACK")

        return statusUuid
    }

    fun close() {
        // Close WebSocket
    }
}

data class TeeSession(
    val ws: WebSocketSession,
    val sharedKey: ByteArray,
    val connectionUuid: String,
)
```

#### Retry Logic

```kotlin
private suspend fun <T> withRetry(
    maxAttempts: Int,
    onRetry: ((Int) -> Unit)?,
    block: suspend () -> T,
): T {
    var lastException: Exception? = null
    for (attempt in 1..maxAttempts) {
        try {
            return block()
        } catch (e: Exception) {
            lastException = e
            if (attempt < maxAttempts) {
                val backoffMs = minOf(1000L * (1 shl (attempt - 1)), 10_000L)
                delay(backoffMs)
                onRetry?.invoke(attempt + 1)
            }
        }
    }
    throw lastException ?: ProvingException("TEE_CONNECT_FAILED", "Max reconnect attempts reached")
}
```

---

### 6. `TeeAttestation.kt` — Attestation Validation

Port of `validatePKIToken` and `checkPCR0Mapping` from `common/src/utils/attest.ts`.

```kotlin
object TeeAttestation {
    /**
     * Validate TEE attestation JWT token.
     *
     * JWT structure: header.payload.signature (RS256)
     * Header x5c: [leaf, intermediate, root] certificate chain
     * Payload eat_nonce: [userPubkey, serverPubkey] (base64)
     * Payload submods.container.image_digest: "sha256:<hash>"
     *
     * @param attestationToken JWT string
     * @param isDev If true, skip debug status check
     * @return Validated attestation data
     */
    fun validate(attestationToken: String, isDev: Boolean): AttestationResult {
        val (headerB64, payloadB64, signatureB64) = attestationToken.split(".")

        // 1. Parse header, extract x5c certificate chain
        val header = Json.parseToJsonElement(base64UrlDecode(headerB64).decodeToString()).jsonObject
        val x5c = header["x5c"]?.jsonArray?.map { it.jsonPrimitive.content }
            ?: throw ProvingException("ATTESTATION_ERROR", "No x5c in header")
        require(x5c.size == 3) { "Expected 3 certificates in x5c chain" }

        // 2. Parse certificates: leaf, intermediate, root
        val certs = x5c.map { PlatformCrypto.parseX509Certificate(pemFromBase64(it)) }

        // 3. Verify root matches stored GCP root certificate
        verifyRootCertificate(certs[2])

        // 4. Verify certificate chain signatures
        verifyCertificateChain(certs)

        // 5. Verify JWT signature (RS256) using leaf certificate
        val signingInput = "$headerB64.$payloadB64".encodeToByteArray()
        val signature = base64UrlDecode(signatureB64)
        require(PlatformCrypto.verifyRsaSha256(certs[0].publicKeyBytes, signingInput, signature)) {
            "JWT signature verification failed"
        }

        // 6. Parse payload
        val payload = Json.parseToJsonElement(base64UrlDecode(payloadB64).decodeToString()).jsonObject

        // 7. Check debug status (skip in dev mode)
        if (!isDev) {
            val dbgstat = payload["dbgstat"]?.jsonPrimitive?.content
            require(dbgstat == "disabled-since-boot") { "Debug mode is enabled on TEE" }
        }

        // 8. Extract keys and image hash
        val eatNonce = payload["eat_nonce"]?.jsonArray
            ?: throw ProvingException("ATTESTATION_ERROR", "No eat_nonce in payload")
        val userPubkey = base64Decode(eatNonce[0].jsonPrimitive.content)
        val serverPubkey = base64Decode(eatNonce[1].jsonPrimitive.content)
        val imageDigest = payload["submods"]?.jsonObject
            ?.get("container")?.jsonObject
            ?.get("image_digest")?.jsonPrimitive?.content
            ?: throw ProvingException("ATTESTATION_ERROR", "No image_digest")
        val imageHash = imageDigest.removePrefix("sha256:")

        return AttestationResult(
            userPubkey = userPubkey,
            serverPubkey = serverPubkey,
            imageHash = imageHash,
            verified = true,
        )
    }

    /**
     * Check PCR0 hash against on-chain PCR0Manager contract.
     */
    suspend fun checkPcr0(imageHashHex: String, environment: Environment) {
        require(imageHashHex.length == 64) { "Invalid PCR0 hash length: ${imageHashHex.length}" }

        // Query PCR0Manager contract on Celo via JSON-RPC
        val rpcUrl = "https://forno.celo.org"  // Celo mainnet RPC
        val pcr0ManagerAddress = PCR0_MANAGER_ADDRESS
        val paddedHash = imageHashHex.padStart(96, '0')

        // Build eth_call to isPCR0Set(bytes)
        val client = HttpClient()
        val response = client.post(rpcUrl) {
            contentType(ContentType.Application.Json)
            setBody(buildJsonObject {
                put("jsonrpc", "2.0")
                put("method", "eth_call")
                put("id", 1)
                putJsonObject("params") {
                    // ... ABI-encoded call to isPCR0Set
                }
            })
        }
        // Parse response, verify returns true
    }

    private const val PCR0_MANAGER_ADDRESS = "0x..."  // TODO: Extract from TypeScript constants

    /**
     * Stored GCP Confidential Computing root certificate (PEM).
     * Used to verify the TEE attestation certificate chain.
     */
    private val GCP_ROOT_CERT = """
        -----BEGIN CERTIFICATE-----
        ...
        -----END CERTIFICATE-----
    """.trimIndent()
    // TODO: Extract from common/src/utils/attest.ts
}

data class AttestationResult(
    val userPubkey: ByteArray,
    val serverPubkey: ByteArray,
    val imageHash: String,
    val verified: Boolean,
)
```

---

### 7. `PayloadEncryption.kt` — ECDH + AES-256-GCM

Port of encryption logic from `common/src/utils/proving.ts`.

```kotlin
object PayloadEncryption {
    /**
     * Encrypt payload using AES-256-GCM with the ECDH-derived shared key.
     *
     * @param payload JSON string to encrypt
     * @param sharedKey 32-byte ECDH-derived shared key
     * @return Encrypted payload with nonce, ciphertext, and auth tag
     */
    fun encrypt(payload: String, sharedKey: ByteArray): EncryptedPayload {
        require(sharedKey.size == 32) { "Shared key must be 32 bytes" }

        val iv = PlatformCrypto.randomBytes(12)  // 12-byte random nonce
        val result = PlatformCrypto.encryptAesGcm(
            plaintext = payload.encodeToByteArray(),
            key = sharedKey,
            iv = iv,
        )

        return EncryptedPayload(
            nonce = iv,
            ciphertext = result.ciphertext,
            authTag = result.authTag,
        )
    }
}
```

---

### 8. `ProtocolDataStore.kt` — Fetch/Cache Protocol Data

Port of protocol store fetching from `packages/mobile-sdk-alpha/src/stores/protocolStore.ts`.

```kotlin
class ProtocolDataStore(private val config: ProvingConfig) {
    private val client = HttpClient {
        install(ContentNegotiation) {
            json(Json { ignoreUnknownKeys = true })
        }
    }
    private val cache = mutableMapOf<String, ProtocolData>()

    /**
     * Fetch all protocol data needed for proving.
     * Fetches in parallel: DSC tree, CSCA tree, commitment tree, OFAC trees,
     * deployed circuits, circuits DNS mapping, alternative CSCA.
     *
     * Results are cached by (environment, documentCategory) key.
     */
    suspend fun fetchAll(
        environment: Environment,
        documentCategory: DocumentCategory,
        dscSki: String? = null,
    ): ProtocolData {
        val cacheKey = "${environment.name}:${documentCategory.name}"
        cache[cacheKey]?.let { return it }

        val baseUrl = environment.apiBaseUrl

        // Parallel fetch all data
        return coroutineScope {
            val deployedCircuits = async { fetchDeployedCircuits(baseUrl, documentCategory) }
            val circuitsDnsMapping = async { fetchCircuitsDnsMapping(baseUrl) }
            val dscTree = async { fetchDscTree(baseUrl, documentCategory) }
            val cscaTree = async { fetchCscaTree(baseUrl, documentCategory) }
            val commitmentTree = async { fetchCommitmentTree(baseUrl, documentCategory) }
            val ofacTrees = async { fetchOfacTrees(baseUrl, documentCategory) }
            val alternativeCsca = async {
                if (dscSki != null) fetchAlternativeCsca(baseUrl, documentCategory, dscSki)
                else null
            }

            ProtocolData(
                deployedCircuits = deployedCircuits.await(),
                circuitsDnsMapping = circuitsDnsMapping.await(),
                dscTree = dscTree.await(),
                cscaTree = cscaTree.await(),
                commitmentTree = commitmentTree.await(),
                ofacTrees = ofacTrees.await(),
                alternativeCsca = alternativeCsca.await(),
            ).also { cache[cacheKey] = it }
        }
    }

    // --- Individual fetchers ---

    private suspend fun fetchDeployedCircuits(baseUrl: String, category: DocumentCategory): DeployedCircuits {
        // GET {baseUrl}/deployed-circuits
        val response = client.get("$baseUrl/deployed-circuits")
        return response.body()
    }

    private suspend fun fetchCircuitsDnsMapping(baseUrl: String): CircuitsDnsMapping {
        // GET {baseUrl}/circuit-dns-mapping-gcp
        val response = client.get("$baseUrl/circuit-dns-mapping-gcp")
        return response.body()
    }

    private suspend fun fetchDscTree(baseUrl: String, category: DocumentCategory): String {
        // GET {baseUrl}/dsc-tree — returns serialized LeanIMT
        val response = client.get("$baseUrl/dsc-tree") {
            parameter("category", category.apiValue)
        }
        return response.body()
    }

    private suspend fun fetchCscaTree(baseUrl: String, category: DocumentCategory): List<List<String>> {
        // GET {baseUrl}/csca-tree — returns 2D array for Merkle tree
        val response = client.get("$baseUrl/csca-tree") {
            parameter("category", category.apiValue)
        }
        return response.body()
    }

    private suspend fun fetchCommitmentTree(baseUrl: String, category: DocumentCategory): String {
        // GET {baseUrl}/identity-tree — returns serialized LeanIMT
        val response = client.get("$baseUrl/identity-tree") {
            parameter("category", category.apiValue)
        }
        return response.body()
    }

    private suspend fun fetchOfacTrees(baseUrl: String, category: DocumentCategory): OfacTrees {
        // GET {baseUrl}/ofac-trees
        val response = client.get("$baseUrl/ofac-trees") {
            parameter("category", category.apiValue)
        }
        return response.body()
    }

    private suspend fun fetchAlternativeCsca(baseUrl: String, category: DocumentCategory, ski: String): AlternativeCsca {
        // GET {baseUrl}/alternative-csca
        val response = client.get("$baseUrl/alternative-csca") {
            parameter("category", category.apiValue)
            parameter("ski", ski)
        }
        return response.body()
    }
}
```

#### TypeScript Fetch Functions → Kotlin Equivalents

| TypeScript | Kotlin | API Endpoint |
|---|---|---|
| `fetch_deployed_circuits(env)` | `fetchDeployedCircuits()` | `GET /deployed-circuits` |
| `fetch_circuits_dns_mapping(env)` | `fetchCircuitsDnsMapping()` | `GET /circuit-dns-mapping-gcp` |
| `fetch_dsc_tree(env)` | `fetchDscTree()` | `GET /dsc-tree` |
| `fetch_csca_tree(env)` | `fetchCscaTree()` | `GET /csca-tree` |
| `fetch_identity_tree(env)` | `fetchCommitmentTree()` | `GET /identity-tree` |
| `fetch_ofac_trees(env)` | `fetchOfacTrees()` | `GET /ofac-trees` |
| `fetch_alternative_csca(env, ski)` | `fetchAlternativeCsca()` | `GET /alternative-csca` |

---

### 9. `DocumentValidator.kt` — Document Validation

Port of validation logic from `common/src/utils/passports/validate.ts`.

```kotlin
object DocumentValidator {
    /**
     * Validate document eligibility for the given circuit type.
     *
     * Checks performed:
     * - Document metadata exists and CSCA was found during parsing
     * - Register + DSC circuits are deployed for this document's crypto params
     * - For disclose: user is registered (commitment exists in tree)
     * - For register: user is NOT already registered, document NOT nullified
     * - For register: DSC is in the DSC tree
     */
    suspend fun validate(
        document: IDDocument,
        secret: String,
        circuitType: CircuitType,
        protocolData: ProtocolData,
        environment: Environment,
    ): ValidationResult {
        // Step 1: Check document supported (metadata, CSCA, circuits deployed)
        val supportStatus = checkDocumentSupported(document, protocolData.deployedCircuits)
        if (supportStatus != SupportStatus.SUPPORTED) {
            return ValidationResult.NotSupported(supportStatus.name)
        }

        // Step 2: Circuit-type-specific validation
        return when (circuitType) {
            CircuitType.DISCLOSE -> validateForDisclose(document, secret, protocolData)
            CircuitType.REGISTER -> validateForRegister(document, secret, protocolData, environment)
            CircuitType.DSC -> ValidationResult.Supported  // DSC has no extra validation
        }
    }
}
```

#### TypeScript Functions → Kotlin Equivalents

| TypeScript Function | Kotlin Equivalent | Purpose |
|---|---|---|
| `checkDocumentSupported(passportData, opts)` | `DocumentValidator.checkDocumentSupported()` | Check metadata, CSCA, deployed circuits |
| `isUserRegistered(documentData, secret, getCommitmentTree)` | `DocumentValidator.isUserRegistered()` | Look up commitment in LeanIMT |
| `isUserRegisteredWithAlternativeCSCA(passportData, secret, opts)` | `DocumentValidator.isUserRegisteredWithAlternativeCsca()` | Try each alternative CSCA commitment |
| `isDocumentNullified(passportData)` | `DocumentValidator.isDocumentNullified()` | POST to `/is-nullifier-onchain-with-attestation-id` |
| `checkIfPassportDscIsInTree(passportData, dscTree)` | `DocumentValidator.isDscInTree()` | Look up DSC leaf in LeanIMT |

#### Commitment Generation

Port of `generateCommitment` from `common/src/utils/passports/passport.ts`:

```kotlin
object CommitmentGenerator {
    /**
     * Generate a commitment hash for a passport/ID document.
     * commitment = poseidon5(secret, attestation_id, dg1_packed_hash, eContent_packed_hash, dsc_hash)
     *
     * @param secret User's secret key
     * @param attestationId "1" for passport, "2" for ID card
     * @param passportData Parsed passport data with MRZ, eContent, parsed certificates
     * @return Commitment as string representation of BigInt
     */
    fun generate(secret: String, attestationId: String, passportData: PassportData): String {
        // 1. Pack MRZ bytes and hash with Poseidon
        val mrzBytes = MrzFormatter.format(passportData.mrz)
        val dg1PackedHash = PoseidonUtils.packBytesAndHash(mrzBytes)

        // 2. Hash eContent, then pack and hash with Poseidon
        val eContentShaBytes = PlatformCrypto.sha256(passportData.eContent)  // Or sha384/sha512 based on metadata
        val eContentPackedHash = PoseidonUtils.packBytesAndHash(eContentShaBytes.map { it.toInt() and 0xff })

        // 3. Get DSC tree leaf hash
        val dscHash = getLeafDscTree(passportData.dscParsed, passportData.cscaParsed)

        // 4. Poseidon-5 hash
        return poseidon5(listOf(
            secret.toBigInteger(),
            attestationId.toBigInteger(),
            dg1PackedHash,
            eContentPackedHash,
            dscHash,
        )).toString()
    }
}
```

#### Constants

```kotlin
object AttestationId {
    const val PASSPORT = "1"
    const val ID_CARD = "2"
    const val AADHAAR = "3"
    const val KYC = "4"
}
```

---

### 10. `StatusListener.kt` — Socket.IO Status Polling

Port of `_startSocketIOStatusListener` from `provingMachine.ts`.

**Note**: Ktor doesn't have native Socket.IO support. Use Ktor WebSocket with manual Socket.IO protocol handling, or use a KMP Socket.IO client library.

```kotlin
object StatusListener {
    /**
     * Connect to Socket.IO relayer and wait for proof status.
     *
     * Status codes:
     *   3, 5 = Failure
     *   4 = Success
     *   Other = In progress (keep listening)
     *
     * @param uuid Proof UUID returned by TEE submit
     * @param environment Determines which relayer URL to use
     * @return Final status (success or failure)
     */
    suspend fun awaitResult(
        uuid: String,
        environment: Environment,
        timeout: Duration = 5.minutes,
    ): ProofStatus {
        val wsUrl = environment.wsRelayerUrl

        return withTimeout(timeout) {
            // Connect via WebSocket (Socket.IO over WS)
            val client = HttpClient { install(WebSockets) }
            val session = client.webSocketSession("$wsUrl/socket.io/?transport=websocket")

            try {
                // Socket.IO handshake
                // ... send "40" (connect to default namespace)
                // ... wait for "40" ack

                // Subscribe to UUID
                val subscribeMsg = """42["subscribe","$uuid"]"""
                session.send(Frame.Text(subscribeMsg))

                // Listen for status messages
                for (frame in session.incoming) {
                    if (frame is Frame.Text) {
                        val text = frame.readText()
                        val status = parseSocketIoStatus(text) ?: continue

                        when (status.code) {
                            3, 5 -> return@withTimeout ProofStatus(
                                isSuccess = false,
                                errorCode = status.errorCode,
                                reason = status.reason,
                            )
                            4 -> return@withTimeout ProofStatus(isSuccess = true)
                            // Other status codes = in progress, keep listening
                        }
                    }
                }
                throw ProvingException("TIMEOUT", "Socket.IO connection closed without final status")
            } finally {
                session.close()
            }
        }
    }

    private fun parseSocketIoStatus(message: String): StatusMessage? {
        // Socket.IO message format: "42[\"status\",{...}]"
        if (!message.startsWith("42")) return null
        val jsonPart = message.substring(2)
        val array = Json.parseToJsonElement(jsonPart).jsonArray
        if (array[0].jsonPrimitive.content != "status") return null
        val data = array[1].jsonObject
        return StatusMessage(
            code = data["status"]?.jsonPrimitive?.int ?: return null,
            errorCode = data["error_code"]?.jsonPrimitive?.content,
            reason = data["reason"]?.jsonPrimitive?.content,
        )
    }
}

data class ProofStatus(
    val isSuccess: Boolean,
    val errorCode: String? = null,
    val reason: String? = null,
)

data class StatusMessage(
    val code: Int,
    val errorCode: String?,
    val reason: String?,
)
```

---

## Data Models

### `ProofResult.kt`

```kotlin
data class ProofResult(
    val success: Boolean,
    val circuitType: CircuitType,
    val uuid: String? = null,
    val claims: Map<String, String>? = null,
)
```

### `CircuitType.kt`

```kotlin
enum class CircuitType {
    DSC, REGISTER, DISCLOSE
}
```

### `DocumentCategory.kt`

```kotlin
enum class DocumentCategory(val apiValue: String) {
    PASSPORT("passport"),
    ID_CARD("id_card"),
    AADHAAR("aadhaar"),
    KYC("kyc");
}
```

### `ProvingRequest.kt`

```kotlin
data class ProvingRequest(
    val circuitType: CircuitType,
    val disclosures: Disclosures = Disclosures(),
    val scope: String? = null,
    val endpoint: String? = null,
    val endpointType: EndpointType = EndpointType.CELO,
    val chainId: Int? = null,
    val userId: String? = null,
    val userDefinedData: String = "",
    val selfDefinedData: String = "",
    val version: Int = 1,
)

data class Disclosures(
    val name: Boolean = false,
    val dateOfBirth: Boolean = false,
    val gender: Boolean = false,
    val passportNumber: Boolean = false,
    val issuingState: Boolean = false,
    val nationality: Boolean = false,
    val expiryDate: Boolean = false,
    val ofac: Boolean = false,
    val excludedCountries: List<String> = emptyList(),
    val minimumAge: Int? = null,
) {
    val revealedAttributes: List<String> get() = buildList {
        if (name) add("name")
        if (dateOfBirth) add("date_of_birth")
        if (gender) add("gender")
        if (passportNumber) add("passport_number")
        if (issuingState) add("issuing_state")
        if (nationality) add("nationality")
        if (expiryDate) add("expiry_date")
    }
}
```

### `EndpointType.kt`

```kotlin
enum class EndpointType {
    CELO, STAGING_CELO, HTTPS
}
```

### `IDDocument.kt` (common model hierarchy)

```kotlin
sealed class IDDocument {
    abstract val documentCategory: DocumentCategory
    abstract val mock: Boolean
    abstract val dscAuthorityKeyIdentifier: String?
}

data class PassportData(
    override val documentCategory: DocumentCategory,  // PASSPORT or ID_CARD
    override val mock: Boolean,
    override val dscAuthorityKeyIdentifier: String?,
    val mrz: String,                          // 88-char MRZ string
    val eContent: ByteArray,
    val dsc: String,                          // DSC certificate PEM
    val passportMetadata: PassportMetadata?,
    val dscParsed: ParsedCertificate?,
    val cscaParsed: ParsedCertificate?,
) : IDDocument()

data class PassportMetadata(
    val countryCode: String,
    val cscaFound: Boolean,
    val dg1HashFunction: String,              // "sha256", "sha384", "sha512"
    val eContentHashFunction: String,
    val signedAttrHashFunction: String,
    val signatureAlgorithm: String,           // "ecdsa", "rsa", "rsapss"
    val curveOrExponent: String,              // "secp256r1", "65537", etc.
    val saltLength: String? = null,
    val signatureAlgorithmBits: String? = null,
    val cscaHashFunction: String? = null,
    val cscaSignatureAlgorithm: String? = null,
    val cscaCurveOrExponent: String? = null,
    val cscaSaltLength: String? = null,
    val cscaSignatureAlgorithmBits: String? = null,
)

data class AadhaarData(
    override val documentCategory: DocumentCategory = DocumentCategory.AADHAAR,
    override val mock: Boolean,
    override val dscAuthorityKeyIdentifier: String? = null,
    val qrData: String,
    val extractedFields: AadhaarFields,
    val publicKey: String,
) : IDDocument()

data class KycData(
    override val documentCategory: DocumentCategory = DocumentCategory.KYC,
    override val mock: Boolean,
    override val dscAuthorityKeyIdentifier: String? = null,
    val serializedApplicantInfo: String,
    val signature: String,
    val pubkey: Pair<String, String>,
) : IDDocument()
```

### `ProtocolData.kt`

```kotlin
data class ProtocolData(
    val deployedCircuits: DeployedCircuits,
    val circuitsDnsMapping: CircuitsDnsMapping,
    val dscTree: String,                    // Serialized LeanIMT
    val cscaTree: List<List<String>>,       // 2D Merkle tree
    val commitmentTree: String,             // Serialized LeanIMT
    val ofacTrees: OfacTrees,
    val alternativeCsca: AlternativeCsca?,
) {
    /**
     * Resolve WebSocket URL for a specific circuit from DNS mapping.
     */
    fun resolveWebSocketUrl(circuitType: CircuitType, document: IDDocument): String {
        val mappingKey = MappingKeyResolver.resolve(circuitType, document.documentCategory)
        val circuitName = CircuitNameResolver.resolve(document, circuitType)
        return circuitsDnsMapping.mapping[mappingKey]?.get(circuitName)
            ?: throw ProvingException("CIRCUIT_NOT_FOUND",
                "No WebSocket URL for $mappingKey/$circuitName")
    }
}

@Serializable
data class DeployedCircuits(
    @SerialName("REGISTER") val register: List<String> = emptyList(),
    @SerialName("REGISTER_ID") val registerId: List<String> = emptyList(),
    @SerialName("REGISTER_AADHAAR") val registerAadhaar: List<String> = emptyList(),
    @SerialName("REGISTER_KYC") val registerKyc: List<String> = emptyList(),
    @SerialName("DSC") val dsc: List<String> = emptyList(),
    @SerialName("DSC_ID") val dscId: List<String> = emptyList(),
    @SerialName("DISCLOSE") val disclose: List<String> = emptyList(),
    @SerialName("DISCLOSE_ID") val discloseId: List<String> = emptyList(),
    @SerialName("DISCLOSE_AADHAAR") val discloseAadhaar: List<String> = emptyList(),
    @SerialName("DISCLOSE_KYC") val discloseKyc: List<String> = emptyList(),
) {
    fun getCircuits(mappingKey: String): List<String> = when (mappingKey) {
        "REGISTER" -> register
        "REGISTER_ID" -> registerId
        "REGISTER_AADHAAR" -> registerAadhaar
        "REGISTER_KYC" -> registerKyc
        "DSC" -> dsc
        "DSC_ID" -> dscId
        "DISCLOSE" -> disclose
        "DISCLOSE_ID" -> discloseId
        "DISCLOSE_AADHAAR" -> discloseAadhaar
        "DISCLOSE_KYC" -> discloseKyc
        else -> emptyList()
    }
}

typealias CircuitsDnsMapping = Map<String, Map<String, String>>

@Serializable
data class OfacTrees(
    val nameAndDob: String,       // Serialized SMT
    val nameAndYob: String,       // Serialized SMT
    val passportNoAndNationality: String? = null,  // Passport only
)

typealias AlternativeCsca = Map<String, String>  // CSCA label → PEM
```

### `PayloadModels.kt`

```kotlin
data class EncryptedPayload(
    val nonce: ByteArray,       // 12 bytes
    val ciphertext: ByteArray,
    val authTag: ByteArray,     // 16 bytes
)

data class CircuitInputs(
    val inputs: JsonElement,
    val circuitName: String,
    val endpointType: EndpointType,
    val endpoint: String,
)
```

### `PayloadBuilder.kt`

Port of `getPayload` from `common/src/utils/proving.ts`:

```kotlin
object PayloadBuilder {
    /**
     * Build the plaintext payload to encrypt and send to TEE.
     * Handles BigInt serialization via custom replacer.
     */
    fun build(
        inputs: CircuitInputs,
        circuitType: CircuitType,
        document: IDDocument,
        request: ProvingRequest,
    ): String {
        val payloadJson = buildJsonObject {
            put("type", resolvePayloadType(circuitType, document.documentCategory))
            put("onchain", inputs.endpointType == EndpointType.CELO)
            put("endpointType", inputs.endpointType.name.lowercase())
            putJsonObject("circuit") {
                put("name", inputs.circuitName)
                put("inputs", Json.encodeToString(inputs.inputs))  // Nested JSON string
            }

            // Disclose-specific fields
            if (circuitType == CircuitType.DISCLOSE) {
                put("endpoint", inputs.endpoint)
                put("version", request.version)
                put("userDefinedData", request.userDefinedData)
                put("selfDefinedData", request.selfDefinedData)
            }
        }
        return Json.encodeToString(payloadJson)
    }

    private fun resolvePayloadType(circuitType: CircuitType, category: DocumentCategory): String {
        return when (circuitType) {
            CircuitType.REGISTER -> when (category) {
                DocumentCategory.PASSPORT -> "register"
                DocumentCategory.ID_CARD -> "register_id"
                DocumentCategory.AADHAAR -> "register_aadhaar"
                DocumentCategory.KYC -> "register_kyc"
            }
            CircuitType.DSC -> when (category) {
                DocumentCategory.PASSPORT -> "dsc"
                DocumentCategory.ID_CARD -> "dsc_id"
                else -> throw IllegalArgumentException("DSC not supported for $category")
            }
            CircuitType.DISCLOSE -> when (category) {
                DocumentCategory.PASSPORT -> "disclose"
                DocumentCategory.ID_CARD -> "disclose_id"
                DocumentCategory.AADHAAR -> "disclose_aadhaar"
                DocumentCategory.KYC -> "disclose_kyc"
            }
        }
    }
}
```

---

## Chunking Guide

### Chunk 4A: Models + ProtocolDataStore (start here)

**Goal**: Define all data models and implement HTTP fetching.

**Steps**:
1. Create all model files in `proving/models/`
2. Implement `ProtocolDataStore.kt` with all 7 fetchers
3. Add Ktor HTTP client dependencies to `build.gradle.kts`
4. Write unit tests for model serialization
5. Validate: API calls return correct data, models deserialize

### Chunk 4B: Platform Crypto

**Goal**: Implement `expect`/`actual` for all cryptographic operations.

**Steps**:
1. Define `PlatformCrypto` expect in `commonMain`
2. Implement `androidMain` actual (BouncyCastle + JCE)
3. Implement `iosMain` actual (Security framework via Swift provider, or direct CommonCrypto cinterop)
4. Test: ECDH key exchange, AES-GCM encrypt/decrypt roundtrip, SHA-256, RSA verify
5. Validate: Same inputs produce same outputs on both platforms

**Note**: For iOS, crypto can use the same Swift provider pattern from [SPEC-PERSON2-IOS.md](./SPEC-PERSON2-IOS.md) — add a `PlatformCryptoProvider` interface and Swift implementation. Or if CommonCrypto cinterop works (it's simpler than UIKit cinterop), use it directly.

### Chunk 4C: TEE Connection + Attestation

**Goal**: WebSocket connection, attestation validation, ECDH handshake.

**Steps**:
1. Implement `TeeConnection.kt` — WebSocket connect, hello, receive attestation
2. Implement `TeeAttestation.kt` — JWT validation, certificate chain, PCR0 check
3. Implement `PayloadEncryption.kt` — AES-GCM encrypt with shared key
4. Add Ktor WebSocket dependencies
5. Test: Connect to TEE endpoint, validate attestation, derive shared key

### Chunk 4D: Document Validation + Circuit Names

**Goal**: All validation logic and circuit name resolution.

**Steps**:
1. Implement `DocumentValidator.kt` with all validation functions
2. Implement `CircuitNameResolver.kt` and `MappingKeyResolver`
3. Implement `CommitmentGenerator.kt` (requires Poseidon hash — see dependencies below)
4. Implement `SelectorGenerator.kt` for DG1 selector bits
5. Port LeanIMT tree operations (import, indexOf) for commitment/DSC lookup
6. Test: Validation returns correct results for each document type

**Poseidon Hash Dependency**: The TypeScript uses `poseidon-lite` for Poseidon-2 and Poseidon-5. Options for Kotlin:
- Port the Poseidon implementation to Kotlin (the algorithm is well-defined, ~200 lines)
- Use a KMP-compatible Poseidon library if one exists
- Call into JavaScript via embedded engine (last resort)

### Chunk 4E: Circuit Input Generation

**Goal**: Port all circuit input generators.

**Steps**:
1. Implement `CircuitInputGenerator.kt` — register, DSC, disclose for each document type
2. Port `generateCircuitInputsRegister` from `common/src/utils/circuits/registerInputs.ts`
3. Port `generateCircuitInputsDSC`
4. Port `generateCircuitInputsVCandDisclose`
5. Port Aadhaar and KYC-specific input generators
6. Test: Same inputs as TypeScript for known test vectors

### Chunk 4F: State Machine + Status Listener + Public API

**Goal**: Wire everything together.

**Steps**:
1. Implement `ProvingStateMachine.kt` — orchestrate the full flow
2. Implement `StatusListener.kt` — Socket.IO polling
3. Implement `ProvingClient.kt` — public API
4. Implement `PayloadBuilder.kt` — payload construction
5. Integration test: Full prove() flow against staging TEE
6. Validate: End-to-end proof generation works on both platforms

---

## Critical Implementation Notes

### BigInt Handling

TypeScript uses native `BigInt` extensively for circuit inputs and Poseidon hashes. Kotlin options:
- `java.math.BigInteger` on JVM/Android
- Need a `commonMain` BigInt: Use `com.ionspin.kotlin.bignum:bignum` KMP library, or define expect/actual wrapping platform BigInteger

### Poseidon Hash

Must produce identical outputs to `poseidon-lite` npm package. The Poseidon hash uses specific round constants and parameters for each width (2, 5). Port the constants from the npm package source.

### LeanIMT (Lean Incremental Merkle Tree)

Port of `@openpassport/zk-kit-lean-imt`. Key operations needed:
- `import(hashFn, serialized)` — deserialize tree from JSON
- `indexOf(leaf)` — find leaf index in tree
- `generateProof(index)` — generate inclusion proof (for circuit inputs)

### SMT (Sparse Merkle Tree)

Port of `@openpassport/zk-kit-smt`. Used for OFAC checks. Key operations:
- `import(serialized)` — deserialize
- `createProof(key)` — inclusion/exclusion proof

### JSON Serialization with BigInt

Circuit inputs contain BigInt values that must be serialized as strings (not numbers) in JSON. Use a custom serializer:

```kotlin
fun bigIntReplacer(value: Any): Any = when (value) {
    is BigInteger -> value.toString()
    else -> value
}
```

---

## Testing Strategy

1. **Unit tests** (`commonTest/`):
   - Model serialization/deserialization
   - Circuit name resolution for known document types
   - Selector bit generation
   - Commitment generation with known test vectors
   - Payload encryption roundtrip

2. **Integration tests** (manual or CI):
   - Protocol data fetching against staging API
   - TEE connection + attestation against staging TEE
   - Full proof generation for a test passport

3. **Cross-platform verification**:
   - Same inputs → same circuit inputs on Android and iOS
   - Same inputs → same commitment hash on Android and iOS

---

## Dependencies

- **SPEC-PERSON2-KMP.md**: Bridge protocol, common models (complete)
- **SPEC-PERSON2-IOS.md**: iOS crypto provider (Chunk 4B may need this for iOS actual)
- **SPEC-MINIPAY-SAMPLE.md**: Depends on this spec's `ProvingClient` public API

## Key TypeScript Reference Files

| TypeScript File | What to Port | Kotlin Target |
|---|---|---|
| `packages/mobile-sdk-alpha/src/proving/provingMachine.ts` | State machine, WebSocket handling, proof flow | `ProvingStateMachine.kt`, `TeeConnection.kt` |
| `packages/mobile-sdk-alpha/src/proving/internal/statusHandlers.ts` | Socket.IO status parsing | `StatusListener.kt` |
| `common/src/utils/proving.ts` | `getPayload`, `encryptAES256GCM`, `getWSDbRelayerUrl` | `PayloadBuilder.kt`, `PayloadEncryption.kt` |
| `common/src/utils/attest.ts` | `validatePKIToken`, `checkPCR0Mapping` | `TeeAttestation.kt` |
| `common/src/utils/circuits/registerInputs.ts` | `generateCircuitInputsRegister`, `generateCircuitInputsDSC`, `generateCircuitInputsVCandDisclose`, `getSelectorDg1` | `CircuitInputGenerator.kt`, `SelectorGenerator.kt` |
| `common/src/utils/circuits/circuitsName.ts` | `getCircuitNameFromPassportData` | `CircuitNameResolver.kt` |
| `common/src/utils/passports/validate.ts` | `checkDocumentSupported`, `isUserRegistered`, `isDocumentNullified`, `checkIfPassportDscIsInTree` | `DocumentValidator.kt` |
| `common/src/utils/passports/passport.ts` | `generateCommitment`, `packBytesAndPoseidon`, `formatMrz` | `CommitmentGenerator.kt`, `PoseidonUtils.kt` |
| `common/src/constants/constants.ts` | `PASSPORT_ATTESTATION_ID`, `ID_CARD_ATTESTATION_ID`, API URLs | `AttestationId` object, `Environment` enum |
| `packages/mobile-sdk-alpha/src/stores/protocolStore.ts` | Protocol data fetching, tree caching | `ProtocolDataStore.kt` |
