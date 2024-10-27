include_directories(
    ../src
    ../build
    ../depends/json/single_include)

link_libraries(${GMP_LIB})

add_definitions(${GMP_DEFINIONS})

if(USE_ASM)
    if(ARCH MATCHES "arm64")
            add_definitions(-DUSE_ASM -DARCH_ARM64)
    elseif(ARCH MATCHES "x86_64")
            add_definitions(-DUSE_ASM -DARCH_X86_64)
    endif()
endif()

if(USE_ASM AND ARCH MATCHES "x86_64")

    if (CMAKE_HOST_SYSTEM_NAME MATCHES "Darwin" AND NOT TARGET_PLATFORM MATCHES "^android(_x86_64)?")
        set(NASM_FLAGS -fmacho64 --prefix _)
    else()
        set(NASM_FLAGS -felf64 -DPIC)
    endif()

    add_custom_command(OUTPUT ${CMAKE_SOURCE_DIR}/build/fq_asm.o
        COMMAND nasm ${NASM_FLAGS} fq.asm -o fq_asm.o
        DEPENDS ${CMAKE_SOURCE_DIR}/build/fq.asm
        WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}/build)

    add_custom_command(OUTPUT ${CMAKE_SOURCE_DIR}/build/fr_asm.o
        COMMAND nasm ${NASM_FLAGS} fr.asm -o fr_asm.o
        DEPENDS ${CMAKE_SOURCE_DIR}/build/fr.asm
        WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}/build)
endif()

set(FR_SOURCES
    ../build/fr.hpp
    ../build/fr.cpp
    )

if(USE_ASM)
    if(ARCH MATCHES "arm64")
        set(FR_SOURCES ${FR_SOURCES} ../build/fr_raw_arm64.s ../build/fr_raw_generic.cpp ../build/fr_generic.cpp)
    elseif(ARCH MATCHES "x86_64")
        set(FR_SOURCES ${FR_SOURCES} ../build/fr_asm.o)
    endif()
else()
    set(FR_SOURCES ${FR_SOURCES} ../build/fr_generic.cpp ../build/fr_raw_generic.cpp)
endif()

add_library(fr STATIC ${FR_SOURCES})
set_target_properties(fr PROPERTIES POSITION_INDEPENDENT_CODE ON)

link_libraries(fr)


add_executable(tests tests.cpp)
add_executable(test_platform test_platform.cpp)


set(LIB_SOURCES
    calcwit.cpp
    witnesscalc.h
    witnesscalc.cpp
    )

# authV2
# set(AUTHV2_SOURCES ${LIB_SOURCES}
#     authV2.cpp
#     witnesscalc_authV2.h
#     witnesscalc_authV2.cpp
#     )

# add_library(witnesscalc_authV2 SHARED ${AUTHV2_SOURCES})
# add_library(witnesscalc_authV2Static STATIC ${AUTHV2_SOURCES})
# set_target_properties(witnesscalc_authV2Static PROPERTIES OUTPUT_NAME witnesscalc_authV2)

# add_executable(authV2 main.cpp)
# target_link_libraries(authV2 witnesscalc_authV2Static)

# target_compile_definitions(witnesscalc_authV2 PUBLIC CIRCUIT_NAME=authV2)
# target_compile_definitions(witnesscalc_authV2Static PUBLIC CIRCUIT_NAME=authV2)
# target_compile_definitions(authV2 PUBLIC CIRCUIT_NAME=authV2)

# register_sha256WithRSAEncryption_65537
# set(register_sha256WithRSAEncryption_65537_SOURCES ${LIB_SOURCES}
#     register_sha256WithRSAEncryption_65537.cpp
#     witnesscalc_register_sha256WithRSAEncryption_65537.h
#     witnesscalc_register_sha256WithRSAEncryption_65537.cpp
#     )

# add_library(witnesscalc_register_sha256WithRSAEncryption_65537 SHARED ${register_sha256WithRSAEncryption_65537_SOURCES})
# add_library(witnesscalc_register_sha256WithRSAEncryption_65537Static STATIC ${register_sha256WithRSAEncryption_65537_SOURCES})
# set_target_properties(witnesscalc_register_sha256WithRSAEncryption_65537Static PROPERTIES OUTPUT_NAME witnesscalc_register_sha256WithRSAEncryption_65537)

# add_executable(register_sha256WithRSAEncryption_65537 main.cpp)
# target_link_libraries(register_sha256WithRSAEncryption_65537 witnesscalc_register_sha256WithRSAEncryption_65537Static)

# target_compile_definitions(witnesscalc_register_sha256WithRSAEncryption_65537 PUBLIC CIRCUIT_NAME=register_sha256WithRSAEncryption_65537)
# target_compile_definitions(witnesscalc_register_sha256WithRSAEncryption_65537Static PUBLIC CIRCUIT_NAME=register_sha256WithRSAEncryption_65537)
# target_compile_definitions(register_sha256WithRSAEncryption_65537 PUBLIC CIRCUIT_NAME=register_sha256WithRSAEncryption_65537)


