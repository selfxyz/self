#include "include/prover.h"
// #include "include/witnesscalc_register_sha256WithRSAEncryption_65537.h"
// #include "include/witnesscalc_disclose.h"
#include "include/witnesscalc_prove_rsa_65537_sha256.h"
#include "include/witnesscalc_prove_rsa_65537_sha1.h"
#include "include/witnesscalc_prove_rsapss_65537_sha256.h"
#include "include/witnesscalc_vc_and_disclose.h"
// #include "include/witnesscalc_prove_ecdsa_secp256r1_sha256.h"
// #include "include/witnesscalc_prove_ecdsa_secp256r1_sha1.h"

#include <jni.h>
#include <iostream>

using namespace std;

extern "C" JNIEXPORT jint JNICALL
Java_com_proofofpassportapp_prover_ZKPTools_groth16_1prover(JNIEnv *env, jobject thiz,
                                                            jbyteArray zkey_buffer, jlong zkey_size,
                                                            jbyteArray wtns_buffer, jlong wtns_size,
                                                            jbyteArray proof_buffer, jlongArray proof_size,
                                                            jbyteArray public_buffer,
                                                            jlongArray public_size, jbyteArray error_msg,
                                                            jlong error_msg_max_size)
{
    const void *zkeyBuffer = env->GetByteArrayElements(zkey_buffer, nullptr);
    const void *wtnsBuffer = env->GetByteArrayElements(wtns_buffer, nullptr);
    char *proofBuffer = reinterpret_cast<char *>(env->GetByteArrayElements(proof_buffer,
                                                                           nullptr));
    char *publicBuffer = reinterpret_cast<char *>(env->GetByteArrayElements(public_buffer,
                                                                            nullptr));
    char *errorMsg = reinterpret_cast<char *>(env->GetByteArrayElements(error_msg, nullptr));

    unsigned long proofSize = env->GetLongArrayElements(proof_size, nullptr)[0];
    unsigned long publicSize = env->GetLongArrayElements(public_size, nullptr)[0];

    int result = groth16_prover(zkeyBuffer, static_cast<unsigned long>(zkey_size),
                                wtnsBuffer, static_cast<unsigned long>(wtns_size),
                                proofBuffer, &proofSize,
                                publicBuffer, &publicSize,
                                errorMsg, static_cast<unsigned long>(error_msg_max_size));

    env->SetLongArrayRegion(proof_size, 0, 1, reinterpret_cast<const jlong *>(&proofSize));
    env->SetLongArrayRegion(public_size, 0, 1, reinterpret_cast<const jlong *>(&publicSize));

    env->ReleaseByteArrayElements(zkey_buffer,
                                  reinterpret_cast<jbyte *>(const_cast<void *>(zkeyBuffer)), 0);
    env->ReleaseByteArrayElements(wtns_buffer,
                                  reinterpret_cast<jbyte *>(const_cast<void *>(wtnsBuffer)), 0);
    env->ReleaseByteArrayElements(proof_buffer, reinterpret_cast<jbyte *>(proofBuffer), 0);
    env->ReleaseByteArrayElements(public_buffer, reinterpret_cast<jbyte *>(publicBuffer), 0);
    env->ReleaseByteArrayElements(error_msg, reinterpret_cast<jbyte *>(errorMsg), 0);

    return result;
}

// extern "C"
// JNIEXPORT jint JNICALL
// Java_com_proofofpassportapp_prover_ZKPTools_witnesscalc_1register_1sha256WithRSAEncryption_165537(JNIEnv *env, jobject thiz,
//                                                        jbyteArray circuit_buffer,
//                                                        jlong circuit_size, jbyteArray json_buffer,
//                                                        jlong json_size, jbyteArray wtns_buffer,
//                                                        jlongArray wtns_size, jbyteArray error_msg,
//                                                        jlong error_msg_max_size) {
//     const char *circuitBuffer = reinterpret_cast<const char *>(env->GetByteArrayElements(
//             circuit_buffer, nullptr));
//     const char *jsonBuffer = reinterpret_cast<const char *>(env->GetByteArrayElements(json_buffer,
//                                                                                       nullptr));
//     char *wtnsBuffer = reinterpret_cast<char *>(env->GetByteArrayElements(wtns_buffer, nullptr));
//     char *errorMsg = reinterpret_cast<char *>(env->GetByteArrayElements(error_msg, nullptr));

