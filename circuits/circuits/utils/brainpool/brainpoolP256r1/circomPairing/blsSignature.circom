pragma circom 2.0.3;

include "finalExp.circom";
include "pairing.circom";
include "bls12_381Func.circom";
include "bls12_381HashToG2.circom";


// Input: pubkey in G_1 
//        signature, H(m) in G_2
// Output: out = 1 if valid signature, else = 0
// Verifies that e(G1, signature) = e(pubkey, H(m)) by checking e(G1, signature)*e(pubkey, -H(m)) === 1 where e(,) is optimal Ate pairing
template CoreVerifyPubkeyG1NoCheck(CHUNK_SIZE, CHUNK_NUMBER){
    signal input pubkey[2][CHUNK_NUMBER];
    signal input signature[2][2][CHUNK_NUMBER];
    signal input Hm[2][2][CHUNK_NUMBER];
    signal output out;

    var Q[150] = get_BLS12_381_prime(CHUNK_SIZE, CHUNK_NUMBER);
    var X = get_BLS12_381_parameter();
    var G1[2][150] = get_generator_G1(CHUNK_SIZE, CHUNK_NUMBER); 

    signal negS[2][2][CHUNK_NUMBER];
    component neg[2];
    for(var j = 0; j < 2; j++){
        neg[j] = FpNegate(CHUNK_SIZE, CHUNK_NUMBER, Q); 
        for(var idx = 0; idx < CHUNK_NUMBER; idx++)
            neg[j].in[idx] <== signature[1][j][idx];
        for(var idx = 0; idx < CHUNK_NUMBER; idx++){
            negS[0][j][idx] <== signature[0][j][idx];
            negS[1][j][idx] <== neg[j].out[idx];
        }
    }

    component miller = MillerLoopFp2Two(CHUNK_SIZE, CHUNK_NUMBER, [4,4], X, Q);
    for(var i = 0; i < 2; i++){
        for(var j = 0; j < 2; j++){
            for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                miller.P[0][i][j][idx] <== negS[i][j][idx];
                miller.P[1][i][j][idx] <== Hm[i][j][idx];
            }   
        }
    }

    for(var i = 0; i < 2; i++){
        for(var idx = 0; idx < CHUNK_NUMBER; idx++){
            miller.Q[0][i][idx] <== G1[i][idx];
            miller.Q[1][i][idx] <== pubkey[i][idx];
        }
    }

    component finalExp = FinalExponentiate(CHUNK_SIZE, CHUNK_NUMBER, Q);
    for(var i = 0; i < 6; i++){
        for(var j = 0; j < 2; j++){
            for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                finalExp.in[i][j][idx] <== miller.out[i][j][idx];
            }
        }
    }

    component is_valid[6][2][CHUNK_NUMBER];
    var total = 12 * CHUNK_NUMBER;
    for(var i = 0; i < 6; i++){
        for(var j = 0; j < 2; j++){
            for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                is_valid[i][j][idx] = IsZero(); 
                if(i == 0 && j == 0 && idx == 0){
                    is_valid[i][j][idx].in <== finalExp.out[i][j][idx] - 1;
                } else {
                    is_valid[i][j][idx].in <== finalExp.out[i][j][idx];
                }
                total -= is_valid[i][j][idx].out; 
            }
        }
    }

    component valid = IsZero(); 
    valid.in <== total;
    out <== valid.out;
}

// Inputs:
//   - pubkey as element of E(Fq)
//   - hash represents two field elements in Fp2, in practice hash = hash_to_field(msg,2).
//   - signature, as element of E2(Fq2) 
// Assume signature is not point at infinity 
template CoreVerifyPubkeyG1(CHUNK_SIZE, CHUNK_NUMBER){
    signal input pubkey[2][CHUNK_NUMBER];
    signal input signature[2][2][CHUNK_NUMBER];
    signal input hash[2][2][CHUNK_NUMBER];
     
    var Q[150] = get_BLS12_381_prime(CHUNK_SIZE, CHUNK_NUMBER);

    component lt[10];
    // check all len CHUNK_NUMBER input arrays are correctly formatted bigints < Q (BigLessThan calls Num2Bits)
    for(var i = 0; i < 10; i++){
        lt[i] = BigLessThan(CHUNK_SIZE, CHUNK_NUMBER);
        for(var idx = 0; idx < CHUNK_NUMBER; idx++)
            lt[i].b[idx] <== Q[idx];
    }
    for(var idx = 0; idx < CHUNK_NUMBER; idx++){
        lt[0].a[idx] <== pubkey[0][idx];
        lt[1].a[idx] <== pubkey[1][idx];
        lt[2].a[idx] <== signature[0][0][idx];
        lt[3].a[idx] <== signature[0][1][idx];
        lt[4].a[idx] <== signature[1][0][idx];
        lt[5].a[idx] <== signature[1][1][idx];
        lt[6].a[idx] <== hash[0][0][idx];
        lt[7].a[idx] <== hash[0][1][idx];
        lt[8].a[idx] <== hash[1][0][idx];
        lt[9].a[idx] <== hash[1][1][idx];
    }
    var r = 0;
    for(var i = 0; i < 10; i++){
        r += lt[i].out;
    }
    r === 10;
    // check all registers are in [0, 2^CHUNK_SIZE)
    component check[5]; 
    for(var i = 0; i < 5; i++){
        check[i] = RangeCheck2D(CHUNK_SIZE, CHUNK_NUMBER); 
    }
    for(var i = 0; i < 2; i++){
        for(var idx = 0; idx < CHUNK_NUMBER; idx++){
            check[0].in[i][idx] <== pubkey[i][idx];
            check[1].in[i][idx] <== signature[0][i][idx];
            check[2].in[i][idx] <== signature[1][i][idx];
            check[3].in[i][idx] <== hash[0][i][idx];
            check[4].in[i][idx] <== hash[1][i][idx];
        }
    }
    
    component pubkeyValid = SubgroupCheckG1(CHUNK_SIZE, CHUNK_NUMBER);
    for(var i = 0; i < 2; i++){
        for(var idx = 0; idx < CHUNK_NUMBER; idx++){
            pubkeyValid.in[i][idx] <== pubkey[i][idx];
        }
    }

    component signatureValid = SubgroupCheckG2(CHUNK_SIZE, CHUNK_NUMBER);
    for(var i = 0; i < 2; i++){
        for(var j = 0; j < 2; j++){
            for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                signatureValid.in[i][j][idx] <== signature[i][j][idx];
            }
        }
    }

    component Hm = MapToG2(CHUNK_SIZE, CHUNK_NUMBER);
    for(var i = 0; i < 2; i++){
        for(var j = 0; j < 2; j++){
            for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                Hm.in[i][j][idx] <== hash[i][j][idx];
            }
        }
    }

    Hm.isInfinity === 0;
    
    component verify = CoreVerifyPubkeyG1NoCheck(CHUNK_SIZE, CHUNK_NUMBER);

    for(var i = 0; i < 2; i++){
        for(var idx = 0; idx < CHUNK_NUMBER; idx++){
            verify.pubkey[i][idx] <== pubkey[i][idx];
        }
    }
    for(var i = 0; i < 2; i++){
        for(var j = 0; j < 2; j++){
            for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                verify.signature[i][j][idx] <== signature[i][j][idx];
                verify.Hm[i][j][idx] <== Hm.out[i][j][idx]; 
            }
        }
    }

    verify.out === 1;
}
