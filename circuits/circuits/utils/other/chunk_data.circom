pragma circom 2.1.9;

// Converts data into chunk_size chunks of 192 bits, assuming original n, k are 64 and 32.
// This is because Poseidon circuit only supports an array of 16 elements.
template ChunkData(n, k, chunk_size) {
    signal input data[k];
    signal output outputs[chunk_size];
    for(var i = 0; i < chunk_size; i++) {
        if(i == chunk_size - 1) {
            if(k % 3 == 1) {
                outputs[i] <== data[3*i];
            } else if(k % 3 == 2) {
                outputs[i] <== data[3*i] + (1<<n) * data[3*i + 1];
            } else {
                outputs[i] <== data[3*i] + (1<<n) * data[3*i + 1] + (1<<(2*n)) * data[3*i + 2];
            }
        } else {
            outputs[i] <== data[3*i] + (1<<n) * data[3*i + 1] + (1<<(2*n)) * data[3*i + 2];
        }
    }
}

