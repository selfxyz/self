pragma circom 2.1.9;

include "../../bitify/bitify.circom";

// PKCS1v1.5 Padding Scheme
// 0x00 || 0x01 || PS || 0x00 || OID || Hash
// PS is a sequence of 0xFF bytes that is padded so that the data to be signed matches the length of the key.
// OID is the object identifier for the hash function used.
// For SHA1,   the OID is 0x3021300906052b0e03021a05000414
// For SHA256, the OID is 0x3031300d060960864801650304020105000420
// For SHA384, the OID is 0x3041300d060960864801650304020205000430
// For SHA512, the OID is 0x3051300d060960864801650304020305000440 

template Pkcs1v1_5Padding(CHUNK_SIZE, CHUNK_NUMBER, HASH_SIZE) {
    signal input modulus[CHUNK_NUMBER];
    signal input message[CHUNK_NUMBER];
    
    signal output out[CHUNK_NUMBER];

    var OID_SIZE = getOIDSize(HASH_SIZE);

    signal paddedMessageBits[CHUNK_SIZE * CHUNK_NUMBER];

    component modulusN2B[CHUNK_NUMBER];
    component messageN2B[CHUNK_NUMBER];
    signal modulusBits[CHUNK_SIZE * CHUNK_NUMBER];
    signal messageBits[CHUNK_SIZE * CHUNK_NUMBER];

    for (var i = 0; i < CHUNK_NUMBER; i++) {
        messageN2B[i] = Num2Bits(CHUNK_SIZE);
        messageN2B[i].in <== message[i];
        for (var j = 0; j < CHUNK_SIZE; j++) {
            messageBits[i*CHUNK_SIZE+j] <== messageN2B[i].out[j];
        }
        modulusN2B[i] = Num2Bits(CHUNK_SIZE);
        modulusN2B[i].in <== modulus[i];
        for (var j = 0; j < CHUNK_SIZE; j++) {
            modulusBits[i*CHUNK_SIZE+j] <== modulusN2B[i].out[j];
        }
    }

    for (var i = 0; i < HASH_SIZE; i++) {
        paddedMessageBits[i] <== messageBits[i];
    }

    for (var i = 0; i < 8; i++) {
        paddedMessageBits[HASH_SIZE + OID_SIZE + i] <== 0;
    }

    var OID = getOID(HASH_SIZE);
    for (var i = HASH_SIZE; i < HASH_SIZE + OID_SIZE; i++) {
        paddedMessageBits[i] <== (OID >> (i - HASH_SIZE)) & 1;
    }

    component modulusZero[(CHUNK_SIZE * CHUNK_NUMBER + 7 - (HASH_SIZE + OID_SIZE)) \ 8];
    {
        var modulusPrefix = 0;
        for (var i = CHUNK_SIZE * CHUNK_NUMBER - 1; i >= (HASH_SIZE + OID_SIZE) + 8; i--) {
            if (i + 8 < CHUNK_SIZE * CHUNK_NUMBER) {
                modulusPrefix += modulusBits[i+8];
                if (i % 8 == 0) {
                    var idx = (i - (HASH_SIZE + OID_SIZE)) \ 8;
                    modulusZero[idx] = IsZero();
                    modulusZero[idx].in <== modulusPrefix;
                    paddedMessageBits[i] <== 1-modulusZero[idx].out;
                } else {
                    paddedMessageBits[i] <== paddedMessageBits[i+1];
                }
            } else {
                paddedMessageBits[i] <== 0;
            }
        }
    }

    assert(HASH_SIZE + OID_SIZE + 8 + 65 < CHUNK_SIZE * CHUNK_NUMBER);

    for (var i = HASH_SIZE + OID_SIZE + 8; i < HASH_SIZE + OID_SIZE + 8 + 65; i++) {
        paddedMessageBits[i] === 1;
    }

    component passedMessageB2N[CHUNK_NUMBER];
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        passedMessageB2N[i] = Bits2Num(CHUNK_SIZE);
        for (var j = 0; j < CHUNK_SIZE; j++) {
            passedMessageB2N[i].in[j] <== paddedMessageBits[i*CHUNK_SIZE+j];
        }
        out[i] <== passedMessageB2N[i].out;
    }
}

function getOID(HASH_SIZE) {
    if (HASH_SIZE == 160) {
        return 0x3021300906052b0e03021a05000414;
    }
    if (HASH_SIZE == 256) {
        return 0x3031300d060960864801650304020105000420;
    }
    if (HASH_SIZE == 384) {
        return 0x3041300d060960864801650304020205000430;
    }
    if (HASH_SIZE == 512) {
        return 0x3051300d060960864801650304020305000440;
    }
    return 0;
}

function getOIDSize(HASH_SIZE) {
    if (HASH_SIZE == 160) {
        return 120;
    }
    if (HASH_SIZE == 256) {
        return 152;
    }
    if (HASH_SIZE == 384) {
        return 152;
    }
    if (HASH_SIZE == 512) {
        return 152;
    }
    return 0;
}