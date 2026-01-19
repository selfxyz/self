pragma circom 2.1.9;

include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/babyjub.circom";
include "../utils/kyc/constants.circom";
include "../utils/passport/customHashers.circom";
include "../utils/kyc/verifySignature.circom";
include "circomlib/circuits/eddsaPoseidon.circom";

template REGISTER_KYC() {
    var max_length = KYC_MAX_LENGTH();
    var country_length = COUNTRY_LENGTH();
    var id_number_length = ID_NUMBER_LENGTH();
    var idNumberIdx = ID_NUMBER_INDEX();

    signal input data_padded[max_length];

    signal input s;
    signal input R[2];
    signal input pubKey[2];
    signal input secret;

    //Check if R is on the curve
    component checkR = BabyCheck();
    checkR.x <== R[0];
    checkR.y <== R[1];

    //Check if pubKey is on the curve
    component checkPubKey = BabyCheck();
    checkPubKey.x <== pubKey[0];
    checkPubKey.y <== pubKey[1];

    //Calculate msg_hash
    component msg_hasher = PackBytesAndPoseidon(max_length);
    for (var i = 0; i < max_length; i++) {
        msg_hasher.in[i] <== data_padded[i];
    }

    component verifyIdCommSig = EdDSAPoseidonVerifier();
    verifyIdCommSig.enabled <== 1;
    verifyIdCommSig.S <== s;
    verifyIdCommSig.M <== msg_hasher.out;
    verifyIdCommSig.Ax <== pubKey[0];
    verifyIdCommSig.Ay <== pubKey[1];
    verifyIdCommSig.R8x <== R[0];
    verifyIdCommSig.R8y <== R[1];

    signal id_num[id_number_length];
    for (var i = 0; i < id_number_length; i++) {
        id_num[i] <== data_padded[idNumberIdx + i];
    }
    signal output nullifier <== PackBytesAndPoseidon(id_number_length)(id_num);
    signal output commitment <== Poseidon(2)([secret, msg_hasher.out]);

    signal output pubkey_hash <== Poseidon(2)([verifyIdCommSig.Ax, verifyIdCommSig.Ay]);
    signal output attestation_id <== 4;
}
