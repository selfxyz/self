# Common Package Refactoring Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restructure `@selfxyz/common` into a layered, domain-driven architecture with dependency injection, factory patterns, and strict dependency boundaries — placing the new structure in `new-common/`.

**Architecture:** Decompose the monolithic `common/src/` into 10 bounded modules across 4 dependency layers. Foundation (Layer 0) holds types, constants, and primitive utilities with zero internal deps. Crypto (Layer 1) depends only on foundation. Domain modules — documents, certificates, circuits, trees, attestation, blockchain (Layer 2) — depend on Layer 0+1 only. App (Layer 3) is the public SDK entry point. A separate `testing/` module isolates all mock data from production bundles. An `IDocument` adapter provides polymorphic document access without breaking existing data interfaces.

**Tech Stack:** TypeScript, tsup (ESM+CJS), Yarn v4 workspaces, Vitest, poseidon-lite, elliptic, @peculiar/x509

---

## Context

The `@selfxyz/common` package is the backbone of the Self identity verification system, consumed by 150+ files across 6 workspace packages (`app/`, `packages/mobile-sdk-alpha/`, `circuits/`, `contracts/`, `sdk/core/`, `packages/mobile-sdk-demo/`). It has grown organically into a ~100-file, 80-export-entry monolith with several structural problems:

1. **Monolithic constants** — `constants.ts` (631 LOC) mixes circuit params, network URLs, verifier enums, country codes, and crypto config
2. **No dependency layers** — `trees.ts` (860 LOC) imports from passports, hash, bytes, constants with no clear hierarchy
3. **Mock data in production** — `genMockPassportData.ts`, `mockDsc.ts`, `vkey.ts` (64KB) ship in production bundles
4. **Platform coupling** — `parseCertificateNode.ts` side effects leak into React Native via transitive imports (currently hacked around with `sideEffects` in package.json)
5. **No polymorphism** — Circuit input generation uses if/else on document category instead of strategy pattern; documents are plain data with no behavioral interface
6. **No interfaces** — Attestation verifiers (GCP, AWS Nitro) have no shared contract; 4 document types have no common accessor interface

The refactoring creates a `new-common/` folder with the new architecture, then migrates consumers with compatibility re-exports at old paths.

---

## New Folder Structure

