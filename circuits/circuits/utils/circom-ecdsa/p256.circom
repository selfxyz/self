pragma circom 2.1.9;

include "curve.circom";
include "p256_func.circom";

template P256AddUnequal(n, k) {
    assert(n == 43 && k == 6);

    signal input a[2][k];
    signal input b[2][k];

    var params[4][6] = get_p256_params();
    component adder = EllipticCurveAddUnequal(n, k, params[2]);
    for (var i = 0; i < 6; i++) {
        adder.a[0][i] <== a[0][i];
        adder.a[1][i] <== a[1][i];
        adder.b[0][i] <== b[0][i];
        adder.b[1][i] <== b[1][i];
    }

    signal output out[2][k] <== adder.out;
}

template P256Double(n, k) {
    assert(n == 43 && k == 6);

    signal input in[2][k];

    var params[4][6] = get_p256_params();
    component doubler = EllipticCurveDouble(n, k, params[0], params[1], params[2]);
    for (var i = 0; i < 6; i++) {
        doubler.in[0][i] <== in[0][i];
        doubler.in[1][i] <== in[1][i];
    }
    
    signal output out[2][k] <== doubler.out;
}

template P256ScalarMult(n, k) {
    signal input scalar[k];
    signal input point[2][k];

    signal output out[2][k];

    component n2b[k];
    for (var i = 0; i < k; i++) {
        n2b[i] = Num2Bits(n);
        n2b[i].in <== scalar[i];
    }

    // has_prev_non_zero[n * i + j] == 1 if there is a nonzero bit in location [i][j] or higher order bit
    component has_prev_non_zero[k * n];
    for (var i = k - 1; i >= 0; i--) {
        for (var j = n - 1; j >= 0; j--) {
            has_prev_non_zero[n * i + j] = OR();
            if (i == k - 1 && j == n - 1) {
                has_prev_non_zero[n * i + j].a <== 0;
                has_prev_non_zero[n * i + j].b <== n2b[i].out[j];
            } else {
                has_prev_non_zero[n * i + j].a <== has_prev_non_zero[n * i + j + 1].out;
                has_prev_non_zero[n * i + j].b <== n2b[i].out[j];
            }
        }
    }

    signal partial[n * k][2][k];
    signal intermed[n * k - 1][2][k];
    component adders[n * k - 1];
    component doublers[n * k - 1];
    for (var i = k - 1; i >= 0; i--) {
        for (var j = n - 1; j >= 0; j--) {
            if (i == k - 1 && j == n - 1) {
                for (var idx = 0; idx < k; idx++) {
                    partial[n * i + j][0][idx] <== point[0][idx];
                    partial[n * i + j][1][idx] <== point[1][idx];
                }
            }
            if (i < k - 1 || j < n - 1) {
                adders[n * i + j] = P256AddUnequal(n, k);
                doublers[n * i + j] = P256Double(n, k);
                for (var idx = 0; idx < k; idx++) {
                    doublers[n * i + j].in[0][idx] <== partial[n * i + j + 1][0][idx];
                    doublers[n * i + j].in[1][idx] <== partial[n * i + j + 1][1][idx];
                }
                for (var idx = 0; idx < k; idx++) {
                    adders[n * i + j].a[0][idx] <== doublers[n * i + j].out[0][idx];
                    adders[n * i + j].a[1][idx] <== doublers[n * i + j].out[1][idx];
                    adders[n * i + j].b[0][idx] <== point[0][idx];
                    adders[n * i + j].b[1][idx] <== point[1][idx];
                }
                // partial[n * i + j]
                // = has_prev_non_zero[n * i + j + 1] * ((1 - n2b[i].out[j]) * doublers[n * i + j] + n2b[i].out[j] * adders[n * i + j])
                //   + (1 - has_prev_non_zero[n * i + j + 1]) * point
                for (var idx = 0; idx < k; idx++) {
                    intermed[n * i + j][0][idx] <== n2b[i].out[j] * (adders[n * i + j].out[0][idx] - doublers[n * i + j].out[0][idx]) + doublers[n * i + j].out[0][idx];
                    intermed[n * i + j][1][idx] <== n2b[i].out[j] * (adders[n * i + j].out[1][idx] - doublers[n * i + j].out[1][idx]) + doublers[n * i + j].out[1][idx];
                    partial[n * i + j][0][idx] <== has_prev_non_zero[n * i + j + 1].out * (intermed[n * i + j][0][idx] - point[0][idx]) + point[0][idx];
                    partial[n * i + j][1][idx] <== has_prev_non_zero[n * i + j + 1].out * (intermed[n * i + j][1][idx] - point[1][idx]) + point[1][idx];
                }
            }
        }
    }

    for (var idx = 0; idx < k; idx++) {
        out[0][idx] <== partial[0][0][idx];
        out[1][idx] <== partial[0][1][idx];
    }
}
