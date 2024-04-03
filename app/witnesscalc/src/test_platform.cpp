#include <iostream>
#include <string>
#include <cstdint>
#include <gmp.h>
#include "fr.hpp"

int main()
{
    std::cout << "sizeof int32_t : "            << sizeof(int32_t)            << std::endl;
    std::cout << "sizeof int64_t : "            << sizeof(int64_t)            << std::endl;

    std::cout << "sizeof int : "                << sizeof(int)                << std::endl;
    std::cout << "sizeof unsigned int :  "      << sizeof(unsigned int)       << std::endl;
    std::cout << "sizeof long : "               << sizeof(long)               << std::endl;
    std::cout << "sizeof unsigned long : "      << sizeof(unsigned long)      << std::endl;
    std::cout << "sizeof long long : "          << sizeof(long long)          << std::endl;
    std::cout << "sizeof unsigned long long : " << sizeof(unsigned long long) << std::endl;
    std::cout << "sizeof mp_limb_t : "          << sizeof(mp_limb_t)          << std::endl;
    std::cout << "sizeof mp_limb_signed_t : "   << sizeof(mp_limb_signed_t)   << std::endl;
    std::cout << "sizeof FrRawElement : "       << sizeof(FrRawElement)       << std::endl;
    std::cout << "sizeof FrElement : "          << sizeof(FrElement)          << std::endl;

    int32_t x = -5;
    uint32_t y = 5;

    std::cout << "-5 >> 1 : " << (x >> 1) << std::endl;
    std::cout << "5 >> 1 : "  << (y >> 1) << std::endl;
}
