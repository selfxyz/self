cmake_minimum_required(VERSION 3.5)

include(cmake/platform.cmake)

set(USE_ASM ON CACHE BOOL "Use asm implementation for Fr and Fq")

project(witnesscalc LANGUAGES CXX ASM)

set(CMAKE_CXX_STANDARD 11)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

message("USE_ASM=" ${USE_ASM})
message("CMAKE_CROSSCOMPILING=" ${CMAKE_CROSSCOMPILING})

message("GMP_PREFIX=" ${GMP_PREFIX})
message("GMP_INCLUDE_DIR=" ${GMP_INCLUDE_DIR})
message("GMP_LIB_DIR=" ${GMP_LIB_DIR})

if (NOT EXISTS ${GMP_INCLUDE_FILE_FULLPATH})
    message("WARNING: ${GMP_INCLUDE_FILE_FULLPATH} is not found and so system ${GMP_INCLUDE_FILE} is used.")
endif()

if (NOT EXISTS ${GMP_LIB_FILE_FULLPATH})
    message("WARNING: ${GMP_LIB_FILE_FULLPATH} is not found and so system ${GMP_LIB_FILE} is used.")
    set(GMP_LIB gmp)
endif()

include_directories(BEFORE ${GMP_INCLUDE_DIR})

add_subdirectory(src)

install(TARGETS
    tests
    test_platform

    prove_rsa_65537_sha256
    witnesscalc_prove_rsa_65537_sha256
    witnesscalc_prove_rsa_65537_sha256Static

    prove_rsa_65537_sha1
    witnesscalc_prove_rsa_65537_sha1
    witnesscalc_prove_rsa_65537_sha1Static

    prove_rsapss_65537_sha256
    witnesscalc_prove_rsapss_65537_sha256
    witnesscalc_prove_rsapss_65537_sha256Static

    # register_rsa_65537_sha256
    # witnesscalc_register_rsa_65537_sha256
    # witnesscalc_register_rsa_65537_sha256Static

    # register_rsa_65537_sha1
    # witnesscalc_register_rsa_65537_sha1
    # witnesscalc_register_rsa_65537_sha1Static

    # register_rsapss_65537_sha256
    # witnesscalc_register_rsapss_65537_sha256
    # witnesscalc_register_rsapss_65537_sha256Static

    vc_and_disclose
    witnesscalc_vc_and_disclose
    witnesscalc_vc_and_discloseStatic

    # register_sha256WithRSAEncryption_65537
    # witnesscalc_register_sha256WithRSAEncryption_65537
    # witnesscalc_register_sha256WithRSAEncryption_65537Static

    # authV2
    # witnesscalc_authV2
    # witnesscalc_authV2Static
    fr
    RUNTIME DESTINATION ${CMAKE_INSTALL_PREFIX}/bin
    BUNDLE DESTINATION ${CMAKE_INSTALL_PREFIX}/app
    LIBRARY DESTINATION ${CMAKE_INSTALL_PREFIX}/lib)

install(FILES "${GMP_LIB_DIR}/${GMP_LIB_FILE}"
    DESTINATION ${CMAKE_INSTALL_PREFIX}/lib)

install(FILES
    src/vc_and_disclose.dat
    # src/register_sha256WithRSAEncryption_65537.dat
    src/prove_rsa_65537_sha256.dat
    src/prove_rsa_65537_sha1.dat
    src/prove_rsapss_65537_sha256.dat
    # src/register_rsa_65537_sha256.dat
    # src/register_rsa_65537_sha1.dat
    # src/register_rsapss_65537_sha256.dat
    # src/authV2.dat
    DESTINATION ${CMAKE_INSTALL_PREFIX}/bin)

install(FILES
    src/witnesscalc.h
    src/witnesscalc_vc_and_disclose.h
    # src/witnesscalc_register_sha256WithRSAEncryption_65537.h
    src/witnesscalc_prove_rsa_65537_sha256.h
    src/witnesscalc_prove_rsa_65537_sha1.h
    src/witnesscalc_prove_rsapss_65537_sha256.h
    # src/witnesscalc_register_rsa_65537_sha256.h
    # src/witnesscalc_register_rsa_65537_sha1.h
    # src/witnesscalc_register_rsapss_65537_sha256.h
    # src/witnesscalc_authV2.h
    DESTINATION ${CMAKE_INSTALL_PREFIX}/include)