//     unsigned long wtnsSize = env->GetLongArrayElements(wtns_size, nullptr)[0];

//     int result = witnesscalc_register_sha256WithRSAEncryption_65537(
//             circuitBuffer, static_cast<unsigned long>(circuit_size),
//             jsonBuffer, static_cast<unsigned long>(json_size),
//             wtnsBuffer, &wtnsSize,
//             errorMsg, static_cast<unsigned long>(error_msg_max_size));

//     // Set the result and release the resources
//     env->SetLongArrayRegion(wtns_size, 0, 1, reinterpret_cast<jlong *>(&wtnsSize));

//     env->ReleaseByteArrayElements(circuit_buffer,
//                                   reinterpret_cast<jbyte *>(const_cast<char *>(circuitBuffer)), 0);
//     env->ReleaseByteArrayElements(json_buffer,
//                                   reinterpret_cast<jbyte *>(const_cast<char *>(jsonBuffer)), 0);
//     env->ReleaseByteArrayElements(wtns_buffer, reinterpret_cast<jbyte *>(wtnsBuffer), 0);
//     env->ReleaseByteArrayElements(error_msg, reinterpret_cast<jbyte *>(errorMsg), 0);

//     return result;
// }

// extern "C"
// JNIEXPORT jint JNICALL
// Java_com_proofofpassportapp_prover_ZKPTools_witnesscalc_1disclose(JNIEnv *env, jobject thiz,
//                                                        jbyteArray circuit_buffer,
//                                                        jlong circuit_size, jbyteArray json_buffer,
//                                                        jlong json_size, jbyteArray wtns_buffer,
//                                                        jlongArray wtns_size, jbyteArray error_msg,
//                                                        jlong error_msg_max_size) {
//     const char *circuitBuffer = reinterpret_cast<const char *>(env->GetByteArrayElements(
//             circuit_buffer, nullptr));
//     const char *jsonBuffer = reinterpret_cast<const char *>(env->GetByteArrayElements(json_buffer,
//                                                                                       nullptr));
//     char *wtnsBuffer = reinterpret_cast<char *>(env->GetByteArrayElements(wtns_buffer, nullptr));
//     char *errorMsg = reinterpret_cast<char *>(env->GetByteArrayElements(error_msg, nullptr));

//     unsigned long wtnsSize = env->GetLongArrayElements(wtns_size, nullptr)[0];

//     int result = witnesscalc_disclose(
//             circuitBuffer, static_cast<unsigned long>(circuit_size),
//             jsonBuffer, static_cast<unsigned long>(json_size),
//             wtnsBuffer, &wtnsSize,
//             errorMsg, static_cast<unsigned long>(error_msg_max_size));

//     // Set the result and release the resources
//     env->SetLongArrayRegion(wtns_size, 0, 1, reinterpret_cast<jlong *>(&wtnsSize));

//     env->ReleaseByteArrayElements(circuit_buffer,
//                                   reinterpret_cast<jbyte *>(const_cast<char *>(circuitBuffer)), 0);
//     env->ReleaseByteArrayElements(json_buffer,
//                                   reinterpret_cast<jbyte *>(const_cast<char *>(jsonBuffer)), 0);
//     env->ReleaseByteArrayElements(wtns_buffer, reinterpret_cast<jbyte *>(wtnsBuffer), 0);
//     env->ReleaseByteArrayElements(error_msg, reinterpret_cast<jbyte *>(errorMsg), 0);

//     return result;
// }

