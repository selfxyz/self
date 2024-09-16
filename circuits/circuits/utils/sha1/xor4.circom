pragma circom 2.1.3;

template Xor4(n) {
    signal input a[n];
    signal input b[n];
    signal input c[n];
    signal input d[n];

    signal mid[n];
    signal a_temp[n];
    
    signal output out[n];
    
    /*
    xor3: 
    mid = b*c
    out_xor3 = a*( 1 - 2*b -2*c + 4*mid ) + b + c - 2 * mid

    xor4:
    a ^ b ^ c ^ d
    out_xor4 = out_xor3 - 2*d*out_xor3 + d
    */

    for (var k=0; k<n; k++) {
        mid[k] <== b[k]*c[k];
        a_temp[k] <== a[k] * (1 -2*b[k]  -2*c[k] +4*mid[k]) + b[k] + c[k] -2*mid[k];
        out[k] <== a_temp[k] -2*d[k]*a_temp[k] + d[k];
    }
}