```
new-common/src/
├── foundation/                          # Layer 0: ZERO internal dependencies
│   ├── types/
│   │   ├── document.ts                  # IDDocument, PassportData, AadhaarData, KycData, type guards
│   │   ├── certificate.ts               # CertificateData, PublicKeyDetails*
│   │   ├── circuit.ts                   # SignatureAlgorithm, Proof, DocumentCategory, DeployedCircuits
│   │   ├── app.ts                       # SelfApp, SelfAppDisclosureConfig, EndpointType
│   │   ├── attestation.ts               # TEEPayload types
│   │   ├── environment.ts               # Environment, OfacTree, DocumentCatalog, DocumentMetadata
│   │   └── index.ts                     # Barrel
│   ├── constants/
│   │   ├── circuit.ts                   # CIRCUIT_CONSTANTS, CIRCUIT_TYPES, tree depths, MAX_* values
│   │   ├── crypto.ts                    # hashAlgos, saltLengths, k_*/n_* params, MAX_BYTES_IN_FIELD
│   │   ├── network.ts                   # API_URL, WS_DB_RELAYER, RPC_URL, tree URLs, contract addresses
│   │   ├── identity.ts                  # ATTESTATION_IDs, RegisterVerifierId, DscVerifierId, SignatureAlgorithmIndex
│   │   ├── disclosure.ts               # attributeToPosition, attributeToPosition_ID, revealedDataTypes
│   │   ├── countries.ts                 # countryCodes, getCountryCode, Country3LetterCode (static data)
│   │   └── index.ts                     # Barrel
│   ├── bytes.ts                         # packBytes, splitToWords, hex conversions
│   ├── date.ts                          # getCurrentDateYYMMDD, timestamp utils
│   ├── arrays.ts                        # arraysAreEqual, findSubarrayIndex
│   └── index.ts                         # Barrel
│
├── crypto/                              # Layer 1: Depends ONLY on foundation
│   ├── hash/
│   │   ├── interface.ts                 # IHasher interface
│   │   ├── sha.ts                       # SHA1/224/256/384/512 dispatch
│   │   ├── poseidon.ts                  # flexiblePoseidon, poseidon wrappers
│   │   ├── custom.ts                    # customHasher, packBytesAndPoseidon
│   │   └── index.ts                     # Barrel: exports hash(), getHashLen(), etc.
│   ├── scope.ts                         # stringToBigInt, formatEndpoint, hashEndpointWithScope
│   ├── identity.ts                      # calculateUserIdentifierHash, getSolidityPackedUserContextData
│   ├── encryption.ts                    # encryptAES256GCM, EC key generation (from proving.ts)
│   ├── sha-pad.ts                       # sha384_512Pad, padding for circuits (from shaPad.ts)
│   └── index.ts                         # Barrel
│
├── certificates/                        # Layer 1.5: Depends on foundation + crypto
│   ├── parsing/
│   │   ├── interface.ts                 # ICertificateParser interface (DI point)
│   │   ├── simple.ts                    # parseCertificateSimple (browser/RN safe)
│   │   ├── node.ts                      # parseCertificateNode (Node.js only)
│   │   ├── factory.ts                   # createCertificateParser(env?) factory
│   │   └── index.ts
│   ├── curves.ts                        # StandardCurve, getCurveForElliptic, identifyCurve
│   ├── oids.ts                          # oidMap, extractHashFunction, OID registry
│   ├── utils.ts                         # certUtils + curveUtils + oidUtils merged
│   ├── elliptic.ts                      # initElliptic, lazy-load wrapper
│   ├── csca.ts                          # findOIDPosition, findStartIndex, getSKIPEM
│   └── index.ts                         # Barrel
│
├── documents/                           # Layer 2: Depends on foundation, crypto, certificates
│   ├── interface.ts                     # IDocument interface (core + disclosure accessors)
│   ├── factory.ts                       # createDocument(data: IDDocument): IDocument
│   ├── passport/
│   │   ├── adapter.ts                   # PassportDocument implements IDocument
│   │   ├── parsing.ts                   # parsePassportData, initPassportDataParsing
│   │   ├── format.ts                    # formatMrz, DG1 helpers
│   │   ├── commitment.ts               # generateCommitment, generateNullifier, calculateContentHash
│   │   ├── signature.ts                 # extractRSFromSignature, findStartPubKeyIndex
│   │   ├── dsc-parsing.ts              # parseDscCertificateData, DscCertificateMetaData
│   │   ├── core.ts                      # pad, getNAndK, inferDocumentCategory
│   │   ├── validate.ts                  # passport/MRZ validation
│   │   └── index.ts
│   ├── aadhaar/
│   │   ├── adapter.ts                   # AadhaarDocument implements IDocument
│   │   ├── parsing.ts                   # extractQRDataFields, getAadharRegistrationWindow
│   │   ├── constants.ts                 # Field positions, selectors
│   │   └── index.ts
│   ├── kyc/
│   │   ├── adapter.ts                   # KycDocument implements IDocument
│   │   ├── types.ts                     # KycRegisterInput, serializeKycData
│   │   ├── constants.ts                 # KYC field positions, lengths, createKycSelector
│   │   ├── api.ts                       # deserializeApplicantInfo
│   │   ├── ecdsa.ts                     # KYC ECDSA utilities
│   │   └── index.ts
│   └── index.ts
│
├── circuits/                            # Layer 2: Depends on foundation, crypto, documents
│   ├── inputs/
│   │   ├── interface.ts                 # ICircuitInputGenerator<T> interface (DI point)
│   │   ├── register.ts                  # generateCircuitInputsRegister
│   │   ├── dsc.ts                       # generateCircuitInputsDSC
│   │   ├── disclose.ts                  # generateCircuitInputsVCandDisclose
│   │   ├── ofac.ts                      # OFAC-specific inputs
│   │   ├── aadhaar.ts                   # generateTEEInputsAadhaarRegister/Disclose
│   │   ├── kyc.ts                       # KYC circuit inputs
│   │   ├── format.ts                    # formatCountriesList, reverseBytes
│   │   ├── factory.ts                   # createInputGenerator(documentCategory) factory
│   │   └── index.ts
│   ├── outputs/
│   │   ├── format.ts                    # unpackReveal, formatForbiddenCountriesList
│   │   └── index.ts
│   ├── naming.ts                        # getCircuitNameFromPassportData
│   ├── uuid.ts                          # castFromUUID, validateUserId, UserIdType
│   └── index.ts
│
├── trees/                               # Layer 2: Depends on foundation, crypto
│   ├── interface.ts                     # ITreeBuilder interface (DI point)
│   ├── smt.ts                           # SMT construction (passport, aadhaar, kyc variants)
│   ├── leaves.ts                        # getLeafDscTree, getLeafCscaTree, getNameDobLeaf, etc.
│   ├── proofs.ts                        # generateSMTProof, inclusion proof helpers
│   ├── ofac.ts                          # fetchOfacTrees
│   └── index.ts
│
├── attestation/                         # Layer 2: Depends on foundation, crypto
│   ├── interface.ts                     # IAttestationVerifier interface (DI point)
│   ├── gcp.ts                           # GCP Confidential Space (from attest.ts)
│   ├── aws-nitro.ts                     # AWS Nitro COSE verification (from cose.ts)
│   ├── self.ts                          # Self attestation (from selfAttestation.ts)
│   ├── factory.ts                       # createAttestationVerifier(provider) factory
│   └── index.ts
│
├── blockchain/                          # Layer 2: Depends on foundation
│   ├── contracts.ts                     # forbiddenCountries, formatCallData
│   ├── proving.ts                       # getPayload, getWSDbRelayerUrl (TEE payload)
│   └── index.ts
│
├── app/                                 # Layer 3: Depends on foundation, crypto
│   ├── builder.ts                       # SelfAppBuilder class
│   ├── links.ts                         # getUniversalLink
│   └── index.ts
│
├── testing/                             # SEPARATE entrypoint — never in production bundle
│   ├── mock-passport.ts                 # genMockPassportData, genAndInitMockPassportData
│   ├── mock-id-doc.ts                   # genMockIdDoc, genMockIdDocAndInitDataParsing, generateMockDSC
│   ├── mock-aadhaar.ts                  # Aadhaar test data and helpers
│   ├── mock-kyc.ts                      # KYC test data
│   ├── mock-dsc.ts                      # getMockDSC utilities
│   ├── fixtures/
│   │   ├── sample-data-hashes.ts        # sampleDataHashes (from constants/)
│   │   ├── mock-certificates.ts         # mockCertificates (from constants/)
│   │   └── vkey.ts                      # 64KB verification keys (from constants/)
│   └── index.ts
│
├── data/                                # Layer 0: Large static datasets
│   ├── ski-pem.ts                       # SKI->PEM mapping (from constants/skiPem.ts)
│   └── countries-extended.ts            # commonNames, alpha2/alpha3 conversions (from countries.ts)
│
├── polyfills/
│   └── crypto.ts                        # Cross-platform crypto polyfill (unchanged)
│
└── index.ts                             # Master barrel re-export
```

---

## Dependency Layer Rules

```
Layer 0 (foundation, data)     → external deps only, ZERO internal deps
Layer 1 (crypto)               → foundation only
Layer 1.5 (certificates)       → foundation + crypto only
Layer 2 (documents, circuits, trees, attestation, blockchain) → Layer 0 + 1 + 1.5
Layer 3 (app)                  → Layer 0 + 1
testing/                       → ALL layers (never imported by production code)
```

