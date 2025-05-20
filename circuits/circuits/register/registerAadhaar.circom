pragma circom 2.1.9;

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/poseidon.circom";
include "../utils/aadhar/QrVerifier.circom";
include "../utils/aadhar/extractor.circom";
include "../utils/aadhar/constants.circom";
include "../utils/passport/customHashers.circom";
// include "../utils/aadhar/nullifier.circom";

/// @title: AadhaarRegister
/// notice: This circuit is reposonsible for verifing the Aadhaar QR data and then outputting the commitment and nullifier
/// @param n RSA pubic key size per chunk
/// @param k Number of chunks the RSA public key is split into
/// @param maxDataLength Maximum length of the data
/// @param nameMaxBytes 
/// @input qrDataPadded QR data without the signature; assumes elements to be bytes; remaining space is padded with 0
/// @input qrDataPaddedLength Length of padded QR data
/// @input delimiterIndices Indices of delimiters (255) in the QR text data. 18 delimiters including photo
/// @input signature RSA signature
/// @input pubKey RSA public key (of the government)
/// @input secret Secret for commitment generation. Saved by the user to access their commitment
/// @output commitment Commitment that will be added to the onchain registration tree
/// @output nullifier attestation nullifier - deterministic on the aadhaar data
/// @output pubKeyHash Poseidon hash of the RSA public key (after merging nearby chunks)

template AadhaarRegister(n,k,maxDataLength,nameMaxBytes) {

    // This means the attestation is aadhaar
    var attestation_id = 3;
    // var packedLength  = computeIntChunkLength(nameMaxBytes);

    signal input qrDataPadded[maxDataLength];
    signal input qrDataPaddedLength;
    signal input delimiterIndices[18];
    signal input signature[k];
    signal input pubKey[k];
    signal input secret;
    signal input current_date[6];
    
    signal output pubKeyHash;
    signal output timestamp;
    signal output nullifier;
    signal output commitment;

    // Assert `qrDataPaddedLength` fits in `ceil(log2(maxDataLength))`
    component n2bHeaderLength = Num2Bits(log2Ceil(maxDataLength));
    n2bHeaderLength.in <== qrDataPaddedLength;

    //verify if the data provided is correct
    component qr = AadhaarQRVerifier(n,k,maxDataLength);
    qr.qrDataPadded        <== qrDataPadded;
    qr.qrDataPaddedLength  <== qrDataPaddedLength;
    qr.delimiterIndices    <== delimiterIndices;
    qr.signature           <== signature;
    qr.pubKey              <== pubKey;

    pubKeyHash <== qr.pubkeyHash;
    // log("pubKeyHash ",pubKeyHash);


    // Assert data between qrDataPaddedLength and maxDataLength is zero
    AssertZeroPadding(maxDataLength)(qrDataPadded, qrDataPaddedLength);

    // extract all the data from QR and computer commitment + nullfier
    component qrDataExtractor = QRDataExtractor(maxDataLength,nameMaxBytes);
    qrDataExtractor.data <== qrDataPadded;
    qrDataExtractor.qrDataPaddedLength <== qrDataPaddedLength;
    qrDataExtractor.delimiterIndices <== delimiterIndices;
    qrDataExtractor.current_date <== current_date;

    timestamp <== qrDataExtractor.timestamp;

    // signal name[packedLength] <== qrDataExtractor.Name;
    signal nameHash <== qrDataExtractor.NameHash;
    signal RefId <== qrDataExtractor.RefID;
    signal age <== qrDataExtractor.age;
    signal DobHasH <== qrDataExtractor.DobHash;
    signal gender <== qrDataExtractor.gender;
    signal state <== qrDataExtractor.state;
    signal pinCode <== qrDataExtractor.pinCode;
    signal photo[photoPackSize()] <== qrDataExtractor.photo;
    signal DobHash <== qrDataExtractor.DobHash;

    component dataCommit = PackBytesAndPoseidon(maxDataLength);
    dataCommit.in <== qrDataPadded;// whole buffer including zeros
    signal Datacommitment <== dataCommit.out;//field element
    // log("data-Commitment",Datacommitment);

    commitment <== Poseidon(3)([secret,attestation_id,Datacommitment]); 
    // log("Commitment ",commitment);

    // nullifier - https://www.notion.so/Indian-identity-Integration-1dc57801cd1280bebd45f3527ef60150?pvs=4#1dc57801cd12800e8f51f89648ca37d5
    nullifier <== Poseidon(4)([nameHash,DobHasH,gender,RefId]);
    // log("age",age);
    // log("RefId",RefId);
    // log("DobHash",DobHash);
    // log("Nullifier ",nullifier);
    // log("gender",gender);

}
