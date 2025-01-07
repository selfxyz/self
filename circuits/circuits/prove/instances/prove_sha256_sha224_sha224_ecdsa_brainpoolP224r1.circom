pragma circom 2.1.9;

include "../openpassport_prove.circom";

component main { public [  scope, user_identifier, current_date] } = OPENPASSPORT_PROVE(256, 224, 30, 32, 7, 448, 128, 20);