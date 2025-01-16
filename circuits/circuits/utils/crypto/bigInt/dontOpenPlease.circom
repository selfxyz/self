pragma circom 2.1.6;

// We use this to get a ** 1.6 * 2.5 to decide is karatsuba algo is better to imlement of a, b chunk size

function get_a_coeff(a){
    if (a < 8) {
        return -1;
    }
    if (a > 128) {
        return 0;
    }
    if (a == 8) {
        return 70;
    }
    if (a == 9) {
        return 84;
    }
    if (a == 10) {
        return 100;
    }
    if (a == 11) {
        return 116;
    }
    if (a == 12) {
        return 133;
    }
    if (a == 13) {
        return 151;
    }
    if (a == 14) {
        return 171;
    }
    if (a == 15) {
        return 190;
    }
    if (a == 16) {
        return 211;
    }
    if (a == 17) {
        return 233;
    }
    if (a == 18) {
        return 255;
    }
    if (a == 19) {
        return 278;
    }
    if (a == 20) {
        return 302;
    }
    if (a == 21) {
        return 326;
    }
    if (a == 22) {
        return 351;
    }
    if (a == 23) {
        return 377;
    }
    if (a == 24) {
        return 404;
    }
    if (a == 25) {
        return 431;
    }
    if (a == 26) {
        return 459;
    }
    if (a == 27) {
        return 488;
    }
    if (a == 28) {
        return 517;
    }
    if (a == 29) {
        return 547;
    }
    if (a == 30) {
        return 577;
    }
    if (a == 31) {
        return 608;
    }
    if (a == 32) {
        return 640;
    }
    if (a == 33) {
        return 672;
    }
    if (a == 34) {
        return 705;
    }
    if (a == 35) {
        return 739;
    }
    if (a == 36) {
        return 773;
    }
    if (a == 37) {
        return 807;
    }
    if (a == 38) {
        return 843;
    }
    if (a == 39) {
        return 878;
    }
    if (a == 40) {
        return 915;
    }
    if (a == 41) {
        return 951;
    }
    if (a == 42) {
        return 989;
    }
    if (a == 43) {
        return 1027;
    }
    if (a == 44) {
        return 1065;
    }
    if (a == 45) {
        return 1104;
    }
    if (a == 46) {
        return 1144;
    }
    if (a == 47) {
        return 1184;
    }
    if (a == 48) {
        return 1224;
    }
    if (a == 49) {
        return 1265;
    }
    if (a == 50) {
        return 1307;
    }
    if (a == 51) {
        return 1349;
    }
    if (a == 52) {
        return 1392;
    }
    if (a == 53) {
        return 1435;
    }
    if (a == 54) {
        return 1478;
    }
    if (a == 55) {
        return 1522;
    }
    if (a == 56) {
        return 1567;
    }
    if (a == 57) {
        return 1612;
    }
    if (a == 58) {
        return 1657;
    }
    if (a == 59) {
        return 1703;
    }
    if (a == 60) {
        return 1750;
    }
    if (a == 61) {
        return 1797;
    }
    if (a == 62) {
        return 1844;
    }
    if (a == 63) {
        return 1892;
    }
    if (a == 64) {
        return 1940;
    }
    if (a == 65) {
        return 1989;
    }
    if (a == 66) {
        return 2038;
    }
    if (a == 67) {
        return 2088;
    }
    if (a == 68) {
        return 2138;
    }
    if (a == 69) {
        return 2188;
    }
    if (a == 70) {
        return 2239;
    }
    if (a == 71) {
        return 2291;
    }
    if (a == 72) {
        return 2342;
    }
    if (a == 73) {
        return 2395;
    }
    if (a == 74) {
        return 2447;
    }
    if (a == 75) {
        return 2501;
    }
    if (a == 76) {
        return 2554;
    }
    if (a == 77) {
        return 2608;
    }
    if (a == 78) {
        return 2663;
    }
    if (a == 79) {
        return 2717;
    }
    if (a == 80) {
        return 2773;
    }
    if (a == 81) {
        return 2828;
    }
    if (a == 82) {
        return 2884;
    }
    if (a == 83) {
        return 2941;
    }
    if (a == 84) {
        return 2998;
    }
    if (a == 85) {
        return 3055;
    }
    if (a == 86) {
        return 3113;
    }
    if (a == 87) {
        return 3171;
    }
    if (a == 88) {
        return 3229;
    }
    if (a == 89) {
        return 3288;
    }
    if (a == 90) {
        return 3348;
    }
    if (a == 91) {
        return 3407;
    }
    if (a == 92) {
        return 3467;
    }
    if (a == 93) {
        return 3528;
    }
    if (a == 94) {
        return 3589;
    }
    if (a == 95) {
        return 3650;
    }
    if (a == 96) {
        return 3712;
    }
    if (a == 97) {
        return 3774;
    }
    if (a == 98) {
        return 3836;
    }
    if (a == 99) {
        return 3899;
    }
    if (a == 100) {
        return 3962;
    }
    if (a == 101) {
        return 4026;
    }
    if (a == 102) {
        return 4090;
    }
    if (a == 103) {
        return 4154;
    }
    if (a == 104) {
        return 4219;
    }
    if (a == 105) {
        return 4284;
    }
    if (a == 106) {
        return 4349;
    }
    if (a == 107) {
        return 4415;
    }
    if (a == 108) {
        return 4481;
    }
    if (a == 109) {
        return 4548;
    }
    if (a == 110) {
        return 4615;
    }
    if (a == 111) {
        return 4682;
    }
    if (a == 112) {
        return 4750;
    }
    if (a == 113) {
        return 4818;
    }
    if (a == 114) {
        return 4886;
    }
    if (a == 115) {
        return 4955;
    }
    if (a == 116) {
        return 5024;
    }
    if (a == 117) {
        return 5094;
    }
    if (a == 118) {
        return 5164;
    }
    if (a == 119) {
        return 5234;
    }
    if (a == 120) {
        return 5304;
    }
    if (a == 121) {
        return 5375;
    }
    if (a == 122) {
        return 5446;
    }
    if (a == 123) {
        return 5518;
    }
    if (a == 124) {
        return 5590;
    }
    if (a == 125) {
        return 5662;
    }
    if (a == 126) {
        return 5735;
    }
    if (a == 127) {
        return 5808;
    }
    if (a == 128) {
        return 5881;
    }
    return 0;
}