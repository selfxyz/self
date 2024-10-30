pragma circom 2.1.6;

include "./circomPairing/curve.circom";
include "circomlib/circuits/bitify.circom";
include "./brainpool.circom";
include "./brainpoolFunc.circom";


template verifyBrainpool(CHUNK_SIZE,CHUNK_NUMBER, ALGO){
    signal input pubkey[2 * CHUNK_SIZE * CHUNK_NUMBER];
    signal input signature[2 * CHUNK_SIZE * CHUNK_NUMBER];
    signal input hashed[ALGO];

    signal pubkeyChunked[2][6];
    signal signatureChunked[2][6];

    signal pubkeyBits[2][258];
    signal signatureBits[2][258];
    pubkeyBits[0][0] <== 0;
    pubkeyBits[0][1] <== 0;
    pubkeyBits[1][0] <== 0;
    pubkeyBits[1][1] <== 0;
    signatureBits[0][0] <== 0;    
    signatureBits[0][1] <== 0;    
    signatureBits[1][0] <== 0;    
    signatureBits[1][1] <== 0;    

    for (var i = 0; i < 2; i++){
        for (var j = 0; j < 256; j++){
            pubkeyBits[i][j+2] <== pubkey[i*256 + j];
            signatureBits[i][j+2] <== signature[i*256 +j];
        }
    }

    component bits2NumInput[24];

    for (var i = 0; i < 2; i++){
        for (var j = 0; j < 6; j++){
            bits2NumInput[i*6+j] = Bits2Num(43);
            bits2NumInput[(i+2)*6+j] = Bits2Num(43);

            for (var z = 0; z < 43; z++){
                bits2NumInput[i*6+j].in[z] <== pubkeyBits[i][43 * j + 42 - z];
                bits2NumInput[(i+2)*6+j].in[z] <== signatureBits[i][43 * j + 42 - z];
            }
            bits2NumInput[i*6+j].out ==> pubkeyChunked[i][5-j];
            bits2NumInput[(i+2)*6+j].out ==> signatureChunked[i][5-j];

        }
    }


    signal hashedMessageBits[258];
    hashedMessageBits[0] <== 0;
    hashedMessageBits[1] <== 0;
    for (var i = 0; i < ALGO; i++){
        hashedMessageBits[i+2] <== hashed[i];
    }


    signal hashedMessageChunked[6];

    component bits2Num[6];
    for (var i = 0; i < 6; i++) {
        bits2Num[i] = Bits2Num(43);
        for (var j = 0; j < 43; j++) {
            bits2Num[i].in[43-1-j] <== hashedMessageBits[i*43+j];
        }
        hashedMessageChunked[6-1-i] <== bits2Num[i].out;
    }
    
    component getOrder = GetBrainpoolOrder(43,6);
    signal order[6];
    order <== getOrder.order;

    signal sinv[6];

    component modInv = BigModInv(43,6);

    modInv.in <== signatureChunked[1];
    modInv.p <== order;
    modInv.out ==> sinv;

    signal sh[6];

    component mult = BigMultModP(43, 6);
    
    mult.a <== sinv;
    mult.b <== hashedMessageChunked;
    mult.p <== order;
    sh <== mult.out;

    signal sr[6];

    component mult2 = BigMultModP(43, 6);

    mult2.a <== sinv;
    mult2.b <== signatureChunked[0];
    mult2.p <== order;
    sr <== mult2.out;
  
    
    signal tmpPoint1[2][6];
    signal tmpPoint2[2][6];

    component scalarMult1 = BrainpoolGeneratorMultiplication(43,6);
    component scalarMult2 = BrainpoolPipingerMult(43,6,4);
    
    scalarMult1.scalar <== sh;

    tmpPoint1 <== scalarMult1.out;

    scalarMult2.scalar <== sr;
    scalarMult2.point <== pubkeyChunked;

    tmpPoint2 <== scalarMult2.out;

    signal verifyX[6];

    component sumPoints = BrainpoolAddUnequal(43,6);
    
    sumPoints.point1 <== tmpPoint1;
    sumPoints.point2 <== tmpPoint2;
    verifyX <== sumPoints.out[0];

    verifyX === signatureChunked[0];   
}