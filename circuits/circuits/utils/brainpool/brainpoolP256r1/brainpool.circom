pragma circom 2.1.6;

include "./circomPairing/curve.circom";
include "./brainpoolFunc.circom";
include "./brainpoolPows.circom";
include "circomlib/circuits/multiplexer.circom";
include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/comparators.circom";
include "../utils/func.circom";

template BrainpoolScalarMult(CHUNK_SIZE, CHUNK_NUMBER){
    signal input scalar[CHUNK_NUMBER];
    signal input point[2][CHUNK_NUMBER];

    signal output out[2][CHUNK_NUMBER];

    component n2b[CHUNK_NUMBER];
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        n2b[i] = Num2Bits(CHUNK_SIZE);
        n2b[i].in <== scalar[i];
    }

    // hasPrevNonZero[CHUNK_SIZE * i + j] == 1 if there is a nonzero bit in location [i][j] or higher order bit
    component hasPrevNonZero[CHUNK_NUMBER * CHUNK_SIZE];
    for (var i = CHUNK_NUMBER - 1; i >= 0; i--) {
        for (var j = CHUNK_SIZE - 1; j >= 0; j--) {
            hasPrevNonZero[CHUNK_SIZE * i + j] = OR();
            if (i == CHUNK_NUMBER - 1 && j == CHUNK_SIZE - 1) {
                hasPrevNonZero[CHUNK_SIZE * i + j].a <== 0;
                hasPrevNonZero[CHUNK_SIZE * i + j].b <== n2b[i].out[j];
            } else {
                hasPrevNonZero[CHUNK_SIZE * i + j].a <== hasPrevNonZero[CHUNK_SIZE * i + j + 1].out;
                hasPrevNonZero[CHUNK_SIZE * i + j].b <== n2b[i].out[j];
            }
        }
    }

    signal partial[CHUNK_SIZE * CHUNK_NUMBER][2][CHUNK_NUMBER];
    signal intermed[CHUNK_SIZE * CHUNK_NUMBER - 1][2][CHUNK_NUMBER];
    component adders[CHUNK_SIZE * CHUNK_NUMBER - 1];
    component doublers[CHUNK_SIZE * CHUNK_NUMBER - 1];
    for (var i = CHUNK_NUMBER - 1; i >= 0; i--) {
        for (var j = CHUNK_SIZE - 1; j >= 0; j--) {
            if (i == CHUNK_NUMBER - 1 && j == CHUNK_SIZE - 1) {
                for (var idx = 0; idx < CHUNK_NUMBER; idx++) {
                    partial[CHUNK_SIZE * i + j][0][idx] <== point[0][idx];
                    partial[CHUNK_SIZE * i + j][1][idx] <== point[1][idx];
                }
            }
            if (i < CHUNK_NUMBER - 1 || j < CHUNK_SIZE - 1) {
                adders[CHUNK_SIZE * i + j] = BrainpoolAddUnequal(CHUNK_SIZE, CHUNK_NUMBER);
                doublers[CHUNK_SIZE * i + j] = BrainpoolDouble(CHUNK_SIZE, CHUNK_NUMBER);
                for (var idx = 0; idx < CHUNK_NUMBER; idx++) {
                    doublers[CHUNK_SIZE * i + j].in[0][idx] <== partial[CHUNK_SIZE * i + j + 1][0][idx];
                    doublers[CHUNK_SIZE * i + j].in[1][idx] <== partial[CHUNK_SIZE * i + j + 1][1][idx];
                }
                for (var idx = 0; idx < CHUNK_NUMBER; idx++) {
                    adders[CHUNK_SIZE * i + j].point1[0][idx] <== doublers[CHUNK_SIZE * i + j].out[0][idx];
                    adders[CHUNK_SIZE * i + j].point1[1][idx] <== doublers[CHUNK_SIZE * i + j].out[1][idx];
                    adders[CHUNK_SIZE * i + j].point2[0][idx] <== point[0][idx];
                    adders[CHUNK_SIZE * i + j].point2[1][idx] <== point[1][idx];
                }
                // partial[CHUNK_SIZE * i + j]
                // = hasPrevNonZero[CHUNK_SIZE * i + j + 1] * ((1 - n2b[i].out[j]) * doublers[CHUNK_SIZE * i + j] + n2b[i].out[j] * adders[CHUNK_SIZE * i + j])
                //   + (1 - hasPrevNonZero[CHUNK_SIZE * i + j + 1]) * point
                for (var idx = 0; idx < CHUNK_NUMBER; idx++) {
                    intermed[CHUNK_SIZE * i + j][0][idx] <== n2b[i].out[j] * (adders[CHUNK_SIZE * i + j].out[0][idx] - doublers[CHUNK_SIZE * i + j].out[0][idx]) + doublers[CHUNK_SIZE * i + j].out[0][idx];
                    intermed[CHUNK_SIZE * i + j][1][idx] <== n2b[i].out[j] * (adders[CHUNK_SIZE * i + j].out[1][idx] - doublers[CHUNK_SIZE * i + j].out[1][idx]) + doublers[CHUNK_SIZE * i + j].out[1][idx];
                    partial[CHUNK_SIZE * i + j][0][idx] <== hasPrevNonZero[CHUNK_SIZE * i + j + 1].out * (intermed[CHUNK_SIZE * i + j][0][idx] - point[0][idx]) + point[0][idx];
                    partial[CHUNK_SIZE * i + j][1][idx] <== hasPrevNonZero[CHUNK_SIZE * i + j + 1].out * (intermed[CHUNK_SIZE * i + j][1][idx] - point[1][idx]) + point[1][idx];
                }
            }
        }
    }

    for (var idx = 0; idx < CHUNK_NUMBER; idx++) {
        out[0][idx] <== partial[0][0][idx];
        out[1][idx] <== partial[0][1][idx];
    }
}

