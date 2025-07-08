pragma circom 2.1.9;

include "../register_id.circom";

component main { public [ merkle_root ] } = REGISTER_ID(160, 160, 3, 120, 35, 384, 128);