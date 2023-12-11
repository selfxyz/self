pragma circom 2.1.5;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "./helpers/extract.circom";
include "./passport_verifier.circom";

template ProofOfPassport(n, k) {
    signal input mrz[93]; // formatted mrz (5 + 88) chars
    signal input dataHashes[297];
    signal input eContentBytes[104];
    signal input pubkey[k];
    signal input signature[k];

    signal input reveal_bitmap[88];
    signal input address;

    // Verify passport
    component PV = PassportVerifier(n, k);
    PV.mrz <== mrz;
    PV.dataHashes <== dataHashes;
    PV.eContentBytes <== eContentBytes;
    PV.pubkey <== pubkey;
    PV.signature <== signature;

    // reveal reveal_bitmap bits of MRZ
    signal reveal[88];
    for (var i = 0; i < 88; i++) {
        reveal[i] <== mrz[5+i] * reveal_bitmap[i];
    }
    signal output reveal_packed[3] <== PackBytes(88, 3, 31)(reveal);

    // make nullifier public;
    // we take nullifier = signature[0, 1] which it 64 + 64 bits long, so chance of collision is 2^128
    signal output nullifier <== signature[0] * 2**64 + signature[1];

    // Calculate the Poseidon hash of public public key and outputs it
    // This can be used to verify the public key is correct in contract without requiring the actual key
    // We are converting pub_key (modulus) in to 9 chunks of 242 bits, assuming original n, k are 121 and 17.
    // This is because Posiedon circuit only support array of 16 elements.
    // Otherwise we would have to output the ceil(256/31) = 9 field elements of the public key
    var k2_chunked_size = k >> 1;
    if(k % 2 == 1) {
        k2_chunked_size += 1;
    }
    signal pubkey_hash_input[k2_chunked_size];
    for(var i = 0; i < k2_chunked_size; i++) {
        if(i==k2_chunked_size-1 && k2_chunked_size % 2 == 1) {
            pubkey_hash_input[i] <== pubkey[2*i];
        } else {
            pubkey_hash_input[i] <== pubkey[2*i] + (1<<n) * pubkey[2*i+1];
        }
    }
    signal output pubkey_hash <== Poseidon(k2_chunked_size)(pubkey_hash_input);
}

component main { public [ address ] } = ProofOfPassport(64, 32);

// Us:
// 1 + 1 + 3 + 1
// pubkey_hash + nullifier + reveal_packed + address

// Them:
// 1 + 3 + 1
// pubkey_hash + reveal_twitter_packed + address