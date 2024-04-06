
cmake_minimum_required(VERSION 3.22.1)

project("proofofpassport")

set(JDK_DIR "/Library/Java/JavaVirtualMachines/zulu-11.jdk/Contents/Home")

# Include the JDK header files
include_directories(${JDK_DIR}/include)
include_directories(${JDK_DIR}/include/darwin)

include_directories(include)

link_directories(lib)

add_library(rapidsnark SHARED IMPORTED)
set_target_properties(rapidsnark PROPERTIES IMPORTED_LOCATION ${CMAKE_SOURCE_DIR}/lib/librapidsnark.so)


add_library(proof_of_passport SHARED IMPORTED)
set_target_properties(proof_of_passport PROPERTIES IMPORTED_LOCATION ${CMAKE_SOURCE_DIR}/lib/libwitnesscalc_proof_of_passport.so)

add_library(${CMAKE_PROJECT_NAME} SHARED
        proofofpassport.cpp)

target_link_libraries(${CMAKE_PROJECT_NAME}
        rapidsnark proof_of_passport)
        # android log fq fr gmp rapidsnark proof_of_passport rapidsnark-fr-fq)