**Hard rule:** No upward dependencies. Layer 0 NEVER imports from Layer 1+. Violations are build errors.

---

## Dependency Injection & Factory Patterns

### 1. IDocument Adapter (polymorphic document access)

**Problem:** 4 document types (passport, id_card, aadhaar, kyc) are plain data interfaces. Consumers use scattered `if (isMRZDocument) ... else if (isAadhaarDocument) ...` to extract names, dates, nationalities. This pattern is repeated across `app/`, `packages/mobile-sdk-alpha/`, and `circuits/`.

**Solution:** Adapter pattern — keep the existing data interfaces (PassportData, AadhaarData, KycData) for serialization/transport, wrap them in an IDocument adapter for behavioral access.

```typescript
// documents/interface.ts
export interface IDocument {
  // Identity
  readonly category: DocumentCategory;
  readonly type: DocumentType;
  readonly raw: IDDocument;
  readonly isMock: boolean;

  // Core accessors — extract data uniformly across document types
  getName(): string;                    // Full name from MRZ / QR / KYC
  getDateOfBirth(): string;             // Normalized YYMMDD
  getNationality(): string;             // 3-letter country code
  getDocumentNumber(): string;          // Passport number / Aadhaar ID / KYC doc number
  getGender(): string;                  // M/F/<
  getExpiryDate(): string | null;       // YYMMDD or null (Aadhaar has none)
  isExpired(): boolean;                 // Compares expiry to current date
  getContentHash(): string;             // For deduplication (used by DocumentCatalog)

  // Disclosure helpers — handle attribute position differences per doc type
  getDiscloseName(): string;            // Name formatted for disclosure circuit
  getAttributePositions(): Record<string, [number, number]>;  // attributeToPosition or attributeToPosition_ID
  getRevealBitmap(disclosures: Record<string, boolean>): number[];  // Build reveal bitmap from disclosure config
  getDisclosureSlice(attribute: string): string;  // Extract specific attribute value by name
}

// documents/factory.ts
export function createDocument(data: IDDocument): IDocument {
  switch (data.documentCategory) {
    case 'passport':
    case 'id_card':
      return new PassportDocument(data);
    case 'aadhaar':
      return new AadhaarDocument(data);
    case 'kyc':
      return new KycDocument(data);
  }
}
```

**Document adapter implementations:**

```typescript
// documents/passport/adapter.ts
export class PassportDocument implements IDocument {
  readonly category: DocumentCategory;
  readonly type: DocumentType;
  readonly raw: PassportData;
  readonly isMock: boolean;

  constructor(data: PassportData) {
    this.raw = data;
    this.category = data.documentCategory;
    this.type = data.documentType;
    this.isMock = data.mock;
  }

  getName(): string {
    // Extract from MRZ positions 5-43 (passport) or 60-89 (id_card)
    const positions = this.getAttributePositions();
    const [start, end] = positions.name;
    return this.raw.mrz.substring(start, end + 1).replace(/</g, ' ').trim();
  }

  getDateOfBirth(): string {
    const positions = this.getAttributePositions();
    const [start, end] = positions.date_of_birth;
    return this.raw.mrz.substring(start, end + 1);
  }

  getNationality(): string {
    const positions = this.getAttributePositions();
    const [start, end] = positions.nationality;
    return this.raw.mrz.substring(start, end + 1).replace(/</g, '');
  }

  getDocumentNumber(): string {
    const positions = this.getAttributePositions();
    const [start, end] = positions.passport_number;
    return this.raw.mrz.substring(start, end + 1).replace(/</g, '');
  }

  getGender(): string {
    const positions = this.getAttributePositions();
    const [start, end] = positions.gender;
    return this.raw.mrz.substring(start, end + 1);
  }

  getExpiryDate(): string {
    const positions = this.getAttributePositions();
    const [start, end] = positions.expiry_date;
    return this.raw.mrz.substring(start, end + 1);
  }

  isExpired(): boolean {
    // Compare YYMMDD expiry to current date
    const expiry = this.getExpiryDate();
    const now = getCurrentDateYYMMDD();
    return expiry < now;
  }

  getContentHash(): string {
    return calculateContentHash(this.raw);
  }

  getDiscloseName(): string {
    // For passports: MRZ name with < separators (surname<<given)
    // For id_cards: different MRZ layout
    return this.getName();
  }

  getAttributePositions(): Record<string, [number, number]> {
    return this.category === 'id_card' ? attributeToPosition_ID : attributeToPosition;
  }

  getRevealBitmap(disclosures: Record<string, boolean>): number[] {
    const positions = this.getAttributePositions();
    // Build bitmap based on which attributes are disclosed
    return Object.entries(disclosures)
      .filter(([_, disclosed]) => disclosed)
      .map(([attr]) => revealedDataTypes[attr])
      .filter((idx): idx is number => idx !== undefined);
  }

  getDisclosureSlice(attribute: string): string {
    const positions = this.getAttributePositions();
    const [start, end] = positions[attribute];
    return this.raw.mrz.substring(start, end + 1);
  }
}
```