# vc_and_disclose
set(vc_and_disclose_SOURCES ${LIB_SOURCES}
    vc_and_disclose.cpp
    witnesscalc_vc_and_disclose.h
    witnesscalc_vc_and_disclose.cpp
    )

add_library(witnesscalc_vc_and_disclose SHARED ${vc_and_disclose_SOURCES})
add_library(witnesscalc_vc_and_discloseStatic STATIC ${vc_and_disclose_SOURCES})
set_target_properties(witnesscalc_vc_and_discloseStatic PROPERTIES OUTPUT_NAME witnesscalc_vc_and_disclose)

add_executable(vc_and_disclose main.cpp)
target_link_libraries(vc_and_disclose witnesscalc_vc_and_discloseStatic)

target_compile_definitions(witnesscalc_vc_and_disclose PUBLIC CIRCUIT_NAME=vc_and_disclose)
target_compile_definitions(witnesscalc_vc_and_discloseStatic PUBLIC CIRCUIT_NAME=vc_and_disclose)
target_compile_definitions(vc_and_disclose PUBLIC CIRCUIT_NAME=vc_and_disclose)



# prove_rsa_65537_sha256
set(prove_rsa_65537_sha256_SOURCES ${LIB_SOURCES}
    prove_rsa_65537_sha256.cpp
    witnesscalc_prove_rsa_65537_sha256.h
    witnesscalc_prove_rsa_65537_sha256.cpp
    )

add_library(witnesscalc_prove_rsa_65537_sha256 SHARED ${prove_rsa_65537_sha256_SOURCES})
add_library(witnesscalc_prove_rsa_65537_sha256Static STATIC ${prove_rsa_65537_sha256_SOURCES})
set_target_properties(witnesscalc_prove_rsa_65537_sha256Static PROPERTIES OUTPUT_NAME witnesscalc_prove_rsa_65537_sha256)

add_executable(prove_rsa_65537_sha256 main.cpp)
target_link_libraries(prove_rsa_65537_sha256 witnesscalc_prove_rsa_65537_sha256Static)

target_compile_definitions(witnesscalc_prove_rsa_65537_sha256 PUBLIC CIRCUIT_NAME=prove_rsa_65537_sha256)
target_compile_definitions(witnesscalc_prove_rsa_65537_sha256Static PUBLIC CIRCUIT_NAME=prove_rsa_65537_sha256)
target_compile_definitions(prove_rsa_65537_sha256 PUBLIC CIRCUIT_NAME=prove_rsa_65537_sha256)


# prove_rsa_65537_sha1
set(prove_rsa_65537_sha1_SOURCES ${LIB_SOURCES}
    prove_rsa_65537_sha1.cpp
    witnesscalc_prove_rsa_65537_sha1.h
    witnesscalc_prove_rsa_65537_sha1.cpp
    )

add_library(witnesscalc_prove_rsa_65537_sha1 SHARED ${prove_rsa_65537_sha1_SOURCES})
add_library(witnesscalc_prove_rsa_65537_sha1Static STATIC ${prove_rsa_65537_sha1_SOURCES})
set_target_properties(witnesscalc_prove_rsa_65537_sha1Static PROPERTIES OUTPUT_NAME witnesscalc_prove_rsa_65537_sha1)

add_executable(prove_rsa_65537_sha1 main.cpp)
target_link_libraries(prove_rsa_65537_sha1 witnesscalc_prove_rsa_65537_sha1Static)

target_compile_definitions(witnesscalc_prove_rsa_65537_sha1 PUBLIC CIRCUIT_NAME=prove_rsa_65537_sha1)
target_compile_definitions(witnesscalc_prove_rsa_65537_sha1Static PUBLIC CIRCUIT_NAME=prove_rsa_65537_sha1)
target_compile_definitions(prove_rsa_65537_sha1 PUBLIC CIRCUIT_NAME=prove_rsa_65537_sha1)


# prove_rsapss_65537_sha256
set(prove_rsapss_65537_sha256_SOURCES ${LIB_SOURCES}
    prove_rsapss_65537_sha256.cpp
    witnesscalc_prove_rsapss_65537_sha256.h
    witnesscalc_prove_rsapss_65537_sha256.cpp
    )

add_library(witnesscalc_prove_rsapss_65537_sha256 SHARED ${prove_rsapss_65537_sha256_SOURCES})
add_library(witnesscalc_prove_rsapss_65537_sha256Static STATIC ${prove_rsapss_65537_sha256_SOURCES})
set_target_properties(witnesscalc_prove_rsapss_65537_sha256Static PROPERTIES OUTPUT_NAME witnesscalc_prove_rsapss_65537_sha256)

