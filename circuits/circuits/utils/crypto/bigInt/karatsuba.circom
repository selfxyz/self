pragma circom  2.1.6;

// Calculates 2 numbers with CHUNK_NUMBER multiplication using karatsuba method
// out is overflowed
// use only for 2 ** k CHUNK_NUMBER, othewise u will get error
// here is no check for CHUNK_SIZE <= 126,  maybe will be added later
template KaratsubaNoCarry(CHUNK_NUMBER) {
    signal input in[2][CHUNK_NUMBER];
    signal output out[2 * CHUNK_NUMBER];
    
    if (CHUNK_NUMBER == 1) {
        out[0] <== in[0][0] * in[1][0];
    } else {
        component karatsubaA1B1 = KaratsubaNoCarry(CHUNK_NUMBER / 2);
        component karatsubaA2B2 = KaratsubaNoCarry(CHUNK_NUMBER / 2);
        component karatsubaA1A2B1B2 = KaratsubaNoCarry(CHUNK_NUMBER / 2);
        
        for (var i = 0; i < CHUNK_NUMBER / 2; i++) {
            karatsubaA1B1.in[0][i] <== in[0][i];
            karatsubaA1B1.in[1][i] <== in[1][i];
            karatsubaA2B2.in[0][i] <== in[0][i + CHUNK_NUMBER / 2];
            karatsubaA2B2.in[1][i] <== in[1][i + CHUNK_NUMBER / 2];
            karatsubaA1A2B1B2.in[0][i] <== in[0][i] + in[0][i + CHUNK_NUMBER / 2];
            karatsubaA1A2B1B2.in[1][i] <== in[1][i] + in[1][i + CHUNK_NUMBER / 2];
        }
        
        for (var i = 0; i < 2 * CHUNK_NUMBER; i++) {
            if (i < CHUNK_NUMBER) {
                if (CHUNK_NUMBER / 2 <= i && i < 3 * (CHUNK_NUMBER / 2)) {
                    out[i] <== karatsubaA1B1.out[i]
                    + karatsubaA1A2B1B2.out[i - CHUNK_NUMBER / 2]
                    - karatsubaA1B1.out[i - CHUNK_NUMBER / 2]
                    - karatsubaA2B2.out[i - CHUNK_NUMBER / 2];
                } else {
                    out[i] <== karatsubaA1B1.out[i];
                }
            } else {
                if (CHUNK_NUMBER / 2 <= i && i < 3 * (CHUNK_NUMBER / 2)) {
                    out[i] <== karatsubaA2B2.out[i - CHUNK_NUMBER]
                    + karatsubaA1A2B1B2.out[i - CHUNK_NUMBER / 2]
                    - karatsubaA1B1.out[i - CHUNK_NUMBER / 2]
                    - karatsubaA2B2.out[i - CHUNK_NUMBER / 2];
                } else {
                    out[i] <== karatsubaA2B2.out[i - CHUNK_NUMBER];
                }
            }
        }
    }
}