```typescript
// documents/aadhaar/adapter.ts
export class AadhaarDocument implements IDocument {
  readonly category: DocumentCategory = 'aadhaar';
  readonly type: DocumentType;
  readonly raw: AadhaarData;
  readonly isMock: boolean;

  constructor(data: AadhaarData) {
    this.raw = data;
    this.type = data.documentType;
    this.isMock = data.mock;
  }

  getName(): string {
    return this.raw.extractedFields.name ?? '';
  }

  getDateOfBirth(): string {
    // Convert from DD-MM-YYYY to YYMMDD
    const dob = this.raw.extractedFields.dateOfBirth;
    if (!dob) return '';
    const parts = dob.split('-');
    return parts[2].slice(-2) + parts[1] + parts[0];
  }

  getNationality(): string {
    return 'IND'; // Aadhaar is India-only
  }

  getDocumentNumber(): string {
    return this.raw.extractedFields.referenceId ?? '';
  }

  getGender(): string {
    return this.raw.extractedFields.gender ?? '<';
  }

  getExpiryDate(): string | null {
    return null; // Aadhaar does not expire
  }

  isExpired(): boolean {
    return false;
  }

  getContentHash(): string {
    // Hash of QR data for dedup
    return hash('sha256', this.raw.qrData);
  }

  getDiscloseName(): string {
    return this.getName();
  }

  getAttributePositions(): Record<string, [number, number]> {
    // Aadhaar uses its own field positions defined in aadhaar/constants.ts
    return aadhaarAttributePositions;
  }

  getRevealBitmap(disclosures: Record<string, boolean>): number[] {
    // Aadhaar-specific bitmap construction
    return buildAadhaarRevealBitmap(disclosures);
  }

  getDisclosureSlice(attribute: string): string {
    // Extract from QR data fields
    return this.raw.extractedFields[attribute] ?? '';
  }
}
```

```typescript
// documents/kyc/adapter.ts
export class KycDocument implements IDocument {
  readonly category: DocumentCategory = 'kyc';
  readonly type: DocumentType;
  readonly raw: KycData;
  readonly isMock: boolean;

  constructor(data: KycData) {
    this.raw = data;
    this.type = data.documentType;
    this.isMock = data.mock;
  }

  getName(): string {
    const info = deserializeApplicantInfo(this.raw.serializedApplicantInfo);
    return `${info.firstName} ${info.lastName}`.trim();
  }

  getDateOfBirth(): string {
    const info = deserializeApplicantInfo(this.raw.serializedApplicantInfo);
    // Convert from YYYY-MM-DD to YYMMDD
    return info.dateOfBirth.replace(/-/g, '').slice(2);
  }

  getNationality(): string {
    const info = deserializeApplicantInfo(this.raw.serializedApplicantInfo);
    return info.country ?? '';
  }

  getDocumentNumber(): string {
    const info = deserializeApplicantInfo(this.raw.serializedApplicantInfo);
    return info.idNumber ?? '';
  }

  getGender(): string {
    const info = deserializeApplicantInfo(this.raw.serializedApplicantInfo);
    return info.gender ?? '<';
  }

  getExpiryDate(): string | null {
    return null; // KYC verification doesn't have a standard expiry
  }

  isExpired(): boolean {
    return false;
  }

  getContentHash(): string {
    return hash('sha256', this.raw.serializedApplicantInfo);
  }

  getDiscloseName(): string {
    return this.getName();
  }

  getAttributePositions(): Record<string, [number, number]> {
    return kycAttributePositions; // From kyc/constants.ts
  }

  getRevealBitmap(disclosures: Record<string, boolean>): number[] {
    return createKycSelector(disclosures);
  }

  getDisclosureSlice(attribute: string): string {
    const info = deserializeApplicantInfo(this.raw.serializedApplicantInfo);
    return info[attribute] ?? '';
  }
}
```

**Files:** `documents/interface.ts`, `documents/factory.ts`, `documents/passport/adapter.ts`, `documents/aadhaar/adapter.ts`, `documents/kyc/adapter.ts`

**Implementation notes:**
- `IDocument` interface defined in `documents/interface.ts` with `DocumentAttribute` and `DisclosureField` types
- `createDocument()` factory dispatches on `documentCategory` to `PassportDocument`, `AadhaarDocument`, `KycDocument`
- Adapters implement `getAttribute()`, `isExpired()`, `getContentHash()`, `getAttestationId()`, circuit name resolution, commitment/nullifier generation, disclosure helpers

**Why adapter pattern over class hierarchy:**
- Existing `PassportData`, `AadhaarData`, `KycData` data interfaces stay unchanged — zero breaking changes for 150+ consumer files
- Data remains serializable (plain objects) for storage, transport, circuit inputs
- New code uses `const doc = createDocument(passportData); doc.getName()` — clean and polymorphic
- Old code keeps using `if (isMRZDocument(data)) data.mrz.substring(...)` — no forced migration

---

### 2. Certificate Parser Factory (highest value DI point)

**Problem:** `parseCertificateNode.ts` has side effects that leak into React Native bundles. Currently worked around with `sideEffects` in package.json.

**Solution:** Interface + factory with environment detection.

```typescript
// certificates/parsing/interface.ts
export interface ICertificateParser {
  parse(certPem: string): CertificateData;
  parseRaw(certDer: ArrayBuffer): CertificateData;
}

// certificates/parsing/factory.ts
export type CertParserEnv = 'node' | 'browser' | 'react-native';

export function createCertificateParser(env?: CertParserEnv): ICertificateParser {
  const detected = env ?? detectEnvironment();
  switch (detected) {
    case 'node':
      return new NodeCertificateParser();
    case 'browser':
    case 'react-native':
      return new SimpleCertificateParser();
  }
}
```

**Files:** `certificates/parsing/interface.ts`, `certificates/parsing/factory.ts`, `certificates/parsing/simple.ts`, `certificates/parsing/node.ts`

### 3. Circuit Input Generator Factory (strategy pattern)

**Problem:** `generateInputs.ts` uses if/else on document category, importing from passports, trees, hash, certificates — the highest-coupling module.

**Solution:** Strategy interface per document type with a factory dispatcher.

```typescript
// circuits/inputs/interface.ts
export interface ICircuitInputGenerator<T extends IDDocument = IDDocument> {
  generateRegisterInputs(doc: T, options: RegisterInputOptions): Promise<CircuitInputs>;
  generateDscInputs?(doc: T, options: DscInputOptions): Promise<CircuitInputs>;
  generateDiscloseInputs(doc: T, options: DiscloseInputOptions): Promise<CircuitInputs>;
}

// circuits/inputs/factory.ts
export function createInputGenerator(category: DocumentCategory): ICircuitInputGenerator {
  switch (category) {
    case 'passport':
    case 'id_card':
      return new PassportInputGenerator();
    case 'aadhaar':
      return new AadhaarInputGenerator();
    case 'kyc':
      return new KycInputGenerator();
  }
}
```

