pragma circom 2.1.6;

template RotL(CHUNK_NUMBER, L) {
    signal input in[CHUNK_NUMBER];
    signal output out[CHUNK_NUMBER];
    
    for (var i = CHUNK_NUMBER - 1; i >= 0; i--) {
        out[i] <== in[(i + L) % CHUNK_NUMBER];
    }
}