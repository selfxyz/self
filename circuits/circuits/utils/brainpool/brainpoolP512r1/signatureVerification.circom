pragma circom 2.1.6;

include "../brainpoolP256r1/circomPairing/curve.circom";
include "circomlib/circuits/bitify.circom";
include "./brainpool.circom";
include "./brainpoolFunc.circom";


template verifyBrainpool(CHUNK_SIZE,CHUNK_NUMBER, ALGO){
    signal input pubkey[2 * CHUNK_SIZE * CHUNK_NUMBER];
    signal input signature[2 * CHUNK_SIZE * CHUNK_NUMBER];
    signal input hashed[ALGO];

    signal pubkeyChunked[2][CHUNK_NUMBER];
    signal signatureChunked[2][CHUNK_NUMBER];

    component bits2NumInput[2*2*CHUNK_NUMBER];

    for (var i = 0; i < 2; i++){
        for (var j = 0; j < CHUNK_NUMBER; j++){
            bits2NumInput[i*CHUNK_NUMBER+j] = Bits2Num(CHUNK_SIZE);
            bits2NumInput[(i+2)*CHUNK_NUMBER+j] = Bits2Num(CHUNK_SIZE);

            for (var z = 0; z < CHUNK_SIZE; z++){
                bits2NumInput[i*CHUNK_NUMBER+j].in[z] <== pubkey[i*CHUNK_NUMBER*CHUNK_SIZE + CHUNK_SIZE * j + (CHUNK_SIZE - 1) - z];
                bits2NumInput[(i+2)*CHUNK_NUMBER+j].in[z] <== signature[i*CHUNK_NUMBER*CHUNK_SIZE + CHUNK_SIZE * j + (CHUNK_SIZE - 1) - z];
            }
            bits2NumInput[i*CHUNK_NUMBER+j].out ==> pubkeyChunked[i][(CHUNK_NUMBER - 1) - j];
            bits2NumInput[(i+2)*CHUNK_NUMBER+j].out ==> signatureChunked[i][(CHUNK_NUMBER - 1) - j];

        }
    }

    signal hashedMessageBits[CHUNK_SIZE*CHUNK_NUMBER];
    var SHIFT = CHUNK_SIZE*CHUNK_NUMBER - ALGO;
    for (var i = 0; i < SHIFT; i++){
        hashedMessageBits[i] <== 0;
    }
    for (var i = 0; i < ALGO; i++){
        hashedMessageBits[i+SHIFT] <== hashed[i];
    }


    signal hashedMessageChunked[CHUNK_NUMBER];

    component bits2Num[CHUNK_NUMBER];
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        bits2Num[i] = Bits2Num(CHUNK_SIZE);
        for (var j = 0; j < CHUNK_SIZE; j++) {
            bits2Num[i].in[CHUNK_SIZE - 1 - j] <== hashedMessageBits[i*CHUNK_SIZE+j];
        }
        hashedMessageChunked[CHUNK_NUMBER - 1 - i] <== bits2Num[i].out;
    }

    component getOrder = GetBrainpoolOrder(CHUNK_SIZE,CHUNK_NUMBER);
    signal order[CHUNK_NUMBER];
    order <== getOrder.order;

    signal sinv[CHUNK_NUMBER];

    component modInv = BigModInv(CHUNK_SIZE,CHUNK_NUMBER);

    modInv.in <== signatureChunked[1];
    modInv.p <== order;
    modInv.out ==> sinv;


    signal sh[CHUNK_NUMBER];

    component mult = BigMultModP(CHUNK_SIZE, CHUNK_NUMBER);
    
    mult.a <== sinv;
    mult.b <== hashedMessageChunked;
    mult.p <== order;
    sh <== mult.out;

    signal sr[CHUNK_NUMBER];

    component mult2 = BigMultModP(CHUNK_SIZE, CHUNK_NUMBER);

    mult2.a <== sinv;
    mult2.b <== signatureChunked[0];
    mult2.p <== order;
    sr <== mult2.out;
  
    
    signal tmpPoint1[2][CHUNK_NUMBER];
    signal tmpPoint2[2][CHUNK_NUMBER];

    component scalarMult1 = BrainpoolGeneratorMultiplication(CHUNK_SIZE,CHUNK_NUMBER);
    component scalarMult2 = BrainpoolPipingerMult(CHUNK_SIZE,CHUNK_NUMBER, 4);
    
    scalarMult1.scalar <== sh;

    tmpPoint1 <== scalarMult1.out;


    scalarMult2.scalar <== sr;
    scalarMult2.point <== pubkeyChunked;

    tmpPoint2 <== scalarMult2.out;


    signal verifyX[CHUNK_NUMBER];

    component sumPoints = BrainpoolAddUnequal(CHUNK_SIZE,CHUNK_NUMBER);
    
    sumPoints.point1 <== tmpPoint1;
    sumPoints.point2 <== tmpPoint2;

    verifyX <== sumPoints.out[0];
    verifyX === signatureChunked[0];   
}