use super::utils::{hash_static, hash_dynamic};

pub global SHA256_SIZE: u32 = 32;
pub global SHA512_SIZE: u32 = 64;
pub global SHA160_SIZE: u32 = 20;
pub global DG_PADDING_BYTES_LEN: u32 = 7;

pub trait Hasher<let MAX_LEN: u32, let OUTPUT_SIZE: u32> {
    fn hash(data: [u8; MAX_LEN], data_len: u32) -> [u8; OUTPUT_SIZE];
}

fn e_content_hasher<let OUTPUT_SIZE: u32, let MAX_ECONTENT_LEN: u32, let MAX_SIGNED_ATTR_LEN: u32>(
    input: [u8; 93],
    dg1_hash_offset: u32,
    dg2_hash: [u8; 64],
    econtent: [u8; MAX_ECONTENT_LEN],
    econtent_padded_length: u32,
    signed_attr: [u8; MAX_SIGNED_ATTR_LEN],
    signed_attr_padded_length: u32,
    signed_attr_econtent_hash_offset: u32,
    secret: [u8; 32],
) -> [u8; OUTPUT_SIZE] {
    // hash dg1
    let dg1_hash = hash_static::<OUTPUT_SIZE, 93>(input);

    // assert dg1 and dg2 hashes match the ones in eContent input
    for i in 0..OUTPUT_SIZE {
        assert(dg1_hash[i] == econtent[i + dg1_hash_offset]);
    }

    let dg1_dg2_len = 2 * OUTPUT_SIZE + DG_PADDING_BYTES_LEN;

    for i in 0..OUTPUT_SIZE + DG_PADDING_BYTES_LEN {
        assert(dg2_hash[i] == econtent[i + dg1_dg2_len]);
    }

    // compute hash of eContent
    let econtent_hash =
        hash_dynamic::<OUTPUT_SIZE, MAX_ECONTENT_LEN>(econtent, econtent_padded_length);

    // assert eContent hash matches the one in signedAttr
    for i in 0..OUTPUT_SIZE {
        assert(econtent_hash[i] == signed_attr[i + signed_attr_econtent_hash_offset]);
    }

    // compute hash of signedAttr
    let signed_attr_hash =
        hash_dynamic::<OUTPUT_SIZE, MAX_SIGNED_ATTR_LEN>(signed_attr, signed_attr_padded_length);

    // compute hash of secret + signed_attr_hash
    let mut pre_hash = [0; 32 + OUTPUT_SIZE];

    for i in 0..32 {
        pre_hash[i] = secret[i];
    }

    for i in 0..OUTPUT_SIZE {
        pre_hash[i + 32] = signed_attr_hash[i];
    }
    let secret_signed_attr_hash = hash_static::<OUTPUT_SIZE, 32 + OUTPUT_SIZE>(pre_hash);
    secret_signed_attr_hash
}
