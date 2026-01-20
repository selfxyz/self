pragma circom 2.1.9;

function COUNTRY_INDEX() {
    return 0;
}

function COUNTRY_LENGTH() {
    return 3;
}

function ID_TYPE_INDEX() {
    return COUNTRY_INDEX() + COUNTRY_LENGTH();
}

function ID_TYPE_LENGTH() {
    return 27;
}

function ID_NUMBER_INDEX() {
    return ID_TYPE_INDEX() + ID_TYPE_LENGTH();
}

function ID_NUMBER_LENGTH() {
    return 32;
}

function ISSUANCE_DATE_INDEX() {
    return ID_NUMBER_INDEX() + ID_NUMBER_LENGTH();
}

function ISSUANCE_DATE_LENGTH() {
    return 8;
}

function EXPIRATION_DATE_INDEX() {
    return ISSUANCE_DATE_INDEX() + ISSUANCE_DATE_LENGTH();
}

function EXPIRATION_DATE_LENGTH() {
    return 8;
}

function FULL_NAME_INDEX() {
    return EXPIRATION_DATE_INDEX() + EXPIRATION_DATE_LENGTH();
}

function FULL_NAME_LENGTH() {
    return 64;
}

function DOB_INDEX() {
    return FULL_NAME_INDEX() + FULL_NAME_LENGTH();
}

function DOB_LENGTH() {
    return 8;
}

function PHOTO_HASH_INDEX() {
    return DOB_INDEX() + DOB_LENGTH();
}

function PHOTO_HASH_LENGTH() {
    return 32;
}

function PHONE_NUMBER_INDEX() {
    return PHOTO_HASH_INDEX() + PHOTO_HASH_LENGTH();
}

function PHONE_NUMBER_LENGTH() {
    return 12;
}

function DOCUMENT_INDEX() {
    return PHONE_NUMBER_INDEX() + PHONE_NUMBER_LENGTH();
}

function DOCUMENT_LENGTH() {
    return 32;
}

function GENDER_INDEX() {
    return DOCUMENT_INDEX() + DOCUMENT_LENGTH();
}

function GENDER_LENGTH() {
    return 6;
}

function ADDRESS_INDEX() {
    return GENDER_INDEX() + GENDER_LENGTH();
}

function ADDRESS_LENGTH() {
    return 100;
}

function KYC_MAX_LENGTH() {
    return ADDRESS_INDEX() + ADDRESS_LENGTH();
}
