pragma circom 2.1.9;

include "../openpassport_prove.circom";

component main { public [  scope, user_identifier, current_date] } = OPENPASSPORT_PROVE(384, 384, 9, 64, 6, 640, 256, 20);