**Files:** `circuits/inputs/interface.ts`, `circuits/inputs/factory.ts`, `circuits/inputs/register.ts`, `circuits/inputs/dsc.ts`, `circuits/inputs/disclose.ts`, `circuits/inputs/aadhaar.ts`, `circuits/inputs/kyc.ts`

### 4. Attestation Verifier Factory

**Problem:** `attest.ts` (GCP) and `cose.ts` (AWS Nitro) do the same job with no shared contract. The proving flow selects one based on server config.

**Solution:** Shared interface + factory.

```typescript
// attestation/interface.ts
export interface IAttestationVerifier {
  verify(doc: Buffer, options?: VerifyOptions): Promise<AttestationResult>;
}

export interface AttestationResult {
  valid: boolean;
  userData?: Record<string, unknown>;
  pcr0?: string;
}

// attestation/factory.ts
export type AttestationProvider = 'gcp' | 'aws-nitro' | 'self';

export function createAttestationVerifier(provider: AttestationProvider): IAttestationVerifier {
  switch (provider) {
    case 'gcp': return new GCPAttestationVerifier();
    case 'aws-nitro': return new AWSNitroVerifier();
    case 'self': return new SelfAttestationVerifier();
  }
}
```

**Files:** `attestation/interface.ts`, `attestation/factory.ts`, `attestation/gcp.ts`, `attestation/aws-nitro.ts`, `attestation/self.ts`

### 5. Tree Builder Interface (for testability)

```typescript
// trees/interface.ts
export interface ITreeBuilder {
  buildTree(entries: TreeEntry[], depth: number): MerkleTree;
  generateProof(tree: MerkleTree, leaf: bigint): MerkleProof;
}
```

### Where DI is NOT applied

- **Hash functions** — deterministic, side-effect-free; direct import is correct
- **Byte utilities** — pure functions, no polymorphism needed
- **Constants** — static data
- **Type guards** — pure type narrowing (kept on data interfaces for backward compat)

---

## Constants Split Plan

Split `constants.ts` (631 LOC) into 6 thematic files:

| New File | Constants Moved | LOC |
|----------|----------------|-----|
| `foundation/constants/circuit.ts` | `CIRCUIT_CONSTANTS`, `CIRCUIT_TYPES`, `*_TREE_DEPTH`, `MAX_*_LEN`, `OFAC_TREE_LEVELS`, `DEFAULT_MAJORITY` | ~60 |
| `foundation/constants/crypto.ts` | `hashAlgos`, `hashAlgosTypes`, `saltLengths`, `k_*`, `n_*`, `max_*_bytes`, `MAX_BYTES_IN_FIELD`, `ECDSA_K_LENGTH_FACTOR`, `MAX_CERT_BYTES`, `MAX_PUBKEY_DSC_BYTES` | ~50 |
| `foundation/constants/network.ts` | `API_URL*`, `WS_*`, `RPC_URL`, `DEFAULT_RPC_URL`, `*_TREE_URL*`, `REDIRECT_URL`, `TREE_URL*`, `TREE_TRACKER_URL` | ~30 |
| `foundation/constants/identity.ts` | `*_ATTESTATION_ID`, `RegisterVerifierId`, `DscVerifierId`, `SignatureAlgorithmIndex`, `IDENTITY_VERIFICATION_HUB_ADDRESS*`, `PCR0_MANAGER_ADDRESS`, `REGISTER_CONTRACT_ADDRESS`, `SBT_CONTRACT_ADDRESS` | ~250 |
| `foundation/constants/disclosure.ts` | `attributeToPosition`, `attributeToPosition_ID`, `revealedDataTypes`, `circuitNameFromMode`, `circuitToSelectorMode`, `contribute_publicKey`, `DEFAULT_USER_ID_TYPE` | ~50 |
| `foundation/constants/countries.ts` | `countryCodes`, `getCountryCode`, `Country3LetterCode`, `document_type` | ~260 |

---

## Implementation Tasks

### Tasks 1-4: Foundation Layer [DONE]

Foundation layer complete. 18 files in `new-common/src/foundation/`. Zero TypeScript errors. Zero external imports.

- Task 1: Scaffold new-common structure
- Task 2: Extract foundation/types (document.ts, circuit.ts, environment.ts, app.ts, certificate.ts, attestation.ts)
- Task 3: Split foundation/constants (circuit, crypto, network, identity, disclosure, countries)
- Task 4: Extract foundation primitives (bytes.ts, date.ts, arrays.ts)

---

### Task 5: Crypto Layer (Pure Functions) [DONE]

- `crypto/hash/sha.ts` — `hash()`, `getHashLen()`
- `crypto/hash/poseidon.ts` — `flexiblePoseidon()`, `customHasher()`, `packBytesAndPoseidon()`
- `crypto/scope.ts` — `stringToBigInt`, `formatEndpoint`, `hashEndpointWithScope`
- `crypto/identity.ts` — `calculateUserIdentifierHash()`, `getSolidityPackedUserContextData()`
- `crypto/sha-pad.ts` — SHA padding for circuits
- `crypto/encryption.ts` — `encryptAES256GCM`
- `crypto/eddsa.ts` — `signEdDSA`, `modulus` (CJS-compatible via `getRequire()` helper)

**Deps added:** `ethers`, `js-sha1`, `js-sha256`, `js-sha512`, `node-forge`, `poseidon-lite`