extern "C" JNIEXPORT jint JNICALL
Java_com_proofofpassportapp_prover_ZKPTools_witnesscalc_1prove_1rsa_165537_1sha256(JNIEnv *env, jobject thiz,
                                                                                   jbyteArray circuit_buffer,
                                                                                   jlong circuit_size, jbyteArray json_buffer,
                                                                                   jlong json_size, jbyteArray wtns_buffer,
                                                                                   jlongArray wtns_size, jbyteArray error_msg,
                                                                                   jlong error_msg_max_size)
{
    const char *circuitBuffer = reinterpret_cast<const char *>(env->GetByteArrayElements(
        circuit_buffer, nullptr));
    const char *jsonBuffer = reinterpret_cast<const char *>(env->GetByteArrayElements(json_buffer,
                                                                                      nullptr));
    char *wtnsBuffer = reinterpret_cast<char *>(env->GetByteArrayElements(wtns_buffer, nullptr));
    char *errorMsg = reinterpret_cast<char *>(env->GetByteArrayElements(error_msg, nullptr));

    unsigned long wtnsSize = env->GetLongArrayElements(wtns_size, nullptr)[0];

    int result = witnesscalc_prove_rsa_65537_sha256(
        circuitBuffer, static_cast<unsigned long>(circuit_size),
        jsonBuffer, static_cast<unsigned long>(json_size),
        wtnsBuffer, &wtnsSize,
        errorMsg, static_cast<unsigned long>(error_msg_max_size));

    // Set the result and release the resources
    env->SetLongArrayRegion(wtns_size, 0, 1, reinterpret_cast<jlong *>(&wtnsSize));

    env->ReleaseByteArrayElements(circuit_buffer,
                                  reinterpret_cast<jbyte *>(const_cast<char *>(circuitBuffer)), 0);
    env->ReleaseByteArrayElements(json_buffer,
                                  reinterpret_cast<jbyte *>(const_cast<char *>(jsonBuffer)), 0);
    env->ReleaseByteArrayElements(wtns_buffer, reinterpret_cast<jbyte *>(wtnsBuffer), 0);
    env->ReleaseByteArrayElements(error_msg, reinterpret_cast<jbyte *>(errorMsg), 0);

    return result;
}

extern "C" JNIEXPORT jint JNICALL
Java_com_proofofpassportapp_prover_ZKPTools_witnesscalc_1prove_1rsa_165537_1sha1(JNIEnv *env, jobject thiz,
                                                                                 jbyteArray circuit_buffer,
                                                                                 jlong circuit_size, jbyteArray json_buffer,
                                                                                 jlong json_size, jbyteArray wtns_buffer,
                                                                                 jlongArray wtns_size, jbyteArray error_msg,
                                                                                 jlong error_msg_max_size)
{
    const char *circuitBuffer = reinterpret_cast<const char *>(env->GetByteArrayElements(
        circuit_buffer, nullptr));
    const char *jsonBuffer = reinterpret_cast<const char *>(env->GetByteArrayElements(json_buffer,
                                                                                      nullptr));
    char *wtnsBuffer = reinterpret_cast<char *>(env->GetByteArrayElements(wtns_buffer, nullptr));
    char *errorMsg = reinterpret_cast<char *>(env->GetByteArrayElements(error_msg, nullptr));

    unsigned long wtnsSize = env->GetLongArrayElements(wtns_size, nullptr)[0];

    int result = witnesscalc_prove_rsa_65537_sha1(
        circuitBuffer, static_cast<unsigned long>(circuit_size),
        jsonBuffer, static_cast<unsigned long>(json_size),
        wtnsBuffer, &wtnsSize,
        errorMsg, static_cast<unsigned long>(error_msg_max_size));

    // Set the result and release the resources
    env->SetLongArrayRegion(wtns_size, 0, 1, reinterpret_cast<jlong *>(&wtnsSize));

    env->ReleaseByteArrayElements(circuit_buffer,
                                  reinterpret_cast<jbyte *>(const_cast<char *>(circuitBuffer)), 0);
    env->ReleaseByteArrayElements(json_buffer,
                                  reinterpret_cast<jbyte *>(const_cast<char *>(jsonBuffer)), 0);
    env->ReleaseByteArrayElements(wtns_buffer, reinterpret_cast<jbyte *>(wtnsBuffer), 0);
    env->ReleaseByteArrayElements(error_msg, reinterpret_cast<jbyte *>(errorMsg), 0);

    return result;
}

