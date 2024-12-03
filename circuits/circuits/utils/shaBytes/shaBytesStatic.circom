pragma circom 2.1.9;

include "./static/Sha256BytesStatic.circom";
include "./static/Sha1BytesStatic.circom";
include "./static/Sha384BytesStatic.circom";
include "./static/Sha512BytesStatic.circom";

template ShaBytesStatic(hashLen, dataLen) {
    signal input data[dataLen];
    signal output hash[hashLen];

    if (hashLen == 512) {
        hash <== Sha512BytesStatic(dataLen)(data);
    }
    if (hashLen == 384) {
        hash <== Sha384BytesStatic(dataLen)(data);
    }
    if (hashLen == 256) {
        hash <== Sha256BytesStatic(dataLen)(data);
    }
    if (hashLen == 160) {
        hash <== Sha1BytesStatic(dataLen)(data);
    }

}