pragma circom 2.0.0;

//------------------------------------------------------------------------------
// initial hash value for SHA2-512 

template Sha512InitialValue() {
    
    signal output out[8][64];
    
    var INITIAL_STATE[8] =
    [
    0x6a09e667f3bcc908,
    0xbb67ae8584caa73b,
    0x3c6ef372fe94f82b,
    0xa54ff53a5f1d36f1,
    0x510e527fade682d1,
    0x9b05688c2b3e6c1f,
    0x1f83d9abfb41bd6b,
    0x5be0cd19137e2179
    ];
    
    for (var k = 0; k < 8; k++) {
        for (var i = 0; i < 64; i++) {
            out[k][i] <== (INITIAL_STATE[k] >> i) & 1;
        }
    }
    
}
