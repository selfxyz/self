use crate::types::DG1;
use crate::utils::date::is_older_than::is_older_than;

pub struct DiscloseOutput {
    revealed_data: [u8; 88],
    older_than: [u8; 2],
}

// todo: check if we have to pack revealed data?
pub fn disclose(
    dg1: DG1,
    selector_dg1: [bool; 88],
    selector_older_than: bool,
    current_date: [u8; 6],
    age: [u8; 2],
) -> DiscloseOutput {
    let mut revealed_data: [u8; 88] = [0; 88];

    for i in 0..88 {
        let mut multiplier = 0;
        if (selector_dg1[i]) {
            multiplier = 1;
        }
        revealed_data[i] = dg1[i + 5] * multiplier;
    }

    let mut older_than = [0, 0];

    if (selector_older_than) {
        let is_verified = is_older_than(
            age,
            current_date,
            [dg1[62], dg1[63], dg1[64], dg1[65], dg1[66], dg1[67]],
        );

        let mut multiplier = 0;
        if (is_verified) {
            multiplier = 1;
        }

        older_than[0] = multiplier * age[0];
        older_than[1] = multiplier * age[1];
    }

    DiscloseOutput { revealed_data, older_than }
}
