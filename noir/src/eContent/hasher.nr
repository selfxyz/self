use std::hash::sha256::sha256_var;
fn hash_dg1<let hashLen: u32, let data_len: u32>(data: [u8; data_len]) -> [u8; hashLen / 8] {
    if hashLen == 256 {
        let hash = sha256_var(data, data_len as u64);
        let mut result = [0; hashLen / 8];
        for i in 0..32 {
            result[i] = hash[i];
        }
        result
    } else if hashLen == 160 {
        let hash = sha256_var(data, data_len as u64);
        let mut result = [0; hashLen / 8];
        for i in 0..20 {
            result[i] = hash[i];
        }
        result
    } else {
        [0; hashLen / 8]
    }
}
