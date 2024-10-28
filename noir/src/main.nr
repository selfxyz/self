use std::hash::sha256::sha256_var;

fn ecdsa_secp256r1_sha256(
    message: [u8; 32],
    pub_key_x: [u8; 32],
    pub_key_y: [u8; 32],
    signature: [u8; 64],
    msg_size: u64,
) {
    let hashed_message = sha256_var(message, msg_size);
    std::println(hashed_message);
    let valid_signature =
        std::ecdsa_secp256r1::verify_signature(pub_key_x, pub_key_y, signature, hashed_message);
    assert(valid_signature);
}

fn ecdsa_secp256k1_sha256(
    message: [u8; 32],
    pub_key_x: [u8; 32],
    pub_key_y: [u8; 32],
    signature: [u8; 64],
    msg_size: u64,
) {
    let hashed_message = sha256_var(message, msg_size);
    std::println(hashed_message);
    let valid_signature =
        std::ecdsa_secp256k1::verify_signature(pub_key_x, pub_key_y, signature, hashed_message);
    assert(valid_signature);
}