extern "C" JNIEXPORT jint JNICALL
Java_com_proofofpassportapp_prover_ZKPTools_witnesscalc_1prove_1rsapss_165537_1sha256(JNIEnv *env, jobject thiz,
                                                                                      jbyteArray circuit_buffer,
                                                                                      jlong circuit_size, jbyteArray json_buffer,
                                                                                      jlong json_size, jbyteArray wtns_buffer,
                                                                                      jlongArray wtns_size, jbyteArray error_msg,
                                                                                      jlong error_msg_max_size)
{
    const char *circuitBuffer = reinterpret_cast<const char *>(env->GetByteArrayElements(
        circuit_buffer, nullptr));
    const char *jsonBuffer = reinterpret_cast<const char *>(env->GetByteArrayElements(json_buffer,
                                                                                      nullptr));
    char *wtnsBuffer = reinterpret_cast<char *>(env->GetByteArrayElements(wtns_buffer, nullptr));
    char *errorMsg = reinterpret_cast<char *>(env->GetByteArrayElements(error_msg, nullptr));

    unsigned long wtnsSize = env->GetLongArrayElements(wtns_size, nullptr)[0];

    int result = witnesscalc_prove_rsapss_65537_sha256(
        circuitBuffer, static_cast<unsigned long>(circuit_size),
        jsonBuffer, static_cast<unsigned long>(json_size),
        wtnsBuffer, &wtnsSize,
        errorMsg, static_cast<unsigned long>(error_msg_max_size));

    // Set the result and release the resources
    env->SetLongArrayRegion(wtns_size, 0, 1, reinterpret_cast<jlong *>(&wtnsSize));

    env->ReleaseByteArrayElements(circuit_buffer,
                                  reinterpret_cast<jbyte *>(const_cast<char *>(circuitBuffer)), 0);
    env->ReleaseByteArrayElements(json_buffer,
                                  reinterpret_cast<jbyte *>(const_cast<char *>(jsonBuffer)), 0);
    env->ReleaseByteArrayElements(wtns_buffer, reinterpret_cast<jbyte *>(wtnsBuffer), 0);
    env->ReleaseByteArrayElements(error_msg, reinterpret_cast<jbyte *>(errorMsg), 0);

    return result;
}

extern "C" JNIEXPORT jint JNICALL Java_com_proofofpassportapp_prover_ZKPTools_groth16_1prover_1zkey_1file(
    JNIEnv *env, jobject obj,
    jstring zkeyPath,
    jbyteArray wtnsBuffer, jlong wtnsSize,
    jbyteArray proofBuffer, jlongArray proofSize,
    jbyteArray publicBuffer, jlongArray publicSize,
    jbyteArray errorMsg, jlong errorMsgMaxSize)
{
    // Convert jbyteArray to native types
    const char *nativeZkeyPath = env->GetStringUTFChars(zkeyPath, nullptr);

    void *nativeWtnsBuffer = env->GetByteArrayElements(wtnsBuffer, nullptr);

    char *nativeProofBuffer = (char *)env->GetByteArrayElements(proofBuffer, nullptr);
    char *nativePublicBuffer = (char *)env->GetByteArrayElements(publicBuffer, nullptr);
    char *nativeErrorMsg = (char *)env->GetByteArrayElements(errorMsg, nullptr);

    jlong *nativeProofSizeArr = env->GetLongArrayElements(proofSize, 0);
    jlong *nativePublicSizeArr = env->GetLongArrayElements(publicSize, 0);

    unsigned long nativeProofSize = nativeProofSizeArr[0];
    unsigned long nativePublicSize = nativePublicSizeArr[0];

    // Call the groth16_prover function`
    int status_code = groth16_prover_zkey_file(
        nativeZkeyPath,
        nativeWtnsBuffer, wtnsSize,
        nativeProofBuffer, &nativeProofSize,
        nativePublicBuffer, &nativePublicSize,
        nativeErrorMsg, errorMsgMaxSize);

    // Convert the results back to JNI types
    nativeProofSizeArr[0] = nativeProofSize;
    nativePublicSizeArr[0] = nativePublicSize;

    env->SetLongArrayRegion(proofSize, 0, 1, (jlong *)nativeProofSizeArr);
    env->SetLongArrayRegion(publicSize, 0, 1, (jlong *)nativePublicSizeArr);

    // Release the native buffers
    env->ReleaseByteArrayElements(wtnsBuffer, (jbyte *)nativeWtnsBuffer, 0);
    env->ReleaseByteArrayElements(proofBuffer, (jbyte *)nativeProofBuffer, 0);
    env->ReleaseByteArrayElements(publicBuffer, (jbyte *)nativePublicBuffer, 0);
    env->ReleaseByteArrayElements(errorMsg, (jbyte *)nativeErrorMsg, 0);

    env->ReleaseLongArrayElements(proofSize, (jlong *)nativeProofSizeArr, 0);
    env->ReleaseLongArrayElements(publicSize, (jlong *)nativePublicSizeArr, 0);

    return status_code;
}

