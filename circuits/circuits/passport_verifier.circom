pragma circom 2.1.5;

include "@zk-email/circuits/helpers/rsa.circom";
include "@zk-email/circuits/helpers/extract.circom";
include "./sha256Bytes.circom";

template PassportVerifier(n, k) {
    signal input mrz[93]; // formatted mrz (5 + 88) chars
    signal input dataHashes[297];
    signal input eContentBytes[104];

    signal input pubkey[k];
    signal input signature[k];

    // compute sha256 of formatted mrz
    signal mrzSha[256] <== Sha256Bytes(93)(mrz);

    // get output of sha256 into bytes to check against dataHashes
    component sha256_bytes[32];
    for (var i = 0; i < 32; i++) {
        sha256_bytes[i] = Bits2Num(8);
        for (var j = 0; j < 8; j++) {
            sha256_bytes[i].in[7 - j] <== mrzSha[i * 8 + j];
        }
    }

    // check that it is in the right position in dataHashes
    for(var i = 0; i < 32; i++) {
        dataHashes[31 + i] === sha256_bytes[i].out;
    }

    // hash dataHashes
    signal dataHashesSha[256] <== Sha256Bytes(297)(dataHashes);

    // get output of dataHashes sha256 into bytes to check against eContent
    component dataHashes_sha256_bytes[32];
    for (var i = 0; i < 32; i++) {
        dataHashes_sha256_bytes[i] = Bits2Num(8);
        for (var j = 0; j < 8; j++) {
            dataHashes_sha256_bytes[i].in[7 - j] <== dataHashesSha[i * 8 + j];
        }
    }

    // check that it is in the right position in eContent
    for(var i = 0; i < 32; i++) {
        eContentBytes[72 + i] === dataHashes_sha256_bytes[i].out;
    }

    // hash eContentBytes
    signal eContentSha[256] <== Sha256Bytes(104)(eContentBytes);

    // get output of eContentBytes sha256 into k chunks of n bits each
    var msg_len = (256 + n) \ n;

    component eContentHash[msg_len];
    for (var i = 0; i < msg_len; i++) {
        eContentHash[i] = Bits2Num(n);
    }
    for (var i = 0; i < 256; i++) {
        eContentHash[i \ n].in[i % n] <== eContentSha[255 - i];
    }
    for (var i = 256; i < n * msg_len; i++) {
        eContentHash[i \ n].in[i % n] <== 0;
    }
    
    // verify eContentHash signature
    component rsa = RSAVerify65537(64, 32);
    for (var i = 0; i < msg_len; i++) {
        rsa.base_message[i] <== eContentHash[i].out;
    }
    for (var i = msg_len; i < k; i++) {
        rsa.base_message[i] <== 0;
    }
    rsa.modulus <== pubkey;
    rsa.signature <== signature;
}