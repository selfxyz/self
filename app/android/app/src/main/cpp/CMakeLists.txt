
cmake_minimum_required(VERSION 3.22.1)

project("proofofpassport")

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
