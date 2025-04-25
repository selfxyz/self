pragma circom 2.1.9;

include "circomlib/circuits/poseidon.circom";
include "../utils/aadhar/QrVerifier.circom";
include "../utils/aadhar/disclose/verify_commitment_aadhaar.circom";
include "../utils/extractor.circom";

/// @title AADHAAR_VC_AND_DISCLOSE
/// @notice verify user's commitment is part of the tree and discloses data selectively 

/// @input secret Secret of the user — used to reconstruct commitment and generate nullifier
/// @input attestation_id attestation_id Attestation ID of the credential used to generate the commitment
/// @input merkle_root Root of the commitment merkle tree
/// @input leaf_depth Actual size of the merkle tree
/// @input siblings Siblings of the commitment in the merkle tree

/// @input qrDataPadded QR data without the signature; assumes elements to be bytes; remaining space is padded with 0
/// @input qrDataPaddedLength Length of padded QR data
/// @input delimiterIndexes
/// @input scope Scope of the application users generates the proof for

/// @input majority Majority user wants to prove he is older than: YY — ASCII
/// @input current_date Current date: YYMMDD — number

/// @input revealAgeolderthan Flag to reveal age older than
/// @input revealGender Flag to reveal extracted gender
/// @input revealPinCode Flag to reveal extracted pin code
/// @input revealState Flag to reveal extracted state

/// @output pubkeyHash Poseidon hash of the RSA public key (after merging nearby chunks)
/// @output timestamp Timestamp of when the data was signed - extracted and converted to Unix timestamp
/// @output ageAbove18 Boolean flag indicating age is above 18; 0 if not revealed
/// @output gender Gender 70(F) or 77(M); 0 if not revealed
/// @output pinCode Pin code of the address as int; 0 if not revealed
/// @output state State packed as int (reverse order); 0 if not revealed

/// @output age
/// @output pincode
/// @output gender
/// @output state

/// @output nullifier Scope nullifier - not deterministic on the aadhaar data

template AADHAAR_VC_AND_DISCLOSE(nLevels,maxDataLength) {

    signal input secret;
    signal input attestation_id;// == 2,
    // data inputs
    signal input qrDataPadded[maxDataLength];
    signal input qrDataPaddedLength;
    signal input delimiterIndices[18];
    // commitment vc
    signal input merkle_root;
    signal input leaf_depth;
    signal input path[nLevels];
    signal input siblings[nLevels];

    signal input scope;
    signal input user_identifier;
    //age related
    signal input majority[2];
    signal input current_date[6];
    //selector bitmaps
    signal input revealAgeolderthan;
    signal input revealGender;
    signal input revealPinCode;
    signal input revealState;
    // Outputs
    signal output timestamp;
    signal output age;
    signal output gender;
    signal output state;
    signal output pinCode;
    signal output nullifier;

    /// TODO
    // signal input ofac_passportno_smt_leaf_key;
    // signal input ofac_passportno_smt_root;
    // signal input ofac_passportno_smt_siblings[passportNoTreeLevels];

    // signal input ofac_namedob_smt_leaf_key;
    // signal input ofac_namedob_smt_root;
    // signal input ofac_namedob_smt_siblings[namedobTreeLevels];

    // signal input ofac_nameyob_smt_leaf_key;
    // signal input ofac_nameyob_smt_root;
    // signal input ofac_nameyob_smt_siblings[nameyobTreeLevels]; 

    // Assert data between qrDataPaddedLength and maxDataLength is zero
    AssertZeroPadding(maxDataLength)(qrDataPadded, qrDataPaddedLength);

    VerifyAadhaarCommitment = VERIFY_COMMITMENT_AADHAAR(nLevels,maxDataLength)(        
        secret,
        attestation_id,
        qrDataPadded,
        qrDataPaddedLength,
        delimiterIndices,
        merkle_root,
        leaf_depth,
        path,
        siblings
    );


    component DiscloseAadhaar = DiscloseAadhaar(maxDataLength);
 


    // action nullifier
    signal output nullifier <== Poseidon(2)([secret, scope]);
}

component main {
    public [
        merkle_root,
        scope,
        user_identifier,
        current_date,
        attestation_id        // == 2
    ]
} = AADHAAR_VC_AND_DISCLOSE(33);