add_executable(prove_rsapss_65537_sha256 main.cpp)
target_link_libraries(prove_rsapss_65537_sha256 witnesscalc_prove_rsapss_65537_sha256Static)

target_compile_definitions(witnesscalc_prove_rsapss_65537_sha256 PUBLIC CIRCUIT_NAME=prove_rsapss_65537_sha256)
target_compile_definitions(witnesscalc_prove_rsapss_65537_sha256Static PUBLIC CIRCUIT_NAME=prove_rsapss_65537_sha256)
target_compile_definitions(prove_rsapss_65537_sha256 PUBLIC CIRCUIT_NAME=prove_rsapss_65537_sha256)

# register_rsa_65537_sha256
# set(register_rsa_65537_sha256_SOURCES ${LIB_SOURCES}
#     register_rsa_65537_sha256.cpp
#     witnesscalc_register_rsa_65537_sha256.h
#     witnesscalc_register_rsa_65537_sha256.cpp
#     )

# add_library(witnesscalc_register_rsa_65537_sha256 SHARED ${register_rsa_65537_sha256_SOURCES})
# add_library(witnesscalc_register_rsa_65537_sha256Static STATIC ${register_rsa_65537_sha256_SOURCES})
# set_target_properties(witnesscalc_register_rsa_65537_sha256Static PROPERTIES OUTPUT_NAME witnesscalc_register_rsa_65537_sha256)

# add_executable(register_rsa_65537_sha256 main.cpp)
# target_link_libraries(register_rsa_65537_sha256 witnesscalc_register_rsa_65537_sha256Static)

# target_compile_definitions(witnesscalc_register_rsa_65537_sha256 PUBLIC CIRCUIT_NAME=register_rsa_65537_sha256)
# target_compile_definitions(witnesscalc_register_rsa_65537_sha256Static PUBLIC CIRCUIT_NAME=register_rsa_65537_sha256)
# target_compile_definitions(register_rsa_65537_sha256 PUBLIC CIRCUIT_NAME=register_rsa_65537_sha256)


# # register_rsa_65537_sha1
# set(register_rsa_65537_sha1_SOURCES ${LIB_SOURCES}
#     register_rsa_65537_sha1.cpp
#     witnesscalc_register_rsa_65537_sha1.h
#     witnesscalc_register_rsa_65537_sha1.cpp
#     )

# add_library(witnesscalc_register_rsa_65537_sha1 SHARED ${register_rsa_65537_sha1_SOURCES})
# add_library(witnesscalc_register_rsa_65537_sha1Static STATIC ${register_rsa_65537_sha1_SOURCES})
# set_target_properties(witnesscalc_register_rsa_65537_sha1Static PROPERTIES OUTPUT_NAME witnesscalc_register_rsa_65537_sha1)

# add_executable(register_rsa_65537_sha1 main.cpp)
# target_link_libraries(register_rsa_65537_sha1 witnesscalc_register_rsa_65537_sha1Static)

# target_compile_definitions(witnesscalc_register_rsa_65537_sha1 PUBLIC CIRCUIT_NAME=register_rsa_65537_sha1)
# target_compile_definitions(witnesscalc_register_rsa_65537_sha1Static PUBLIC CIRCUIT_NAME=register_rsa_65537_sha1)
# target_compile_definitions(register_rsa_65537_sha1 PUBLIC CIRCUIT_NAME=register_rsa_65537_sha1)

# # register_rsapss_65537_sha256
# set(register_rsapss_65537_sha256_SOURCES ${LIB_SOURCES}
#     register_rsapss_65537_sha256.cpp
#     witnesscalc_register_rsapss_65537_sha256.h
#     witnesscalc_register_rsapss_65537_sha256.cpp
#     )

# add_library(witnesscalc_register_rsapss_65537_sha256 SHARED ${register_rsapss_65537_sha256_SOURCES})
# add_library(witnesscalc_register_rsapss_65537_sha256Static STATIC ${register_rsapss_65537_sha256_SOURCES})
# set_target_properties(witnesscalc_register_rsapss_65537_sha256Static PROPERTIES OUTPUT_NAME witnesscalc_register_rsapss_65537_sha256)

# add_executable(register_rsapss_65537_sha256 main.cpp)
# target_link_libraries(register_rsapss_65537_sha256 witnesscalc_register_rsapss_65537_sha256Static)

# target_compile_definitions(witnesscalc_register_rsapss_65537_sha256 PUBLIC CIRCUIT_NAME=register_rsapss_65537_sha256)
# target_compile_definitions(witnesscalc_register_rsapss_65537_sha256Static PUBLIC CIRCUIT_NAME=register_rsapss_65537_sha256)
# target_compile_definitions(register_rsapss_65537_sha256 PUBLIC CIRCUIT_NAME=register_rsapss_65537_sha256)