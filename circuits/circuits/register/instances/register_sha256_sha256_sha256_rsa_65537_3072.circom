pragma circom 2.1.9;

include "../openpassport_register.circom";

component main { public [ scope, user_identifier, current_date ] } = OPENPASSPORT_REGISTER(256, 256, 14, 96, 32, 448, 128);