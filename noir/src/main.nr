use std::hash::sha256::sha256_var;

fn main() {}

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

mod tests {
    use super::{ecdsa_secp256k1_sha256, ecdsa_secp256r1_sha256};
    #[test]
    fn test_ecdsa_secp256r1_sha256() {
        // Message: "Hello, World!" padded with zeros
        let message = [
            104, 101, 108, 108, 111, 32, 119, 111, 114, 108, 100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        ];

        // P-256 Public Key X coordinate
        let pub_key_x = [
            104, 58, 199, 193, 108, 64, 45, 195, 11, 11, 75, 166, 214, 156, 201, 146, 206, 170, 52,
            146, 32, 208, 104, 234, 167, 66, 91, 233, 113, 226, 152, 6,
        ];

        // P-256 Public Key Y coordinate
        let pub_key_y = [
            115, 16, 190, 179, 184, 255, 110, 78, 24, 118, 74, 215, 76, 48, 172, 220, 120, 138, 118,
            41, 209, 61, 128, 127, 44, 222, 149, 139, 165, 78, 139, 58,
        ];

        // ECDSA Signature (r || s)
        let signature = [
            221, 226, 121, 210, 151, 221, 220, 126, 183, 133, 57, 88, 121, 162, 147, 62, 45, 73, 38,
            135, 36, 183, 189, 89, 149, 182, 76, 61, 116, 61, 23, 73, 77, 53, 204, 140, 129, 238,
            80, 151, 238, 13, 34, 131, 211, 72, 39, 138, 69, 95, 101, 156, 120, 128, 230, 136, 112,
            138, 232, 88, 121, 123, 231, 24,
        ];

        ecdsa_secp256r1_sha256(message, pub_key_x, pub_key_y, signature, 11);
    }

    #[test]
    fn test_ecdsa_secp256k1_sha256() {
        // Message: "Hello, World!" padded with zeros
        let message = [
            104, 101, 108, 108, 111, 32, 119, 111, 114, 108, 100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        ];

        // S-256 Public Key X coordinate
        let pub_key_x = [
            19, 12, 206, 66, 56, 16, 77, 86, 243, 225, 118, 50, 226, 119, 97, 154, 79, 59, 242, 153,
            182, 105, 109, 204, 230, 64, 212, 21, 163, 88, 242, 142,
        ];

        // S-256 Public Key Y coordinate
        let pub_key_y = [
            188, 47, 147, 6, 41, 232, 38, 103, 79, 35, 232, 182, 224, 225, 186, 140, 86, 111, 227,
            42, 206, 230, 177, 143, 116, 86, 163, 69, 20, 68, 115, 77,
        ];

        // ECDSA Signature (r || s)
        let signature = [
            118, 53, 168, 174, 137, 129, 132, 64, 188, 73, 113, 174, 162, 121, 184, 28, 18, 80, 223,
            89, 173, 159, 127, 234, 195, 12, 164, 123, 89, 237, 192, 227, 113, 142, 149, 133, 71,
            141, 154, 19, 26, 140, 73, 250, 171, 230, 107, 235, 53, 246, 192, 170, 102, 163, 225,
            249, 67, 102, 36, 77, 155, 160, 39, 51,
        ];

        ecdsa_secp256k1_sha256(message, pub_key_x, pub_key_y, signature, 11);
    }

}
