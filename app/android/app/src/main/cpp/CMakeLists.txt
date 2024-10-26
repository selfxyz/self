
cmake_minimum_required(VERSION 3.22.1)

project("proofofpassportapp")

include_directories(include)

link_directories(lib)

add_library(rapidsnark SHARED IMPORTED)
set_target_properties(rapidsnark PROPERTIES IMPORTED_LOCATION ${CMAKE_SOURCE_DIR}/lib/librapidsnark.so)

# add_library(register_sha256WithRSAEncryption_65537 SHARED IMPORTED)
# set_target_properties(register_sha256WithRSAEncryption_65537 PROPERTIES IMPORTED_LOCATION ${CMAKE_SOURCE_DIR}/lib/libwitnesscalc_register_sha256WithRSAEncryption_65537.so)

# add_library(disclose SHARED IMPORTED)
# set_target_properties(disclose PROPERTIES IMPORTED_LOCATION ${CMAKE_SOURCE_DIR}/lib/libwitnesscalc_disclose.so)

add_library(prove_rsa_65537_sha256 SHARED IMPORTED)
set_target_properties(prove_rsa_65537_sha256 PROPERTIES IMPORTED_LOCATION ${CMAKE_SOURCE_DIR}/lib/libwitnesscalc_prove_rsa_65537_sha256.so)

add_library(prove_rsa_65537_sha1 SHARED IMPORTED)
set_target_properties(prove_rsa_65537_sha1 PROPERTIES IMPORTED_LOCATION ${CMAKE_SOURCE_DIR}/lib/libwitnesscalc_prove_rsa_65537_sha1.so)

add_library(prove_rsapss_65537_sha256 SHARED IMPORTED)
set_target_properties(prove_rsapss_65537_sha256 PROPERTIES IMPORTED_LOCATION ${CMAKE_SOURCE_DIR}/lib/libwitnesscalc_prove_rsapss_65537_sha256.so)

# add_library(prove_ecdsa_secp256r1_sha256 SHARED IMPORTED)
# set_target_properties(prove_ecdsa_secp256r1_sha256 PROPERTIES IMPORTED_LOCATION ${CMAKE_SOURCE_DIR}/lib/libwitnesscalc_prove_ecdsa_secp256r1_sha256.so)

# add_library(prove_ecdsa_secp256r1_sha1 SHARED IMPORTED)
# set_target_properties(prove_ecdsa_secp256r1_sha1 PROPERTIES IMPORTED_LOCATION ${CMAKE_SOURCE_DIR}/lib/libwitnesscalc_prove_ecdsa_secp256r1_sha1.so)

add_library(vc_and_disclose SHARED IMPORTED)
set_target_properties(vc_and_disclose PROPERTIES IMPORTED_LOCATION ${CMAKE_SOURCE_DIR}/lib/libwitnesscalc_vc_and_disclose.so)

add_library(${CMAKE_PROJECT_NAME} SHARED
        proofofpassportapp.cpp)

target_link_libraries(${CMAKE_PROJECT_NAME}
        rapidsnark
        # register_sha256WithRSAEncryption_65537
        # disclose
        prove_rsa_65537_sha256
        prove_rsa_65537_sha1
        prove_rsapss_65537_sha256
        vc_and_disclose
)
