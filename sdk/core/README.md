# How to use this SDK
## Install
You can install with this command
```
npm i @openpassport/core
```

## Initialize
You should have CELO_RPC_URL and SCOPE in your environment or somewhere in your code.
```typescript
import { SelfBackendVerifier } from "@openpassport/core";

const selfBackendVerifier = new SelfBackendVerifier(
    process.env.CELO_RPC_URL as string,
    process.env.SCOPE as string,
);
```
## Setup
You can setup which data you want to verify in this sdk
```typescript
// In default, verification will be done with latest identity commitment root, but if you have some other root in your mind, you can choose with timestamp
selfBackendVerifier.setTargetRootTimestamp(0);
// Set minimum age verification
selfBackendVerifier.setMinimumAge(20);
// Set nationality verification
selfBackendVerifier.setNationality('France')
// Set exclude countries verification
selfBackendVerifier.excludeCountries('Country Name1', 'Country Name2', 'Coutry Name3', 'etc...');
// Enable if you want to do passport number ofac check
// Default false
selfBackendVerifier.enablePassportNoOfacCheck();
// Enable if you want to do name and date of birth ofac check
// Default false
selfBackendVerifier.enableNameAndDobOfacCheck();
// Enable if you want to do name and year of birth ofac check
// Default false
selfBackendVerifier.enableNameAndYobOfacCheck();
```

## Verification
You can do the verification with this
```typescript
const result = await selfBackendVerifier.verify(
    request.body.proof,
    request.body.publicSignals
);
```
## Result
Result from the verify function is like this
```typescript
export interface SelfVerificationResult {
    // Check if the whole verification is succeeded
    isValid: boolean;
    isValidDetails: {
        // Verifies that the proof is generated under the expected scope.
        isValidScope: boolean;
        // Checks that the attestation identifier in the proof matches the expected value.
        isValidAttestationId: boolean;
        // Verifies the cryptographic validity of the proof.
        isValidProof: boolean;
        // Ensures that the revealed nationality is correct (when nationality verification is enabled).
        isValidNationality: boolean;
    };
    // User Identifier which is included in the proof
    userId: string;
    // Application name which is showed as scope
    application: string;
    // A cryptographic value used to prevent double registration or reuse of the same proof.
    nullifier: string;
    // Revealed data by users
    credentialSubject: {
        // Merkle root which is used to generate proof.
        merkle_root?: string;
        // Proved identity type, for passport this value is fixed as 1.
        attestation_id?: string;
        // Date when the proof is generated
        current_date?: string;
        // Revealed issuing state in the passport
        issuing_state?: string;
        // Revealed name in the passport 
        name?: string;
        // Revealed passport number in the passport 
        passport_number?: string;
        // Revealed nationality in the passport
        nationality?: string;
        // Revealed date of birth in the passport
        date_of_birth?: string;
        // Revealed gender in the passport
        gender?: string;
        // Revealed expiry date in the passport
        expiry_date?: string;
        // Result of older than
        older_than?: string;
        // Result of passport number ofac check
        passport_no_ofac?: string;
        // Result of name and date of birth ofac check
        name_and_dob_ofac?: string;
        // Result of name and year of birth ofac check
        name_and_yob_ofac?: string;
    };
    proof: {
        // Proof which is used for this verification
        value: {
            proof: Groth16Proof;
            publicSignals: PublicSignals;
        };
    };
}
```

# When you run the tests

First you need to copy the abi files to the sdk/core/src/abi folder.

```
cd ../sdk/core
yarn run copy-abi
```

Then you need to run the local hardhat node.

```
cd contracts
npx hardhat node
```

Then you need to run the tests in the contract dir.

```
yarn run test:sdkcore:local
```
