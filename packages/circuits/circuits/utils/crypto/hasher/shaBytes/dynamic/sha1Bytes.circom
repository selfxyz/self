pragma circom 2.1.5;

include "../../sha1/sha1compression.circom";
include "../../sha1/constants.circom";
include "@openpassport/zk-email-circuits/utils/array.circom";
include "circomlib/circuits/bitify.circom";

//Adapted from @openpassport/zk-email-circuits/helpers/sha.circom
template Sha1Bytes(max_num_bytes) {
    signal input in_padded[max_num_bytes];
    signal input in_len_padded_bytes;
    signal output out[160];

    var num_bits = max_num_bytes * 8;
    component sha = Sha1General(num_bits);

    component bytes[max_num_bytes];
    for (var i = 0; i < max_num_bytes; i++) {
        bytes[i] = Num2Bits(8);
        bytes[i].in <== in_padded[i];
        for (var j = 0; j < 8; j++) {
            sha.paddedIn[i*8+j] <== bytes[i].out[7-j];
        }
    }

    sha.in_len_padded_bits <== in_len_padded_bytes * 8;

    for (var i = 0; i < 160; i++) {
        out[i] <== sha.out[i];
    }
   
}

//Adapted from @openpassport/zk-email-circuits/helpers/sha256general.circom
//Sha1 template from https://github.com/dmpierre/sha1-circom/blob/fe18319cf72b9f3b83d0cea8f49a1f04482c125b/circuits/sha1.circom
template Sha1General(maxBitsPadded) {
    assert(maxBitsPadded % 512 == 0);
    var maxBitsPaddedBits = log2Ceil(maxBitsPadded);
    assert(2 ** maxBitsPaddedBits >= maxBitsPadded);

    signal input paddedIn[maxBitsPadded];
    signal output out[160];
    signal input in_len_padded_bits;
    signal inBlockIndex;

    var i;
    var k;
    var j;
    var maxBlocks;
    maxBlocks = (maxBitsPadded\512);
    var maxBlocksBits = log2Ceil(maxBlocks);
    assert(2 ** maxBlocksBits >= maxBlocks);

    inBlockIndex <-- (in_len_padded_bits >> 9);
    in_len_padded_bits === inBlockIndex * 512;

    component bitLengthVerifier = LessEqThan(maxBitsPaddedBits);
    bitLengthVerifier.in[0] <== in_len_padded_bits;
    bitLengthVerifier.in[1] <== maxBitsPadded;
    bitLengthVerifier.out === 1;

    component ha0 = H_sha1(0);
    component hb0 = H_sha1(1);
    component hc0 = H_sha1(2);
    component hd0 = H_sha1(3);
    component he0 = H_sha1(4);

    component sha1compression[maxBlocks];
    
    for (i=0; i<maxBlocks; i++) {
        
        sha1compression[i] = Sha1compression();

        if (i==0) {
            for (k=0; k<32; k++) {
                sha1compression[i].hin[0*32+k] <== ha0.out[k];
                sha1compression[i].hin[1*32+k] <== hb0.out[k];
                sha1compression[i].hin[2*32+k] <== hc0.out[k];
                sha1compression[i].hin[3*32+k] <== hd0.out[k];
                sha1compression[i].hin[4*32+k] <== he0.out[k];
            }
        } else {
            for (k=0; k<32; k++) {
                sha1compression[i].hin[32*0+k] <== sha1compression[i-1].out[32*0+31-k];
                sha1compression[i].hin[32*1+k] <== sha1compression[i-1].out[32*1+31-k];
                sha1compression[i].hin[32*2+k] <== sha1compression[i-1].out[32*2+31-k];
                sha1compression[i].hin[32*3+k] <== sha1compression[i-1].out[32*3+31-k];
                sha1compression[i].hin[32*4+k] <== sha1compression[i-1].out[32*4+31-k];
            } 
        }

        for (k=0; k<512; k++) {
            sha1compression[i].inp[k] <== paddedIn[i*512+k];
        }
        
    }

    component arraySelectors[160];

    var outs[maxBlocks][160];
    for (i=0; i<maxBlocks; i++) {
        for (j=0; j<5; j++) {
            for (k=0; k<32; k++) {
                outs[i][32*j + k] = sha1compression[i].out[32*j + (31-k)];
            }
        }
    }

    for (i =0; i < 160; i++) {
        arraySelectors[i] = ItemAtIndex(maxBlocks);

        for (j=0; j<maxBlocks; j++) {
            arraySelectors[i].in[j] <== outs[j][i];
        }
        arraySelectors[i].index <== inBlockIndex - 1;
        out[i] <== arraySelectors[i].out;
    }
}