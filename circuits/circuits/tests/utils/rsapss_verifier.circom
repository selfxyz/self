include "../../utils/RSASSAPSS_padded.circom";

template RSAPSSVerifier(n,k,max_bytes) {
    signal input signature[k];
    signal input modulus[k];
    signal input raw_message[max_bytes];
    signal input raw_message_padded_bytes;

    component rsaDecode = RSASSAPSS_Decode(n, k);
    rsaDecode.signature <== signature;
    rsaDecode.modulus <== modulus;
    var emLen = div_ceil(n * k, 8);
    signal encodedMessage[emLen] <== rsaDecode.eM;

    component rsaVerify = RSASSAPSSVerify_SHA256(n * k, max_bytes);
    rsaVerify.eM <== encodedMessage;
    rsaVerify.message <== raw_message;
    rsaVerify.messagePaddedLen <== raw_message_padded_bytes;
}
component main = RSAPSSVerifier(64,32, 960);