pragma circom 2.1.9;

include "../utils/aadhar/QrVerifier.circom";
include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/bitify.circom";
include "../utils/aadhar/extractor.circom";
include "../utils/aadhar/constant.circom";
include "../utils/passport/customHashers.circom";
include "../utils/aadhar/nullifier.circom";

/// @title: AadhaarRegister
/// notice: This circuit is reposonsible for verifing the Aadhaar QR data and then outputting the commitment and nullifier
/// @param n RSA pubic key size per chunk
/// @param k Number of chunks the RSA public key is split into
/// @param maxDataLength Maximum length of the data
/// @input qrDataPadded QR data without the signature; assumes elements to be bytes; remaining space is padded with 0
/// @input qrDataPaddedLength Length of padded QR data
/// @input delimiterIndices Indices of delimiters (255) in the QR text data. 18 delimiters including photo
/// @input signature RSA signature
/// @input pubKey RSA public key (of the government)
/// @input secret Secret for commitment generation. Saved by the user to access their commitment
/// @output commitment Commitment that will be added to the onchain registration tree
/// @output nullifier attestation nullifier - deterministic on the aadhaar data
/// @output pubKeyHash Poseidon hash of the RSA public key (after merging nearby chunks)

template AadhaarRegister(n, k,maxDataLength) {

    // This means the attestation is aadhaar
    var attestation_id = 2;

    signal input qrDataPadded[maxDataLength];
    signal input qrDataPaddedLength;
    signal input delimiterIndices[18];
    signal input signature[k];
    signal input pubKey[k];
    signal input secret;

    signal output commitment;
    signal output nullifier;
    signal output timestamp;
    signal output pubKeyHash;

    component qr = AadhaarQRVerifier(n,k,maxDataLength);
    qr.qrDataPadded        <== qrDataPadded;
    qr.qrDataPaddedLength  <== qrDataPaddedLength;
    qr.delimiterIndices    <== delimiterIndices;
    qr.signature           <== signature;
    qr.pubKey              <== pubKey;
    qr.nullifierSeed       <== secret;

    pubKeyHash <== qr.pubkeyHash;

    component qrDataExtractor = QRDataExtractor(maxDataLength);
    qrDataExtractor.data <== qrDataPadded;
    qrDataExtractor.qrDataPaddedLength <== qrDataPaddedLength;
    qrDataExtractor.delimiterIndices <== delimiterIndices;

    // signal ageAbove18; 
    // signal gender;
    // signal state;
    // signal pinCode;

    // timestamp <== qrDataExtractor.timestamp;
    // ageAbove18 <== qrDataExtractor.ageAbove18;
    // gender <== qrDataExtractor.gender;
    // state <== qrDataExtractor.state;
    // pinCode <== qrDataExtractor.pinCode;

    signal photo[photoPackSize()] <== qrDataExtractor.photo;

    // photohash (similar to nullifier calc)
    component h0 = Poseidon(16);
    component h1 = Poseidon(16);
    for (var i = 0; i < 16; i++) {
        h0.inputs[i] <== photo[i];
        h1.inputs[i] <== photo[i + 16];
    }

    component hReduce = Poseidon(2);
    hReduce.inputs[0] <== h0.out;
    hReduce.inputs[1] <== h1.out;

    signal photoHash <== hReduce.out;

    // TODO:figure out this part
    // many questions to solve +task hand , primry of which being a better data extractor
    // Skipping a full dataHash for now, since photo is already unique-enough + hashing full QR (512*3) would need custom batching,need to work on this 

    // component dataHasher = Poseidon(4);
    // dataHasher.inputs[0] <== ex.ageAbove18;
    // dataHasher.inputs[1] <== ex.gender;
    // dataHasher.inputs[2] <== ex.state;
    // dataHasher.inputs[3] <== ex.pinCode;
    // signal dataHash <== dataHasher.out;

    commitment <== Poseidon(4)([
        secret,
        attestation_id,
        // data_hash,
        photoHash,
        pubKeyHash
    ]);

    nullifier <== Nullifier()(nullifierSeed, photo);

}

component main = AadhaarRegister(121, 17, 512 * 3);
