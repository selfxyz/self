include "@zk-email/circuits/lib/sha.circom";
include "./static/Sha256BytesStatic.circom";
include "./static/Sha1BytesStatic.circom";

template ShaBytesStatic(hashLen, dataLen) {
    signal input data[dataLen];
    signal output hash[hashLen];

    if (hashLen == 256) {
        hash <== Sha256BytesStatic(dataLen)(data);
    }
    if (hashLen == 160) {
        hash <== Sha1BytesStatic(dataLen)(data);
    }

}