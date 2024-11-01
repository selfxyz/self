pub mod dg1;

use crate::constants::{MAX_ECONTENT_LEN, MAX_SIGNED_ATTR_LEN};
use dg1::{verify_dg1_and_dg2, verify_econtent};

fn Dg1(
    dg1: [u8; 93],
    dg1_hash_offset: u8,
    dg2_hash: [u8; 64],
    eContent: [u8; MAX_ECONTENT_LEN],
    signed_attr: [u8; MAX_SIGNED_ATTR_LEN],
    signed_attr_econtent_hash_offset: u8,
    eContent_padded_length: u16,
    signed_attr_padded_length: u8
) {
    verify_dg1_and_dg2(dg1, dg1_hash_offset, dg2_hash, eContent);

    verify_econtent(
        eContent,
        signed_attr,
        signed_attr_econtent_hash_offset,
        eContent_padded_length,
        signed_attr_padded_length
    );
}

