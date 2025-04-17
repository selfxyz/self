pragma circom 2.1.9;

include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/poseidon.circom";
include "./signature.circom";
include "./extractor.circom";
include "./nullifier.circom";



/// @title AadhaarQRVerifier
/// @notice This circuit verifies the Aadhaar QR data using RSA signature
/// @param n RSA pubic key size per chunk
/// @param k Number of chunks the RSA public key is split into
/// @param maxDataLength Maximum length of the data
/// @input qrDataPadded QR data without the signature; assumes elements to be bytes; remaining space is padded with 0
/// @input qrDataPaddedLength Length of padded QR data
/// @input delimiterIndices Indices of delimiters (255) in the QR text data. 18 delimiters including photo
/// @input signature RSA signature
/// @input pubKey RSA public key (of the government)
/// @input nullifierSeed A random value used as an input to compute the nullifier;we treat this as the secret the user will pass as per the self scheme
/// @output pubkeyHash Poseidon hash of the RSA public key (after merging nearby chunks)
/// @output nullifier A unique value derived from nullifierSeed and Aadhaar data to nullify the proof/user
/// @output timestamp Timestamp of when the data was signed - extracted and converted to Unix timestamp

template AadhaarQRVerifier(n, k, maxDataLength) {
    signal input qrDataPadded[maxDataLength];
    signal input qrDataPaddedLength;
    signal input delimiterIndices[18];
    signal input signature[k];
    signal input pubKey[k];
    signal input nullifierSeed;

    signal output pubkeyHash;
    // signal output nullifier;
    // signal output timestamp;

    // Assert `qrDataPaddedLength` fits in `ceil(log2(maxDataLength))`
    component n2bHeaderLength = Num2Bits(log2Ceil(maxDataLength));
    n2bHeaderLength.in <== qrDataPaddedLength;


    // Verify the RSA signature
    component signatureVerifier = SignatureVerifier(n, k, maxDataLength);
    signatureVerifier.qrDataPadded <== qrDataPadded;
    signatureVerifier.qrDataPaddedLength <== qrDataPaddedLength;
    signatureVerifier.pubKey <== pubKey;
    signatureVerifier.signature <== signature;
    pubkeyHash <== signatureVerifier.pubkeyHash;

    // do not want to use this component here anymore
    // // Assert data between qrDataPaddedLength and maxDataLength is zero
    // AssertZeroPadding(maxDataLength)(qrDataPadded, qrDataPaddedLength);
    

    // // Extract data from QR and compute nullifiers
    // component qrDataExtractor = QRDataExtractor(maxDataLength);
    // qrDataExtractor.data <== qrDataPadded;
    // qrDataExtractor.qrDataPaddedLength <== qrDataPaddedLength;
    // qrDataExtractor.delimiterIndices <== delimiterIndices;

    // signal output ageAbove18;
    // signal output gender;
    // signal output state;
    // signal output pinCode;
    // signal output photo[photoPackSize()];
    // timestamp <== qrDataExtractor.timestamp;

    // // Calculate nullifier
    // signal photo[photoPackSize()] <== qrDataExtractor.photo;
    // nullifier <== Nullifier()(nullifierSeed, photo);
}