template BrainpoolAddUnequal(CHUNK_SIZE, CHUNK_NUMBER){
    signal input point1[2][CHUNK_NUMBER];
    signal input point2[2][CHUNK_NUMBER];
    signal output out[2][CHUNK_NUMBER];

    var PARAMS[3][CHUNK_NUMBER] = get_params(CHUNK_SIZE,CHUNK_NUMBER);

    component add = EllipticCurveAddUnequal(CHUNK_SIZE, CHUNK_NUMBER, PARAMS[2]);   
    add.a <== point1;
    add.b <== point2;
    add.out ==> out;
}

template BrainpoolDouble(CHUNK_SIZE, CHUNK_NUMBER){
    signal input in[2][CHUNK_NUMBER];
    signal output out[2][CHUNK_NUMBER];

    var PARAMS[3][CHUNK_NUMBER] = get_params(CHUNK_SIZE,CHUNK_NUMBER);

    component doubling = EllipticCurveDouble(CHUNK_SIZE,CHUNK_NUMBER, PARAMS[0], PARAMS[1], PARAMS[2]);
    doubling.in <== in;
    doubling.out ==> out;
}

template BrainpoolGetGenerator(CHUNK_SIZE, CHUNK_NUMBER){
    signal output gen[2][CHUNK_NUMBER];

    gen[0][0] <== 4112880906850;
    gen[0][1] <== 8402973968522;
    gen[0][2] <== 7591230932878;
    gen[0][3] <== 4501096422359;
    gen[0][4] <== 8682220995764;
    gen[0][5] <== 1201070240662;

    gen[1][0] <== 5253533821335;
    gen[1][1] <== 6261165491114;
    gen[1][2] <== 7738945195191;
    gen[1][3] <== 3354540412644;
    gen[1][4] <== 6237632167812;
    gen[1][5] <== 725814897543;
}

template GetBrainpoolOrder(CHUNK_SIZE, CHUNK_NUMBER){
    signal output order[6];

    order[0] <== 7157953615527;
    order[1] <== 4625125213121;
    order[2] <== 6807085551317;
    order[3] <== 5808117106360;
    order[4] <== 7604705420896;
    order[5] <== 1460132624195;
}

