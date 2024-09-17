pragma circom 2.1.6;


function EMAIL_ADDR_MAX_BYTES() {
    return 256;
}

function DOMAIN_MAX_BYTES() {
    return 255;
}

// Field support maximum of ~253 bit
function MAX_BYTES_IN_FIELD() {
    return 31;
}
