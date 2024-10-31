use crate::constants::{MAX_ECONTENT_LEN, HASH_LEN_BYTES, DG_PADDING_BYTES_LEN, MAX_SIGNED_ATTR_LEN};
use std::hash::sha256;

pub fn verify_dg1_and_dg2(
    dg1: [u8; 93],
    dg1_hash_offset: u8,
    dg2_hash: [u8; 64],
    eContent: [u8; MAX_ECONTENT_LEN],
) {
    let computed_dg1_hash = sha256(dg1);

    // Calc position where DG2 hash should start
    let dg2_hash_start = dg1_hash_offset as u32 + HASH_LEN_BYTES + DG_PADDING_BYTES_LEN;

    // Verify DG1,DG2 hash matches in eContent
    for i in 0..HASH_LEN_BYTES {
        assert_eq(computed_dg1_hash[i], eContent[dg1_hash_offset as u32 + i as u32]);
        assert_eq(dg2_hash[i], eContent[dg2_hash_start + i as u32]);
    }
}

// todo
pub fn verify_econtent(
    eContent: [u8; MAX_ECONTENT_LEN],
    signed_attr: [u8; MAX_SIGNED_ATTR_LEN],
    signed_attr_econtent_hash_offset: u8,
    eContent_padded_length: u16,
    signed_attr_padded_length: u8,
) {}