**CJS fix (2026-03-02):** `eddsa.ts` uses `import.meta.url` which is undefined in CJS context. Added `getRequire()` helper that tries `import.meta.url` first, falls back to `__filename`. This is needed because tsup replaces `import.meta` with an empty object in CJS builds.

---

### Task 6: Certificate Parser Interface + Simple Implementation [DONE]

- `certificates/types.ts` — `ICertificateParser` interface
- `certificates/parsing/parseCertificateSimple.ts` — browser/RN parser
- `certificates/parsing/curves.ts`, `oids.ts`, `utils.ts`, `elliptic.ts`
- `certificates/factory.ts` — `createCertificateParser(env?)`
- `certificates/index.ts` — barrel

**Deps added:** `asn1js`, `pkijs`, `elliptic`, `hash.js`, `@types/elliptic`

---

### Task 7: Certificate Utility Functions [DONE]

- `certificates/signature.ts` — `extractRSFromSignature`, `formatSignatureDSCCircuit`, `getSignatureAlgorithmFullName`, `getNAndK`, `getNAndKCSCA`
- `certificates/pubkey.ts` — `getCertificatePubKey`, `formatCertificatePubKeyDSC`, `findStartPubKeyIndex`, `findStartIndex`, `findStartIndexEC`, `findOIDPosition`
- `certificates/parsing/bruteForceSignature.ts` — `bruteForceSignatureAlgorithmDsc`, `getTBSHash`
- `certificates/parsing/parseDscCertificateData.ts` — `DscCertificateMetaData`, `getCurveOrExponent`, `parseDscCertificateData`
- `certificates/csca.ts` — `getCSCAFromSKI`, `getSKIPEM`

**Note:** `getCSCAFromSKI` now requires `skiPem` parameter (no static fallback until data files ported in Task 15).

---

### Task 8: IDocument Interface + Adapters [DONE]

Eliminates 33+ branching points across 13 files.

**Creates:**
- `documents/types.ts` — `IDocument` interface + sub-interfaces:
  ```
  IDocument: raw, documentType, documentCategory, isMock,
    isMRZ(), isAadhaar(), isKyc(),
    getRegisterCircuitName(), getDscCircuitName(), getDiscloseCircuitName(),
    getAttestationId(), generateNullifier(), getContentHash(),
    generateCommitment(secret, attestationId),
    getDscParsed(), getCscaParsed()

  IPassportDocument extends IDocument: mrz, eContent, signedAttr, encryptedDigest, dsc, passportMetadata
  IAadhaarDocument extends IDocument: qrData, extractedFields, signature, publicKey
  IKycDocument extends IDocument: serializedApplicantInfo, signature, pubkey
  ```
- `documents/adapters/passport-adapter.ts` — `PassportDocumentAdapter implements IPassportDocument`
- `documents/adapters/aadhaar-adapter.ts` — `AadhaarDocumentAdapter implements IAadhaarDocument`
- `documents/adapters/kyc-adapter.ts` — `KycDocumentAdapter implements IKycDocument`
- `documents/factory.ts` — `createDocument(rawData: IDDocument): IDocument`
- `documents/index.ts` — barrel

**Key behavior moved into adapters:**
- Circuit name resolution (from `circuitsName.ts:3-150`)
- Content hash (from `passport.ts:47-72`)
- Commitment generation (from `passport.ts:160-189`)
- Nullifier generation (from `passport.ts:207-238`)
- Attestation ID lookup (from constants)

**Source:** `circuitsName.ts` (164), `passport.ts:47-72,160-238`, `kyc/utils.ts`, `format.ts`
**DI:** `IDocument` + sub-interfaces + `createDocument()` factory. Raw data types stay for serialization.
**Verify:** `yarn types` passes. `createDocument(passportData).getRegisterCircuitName()` works.

---

### Task 9: Document-Specific Utilities [DONE]

**Created:**
- `documents/passport/parsing.ts` — `parsePassportData`, `initPassportDataParsing`
- `documents/passport/format.ts` — `formatMrz`, DG1 helpers
- `documents/passport/core.ts` — `pad`, `getNAndK`, `inferDocumentCategory`
- `documents/passport/commitment.ts` — `generateCommitment`, `generateNullifier`, `calculateContentHash`
- `documents/passport/bruteForcePassportSignature.ts` — brute-force signature algorithm detection
- `documents/aadhaar/adapter.ts`, `utils.ts`, `constants.ts`, `qr.ts`
- `documents/kyc/adapter.ts`, `utils.ts`, `constants.ts`, `types.ts`, `api.ts`

**Source:** `passports/` (~800 LOC), `aadhaar/` (5 files), `kyc/` (7 files)
**DI:** None new. Implementation details used by adapters and low-level consumers.

---

### Task 10: Trees [DONE]

Decomposed `trees.ts` (860 LOC) into 7 modules using inheritance-based leaf builder pattern.

**Created:**
- `trees/certificate.ts` — `getLeafDscTree`, `getLeafCscaTree` (certificate tree leaf computation)
- `trees/proof.ts` — `generateMerkleProof`, `generateSMTProof`, `getDscTreeInclusionProof`, `getCscaTreeInclusionProof`, `getCscaTreeRoot`
- `trees/leafBuilder.ts` — Abstract `LeafBuilder` base class + `generateSmallKey`, `cleanName`, `OfacEntry`
- `trees/passportLeafBuilder.ts` — `PassportLeafBuilder` + `hashNameMrz`, `hashDobMrz`, `getNameDobLeafFromMrz`, `getNameYobLeafFromMrz`, `getPassportNumberAndNationalityLeafFromMrz`
- `trees/aadhaarLeafBuilder.ts` — `AadhaarLeafBuilder` + `getNameDobLeafAadhaar`, `getNameYobLeafAadhaar`
- `trees/kycLeafBuilder.ts` — `KycLeafBuilder` + `getNameDobLeafKyc`, `getNameYobLeafKyc`
- `trees/ofac.ts` — `buildSMT`, `buildPassportSMT`, `buildIdCardSMT`, `buildAadhaarSMT`, `buildKycSMT`, `getCountryLeaf`, `getCountryCode`
- `trees/index.ts` — barrel with backward-compatible aliases