template BrainpoolGeneratorMultiplication(CHUNK_SIZE,CHUNK_NUMBER){
    var STRIDE = 8;
    signal input scalar[CHUNK_NUMBER];
    signal output out[2][CHUNK_NUMBER];

    component n2b[CHUNK_NUMBER];
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        n2b[i] = Num2Bits(CHUNK_SIZE);
        n2b[i].in <== scalar[i];
    }

    var NUM_STRIDES = div_ceil(CHUNK_SIZE * CHUNK_NUMBER, STRIDE);
    // power[i][j] contains: [j * (1 << STRIDE * i) * G] for 1 <= j < (1 << STRIDE)
    var POWERS[NUM_STRIDES][2 ** STRIDE][2][CHUNK_NUMBER];
    POWERS = get_g_pow_stride8_table(CHUNK_SIZE, CHUNK_NUMBER);

    var DUMMY_HOLDER[2][CHUNK_NUMBER] = get_dummy_point(CHUNK_SIZE, CHUNK_NUMBER);
    var DUMMY[2][CHUNK_NUMBER];
    for (var i = 0; i < CHUNK_NUMBER; i++) DUMMY[0][i] = DUMMY_HOLDER[0][i];
    for (var i = 0; i < CHUNK_NUMBER; i++) DUMMY[1][i] = DUMMY_HOLDER[1][i];

    component selectors[NUM_STRIDES];
    for (var i = 0; i < NUM_STRIDES; i++) {
        selectors[i] = Bits2Num(STRIDE);
        for (var j = 0; j < STRIDE; j++) {
            var bit_idx1 = (i * STRIDE + j) \ CHUNK_SIZE;
            var bit_idx2 = (i * STRIDE + j) % CHUNK_SIZE;
            if (bit_idx1 < CHUNK_NUMBER) {
                selectors[i].in[j] <== n2b[bit_idx1].out[bit_idx2];
            } else {
                selectors[i].in[j] <== 0;
            }
        }
    }

    // multiplexers[i][l].out will be the coordinates of:
    // selectors[i].out * (2 ** (i * STRIDE)) * G    if selectors[i].out is non-zero
    // (2 ** 255) * G                                if selectors[i].out is zero
    component multiplexers[NUM_STRIDES][2];
    // select from CHUNK_NUMBER-register outputs using a 2 ** STRIDE bit selector
    for (var i = 0; i < NUM_STRIDES; i++) {
        for (var l = 0; l < 2; l++) {
            multiplexers[i][l] = Multiplexer(CHUNK_NUMBER, (1 << STRIDE));
            multiplexers[i][l].sel <== selectors[i].out;
            for (var idx = 0; idx < CHUNK_NUMBER; idx++) {
                multiplexers[i][l].inp[0][idx] <== DUMMY[l][idx];
                for (var j = 1; j < (1 << STRIDE); j++) {
                    multiplexers[i][l].inp[j][idx] <== POWERS[i][j][l][idx];
                }
            }
        }
    }

    component isZero[NUM_STRIDES];
    for (var i = 0; i < NUM_STRIDES; i++) {
        isZero[i] = IsZero();
        isZero[i].in <== selectors[i].out;
    }

    // hasPrevNonZero[i] = 1 if at least one of the selections in privkey up to STRIDE i is non-zero
    component hasPrevNonZero[NUM_STRIDES];
    hasPrevNonZero[0] = OR();
    hasPrevNonZero[0].a <== 0;
    hasPrevNonZero[0].b <== 1 - isZero[0].out;
    for (var i = 1; i < NUM_STRIDES; i++) {
        hasPrevNonZero[i] = OR();
        hasPrevNonZero[i].a <== hasPrevNonZero[i - 1].out;
        hasPrevNonZero[i].b <== 1 - isZero[i].out;
    }

    signal partial[NUM_STRIDES][2][CHUNK_NUMBER];
    for (var idx = 0; idx < CHUNK_NUMBER; idx++) {
        for (var l = 0; l < 2; l++) {
            partial[0][l][idx] <== multiplexers[0][l].out[idx];
        }
    }

    component adders[NUM_STRIDES - 1];
    signal intermed1[NUM_STRIDES - 1][2][CHUNK_NUMBER];
    signal intermed2[NUM_STRIDES - 1][2][CHUNK_NUMBER];
    for (var i = 1; i < NUM_STRIDES; i++) {
        adders[i - 1] = BrainpoolAddUnequal(CHUNK_SIZE, CHUNK_NUMBER);
        for (var idx = 0; idx < CHUNK_NUMBER; idx++) {
            for (var l = 0; l < 2; l++) {
                adders[i - 1].point1[l][idx] <== partial[i - 1][l][idx];
                adders[i - 1].point2[l][idx] <== multiplexers[i][l].out[idx];
            }
        }

        // partial[i] = hasPrevNonZero[i - 1] * ((1 - isZero[i]) * adders[i - 1].out + isZero[i] * partial[i - 1][0][idx])
        //              + (1 - hasPrevNonZero[i - 1]) * (1 - isZero[i]) * multiplexers[i]
        for (var idx = 0; idx < CHUNK_NUMBER; idx++) {
            for (var l = 0; l < 2; l++) {
                intermed1[i - 1][l][idx] <== isZero[i].out * (partial[i - 1][l][idx] - adders[i - 1].out[l][idx]) + adders[i - 1].out[l][idx];
                intermed2[i - 1][l][idx] <== multiplexers[i][l].out[idx] - isZero[i].out * multiplexers[i][l].out[idx];
                partial[i][l][idx] <== hasPrevNonZero[i - 1].out * (intermed1[i - 1][l][idx] - intermed2[i - 1][l][idx]) + intermed2[i - 1][l][idx];
            }
        }
    }

    for (var i = 0; i < CHUNK_NUMBER; i++) {
        for (var l = 0; l < 2; l++) {
            out[l][i] <== partial[NUM_STRIDES - 1][l][i];
        }
    }
}

