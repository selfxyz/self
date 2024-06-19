pragma circom 2.1.5;

include "./utils/rsaPkcs1.circom";
include "@zk-email/circuits/helpers/extract.circom";
include "./utils/Sha1BytesStatic.circom";
include "./utils/Sha1Bytes.circom";
include "dmpierre/sha1-circom/circuits/sha1.circom";

template PassportVerifier_sha1WithRSAEncryption_65537(n, k, max_datahashes_bytes) {
    signal input mrz[93]; // formatted mrz (5 + 88) chars
    signal input dataHashes[max_datahashes_bytes];
    signal input datahashes_padded_length;
    signal input eContentBytes[92];

    // pubkey that signed the passport
    signal input pubkey[k];

    // signature of the passport
    signal input signature[k];

    // compute sha1 of formatted mrz
    signal mrzSha[160] <== Sha1BytesStatic(93)(mrz);

    // mrzSha_bytes: list of 32 Bits2Num
    component mrzSha_bytes[20];

    // cast the 160 bits from mrzSha into a list of 32 bytes
    for (var i = 0; i < 20; i++) {
        mrzSha_bytes[i] = Bits2Num(8);

        for (var j = 0; j < 8; j++) {
            mrzSha_bytes[i].in[7 - j] <== mrzSha[i * 8 + j];
        }
    }

    // assert mrz_hash equals the one extracted from dataHashes input (bytes 32 to 52)
    for(var i = 0; i < 20; i++) {
        dataHashes[31 + i] === mrzSha_bytes[i].out;
    }

    // hash dataHashes dynamically
    signal dataHashesSha[160] <== Sha1Bytes(max_datahashes_bytes)(dataHashes, datahashes_padded_length);

    // get output of dataHashes 160 into bytes to check against eContent
    component dataHashesSha_bytes[20];
    for (var i = 0; i < 20; i++) {
        dataHashesSha_bytes[i] = Bits2Num(8);
        for (var j = 0; j < 8; j++) {
            dataHashesSha_bytes[i].in[7 - j] <== dataHashesSha[i * 8 + j];
        }
    }

    // assert dataHashesSha is in eContentBytes in range bytes 72 to 92
    for(var i = 0; i < 20; i++) {
        // log(dataHashesSha_bytes[i].out);

        eContentBytes[72 + i] === dataHashesSha_bytes[i].out;
    }

    // hash eContentBytes
    signal eContentSha[160] <== Sha1BytesStatic(92)(eContentBytes);

    // get output of eContentBytes sha1 into k chunks of n bits each
    var msg_len = (160 + n) \ n;

    //eContentHash:  list of length 160/n +1 of components of n bits 
    component eContentHash[msg_len];
    for (var i = 0; i < msg_len; i++) {
        //instantiate each component of the list of Bits2Num of size n
        eContentHash[i] = Bits2Num(n);
    }

    for (var i = 0; i < 160; i++) {
        eContentHash[i \ n].in[i % n] <== eContentSha[159 - i];
    }

    for (var i = 160; i < n * msg_len; i++) {
        eContentHash[i \ n].in[i % n] <== 0;
    }
    
    // verify eContentHash signature
    // component rsa = RSAVerify65537(64, 32);
    component rsa = RSAVerify65537(n, k);


    for (var i = 0; i < msg_len; i++) {
        rsa.base_message[i] <== eContentHash[i].out;
    }

    for (var i = msg_len; i < k; i++) {
        rsa.base_message[i] <== 0;
    }

    rsa.modulus <== pubkey;
    rsa.signature <== signature;
}