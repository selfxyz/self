pragma circom 2.1.9;

include "../register_id.circom";

component main { public [ merkle_root ] } = REGISTER_ID(384, 384, 45, 120, 35, 768, 256);