template BrainpoolPrecomputePipinger(CHUNK_SIZE, CHUNK_NUMBER, WINDOW_SIZE){
    signal input in[2][CHUNK_NUMBER];

    var PRECOMPUTE_NUMBER = 2 ** WINDOW_SIZE; 

    signal output out[PRECOMPUTE_NUMBER][2][CHUNK_NUMBER];
    
    for (var i = 0; i < 2; i++){
        for (var j = 0; j < CHUNK_NUMBER; j++){
            out[0][i][j] <== 0;
        }
    }

    out[1] <== in;

    component doublers[PRECOMPUTE_NUMBER\2 - 1];
    component adders  [PRECOMPUTE_NUMBER\2 - 1];

    for (var i = 2; i < PRECOMPUTE_NUMBER; i++){
        if (i % 2 == 0){
            doublers[i\2 - 1]     = BrainpoolDouble(CHUNK_SIZE, CHUNK_NUMBER);
            doublers[i\2 - 1].in  <== out[i\2];
            doublers[i\2 - 1].out ==> out[i];
        }
        else
        {
            adders[i\2 - 1]          = BrainpoolAddUnequal(CHUNK_SIZE, CHUNK_NUMBER);
            adders[i\2 - 1].point1   <== out[1];
            adders[i\2 - 1].point2   <== out[i - 1];
            adders[i\2 - 1].out      ==> out[i]; 
        }
    }
}

