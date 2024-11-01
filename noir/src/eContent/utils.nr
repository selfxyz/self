use std::hash::sha256::{sha256, sha256_var};

pub fn hash_static<let OUTPUT_SIZE: u32, let MAX_SIZE: u32>(data: [u8; MAX_SIZE]) -> [u8; OUTPUT_SIZE] {
    if OUTPUT_SIZE == 32 {
        let hash = sha256(data);
        let mut result = [0; OUTPUT_SIZE];
        for i in 0..32 {
            result[i] = hash[i];
        }
        result
    } else if OUTPUT_SIZE == 20 {
        [0; OUTPUT_SIZE]
    } else {
        [0; OUTPUT_SIZE]
    }
}

pub fn hash_dynamic<let OUTPUT_SIZE: u32, let MAX_LEN: u32>(data: [u8; MAX_LEN], data_len: u32) -> [u8; OUTPUT_SIZE] {
    if OUTPUT_SIZE == 32 {
        let hash = sha256_var(data, data_len as u64);
        let mut result = [0; OUTPUT_SIZE];
        for i in 0..32 {
            result[i] = hash[i];
        }
        result
    } else if OUTPUT_SIZE == 20 {
        [0; OUTPUT_SIZE]
    } else {
        [0; OUTPUT_SIZE]
    }
}
