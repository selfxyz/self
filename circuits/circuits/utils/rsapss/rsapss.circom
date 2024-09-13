pragma circom  2.1.6;

include "./powMod.circom";
include "./mgf1.circom";
include "./xor2.circom";
include "../sha2/sha256/sha256_hash_bits.circom";
include "../sha2/sha384/sha384_hash_bits.circom";

template VerifyRsaPssSig (n, k, e_bits, ALGO){

    assert(ALGO == 256 || ALGO == 384);


    signal input pubkey[k]; //aka modulus
    signal input signature[k];
    signal input hashed[ALGO]; //message hash

    var emLen = (n*k)\8; //in bytes
    var hLen = ALGO\8; //in bytes
    var sLen = ALGO\8; //in bytes
    var hLenBits = ALGO; //in bits
    var sLenBits = ALGO; //in bits
    var emLenBits = n * k; //in bits


    signal eM[emLen]; 
    signal eMsgInBits[emLenBits];
    
    //computing encoded message
    component powmod = PowerMod(n, k, e_bits);
    powmod.base <== signature;
    powmod.modulus <== pubkey;

   
    signal encoded[k];
    encoded <== powmod.out;

    component num2Bits[k];
    for (var i = 0; i < k; i++) {
        num2Bits[i] = Num2Bits(n);
        num2Bits[i].in <== encoded[k-1-i];
        
        for (var j = 0; j < n; j++) {
            eMsgInBits[i * n + j] <== num2Bits[i].out[n-j-1];
        }
    }

    component bits2Num[emLen];
    for (var i = 0; i < emLen; i++) {
        bits2Num[i] = Bits2Num(8);
        for (var j = 0; j < 8; j++) {
            bits2Num[i].in[7-j] <== eMsgInBits[i*8 + j];
        }
        eM[emLen - i - 1] <== bits2Num[i].out;
    }


    
    //should be more than HLEN + SLEN + 2
    assert(emLen >= hLen + sLen + 2);

    //should end with 0xBC (188 in decimal)
    assert(eM[0] == 188); //inconsistent

    var dbMaskLen = emLen - hLen - 1;
    signal dbMask[dbMaskLen * 8];
    signal DB[dbMaskLen * 8];
    signal salt[sLen * 8];
    signal maskedDB[(emLen - hLen - 1) * 8];

    for (var i=0; i< (emLen - hLen -1) * 8; i++) {
        maskedDB[i] <== eMsgInBits[i];
    }
    
    signal hash[hLen * 8];

    //inserting hash
    for (var i=0; i<hLenBits; i++) {
        hash[i] <== eMsgInBits[(emLenBits) - hLenBits-8 + i];
    }

    //getting mask
    if (ALGO == 256){
        component MGF1_256 = Mgf1Sha256(hLen, dbMaskLen);
        for (var i = 0; i < (hLenBits); i++) {
            MGF1_256.seed[i] <== hash[i];
        }
        for (var i = 0; i < dbMaskLen * 8; i++) {
            dbMask[i] <== MGF1_256.out[i];
        }
    }
    if (ALGO == 384){
        component MGF1_384 = Mgf1Sha384(hLen, dbMaskLen);
        for (var i = 0; i < (hLenBits); i++) {
            MGF1_384.seed[i] <== hash[i];
        }
        for (var i = 0; i < dbMaskLen * 8; i++) {
            dbMask[i] <== MGF1_384.out[i];
        }
    }
    
    

    component xor = Xor2(dbMaskLen * 8);
    for (var i = 0; i < dbMaskLen * 8; i++) {
        xor.a[i] <== maskedDB[i];
        xor.b[i] <== dbMask[i];
    }
    for (var i = 0; i < dbMaskLen * 8; i++) {
        //setting the first leftmost byte to 0
        if (i==0) {
            DB[i] <== 0;
        } else {
            DB[i] <== xor.out[i];
        }
    }

    //inserting salt
    for (var i = 0; i < sLenBits; i++) {
        salt[sLenBits - 1 - i] <== DB[(dbMaskLen * 8) -1 - i];
    }

    signal mDash[1024]; 
    //adding 0s
    for (var i = 0; i < 64; i++) {
        mDash[i] <== 0;
    }
    //adding message hash
    for (var i = 0 ; i < hLen * 8; i++) {
        mDash[64 + i] <== hashed[i];

    }
    //adding salt
    for (var i = 0; i < sLen * 8; i++) {
        mDash[64 + hLen * 8 + i] <== salt[i];

    }

    if (ALGO == 256){
        
        //adding padding
        //len = 64+512 = 576 = 1001000000
        for (var i = 577; i < 1014; i++){
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
        component hDash256 = Sha256_hash_chunks(2);
        hDash256.in <== mDash;
        hDash256.out === hash;
    }
    if (ALGO == 384){

        //padding
        //len = 64+48*16 = 832 = 1101000000
        for (var i = 833; i < 1014; i++){
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
        component hDash384 = Sha384_hash_chunks(1);
        hDash384.in <== mDash;
        
        hDash384.out === hash;
    }
    

   
}

