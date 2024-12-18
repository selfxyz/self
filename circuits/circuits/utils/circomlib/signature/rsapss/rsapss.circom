pragma circom 2.1.6;

include "../../bigInt/bigInt.circom";
include "./mgf1.circom";
include "../../bitify/bitGates.circom";
include "../../hasher/hash.circom";

/*
* Verification for RSAPSS signature.
* hashed is hashed message of hash_type algo, hash_type is algo hash algo for mgf1 mask generation.
* There is no assert for CHUNK_SIZE == 64 and it may work with other chunking, but this one wasn`t tested, 
* so better use 64 signature and pubkey - chunked numbers (CHUNK_SIZE, CHUNK_NUMBER).
* default exp = 65537 
* SALT_LEN is salt lenght in bytes! (NOT IN BITES LIKE HASH_TYPE!).
* This is because salt len can`t be % 8 != 0 so we use bytes len (8 bites).
* For now, only HASH_TYPE == 384 && SALT_LEN == 48, HASH_TYPE == 256 && SALT_LEN == 64, HASH_TYPE == 256 && SALT_LEN == 32 cases supported.
* Use this for CHUNK_NUMBER == 2**n, otherwise error will occur.
*/
template VerifyRsaPssSig(CHUNK_SIZE, CHUNK_NUMBER, SALT_LEN, EXP, HASH_TYPE) {
    assert((HASH_TYPE == 384 && SALT_LEN == 48) || (HASH_TYPE == 256 && SALT_LEN == 64) || (HASH_TYPE == 256 && SALT_LEN == 32));
    
    signal input pubkey[CHUNK_NUMBER]; 
    signal input signature[CHUNK_NUMBER];
    signal input hashed[HASH_TYPE]; 


    var EM_LEN = (CHUNK_SIZE * CHUNK_NUMBER) \ 8; 
    var HASH_LEN = HASH_TYPE \ 8; 
    var SALT_LEN_BITS = SALT_LEN * 8; 
    var EM_LEN_BITS = CHUNK_SIZE * CHUNK_NUMBER; 
    
    signal eM[EM_LEN];
    signal eMsgInBits[EM_LEN_BITS];
    
    //computing encoded message
    component powerMod;
    powerMod = PowerMod(CHUNK_SIZE, CHUNK_NUMBER, EXP);
    powerMod.base <== signature;
    powerMod.modulus <== pubkey;
    
    signal encoded[CHUNK_NUMBER];
    encoded <== powerMod.out;
    
    component num2Bits[CHUNK_NUMBER];

    for (var i = 0; i < CHUNK_NUMBER; i++) {
        num2Bits[i] = Num2Bits(CHUNK_SIZE);
        num2Bits[i].in <== encoded[CHUNK_NUMBER - 1 - i];
        
        for (var j = 0; j < CHUNK_SIZE; j++) {
            eMsgInBits[i * CHUNK_SIZE + j] <== num2Bits[i].out[CHUNK_SIZE - j - 1];
        }
    }
    
    component bits2Num[EM_LEN];

    for (var i = 0; i < EM_LEN; i++) {
        bits2Num[i] = Bits2Num(8);

        for (var j = 0; j < 8; j++) {
            bits2Num[i].in[7 - j] <== eMsgInBits[i * 8 + j];
        }

        eM[EM_LEN - i - 1] <== bits2Num[i].out;
    }
 
    //should be more than HLEN + SLEN + 2
    assert(EM_LEN >= HASH_LEN + SALT_LEN + 2);
    
    //should end with 0xBC (188 in decimal)
    assert(eM[0] == 188); 
    
    var DB_MASK_LEN = EM_LEN - HASH_LEN - 1;

    signal dbMask[DB_MASK_LEN * 8];
    signal db[DB_MASK_LEN * 8];
    signal salt[SALT_LEN * 8];
    signal maskedDB[(EM_LEN - HASH_LEN - 1) * 8];
    
    for (var i = 0; i < (EM_LEN - HASH_LEN - 1) * 8; i++) {
        maskedDB[i] <== eMsgInBits[i];
    }
    
    signal hash[HASH_LEN * 8];
    
    //inserting hash
    for (var i = 0; i < HASH_TYPE; i++) {
        hash[i] <== eMsgInBits[(EM_LEN_BITS) - HASH_TYPE - 8 + i];
    }
    
    //getting mask
    if (HASH_TYPE == 256) {
        component MGF1_256 = Mgf1Sha256(HASH_LEN, DB_MASK_LEN);

        for (var i = 0; i < (HASH_TYPE); i++) {
            MGF1_256.seed[i] <== hash[i];
        }

        for (var i = 0; i < DB_MASK_LEN * 8; i++) {
            dbMask[i] <== MGF1_256.out[i];
        }
    }
    if (HASH_TYPE == 384) {
        component MGF1_384 = Mgf1Sha384(HASH_LEN, DB_MASK_LEN);

        for (var i = 0; i < (HASH_TYPE); i++) {
            MGF1_384.seed[i] <== hash[i];
        }

        for (var i = 0; i < DB_MASK_LEN * 8; i++) {
            dbMask[i] <== MGF1_384.out[i];
        }
    }

    component xor = Xor2(DB_MASK_LEN * 8);

    for (var i = 0; i < DB_MASK_LEN * 8; i++) {
        xor.in1[i] <== maskedDB[i];
        xor.in2[i] <== dbMask[i];
    }

    for (var i = 0; i < DB_MASK_LEN * 8; i++) {
        //setting the first leftmost byte to 0
        if (i == 0) {
            db[i] <== 0;
        } else {
            db[i] <== xor.out[i];
        }
    }
    
    //inserting salt
    for (var i = 0; i < SALT_LEN_BITS; i++) {
        salt[SALT_LEN_BITS - 1 - i] <== db[(DB_MASK_LEN * 8) - 1 - i];
    }
    
    signal mDash[1024];
    //adding 0s
    for (var i = 0; i < 64; i++) {
        mDash[i] <== 0;
    }

    //adding message hash
    for (var i = 0; i < HASH_LEN * 8; i++) {
        mDash[64 + i] <== hashed[i];
    }

    //adding salt
    for (var i = 0; i < SALT_LEN * 8; i++) {
        mDash[64 + HASH_LEN * 8 + i] <== salt[i];
    }
    
    if (HASH_TYPE == 256 && SALT_LEN == 32) {
        //adding padding
        //len = 64+512 = 576 = 1001000000
        for (var i = 577; i < 1014; i++) {
            mDash[i] <== 0;
        }

        mDash[576] <== 1;
        mDash[1023] <== 0;
        mDash[1022] <== 0;
        mDash[1021] <== 0;
        mDash[1020] <== 0;
        mDash[1019] <== 0;
        mDash[1018] <== 0;
        mDash[1017] <== 1;
        mDash[1016] <== 0;
        mDash[1015] <== 0;
        mDash[1014] <== 1;
        
        //hashing
        component hDash256 = ShaHashChunks(2, HASH_TYPE);
        hDash256.in <== mDash;

        hDash256.out === hash;
    }

    if (HASH_TYPE == 256 && SALT_LEN == 64) {
        for (var i = 833; i < 1014; i++) {
            mDash[i] <== 0;
        }

        mDash[832] <== 1;
        mDash[1023] <== 0;
        mDash[1022] <== 0;
        mDash[1021] <== 0;
        mDash[1020] <== 0;
        mDash[1019] <== 0;
        mDash[1018] <== 0;
        mDash[1017] <== 1;
        mDash[1016] <== 0;
        mDash[1015] <== 1;
        mDash[1014] <== 1;

        component hDash256 = ShaHashChunks(2, HASH_TYPE);
        hDash256.in <== mDash;

        hDash256.out === hash;
    }

    if (HASH_TYPE == 384 && SALT_LEN == 48) {        
        //padding
        //len = 64+48*16 = 832 = 1101000000
        for (var i = 833; i < 1014; i++) {
            mDash[i] <== 0;
        }

        mDash[832] <== 1;
        mDash[1023] <== 0;
        mDash[1022] <== 0;
        mDash[1021] <== 0;
        mDash[1020] <== 0;
        mDash[1019] <== 0;
        mDash[1018] <== 0;
        mDash[1017] <== 1;
        mDash[1016] <== 0;
        mDash[1015] <== 1;
        mDash[1014] <== 1;
        
        //hashing mDash
        component hDash384 = ShaHashChunks(1, HASH_TYPE);
        hDash384.in <== mDash;

        hDash384.out === hash;
    }
}