template BrainpoolPipingerMult(CHUNK_SIZE, CHUNK_NUMBER, WINDOW_SIZE){

    assert(WINDOW_SIZE == 4);

    signal input  point[2][CHUNK_NUMBER];
    signal input  scalar  [CHUNK_NUMBER];

    signal output out[2][CHUNK_NUMBER];

    var PRECOMPUTE_NUMBER = 2 ** WINDOW_SIZE;

    signal precomputed[PRECOMPUTE_NUMBER][2][CHUNK_NUMBER];

    component precompute = BrainpoolPrecomputePipinger(CHUNK_SIZE, CHUNK_NUMBER, WINDOW_SIZE);
    precompute.in  <== point;
    precompute.out ==> precomputed;

    var DOUBLERS_NUMBER = 256 - WINDOW_SIZE;
    var ADDERS_NUMBER   = 256 \ WINDOW_SIZE;

    component doublers[DOUBLERS_NUMBER];
    component adders  [ADDERS_NUMBER];
    component bits2Num[ADDERS_NUMBER];
    component num2Bits[CHUNK_NUMBER];

    signal res [ADDERS_NUMBER + 1][2][CHUNK_NUMBER];

    signal tmp [ADDERS_NUMBER][PRECOMPUTE_NUMBER][2][CHUNK_NUMBER];

    signal tmp2[ADDERS_NUMBER]    [2]   [CHUNK_NUMBER];
    signal tmp3[ADDERS_NUMBER]    [2][2][CHUNK_NUMBER];
    signal tmp4[ADDERS_NUMBER]    [2]   [CHUNK_NUMBER];
    signal tmp5[ADDERS_NUMBER]    [2][2][CHUNK_NUMBER];
    signal tmp6[ADDERS_NUMBER - 1][2][2][CHUNK_NUMBER];
    signal tmp7[ADDERS_NUMBER - 1][2]   [CHUNK_NUMBER];
    
    component equals    [ADDERS_NUMBER][PRECOMPUTE_NUMBER][2][CHUNK_NUMBER];
    component zeroEquals[ADDERS_NUMBER];
    component tmpEquals [ADDERS_NUMBER];

    component g = BrainpoolGetGenerator(CHUNK_SIZE, CHUNK_NUMBER);
    signal gen[2][CHUNK_NUMBER];
    gen <== g.gen;

    signal scalarBits[256];

    for (var i = 0; i < CHUNK_NUMBER; i++){
        num2Bits[i] = Num2Bits(CHUNK_SIZE);
        num2Bits[i].in <== scalar[i];
        if (i != CHUNK_NUMBER - 1){
            for (var j = 0; j < CHUNK_SIZE; j++){
                scalarBits[256 - CHUNK_SIZE * (i + 1) + j] <== num2Bits[i].out[CHUNK_SIZE - 1 - j];
            }
        } else {
            for (var j = 0; j < CHUNK_SIZE - (CHUNK_SIZE*CHUNK_NUMBER - 256); j++){
                scalarBits[j] <== num2Bits[i].out[CHUNK_SIZE - 1 - (j + (CHUNK_SIZE * CHUNK_NUMBER - 256))];
            }
        }
    }

    res[0] <== precomputed[0];

    for (var i = 0; i < 256; i += WINDOW_SIZE){
        adders[i\WINDOW_SIZE] = BrainpoolAddUnequal(CHUNK_SIZE, CHUNK_NUMBER);
        bits2Num[i\WINDOW_SIZE] = Bits2Num(WINDOW_SIZE);
        for (var j = 0; j < WINDOW_SIZE; j++){
            bits2Num[i\WINDOW_SIZE].in[j] <== scalarBits[i + (WINDOW_SIZE - 1) - j];
        }

        tmpEquals[i\WINDOW_SIZE] = IsEqual();
        tmpEquals[i\WINDOW_SIZE].in[0] <== 0;
        tmpEquals[i\WINDOW_SIZE].in[1] <== res[i\WINDOW_SIZE][0][0];

        if (i != 0){
            for (var j = 0; j < WINDOW_SIZE; j++){
                doublers[i + j - WINDOW_SIZE] = BrainpoolDouble(CHUNK_SIZE, CHUNK_NUMBER);

                if (j == 0){
                    for (var axis_idx = 0; axis_idx < 2; axis_idx++){
                        for (var coor_idx = 0; coor_idx < 6; coor_idx ++){
                            tmp6[i\WINDOW_SIZE - 1][0][axis_idx][coor_idx] <==      tmpEquals[i\WINDOW_SIZE].out  * gen[axis_idx][coor_idx];
                            tmp6[i\WINDOW_SIZE - 1][1][axis_idx][coor_idx] <== (1 - tmpEquals[i\WINDOW_SIZE].out) * res[i\WINDOW_SIZE][axis_idx][coor_idx];
                            tmp7[i\WINDOW_SIZE - 1]   [axis_idx][coor_idx] <== tmp6[i\WINDOW_SIZE - 1][0][axis_idx][coor_idx] 
                                                                             + tmp6[i\WINDOW_SIZE - 1][1][axis_idx][coor_idx];
                        }
                    }

                    doublers[i + j - WINDOW_SIZE].in <== tmp7[i\WINDOW_SIZE - 1];
                }
                else
                {
                    doublers[i + j - WINDOW_SIZE].in <== doublers[i + j - 1 - WINDOW_SIZE].out;
                }
            }
        }

       for (var point_idx = 0; point_idx < PRECOMPUTE_NUMBER; point_idx++){
            for (var axis_idx = 0; axis_idx < 2; axis_idx++){
                for (var coor_idx = 0; coor_idx < CHUNK_NUMBER; coor_idx++){
                    equals[i\WINDOW_SIZE][point_idx][axis_idx][coor_idx]       = IsEqual();
                    equals[i\WINDOW_SIZE][point_idx][axis_idx][coor_idx].in[0] <== point_idx;
                    equals[i\WINDOW_SIZE][point_idx][axis_idx][coor_idx].in[1] <== bits2Num[i\WINDOW_SIZE].out;
                    tmp   [i\WINDOW_SIZE][point_idx][axis_idx][coor_idx]       <== precomputed[point_idx][axis_idx][coor_idx] * 
                                                                         equals[i\WINDOW_SIZE][point_idx][axis_idx][coor_idx].out;
                }
            }
        }

        for (var axis_idx = 0; axis_idx < 2; axis_idx++){
            for (var coor_idx = 0; coor_idx < CHUNK_NUMBER; coor_idx++){
                tmp2[i\WINDOW_SIZE]   [axis_idx][coor_idx] <== 
                tmp[i\WINDOW_SIZE][0] [axis_idx][coor_idx] + 
                tmp[i\WINDOW_SIZE][1] [axis_idx][coor_idx] + 
                tmp[i\WINDOW_SIZE][2] [axis_idx][coor_idx] + 
                tmp[i\WINDOW_SIZE][3] [axis_idx][coor_idx] + 
                tmp[i\WINDOW_SIZE][4] [axis_idx][coor_idx] + 
                tmp[i\WINDOW_SIZE][5] [axis_idx][coor_idx] + 
                tmp[i\WINDOW_SIZE][6] [axis_idx][coor_idx] + 
                tmp[i\WINDOW_SIZE][7] [axis_idx][coor_idx] + 
                tmp[i\WINDOW_SIZE][8] [axis_idx][coor_idx] + 
                tmp[i\WINDOW_SIZE][9] [axis_idx][coor_idx] + 
                tmp[i\WINDOW_SIZE][10][axis_idx][coor_idx] + 
                tmp[i\WINDOW_SIZE][11][axis_idx][coor_idx] + 
                tmp[i\WINDOW_SIZE][12][axis_idx][coor_idx] + 
                tmp[i\WINDOW_SIZE][13][axis_idx][coor_idx] + 
                tmp[i\WINDOW_SIZE][14][axis_idx][coor_idx] + 
                tmp[i\WINDOW_SIZE][15][axis_idx][coor_idx];
            }
        }

        if (i == 0){

            adders[i\WINDOW_SIZE].point1 <== res [i\WINDOW_SIZE];
            adders[i\WINDOW_SIZE].point2 <== tmp2[i\WINDOW_SIZE];
            res[i\WINDOW_SIZE + 1]       <== tmp2[i\WINDOW_SIZE];

        } else {

            adders[i\WINDOW_SIZE].point1 <== doublers[i - 1].out;
            adders[i\WINDOW_SIZE].point2 <== tmp2[i\WINDOW_SIZE];

            zeroEquals[i\WINDOW_SIZE] = IsEqual();

            zeroEquals[i\WINDOW_SIZE].in[0]<== 0;
            zeroEquals[i\WINDOW_SIZE].in[1]<== tmp2[i\WINDOW_SIZE][0][0];

            for (var axis_idx = 0; axis_idx < 2; axis_idx++){
                for(var coor_idx = 0; coor_idx < CHUNK_NUMBER; coor_idx++){

                    tmp3[i\WINDOW_SIZE][0][axis_idx][coor_idx] <== adders    [i\WINDOW_SIZE].out[axis_idx][coor_idx] * (1 - zeroEquals[i\WINDOW_SIZE].out);
                    tmp3[i\WINDOW_SIZE][1][axis_idx][coor_idx] <== zeroEquals[i\WINDOW_SIZE].out                     * doublers[i-1].out[axis_idx][coor_idx];
                    tmp4[i\WINDOW_SIZE]   [axis_idx][coor_idx] <== tmp3[i\WINDOW_SIZE][0][axis_idx][coor_idx]        + tmp3[i\WINDOW_SIZE][1][axis_idx][coor_idx]; 
                    tmp5[i\WINDOW_SIZE][0][axis_idx][coor_idx] <== (1 - tmpEquals[i\WINDOW_SIZE].out)                * tmp4[i\WINDOW_SIZE]   [axis_idx][coor_idx];
                    tmp5[i\WINDOW_SIZE][1][axis_idx][coor_idx] <== tmpEquals[i\WINDOW_SIZE].out                      * tmp2[i\WINDOW_SIZE]   [axis_idx][coor_idx];
                                    
                    res[i\WINDOW_SIZE + 1][axis_idx][coor_idx] <== tmp5[i\WINDOW_SIZE][0][axis_idx][coor_idx]        + tmp5[i\WINDOW_SIZE][1][axis_idx][coor_idx];                                 
                }
            }        
        }
    }

    out <== res[ADDERS_NUMBER];
}
