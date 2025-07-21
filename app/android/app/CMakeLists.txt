cmake_minimum_required(VERSION 3.22.1)

# Set CMake policies to handle duplicate targets gracefully
cmake_policy(SET CMP0002 NEW)

# Exclude SVG module if specified
if(DEFINED EXCLUDE_SVG AND EXCLUDE_SVG)
    message(STATUS "Excluding SVG module from build")
    set(BUILD_SVG OFF)
endif()

# Set Android STL
set(ANDROID_STL c++_shared)

# Add compiler flags
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -fexceptions -frtti -std=c++11")

# Function to safely add subdirectory only if it exists
function(safe_add_subdirectory dir)
    if(EXISTS "${dir}/CMakeLists.txt")
        add_subdirectory(${dir})
    else()
        message(STATUS "Skipping ${dir} - CMakeLists.txt not found")
    endif()
endfunction()

# Function to safely include directory only if it exists
function(safe_include_directory dir)
    if(EXISTS "${dir}")
        include_directories(${dir})
    else()
        message(STATUS "Skipping include directory ${dir} - directory not found")
    endif()
endfunction()