**Architecture note:** Used abstract `LeafBuilder` base class instead of `ITreeBuilder` interface — each document type extends it with its own name/DOB/YOB leaf generation. Singletons exported: `passportLeafBuilder`, `idCardLeafBuilder`, `aadhaarLeafBuilder`, `kycLeafBuilder`.

**Source:** `common/src/utils/trees.ts` (860 LOC)
**Deps:** `@openpassport/zk-kit-imt`, `@openpassport/zk-kit-lean-imt`, `@openpassport/zk-kit-smt`, `i18n-iso-countries`, `poseidon-lite`

---

### Task 11: Circuit Input Generation (ICircuitInputGenerator) [DONE]

**Created:**
- `circuits/types.ts` — `ICircuitInputGenerator` interface with typed generics per document category + `PassportRegisterOpts`, `PassportDiscloseOpts`, `RegisterOptsFor<C>`, `DiscloseOptsFor<C>`, `RegisterInputsFor<C>`, `DiscloseInputsFor<C>`, `DscInputsFor<C>`
- `circuits/generator.ts` — `createCircuitInputGenerator()` factory dispatching to passport/aadhaar/kyc strategies
- `circuits/inputs/register.ts` — `generatePassportRegisterInputs`
- `circuits/inputs/dsc.ts` — `generatePassportDscInputs`
- `circuits/inputs/disclose.ts` — `generatePassportDiscloseInputs`
- `circuits/inputs/register-aadhaar.ts` — `generateAadhaarRegisterInputs`
- `circuits/inputs/disclose-aadhaar.ts` — `generateAadhaarDiscloseInputs`
- `circuits/inputs/register-kyc.ts` — `generateKycRegisterInputs`
- `circuits/inputs/disclose-kyc.ts` — `generateKycDiscloseInputs`
- `circuits/inputs/ofac.ts` — `generateCircuitInputsOfac`
- `circuits/inputs/format.ts` — `formatInput`, `formatCountriesList`, `reverseBytes`
- `circuits/outputs/format.ts` — output formatting
- `circuits/userId.ts` — `castFromUUID`, `validateUserId`, `UserIdType`
- `circuits/circuitName.ts` — `getCircuitNameFromPassportData`
- `circuits/index.ts` — barrel

**Architecture note:** Uses typed generic strategy pattern — `ICircuitInputGenerator` is parameterized per document category with `RegisterOptsFor<C>`, `DiscloseOptsFor<C>` mapped types. Each document type has separate register + disclose input files rather than one monolithic `generateInputs.ts`.

**Source:** `circuits/generateInputs.ts` (473), `formatInputs.ts` (77), `formatOutputs.ts` (143), `uuid.ts`

---

### Task 12: Attestation (GCP only, no DI) [DONE]

- `attestation/gcp.ts` — `validatePKIToken`, `checkPCR0Mapping` (184 LOC)
- `attestation/index.ts` — barrel exporting both functions

**Source:** `common/src/utils/attest.ts` (202)
**DI:** None. GCP is the only attestation provider. AWS COSE (`cose.ts`) is unused and dropped.

---

### Task 13: Blockchain Utilities [DONE]

- `blockchain/proving.ts` — `getPayload`, `getWSDbRelayerUrl`, client key generation (74 LOC)
- `blockchain/formatCallData.ts` — `formatCallData_disclose`, `formatCallData_dsc`, `formatCallData_register`, `formatProof`, `packForbiddenCountriesList` (99 LOC)
- `blockchain/ofac.ts` — `fetchOfacTrees` (59 LOC)
- `blockchain/forbiddenCountries.ts` — `getPackedForbiddenCountries` (49 LOC)
- `blockchain/index.ts` — barrel exporting all 4 modules

**Source:** `common/src/utils/proving.ts`, `common/src/contracts/`, `common/src/utils/ofac.ts`

---

### Task 14: App Layer (SelfAppBuilder) [DONE]

- `app/builder.ts` — `SelfAppBuilder` class with validation + `getUniversalLink` (85 LOC)
- `app/index.ts` — barrel exporting SelfAppBuilder

**Source:** `common/src/utils/appType.ts` (132 LOC)

---

### Task 15: Testing Fixtures + Static Data [DONE]

**Created:**
- `testing/genMockPassportData.ts` — `genMockPassportData`, `genAndInitMockPassportData`
- `testing/genMockIdDoc.ts` — `genMockIdDoc`, `genMockIdDocAndInitDataParsing`, `generateMockDSC`
- `testing/genMockAadhaarData.ts` — `generateTestData`, `createCustomV2TestData`, `returnNewDateString`, test QR data
- `testing/genMockKycData.ts` — `genMockKycDocument`, `NON_OFAC_DUMMY_KYC_DATA`, `OFAC_DUMMY_KYC_DATA`
- `testing/getMockDSC.ts` — `getMockDSC`
- `testing/dg1.ts` — `genDG1`
- `testing/mockAadhaarCert.ts` — `AADHAAR_MOCK_PRIVATE_KEY_PEM`, `AADHAAR_MOCK_PUBLIC_KEY_PEM`
- `testing/index.ts` — barrel
- `data/countries.ts` — country code mappings
- `data/mockCertificates.ts` — mock certificate data
- `data/sampleDataHashes.ts` — `sampleDataHashes_large`, `sampleDataHashes_small`
- `data/skiPem.ts` — SKI to PEM mapping
- `data/serialized_csca_tree.json` — serialized CSCA merkle tree
- `data/serialized_dsc_tree.json` — serialized DSC merkle tree
- `data/index.ts` — barrel

**DI:** None. Test fixtures and static data.

