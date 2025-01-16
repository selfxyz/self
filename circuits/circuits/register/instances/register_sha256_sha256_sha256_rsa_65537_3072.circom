pragma circom 2.1.9;

include "../register.circom";

component main { public [ scope, user_identifier, current_date ] } = REGISTER(256, 256, 14, 96, 32, 448, 128);