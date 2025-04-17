pragma circom 2.1.9;

include "circomlib/circuits/poseidon.circom";


/// @title AADHAAR_VC_AND_DISCLOSE
/// @notice verify user's commitment is part of the tree and discloses data selectively 
/// @input secret Secret of the user — used to reconstruct commitment and generate nullifier
/// @input attestation_id attestation_id Attestation ID of the credential used to generate the commitment
/// @input merkle_root Root of the commitment merkle tree
/// @input leaf_depth Actual size of the merkle tree
/// @input siblings Siblings of the commitment in the merkle tree
/// @input qrDataPadded QR data without the signature; assumes elements to be bytes; remaining space is padded with 0
/// @input qrDataPaddedLength Length of padded QR dat
/// @input revealAgeAbove18 Flag to reveal age is above 18
/// @input revealGender Flag to reveal extracted gender
/// @input revealPinCode Flag to reveal extracted pin code
/// @input revealState Flag to reveal extracted state
/// @output pubkeyHash Poseidon hash of the RSA public key (after merging nearby chunks)
/// @output nullifier A unique value derived from nullifierSeed and Aadhaar data to nullify the proof/user
/// @output timestamp Timestamp of when the data was signed - extracted and converted to Unix timestamp
/// @output ageAbove18 Boolean flag indicating age is above 18; 0 if not revealed
/// @output gender Gender 70(F) or 77(M); 0 if not revealed
/// @output pinCode Pin code of the address as int; 0 if not revealed
/// @output state State packed as int (reverse order); 0 if not revealed
/// @output ageAbove18
/// @output pincode
/// @output gender
/// @output state
/// @output nullifier Scope nullifier - not deterministic on the aadhaar data
/// TODO
/// for now we follow the pattern similar to anon aadhaar but later would like to switch to a format similar to passport circuits
/// @input datarevealselector Indices of delimiters (255) in the QR text data. 18 in total

template AADHAAR_VC_AND_DISCLOSE(nLevels) {

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

    /// TODO
    //To discuss further for aadhaar how does the forbidden stuff look with the name fields etuff etc

    // signal input ofac_passportno_smt_leaf_key;
    // signal input ofac_passportno_smt_root;
    // signal input ofac_passportno_smt_siblings[passportNoTreeLevels];

    // signal input ofac_namedob_smt_leaf_key;
    // signal input ofac_namedob_smt_root;
    // signal input ofac_namedob_smt_siblings[namedobTreeLevels];

    // signal input ofac_nameyob_smt_leaf_key;
    // signal input ofac_nameyob_smt_root;
    // signal input ofac_nameyob_smt_siblings[nameyobTreeLevels];

    // reveal flags 
    // would like to move to something like 
    /// @input datarevealselector Indices of delimiters (255) in the QR text data. 18 in total
    /// to disclose all the fields like in the passport circuit 

    signal input revealAgeAbove18;   // 0/1
    signal input gender;             // 0/1
    signal input pinCode;            // 0/1
    signal input state;              // 0/1

    signal ageAbove18; 
    signal gender;
    signal state;
    signal pinCode;

    component qrDataExtractor = QRDataExtractor(maxDataLength);
    qrDataExtractor.data <== qrDataPadded;
    qrDataExtractor.qrDataPaddedLength <== qrDataPaddedLength;
    qrDataExtractor.delimiterIndices <== delimiterIndices;

    timestamp <== qrDataExtractor.timestamp;

    ageAbove18 <== revealAgeAbove18 * qrDataExtractor.ageAbove18;
    gender <== revealGender * qrDataExtractor.gender;
    state <== revealstate * qrDataExtractor.state;
    pinCode <== revealPinCode * qrDataExtractor.pinCode;


    // verify commitment is part of the merkle tree
    VERIFY_COMMITMENT(nLevels)(
        secret,
        attestation_id,
        qrDataPadded,
        qrDataPaddedLength
        delimiterIndices,
        merkle_root,
        leaf_depth,
        path,
        siblings
    );

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
