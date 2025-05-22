pragma circom 2.1.9;

include "circomlib/circuits/poseidon.circom";
include "../utils/aadhar/QrVerifier.circom";
include "../utils/passport/ofac/ofac_name_dob.circom";
include "../utils/passport/ofac/ofac_name_yob.circom";
include "../utils/aadhar/disclose/verify_commitment_aadhaar.circom";
include "../utils/aadhar/disclose/disclose_aadhaar.circom";
include "../utils/aadhar/extractor.circom";

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

/// @input revealAgeolderthan Flag to reveal age older than
/// @input revealGender Flag to reveal extracted gender
/// @input revealPinCode Flag to reveal extracted pin code
/// @input revealState Flag to reveal extracted state

/// @output timestamp Timestamp of when the data was signed - extracted and converted to Unix timestamp
/// @output ageAbove18 Boolean flag indicating age is above 18; 0 if not revealed
/// @output gender Gender 70(F) or 77(M); 0 if not revealed
/// @output pinCode Pin code of the address as int; 0 if not revealed
/// @output state State packed as int (reverse order); 0 if not revealed


/// @output nullifier Scope nullifier - not deterministic on the aadhaar data

template AADHAAR_VC_AND_DISCLOSE(
    nLevels,
    maxDataLength,
    nameMaxBytes,
    namedobTreeLevels,
    nameyobTreeLevels
) {

    signal input secret;
    signal input attestation_id;// == 3,

    // data inputs
    signal input qrDataPadded[maxDataLength];
    signal input qrDataPaddedLength;
    signal input delimiterIndices[18];

    // commitment tree
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
    
    signal input selector_ofac;

    //OFAC Checks
    signal input ofac_namedob_smt_leaf_key;
    signal input ofac_namedob_smt_root;
    signal input ofac_namedob_smt_siblings[namedobTreeLevels];

    signal input ofac_nameyob_smt_leaf_key;
    signal input ofac_nameyob_smt_root;
    signal input ofac_nameyob_smt_siblings[nameyobTreeLevels]; 

    // Outputs
    signal output RevealDataPacked;
    signal output nullifier;

    // Assert data between qrDataPaddedLength and maxDataLength is zero
    AssertZeroPadding(maxDataLength)(qrDataPadded, qrDataPaddedLength);

    VERIFY_COMMITMENT_AADHAAR(nLevels,maxDataLength)(        
        secret,
        attestation_id,
        qrDataPadded,
        merkle_root,
        leaf_depth,
        path,
        siblings
    );

    component DiscloseAadhaar = DiscloseAadhaar(
        maxDataLength,
        nameMaxBytes,
        namedobTreeLevels,
        nameyobTreeLevels
    );

    DiscloseAadhaar.qrDataPadded <== qrDataPadded;
    DiscloseAadhaar.qrDataPaddedLength <== qrDataPaddedLength;
    DiscloseAadhaar.delimiterIndices <== delimiterIndices;
    DiscloseAadhaar.current_date <== current_date;
    DiscloseAadhaar.majorityASCII <==  majority;
    DiscloseAadhaar.revealAgeolderthan <== revealAgeolderthan;
    DiscloseAadhaar.revealGender <== revealGender;
    DiscloseAadhaar.revealPinCode <== revealPinCode;
    DiscloseAadhaar.revealState <== revealState;
    DiscloseAadhaar.selector_ofac <== selector_ofac;
    DiscloseAadhaar.ofac_namedob_smt_leaf_key <== ofac_namedob_smt_leaf_key;
    DiscloseAadhaar.ofac_namedob_smt_root <== ofac_namedob_smt_root;
    DiscloseAadhaar.ofac_namedob_smt_siblings <== ofac_namedob_smt_siblings;
    DiscloseAadhaar.ofac_nameyob_smt_leaf_key <== ofac_nameyob_smt_leaf_key;
    DiscloseAadhaar.ofac_nameyob_smt_root <== ofac_nameyob_smt_root;
    DiscloseAadhaar.ofac_nameyob_smt_siblings <== ofac_nameyob_smt_siblings;

    RevealDataPacked <==  DiscloseAadhaar.DataPacked[0];
    
    nullifier <== Poseidon(2)([secret, scope]);
}

component main {
    public [
        merkle_root,
        scope,
        attestation_id,     // == 3
        ofac_namedob_smt_root,
        ofac_nameyob_smt_root
    ]
} = AADHAAR_VC_AND_DISCLOSE(33, 512 * 3, 256, 64, 64);