---

### Task 16: Build Configuration + Final Validation [PARTIALLY DONE]

**Done:**
- `tsup.config.ts` — dual CJS/ESM build with 134 entry points covering all layers
- `package.json` — `exports` map with CJS/ESM conditions:
  - `"."` → `dist/esm/index.js` (import) / `dist/cjs/index.cjs` (require)
  - `"./src/*"` → `dist/esm/src/*.js` (import) / `dist/cjs/src/*.cjs` (require)
  - `"./src/data/*.json"` → raw JSON files
- `src/index.ts` — master barrel exporting all layers

**Remaining:**
- `polyfills/crypto.ts` — cross-platform crypto polyfill (copy from common)
- Comprehensive verification across all consumers

**Verification (comprehensive):**
1. `yarn types` — zero errors
2. `yarn build` — produces dist/esm and dist/cjs
3. All DI interfaces exported and constructable via factories
4. No circular dependency warnings
5. Every file under 800 LOC
6. Layer boundaries: no foundation/ importing from crypto/ or above

---

## Task Dependencies

```
Tasks 1-4 (foundation) ─── DONE
         │
    Task 5 (crypto) ─── DONE
         │
    Task 6 (cert interface) ─── DONE
         │
    Task 7 (cert utils) ─── DONE
         │
    Task 8 (IDocument) ─── DONE
         │
    Task 9 (doc utils) ─── DONE
         │
    ┌─────┼──────┬──────────┐
  Task 10  Task 12  Task 13  Task 14
  (trees)  (attest)  (blockchain)  (app)
   DONE     DONE      DONE       DONE
    │
  Task 11 (circuits) ─── DONE
    │
  Task 15 (testing + data) ─── DONE
    │
  Task 16 (build + validation) ─── PARTIAL
```

**All implementation tasks complete.** Remaining: Task 16 finalization (polyfills/crypto.ts) + consumer migrations (app/, sdk/, packages/).

---

## Consumer Migration Status

After new-common internals are complete, each workspace consumer needs to migrate from `@selfxyz/common` to `@selfxyz/new-common`.

| Consumer | Status | Notes |
|----------|--------|-------|
| `circuits/` | **DONE** | Migrated in prior session |
| `contracts/` | **DONE** | Migrated 2026-03-02. 20/20 unit tests passing, all v2 tests passing |
| `app/` | **TODO** | ~30 files still importing `@selfxyz/common` |
| `sdk/core/` | **TODO** | 5 files |
| `packages/mobile-sdk-alpha/` | **TODO** | ~20 files |
| `packages/mobile-sdk-demo/` | **TODO** | ~8 files |

### Key Infrastructure Fixes (for consumer migration)

These fixes enable CJS consumers (Hardhat, ts-node) to use the ESM `new-common` package:

1. **`exports` map in `new-common/package.json`** — Maps `"./src/*"` to CJS/ESM dual outputs. Matches the pattern old `@selfxyz/common` used (67 explicit export paths). This is the runtime fix.

2. **`eddsa.ts` CJS compatibility** — `import.meta.url` is undefined in CJS. `getRequire()` helper tries `import.meta.url` first, falls back to `__filename`.

3. **Consumer tsconfig pattern** — For CJS consumers (contracts/, circuits/):
   - `"module": "NodeNext"` + `"moduleResolution": "NodeNext"` for type-checking
   - `"paths"` mapping to source `.ts` files (type-checking only, not runtime)
   - Runtime resolution goes through the `exports` map

---

## Critical Files Reference

| Current Path | New Path | LOC | Risk |
|---|---|---|---|
| `src/utils/types.ts` | `foundation/types/document.ts` + `circuit.ts` + `environment.ts` | 205 | Low |
| `src/constants/constants.ts` | `foundation/constants/` (6 files) | 631 | Medium |
| `src/constants/countries.ts` | `foundation/constants/countries.ts` + `data/countries-extended.ts` | 788 | Low |
| `src/utils/hash.ts` | `crypto/hash/` (4 files) + `crypto/identity.ts` | 189 | Medium |
| `src/utils/trees.ts` | `trees/` (5 files) | 860 | High |
| `src/utils/proving.ts` | `crypto/encryption.ts` + `blockchain/proving.ts` | 200 | Medium |
| `src/utils/circuits/generateInputs.ts` | `circuits/inputs/` (8 files) | ~400 | High |
| `src/utils/certificate_parsing/` (12 files) | `certificates/` (8 files) | ~500 | Medium |
| `src/utils/passports/` (15 files) | `documents/passport/` (8 files, incl adapter) | ~800 | High |
| `src/utils/appType.ts` | `app/builder.ts` | 132 | Low |
| `src/constants/vkey.ts` | `testing/fixtures/vkey.ts` | 64KB | Low |
| (new) | `documents/interface.ts` + `documents/factory.ts` | ~30 | Low |
| (new) | `documents/*/adapter.ts` (3 files) | ~300 | Medium |
| `package.json` exports | Updated with new + compat paths | — | High |
| `tsup.config.ts` | Updated entry points | — | High |

---

## Verification Checklist

After all tasks complete:

1. **Build:** `cd new-common && yarn build` — ESM + CJS outputs generate without errors
2. **Types:** `cd new-common && yarn types` — no TypeScript errors
3. **Tests:** `cd new-common && yarn test` — all existing tests pass
4. **Exports:** `cd new-common && yarn test:exports` — all export paths resolve
5. **Layer check:** No file in `foundation/` imports from `crypto/`, `documents/`, etc.
6. **Bundle size:** `testing/` module is not included in production entry points
7. **IDocument smoke test:** `createDocument(mockPassportData).getName()` returns expected name
8. **Factory smoke test:** `createCertificateParser('react-native')` returns SimpleCertificateParser
9. **Consumer smoke test:** Change one consumer (e.g., `sdk/core/`) to use new import paths and verify build
