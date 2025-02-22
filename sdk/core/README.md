# How to use this SDK
## Install
You can install with this command
```
npm i @selfxyz/core
```

## Initialize
You should have CELO_RPC_URL and SCOPE in your environment or somewhere in your code.
```typescript
import { SelfBackendVerifier } from "@selfxyz/core";

const selfBackendVerifier = new SelfBackendVerifier(
    process.env.CELO_RPC_URL as string,
    process.env.SCOPE as string,
);
```
## Setup
You can setup which data you want to verify in this sdk
```typescript
// Set minimum age verification
selfBackendVerifier.setMinimumAge(20);
// Set nationality verification
selfBackendVerifier.setNationality('France')
// Set exclude countries verification
// At most 40
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

## How to return the result in your api implementation
This backend SDK is designed to be used with APIs managed by third parties, and it communicates with Self's managed relayer to enable smooth usage of applications provided by Self.

When using it:
1. Set the endpoint of the API that imports this backend SDK in SelfAppBuilder
```typescript
  const selfApp = new SelfAppBuilder({
    appName: "Application name",
    scope: "Application id",
    endpoint: "API endpoint which imports this backend sdk",
    logoBase64: logo,
    userId,
    disclosures: {
      name: true,
      nationality: true,
      date_of_birth: true,
      passport_number: true,
      minimumAge: 20,
      excludedCountries: [
        "Exclude countries which you want"
      ],
      ofac: true,
    }
  }).build();
```

2. This API needs to return values in the following format:
```typescript
response: {
    200: t.Object({
        status: t.String(),
        result: t.Boolean(),
    }),
    500: t.Object({
        status: t.String(),
        result: t.Boolean(),
        message: t.String(),
    }),
},
```
Bit more explanation to the values in the return value.

status: Indicates that the API processing has completed successfully

result: Contains the verification result from the SelfBackendVerifier

message: Represents the error details when an error occurs

Here is the little example to implement the api.

```typescript
try {
    const result = await selfBackendVerifier.verify(
        request.body.proof,
        request.body.publicSignals
    );
    return {
        status: "success",
        result: result.isValid,
    };
} catch (error) {
    return {
        status: "error",
        result: false,
        message: error instanceof Error ? error.message : "Unknown error",
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
