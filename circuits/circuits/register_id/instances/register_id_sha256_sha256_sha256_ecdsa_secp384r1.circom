pragma circom 2.1.9;

include "../register_id.circom";

component main { public [ merkle_root ] } = REGISTER_ID(256, 256, 23, 64, 6, 512, 256);