// // Function for ECDSA secp256r1 with SHA-256
// extern "C" JNIEXPORT jint JNICALL
// Java_com_proofofpassportapp_prover_ZKPTools_witnesscalc_1prove_1ecdsa_1secp256r1_1sha256(JNIEnv *env, jobject thiz,
//                                                                                          jbyteArray circuit_buffer,
//                                                                                          jlong circuit_size, jbyteArray json_buffer,
//                                                                                          jlong json_size, jbyteArray wtns_buffer,
//                                                                                          jlongArray wtns_size, jbyteArray error_msg,
//                                                                                          jlong error_msg_max_size)
// {
//         const char *circuitBuffer = reinterpret_cast<const char *>(
//             env->GetByteArrayElements(circuit_buffer, nullptr));
//         const char *jsonBuffer = reinterpret_cast<const char *>(
//             env->GetByteArrayElements(json_buffer, nullptr));
//         char *wtnsBuffer = reinterpret_cast<char *>(
//             env->GetByteArrayElements(wtns_buffer, nullptr));
//         char *errorMsg = reinterpret_cast<char *>(
//             env->GetByteArrayElements(error_msg, nullptr));

//         unsigned long wtnsSize = env->GetLongArrayElements(wtns_size, nullptr)[0];

//         int result = witnesscalc_prove_ecdsa_secp256r1_sha256(
//             circuitBuffer, static_cast<unsigned long>(circuit_size),
//             jsonBuffer, static_cast<unsigned long>(json_size),
//             wtnsBuffer, &wtnsSize,
//             errorMsg, static_cast<unsigned long>(error_msg_max_size));

//         // Update the witness size
//         env->SetLongArrayRegion(wtns_size, 0, 1, reinterpret_cast<jlong *>(&wtnsSize));

//         // Release resources
//         env->ReleaseByteArrayElements(circuit_buffer, reinterpret_cast<jbyte *>(const_cast<char *>(circuitBuffer)), 0);
//         env->ReleaseByteArrayElements(json_buffer, reinterpret_cast<jbyte *>(const_cast<char *>(jsonBuffer)), 0);
//         env->ReleaseByteArrayElements(wtns_buffer, reinterpret_cast<jbyte *>(wtnsBuffer), 0);
//         env->ReleaseByteArrayElements(error_msg, reinterpret_cast<jbyte *>(errorMsg), 0);

//         return result;
// }

