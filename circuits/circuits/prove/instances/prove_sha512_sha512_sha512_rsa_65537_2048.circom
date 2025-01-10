pragma circom 2.1.9;

include "../openpassport_prove.circom";

component main { public [  scope, user_identifier, current_date] }  = OPENPASSPORT_PROVE(512, 512 , 31, 64, 32, 320, 128, 20);