/*
* Verification for RSAPSS signature.
* hashed is hashed message of hash_type algo, hash_type is algo hash algo for mgf1 mask generation.
* There is no assert for CHUNK_SIZE == 64 and it may work with other chunking, but this one wasn`t tested,
* so better use 64 signature and pubkey - chunked numbers (CHUNK_SIZE, CHUNK_NUMBER).
* e_bits - Len of bit representation of exponent with 1 highest and lowest bits, other are 0 (2^(e_bits - 1) + 1).
* default exp = 65537 (e_bits = 17)
* SALT_LEN is salt lenght in bytes! (NOT IN BITES LIKE HASH_TYPE!)
* This is because salt len can`t be % 8 != 0 so we use bytes len (8 bites).
* For now, only HASH_TYPE == 384 && SALT_LEN == 48,  HASH_TYPE == 256 && SALT_LEN == 64, HASH_TYPE == 256 && SALT_LEN == 32 cases supported.
* Use this for CHUNK_NUMBER != 2**n, otherwise use previous template.
*/
template VerifyRsaPssSigNonOptimised(CHUNK_SIZE, CHUNK_NUMBER, SALT_LEN, EXP, HASH_TYPE) {
    assert((HASH_TYPE == 384 && SALT_LEN == 48) || (HASH_TYPE == 256 && SALT_LEN == 64) || (HASH_TYPE == 256 && SALT_LEN == 32));
    
    signal input pubkey[CHUNK_NUMBER]; 
    signal input signature[CHUNK_NUMBER];
    signal input hashed[HASH_TYPE]; 


    var EM_LEN = (CHUNK_SIZE * CHUNK_NUMBER) \ 8; 
    var HASH_LEN = HASH_TYPE \ 8; 
    var SALT_LEN_BITS = SALT_LEN * 8; 
    var EM_LEN_BITS = CHUNK_SIZE * CHUNK_NUMBER; 
    
    signal eM[EM_LEN];
    signal eMsgInBits[EM_LEN_BITS];
    
    //computing encoded message
    component powerMod;
    powerMod = PowerModNonOptimised(CHUNK_SIZE, CHUNK_NUMBER, EXP);
    powerMod.base <== signature;
    powerMod.modulus <== pubkey;
    
    signal encoded[CHUNK_NUMBER];
    encoded <== powerMod.out;
    
    component num2Bits[CHUNK_NUMBER];

    for (var i = 0; i < CHUNK_NUMBER; i++) {
        num2Bits[i] = Num2Bits(CHUNK_SIZE);
        num2Bits[i].in <== encoded[CHUNK_NUMBER - 1 - i];
        
        for (var j = 0; j < CHUNK_SIZE; j++) {
            eMsgInBits[i * CHUNK_SIZE + j] <== num2Bits[i].out[CHUNK_SIZE - j - 1];
        }
    }
    
    component bits2Num[EM_LEN];

    for (var i = 0; i < EM_LEN; i++) {
        bits2Num[i] = Bits2Num(8);

        for (var j = 0; j < 8; j++) {
            bits2Num[i].in[7 - j] <== eMsgInBits[i * 8 + j];
        }

        eM[EM_LEN - i - 1] <== bits2Num[i].out;
    }
    
    //should be more than HLEN + SLEN + 2
    assert(EM_LEN >= HASH_LEN + SALT_LEN + 2);
    
    //should end with 0xBC (188 in decimal)
    assert(eM[0] == 188); 
    
    var DB_MASK_LEN = EM_LEN - HASH_LEN - 1;
    signal dbMask[DB_MASK_LEN * 8];
    signal db[DB_MASK_LEN * 8];
    signal salt[SALT_LEN * 8];
    signal maskedDB[(EM_LEN - HASH_LEN - 1) * 8];
    
    for (var i = 0; i < (EM_LEN - HASH_LEN - 1) * 8; i++) {
        maskedDB[i] <== eMsgInBits[i];
    }
    
    signal hash[HASH_LEN * 8];
    
    //inserting hash
    for (var i = 0; i < HASH_TYPE; i++) {
        hash[i] <== eMsgInBits[(EM_LEN_BITS) - HASH_TYPE - 8 + i];
    }
    
    //getting mask
    if (HASH_TYPE == 256) {
        component MGF1_256 = Mgf1Sha256(HASH_LEN, DB_MASK_LEN);

        for (var i = 0; i < (HASH_TYPE); i++) {
            MGF1_256.seed[i] <== hash[i];
        }

        for (var i = 0; i < DB_MASK_LEN * 8; i++) {
            dbMask[i] <== MGF1_256.out[i];
        }
    }
    if (HASH_TYPE == 384) {
        component MGF1_384 = Mgf1Sha384(HASH_LEN, DB_MASK_LEN);

        for (var i = 0; i < (HASH_TYPE); i++) {
            MGF1_384.seed[i] <== hash[i];
        }

        for (var i = 0; i < DB_MASK_LEN * 8; i++) {
            dbMask[i] <== MGF1_384.out[i];
        }
    }
    
    component xor = Xor2(DB_MASK_LEN * 8);

    for (var i = 0; i < DB_MASK_LEN * 8; i++) {
        xor.in1[i] <== maskedDB[i];
        xor.in2[i] <== dbMask[i];
    }

    for (var i = 0; i < DB_MASK_LEN * 8; i++) {
        //setting the first leftmost byte to 0
        if (i == 0) {
            db[i] <== 0;
        } else {
            db[i] <== xor.out[i];
        }
    }
    
    //inserting salt
    for (var i = 0; i < SALT_LEN_BITS; i++) {
        salt[SALT_LEN_BITS - 1 - i] <== db[(DB_MASK_LEN * 8) - 1 - i];
    }
    
    signal mDash[1024];
    //adding 0s
    for (var i = 0; i < 64; i++) {
        mDash[i] <== 0;
    }

    //adding message hash
    for (var i = 0; i < HASH_LEN * 8; i++) {
        mDash[64 + i] <== hashed[i];
        
    }

    //adding salt
    for (var i = 0; i < SALT_LEN * 8; i++) {
        mDash[64 + HASH_LEN * 8 + i] <== salt[i];  
    }

    if (HASH_TYPE == 256 && SALT_LEN == 32) {
        //adding padding
        //len = 64+512 = 576 = 1001000000
        for (var i = 577; i < 1014; i++) {
            mDash[i] <== 0;
        }

        mDash[576] <== 1;
        mDash[1023] <== 0;
        mDash[1022] <== 0;
        mDash[1021] <== 0;
        mDash[1020] <== 0;
        mDash[1019] <== 0;
        mDash[1018] <== 0;
        mDash[1017] <== 1;
        mDash[1016] <== 0;
        mDash[1015] <== 0;
        mDash[1014] <== 1;
        
        //hashing
        component hDash256 = ShaHashChunks(2, HASH_TYPE);
        hDash256.in <== mDash;

        hDash256.out === hash;
    }
    if (HASH_TYPE == 256 && SALT_LEN == 64) {
        for (var i = 833; i < 1014; i++) {
            mDash[i] <== 0;
        }

        mDash[832] <== 1;
        mDash[1023] <== 0;
        mDash[1022] <== 0;
        mDash[1021] <== 0;
        mDash[1020] <== 0;
        mDash[1019] <== 0;
        mDash[1018] <== 0;
        mDash[1017] <== 1;
        mDash[1016] <== 0;
        mDash[1015] <== 1;
        mDash[1014] <== 1;

        component hDash256 = ShaHashChunks(2, HASH_TYPE);
        hDash256.in <== mDash;

        hDash256.out === hash;
    }

    if (HASH_TYPE == 384 && SALT_LEN == 48) {        
        //padding
        //len = 64+48*16 = 832 = 1101000000
        for (var i = 833; i < 1014; i++) {
            mDash[i] <== 0;
        }

        mDash[832] <== 1;
        mDash[1023] <== 0;
        mDash[1022] <== 0;
        mDash[1021] <== 0;
        mDash[1020] <== 0;
        mDash[1019] <== 0;
        mDash[1018] <== 0;
        mDash[1017] <== 1;
        mDash[1016] <== 0;
        mDash[1015] <== 1;
        mDash[1014] <== 1;
        
        //hashing mDash
        component hDash384 = ShaHashChunks(1, HASH_TYPE);
        hDash384.in <== mDash;

        hDash384.out === hash;
    }
}