// // Function for ECDSA secp256r1 with SHA-1
// extern "C" JNIEXPORT jint JNICALL
// Java_com_proofofpassportapp_prover_ZKPTools_witnesscalc_1prove_1ecdsa_1secp256r1_1sha1(JNIEnv *env, jobject thiz,
//                                                                                        jbyteArray circuit_buffer,
//                                                                                        jlong circuit_size, jbyteArray json_buffer,
//                                                                                        jlong json_size, jbyteArray wtns_buffer,
//                                                                                        jlongArray wtns_size, jbyteArray error_msg,
//                                                                                        jlong error_msg_max_size)
// {
//         const char *circuitBuffer = reinterpret_cast<const char *>(
//             env->GetByteArrayElements(circuit_buffer, nullptr));
//         const char *jsonBuffer = reinterpret_cast<const char *>(
//             env->GetByteArrayElements(json_buffer, nullptr));
//         char *wtnsBuffer = reinterpret_cast<char *>(
//             env->GetByteArrayElements(wtns_buffer, nullptr));
//         char *errorMsg = reinterpret_cast<char *>(
//             env->GetByteArrayElements(error_msg, nullptr));

//         unsigned long wtnsSize = env->GetLongArrayElements(wtns_size, nullptr)[0];

//         int result = witnesscalc_prove_ecdsa_secp256r1_sha1(
//             circuitBuffer, static_cast<unsigned long>(circuit_size),
//             jsonBuffer, static_cast<unsigned long>(json_size),
//             wtnsBuffer, &wtnsSize,
//             errorMsg, static_cast<unsigned long>(error_msg_max_size));

//         // Update the witness size
//         env->SetLongArrayRegion(wtns_size, 0, 1, reinterpret_cast<jlong *>(&wtnsSize));

//         // Release resources
//         env->ReleaseByteArrayElements(circuit_buffer, reinterpret_cast<jbyte *>(const_cast<char *>(circuitBuffer)), 0);
//         env->ReleaseByteArrayElements(json_buffer, reinterpret_cast<jbyte *>(const_cast<char *>(jsonBuffer)), 0);
//         env->ReleaseByteArrayElements(wtns_buffer, reinterpret_cast<jbyte *>(wtnsBuffer), 0);
//         env->ReleaseByteArrayElements(error_msg, reinterpret_cast<jbyte *>(errorMsg), 0);

//         return result;
// }

// Function for VC and Disclose
extern "C" JNIEXPORT jint JNICALL
Java_com_proofofpassportapp_prover_ZKPTools_witnesscalc_1vc_1and_1disclose(JNIEnv *env, jobject thiz,
                                                                           jbyteArray circuit_buffer,
                                                                           jlong circuit_size, jbyteArray json_buffer,
                                                                           jlong json_size, jbyteArray wtns_buffer,
                                                                           jlongArray wtns_size, jbyteArray error_msg,
                                                                           jlong error_msg_max_size)
{
    const char *circuitBuffer = reinterpret_cast<const char *>(env->GetByteArrayElements(circuit_buffer, nullptr));
    const char *jsonBuffer = reinterpret_cast<const char *>(env->GetByteArrayElements(json_buffer, nullptr));
    char *wtnsBuffer = reinterpret_cast<char *>(env->GetByteArrayElements(wtns_buffer, nullptr));
    char *errorMsg = reinterpret_cast<char *>(env->GetByteArrayElements(error_msg, nullptr));

    unsigned long wtnsSize = env->GetLongArrayElements(wtns_size, nullptr)[0];

    int result = witnesscalc_vc_and_disclose(
        circuitBuffer, static_cast<unsigned long>(circuit_size),
        jsonBuffer, static_cast<unsigned long>(json_size),
        wtnsBuffer, &wtnsSize,
        errorMsg, static_cast<unsigned long>(error_msg_max_size));

    // Set the result and release the resources
    env->SetLongArrayRegion(wtns_size, 0, 1, reinterpret_cast<jlong *>(&wtnsSize));

    env->ReleaseByteArrayElements(circuit_buffer,
                                  reinterpret_cast<jbyte *>(const_cast<char *>(circuitBuffer)), 0);
    env->ReleaseByteArrayElements(json_buffer,
                                  reinterpret_cast<jbyte *>(const_cast<char *>(jsonBuffer)), 0);
    env->ReleaseByteArrayElements(wtns_buffer, reinterpret_cast<jbyte *>(wtnsBuffer), 0);
    env->ReleaseByteArrayElements(error_msg, reinterpret_cast<jbyte *>(errorMsg), 0);

    return result;
}
