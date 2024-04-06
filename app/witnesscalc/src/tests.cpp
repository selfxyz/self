#include <iostream>
#include <sstream>
#include <iomanip>
#include <string>
#include <cstdint>
#include <cstring>
#include "fr.hpp"

int tests_run = 0;
int tests_failed = 0;

FrElement fr_short(int32_t val)
{
    return {val, Fr_SHORT, {0, 0, 0, 0}};
}

FrElement fr_mshort(int32_t val)
{
    return {val, Fr_SHORTMONTGOMERY, {0, 0, 0, 0}};
}

FrElement fr_long(uint64_t val0, uint64_t val1 = 0, uint64_t val2 = 0, uint64_t val3 = 0)
{
    return {0, Fr_LONG, {val0, val1, val2, val3}};
}

FrElement fr_mlong(uint64_t val0, uint64_t val1 = 0, uint64_t val2 = 0, uint64_t val3 = 0)
{
    return {0, Fr_LONGMONTGOMERY, {val0, val1, val2, val3}};
}

bool is_equal(const FrRawElement a, const FrRawElement b)
{
    return std::memcmp(a, b, sizeof(FrRawElement)) == 0;
}

bool is_equal(const PFrElement a, const PFrElement b)
{
    return std::memcmp(a, b, sizeof(FrElement)) == 0;
}

std::string format(uint64_t val)
{
    std::ostringstream  oss;

    oss << "0x" << std::hex << std::setw(16) << std::setfill('0') << val;

    return oss.str();
}

std::string format(uint32_t val)
{
    std::ostringstream  oss;

    oss << "0x" << std::hex << std::setw(8) << std::setfill('0') << val;

    return oss.str();
}

std::string format(int32_t val)
{
    std::ostringstream  oss;

    oss << "0x" << std::hex << std::setw(8) << std::setfill('0') << val;

    return oss.str();
}

std::ostream& operator<<(std::ostream& os, const FrRawElement val)
{
    os << format(val[0]) << ","
       << format(val[1]) << ","
       << format(val[2]) << ","
       << format(val[3]);

    return os;
}

std::ostream& operator<<(std::ostream& os, const PFrElement val)
{
    os  << format(val->shortVal) << ", "
        << format(val->type)     << ", "
        << val->longVal;

    return os;
}

template <typename T1, typename T2, typename T3>
void compare_Result(const T1 expected, const T1 computed, const T2 A, const T3 B, int idx, std::string TestName)
{
    if (!is_equal(expected, computed))
    {
        std::cout << TestName << ":" << idx << " failed!" << std::endl;
        std::cout << "A: " << A << std::endl;
        std::cout << "B: " << B << std::endl;
        std::cout << "Expected: " << expected << std::endl;
        std::cout << "Computed: " << computed << std::endl;
        std::cout << std::endl;
        tests_failed++;
    }

    tests_run++;
}

template <typename T1, typename T2>
void compare_Result(const T1 expected, const T1 computed, const T2 A, int idx, std::string test_name)
{
    if (!is_equal(expected, computed))
    {
        std::cout << test_name << ":" << idx << " failed!" << std::endl;
        std::cout << "A: " << A << std::endl;
        std::cout << "Expected: " << expected << std::endl;
        std::cout << "Computed: " << computed << std::endl;
        std::cout << std::endl;
        tests_failed++;
    }

    tests_run++;
}

void Fr_Rw_Neg_unit_test()
{
    //Fr_Rw_Neg_test 0:
    FrRawElement pRawA0= {0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014};
    FrRawElement pRawResult0= {0xa1f0fac9f8000001,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014};
    //Fr_Rw_Neg_test 1:
    FrRawElement pRawA1= {0x1,0x0,0x0,0x0};
    FrRawElement pRawResult1= {0x43e1f593f0000000,0x2833e84879b97091,0xb85045b68181585d,0x30644e72e131a029};
    //Fr_Rw_Neg_test 2:
    FrRawElement pRawA2= {0xfffffffffffffffe,0x0,0x0,0x0};
    FrRawElement pRawResult2= {0x43e1f593f0000003,0x2833e84879b97090,0xb85045b68181585d,0x30644e72e131a029};
    //Fr_Rw_Neg_test 3:
    FrRawElement pRawA3= {0xfffffffffffffffe,0xfffffffffffffffe,0xfffffffffffffffe,0xfffffffffffffffe};
    FrRawElement pRawResult3= {0x43e1f593f0000003,0x2833e84879b97092,0xb85045b68181585e,0x30644e72e131a02a}; 
    //Fr_Rw_Neg_test 5:
    FrRawElement pRawA5= {0x0,0x0,0x0,0x0};
    FrRawElement pRawResult5= {0x0,0x0,0x0,0x0};

    FrRawElement pRawResult0_c;
    FrRawElement pRawResult1_c;
    FrRawElement pRawResult2_c;
    FrRawElement pRawResult3_c;
    FrRawElement pRawResult5_c;

    Fr_rawNeg(pRawResult0_c, pRawA0);
    Fr_rawNeg(pRawResult1_c, pRawA1);
    Fr_rawNeg(pRawResult2_c, pRawA2);
    Fr_rawNeg(pRawResult3_c, pRawA3);
    Fr_rawNeg(pRawResult5_c, pRawA5);

    compare_Result(pRawResult0, pRawResult0_c, pRawA0, pRawA0, 0, "Fr_Rw_Neg_unit_test");
    compare_Result(pRawResult1, pRawResult1_c, pRawA1, pRawA1, 1, "Fr_Rw_Neg_unit_test");
    compare_Result(pRawResult2, pRawResult2_c, pRawA2, pRawA2, 2, "Fr_Rw_Neg_unit_test");
    compare_Result(pRawResult3, pRawResult3_c, pRawA3, pRawA3, 3, "Fr_Rw_Neg_unit_test");
    compare_Result(pRawResult5, pRawResult5_c, pRawA5, pRawA5, 5, "Fr_Rw_Neg_unit_test");
}

void Fr_Rw_copy_unit_test()
{
    //Fr_Rw_copy_test 0:
    FrRawElement pRawA0= {0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014};
    FrRawElement pRawResult0= {0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014};
    //Fr_Rw_copy_test 1:
    FrRawElement pRawA1= {0x1,0x0,0x0,0x0};
    FrRawElement pRawResult1= {0x1,0x0,0x0,0x0};
    //Fr_Rw_copy_test 2:
    FrRawElement pRawA2= {0xfffffffffffffffe,0x0,0x0,0x0};
    FrRawElement pRawResult2= {0xfffffffffffffffe,0x0,0x0,0x0};
    //Fr_Rw_copy_test 3:
    FrRawElement pRawA3= {0xfffffffffffffffe,0xfffffffffffffffe,0xfffffffffffffffe,0xfffffffffffffffe};
    FrRawElement pRawResult3= {0xfffffffffffffffe,0xfffffffffffffffe,0xfffffffffffffffe,0xfffffffffffffffe};

    FrRawElement pRawResult0_c;
    FrRawElement pRawResult1_c;
    FrRawElement pRawResult2_c;
    FrRawElement pRawResult3_c;

    Fr_rawCopy(pRawResult0_c, pRawA0);
    Fr_rawCopy(pRawResult1_c, pRawA1);
    Fr_rawCopy(pRawResult2_c, pRawA2);
    Fr_rawCopy(pRawResult3_c, pRawA3);

    compare_Result(pRawResult0, pRawResult0_c, pRawA0, pRawA0, 0, "Fr_Rw_copy_unit_test");
    compare_Result(pRawResult1, pRawResult1_c, pRawA1, pRawA1, 1, "Fr_Rw_copy_unit_test");
    compare_Result(pRawResult2, pRawResult2_c, pRawA2, pRawA2, 2, "Fr_Rw_copy_unit_test");
    compare_Result(pRawResult3, pRawResult3_c, pRawA3, pRawA3, 3, "Fr_Rw_copy_unit_test");
}


void Fr_Rw_add_unit_test()
{
    //Fr_rawAdd Test 0:
    FrRawElement pRawA0= {0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014};
    FrRawElement pRawB0= {0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5};
    FrRawElement pRawResult0= {0xbda9e10fa6216da7,0xe8182ed62039122b,0x6871a618947c2cb3,0x1a48f7eaefe714ba};
    //Fr_rawAdd Test 1:
    FrRawElement pRawA1= {0x1,0x0,0x0,0x0};
    FrRawElement pRawB1= {0x2,0x0,0x0,0x0};
    FrRawElement pRawResult1= {0x3,0x0,0x0,0x0};
    //Fr_rawAdd Test 2:
    FrRawElement pRawA2= {0xfffffffffffffffe,0x0,0x0,0x0};
    FrRawElement pRawB2= {0xffffffffffffffff,0x0,0x0,0x0};
    FrRawElement pRawResult2= {0xfffffffffffffffd,0x1,0x0,0x0};
    //Fr_rawAdd Test 3:
    FrRawElement pRawA3= {0xfffffffffffffffe,0xfffffffffffffffe,0xfffffffffffffffe,0xfffffffffffffffe};
    FrRawElement pRawB3= {0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff};
    FrRawElement pRawResult3= {0xbc1e0a6c0ffffffc,0xd7cc17b786468f6d,0x47afba497e7ea7a1,0xcf9bb18d1ece5fd5};
    //Fr_rawAdd Test 6:
    FrRawElement pRawA6= {0x43e1f593f0000001,0x2833e84879b97091,0xb85045b68181585d,0x30644e72e131a029};
    FrRawElement pRawB6= {0x0,0x0,0x0,0x0};
    FrRawElement pRawResult6= {0x0,0x0,0x0,0x0};

    FrRawElement pRawResult0_c;
    FrRawElement pRawResult1_c;
    FrRawElement pRawResult2_c;
    FrRawElement pRawResult3_c;
    FrRawElement pRawResult6_c;

    Fr_rawAdd(pRawResult0_c, pRawA0, pRawB0);
    Fr_rawAdd(pRawResult1_c, pRawA1, pRawB1);
    Fr_rawAdd(pRawResult2_c, pRawA2, pRawB2);
    Fr_rawAdd(pRawResult3_c, pRawA3, pRawB3);
    Fr_rawAdd(pRawResult6_c, pRawA6, pRawB6);


    compare_Result(pRawResult0, pRawResult0_c, pRawA0, pRawB0, 0, "Fr_Rw_add_unit_test");
    compare_Result(pRawResult1, pRawResult1_c, pRawA1, pRawB1, 1, "Fr_Rw_add_unit_test");
    compare_Result(pRawResult2, pRawResult2_c, pRawA2, pRawB2, 2, "Fr_Rw_add_unit_test");
    compare_Result(pRawResult3, pRawResult3_c, pRawA3, pRawB3, 3, "Fr_Rw_add_unit_test");
    compare_Result(pRawResult6, pRawResult6_c, pRawA6, pRawB6, 6, "Fr_Rw_add_unit_test");
}

void Fr_Rw_sub_unit_test()
{
    //Fr_Rw_sub_test 0:
    FrRawElement pRawA0= {0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014};
    FrRawElement pRawB0= {0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5};
    FrRawElement pRawResult0= {0x8638148449de9259,0x401bb97259805e65,0x4fde9f9ded052ba9,0x161b5687f14a8b6f};
    //Fr_Rw_sub_test 1:
    FrRawElement pRawA1= {0x1,0x0,0x0,0x0};
    FrRawElement pRawB1= {0x2,0x0,0x0,0x0};
    FrRawElement pRawResult1= {0x43e1f593f0000000,0x2833e84879b97091,0xb85045b68181585d,0x30644e72e131a029};
    //Fr_Rw_sub_test 2:
    FrRawElement pRawA2= {0xfffffffffffffffe,0x0,0x0,0x0};
    FrRawElement pRawB2= {0xffffffffffffffff,0x0,0x0,0x0};
    FrRawElement pRawResult2= {0x43e1f593f0000000,0x2833e84879b97091,0xb85045b68181585d,0x30644e72e131a029};
    //Fr_Rw_sub_test 3:
    FrRawElement pRawA3= {0xfffffffffffffffe,0xfffffffffffffffe,0xfffffffffffffffe,0xfffffffffffffffe};
    FrRawElement pRawB3= {0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff};
    FrRawElement pRawResult3= {0x43e1f593f0000000,0x2833e84879b97090,0xb85045b68181585c,0x30644e72e131a028};

    FrRawElement pRawResult0_c;
    FrRawElement pRawResult1_c;
    FrRawElement pRawResult2_c;
    FrRawElement pRawResult3_c;

    Fr_rawSub(pRawResult0_c, pRawA0, pRawB0);
    Fr_rawSub(pRawResult1_c, pRawA1, pRawB1);
    Fr_rawSub(pRawResult2_c, pRawA2, pRawB2);
    Fr_rawSub(pRawResult3_c, pRawA3, pRawB3);

    compare_Result(pRawResult0, pRawResult0_c, pRawA0, pRawB0, 0, "Fr_Rw_sub_unit_test");
    compare_Result(pRawResult1, pRawResult1_c, pRawA1, pRawB1, 1, "Fr_Rw_sub_unit_test");
    compare_Result(pRawResult2, pRawResult2_c, pRawA2, pRawB2, 2, "Fr_Rw_sub_unit_test");
    compare_Result(pRawResult3, pRawResult3_c, pRawA3, pRawB3, 3, "Fr_Rw_sub_unit_test");


}

void Fr_Rw_mul_unit_test()
{
    //Fr_Rw_mul_test 0:
    FrRawElement pRawA0= {0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014};
    FrRawElement pRawB0= {0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5};
    FrRawElement pRawResult0= {0xcba5e0bbd0000003,0x789bb8d96d2c51b3,0x28f0d12384840917,0x112ceb58a394e07d};
    //Fr_Rw_mul_test 1:
    FrRawElement pRawA1= {0x1,0x0,0x0,0x0};
    FrRawElement pRawB1= {0x2,0x0,0x0,0x0};
    FrRawElement pRawResult1= {0xb8b7400adb62329c,0x121deb53c223d90f,0x904c1bc95d70baba,0x2bd7f2a3058aaa39};
    //Fr_Rw_mul_test 2:
    FrRawElement pRawA2= {0xfffffffffffffffe,0x0,0x0,0x0};
    FrRawElement pRawB2= {0xffffffffffffffff,0x0,0x0,0x0};
    FrRawElement pRawResult2= {0x8663902cfae5d423,0x95d2440ac403ddd3,0x1ad411b88e349a0f,0x1ebf106109e4fa8d};
    //Fr_Rw_mul_test 3:
    FrRawElement pRawA3= {0xfffffffffffffffe,0xfffffffffffffffe,0xfffffffffffffffe,0xfffffffffffffffe};
    FrRawElement pRawB3= {0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff};
    FrRawElement pRawResult3= {0xd13604f1e300865c,0xba58b3d2a99f4ba5,0x1b4e415146d47f95,0x55c593ff9cfbf0a};
    //Fr_Rw_mul_test 4:
    FrRawElement pRawA4= {0xfffffffffffffffe,0xfffffffffffffffe,0xfffffffffffffffe,0xfffffffffffffffe};
    FrRawElement pRawB4= {0xffffffffffffffff,0x0,0x0,0x0};
    FrRawElement pRawResult4= {0x1d0a8ff4c8e5744c,0x6fd9959908f97ec,0xdfe72d24fcdef34e,0xd1c7f8bb929dbb};
    //Fr_Rw_mul_test 5:
    FrRawElement pRawA5= {0x0,0x0,0x0,0x0};
    FrRawElement pRawB5= {0x2,0x0,0x0,0x0};
    FrRawElement pRawResult5= {0x0,0x0,0x0,0x0};   
    //Fr_Rw_mul_test 8:
    FrRawElement pRawA8= {0x1,0x0,0x0,0x0};
    FrRawElement pRawB8= {0x43e1f593f0000001,0x2833e84879b97091,0xb85045b68181585d,0x30644e72e131a029};
    FrRawElement pRawResult8= {0x0,0x0,0x0,0x0};

    FrRawElement pRawResult0_c;
    FrRawElement pRawResult1_c;
    FrRawElement pRawResult2_c;
    FrRawElement pRawResult3_c;
    FrRawElement pRawResult4_c;
    FrRawElement pRawResult5_c;
    FrRawElement pRawResult8_c;

    Fr_rawMMul(pRawResult0_c, pRawA0, pRawB0);
    Fr_rawMMul(pRawResult1_c, pRawA1, pRawB1);
    Fr_rawMMul(pRawResult2_c, pRawA2, pRawB2);
    Fr_rawMMul(pRawResult3_c, pRawA3, pRawB3);
    Fr_rawMMul(pRawResult4_c, pRawA4, pRawB4);
    Fr_rawMMul(pRawResult5_c, pRawA5, pRawB5);
    Fr_rawMMul(pRawResult8_c, pRawA8, pRawB8);

    compare_Result(pRawResult0, pRawResult0_c, pRawA0, pRawB0, 0, "Fr_Rw_mul_unit_test");
    compare_Result(pRawResult1, pRawResult1_c, pRawA1, pRawB1, 1, "Fr_Rw_mul_unit_test");
    compare_Result(pRawResult2, pRawResult2_c, pRawA2, pRawB2, 2, "Fr_Rw_mul_unit_test");
    compare_Result(pRawResult3, pRawResult3_c, pRawA3, pRawB3, 3, "Fr_Rw_mul_unit_test");
    compare_Result(pRawResult1, pRawResult1_c, pRawA4, pRawB4, 4, "Fr_Rw_mul_unit_test");
    compare_Result(pRawResult2, pRawResult2_c, pRawA5, pRawB5, 5, "Fr_Rw_mul_unit_test");
    compare_Result(pRawResult3, pRawResult3_c, pRawA8, pRawB8, 8, "Fr_Rw_mul_unit_test");


}

void Fr_Rw_Msquare_unit_test()
{
    //Fr_Rw_Msquare_test 0:
    FrRawElement pRawA0= {0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014};
    FrRawElement pRawResult0= {0x9907e2cb536c4654,0xd65db18eb521336a,0xe31a6546c6ec385,0x1dad258dd14a255c};
    //Fr_Rw_Msquare_test 1:
    FrRawElement pRawA1= {0x1,0x0,0x0,0x0};
    FrRawElement pRawResult1= {0xdc5ba0056db1194e,0x90ef5a9e111ec87,0xc8260de4aeb85d5d,0x15ebf95182c5551c};
    //Fr_Rw_Msquare_test 2:
    FrRawElement pRawA2= {0xfffffffffffffffe,0x0,0x0,0x0};
    FrRawElement pRawResult2= {0xa36e2021c3cb4871,0x9ccfdd64549375be,0xfabb3edd8b138d5d,0x1f90d859c5779848};
    //Fr_Rw_Msquare_test 3:
    FrRawElement pRawA3= {0xfffffffffffffffe,0xfffffffffffffffe,0xfffffffffffffffe,0xfffffffffffffffe};
    FrRawElement pRawResult3= {0x3ff409a0d3b30d18,0xca2027949dd16d47,0x6c8c4187ce125dad,0x3b5af5c48558e40};

    FrRawElement pRawResult0_c;
    FrRawElement pRawResult1_c;
    FrRawElement pRawResult2_c;
    FrRawElement pRawResult3_c;

    Fr_rawMSquare(pRawResult0_c, pRawA0);
    Fr_rawMSquare(pRawResult1_c, pRawA1);
    Fr_rawMSquare(pRawResult2_c, pRawA2);
    Fr_rawMSquare(pRawResult3_c, pRawA3);

    compare_Result(pRawResult0, pRawResult0_c, pRawA0, pRawA0, 0, "Fr_Rw_Msquare_unit_test");
    compare_Result(pRawResult1, pRawResult1_c, pRawA1, pRawA1, 1, "Fr_Rw_Msquare_unit_test");
    compare_Result(pRawResult2, pRawResult2_c, pRawA2, pRawA2, 2, "Fr_Rw_Msquare_unit_test");
    compare_Result(pRawResult3, pRawResult3_c, pRawA3, pRawA3, 3, "Fr_Rw_Msquare_unit_test");
}

void Fr_Rw_mul1_unit_test()
{
    //Fr_Rw_mul1_test 0:
    FrRawElement pRawA0= {0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014};
    FrRawElement pRawB0= {0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5};
    FrRawElement pRawResult0= {0xf599ddfbad86bc06,0xec1c0a17893c85cd,0x5d482c29ab80ec64,0x4d4face96bf58f3};
    //Fr_Rw_mul1_test 1:
    FrRawElement pRawA1= {0x1,0x0,0x0,0x0};
    FrRawElement pRawB1= {0x2,0x0,0x0,0x0};
    FrRawElement pRawResult1= {0xb8b7400adb62329c,0x121deb53c223d90f,0x904c1bc95d70baba,0x2bd7f2a3058aaa39};
    //Fr_Rw_mul1_test 2:
    FrRawElement pRawA2= {0xfffffffffffffffe,0x0,0x0,0x0};
    FrRawElement pRawB2= {0xffffffffffffffff,0x0,0x0,0x0};
    FrRawElement pRawResult2= {0x8663902cfae5d423,0x95d2440ac403ddd3,0x1ad411b88e349a0f,0x1ebf106109e4fa8d};
    //Fr_Rw_mul1_test 3:
    FrRawElement pRawA3= {0xfffffffffffffffe,0xfffffffffffffffe,0xfffffffffffffffe,0xfffffffffffffffe};
    FrRawElement pRawB3= {0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff};
    FrRawElement pRawResult3= {0x35f905313fdf50bb,0x5bab176e33b97efa,0xafd63944c55782d,0x1402c8cfdb71d335};    
    //Fr_Rw_mul1_test 9:
    FrRawElement pRawA9= {0x43e1f593f0000001,0x2833e84879b97091,0xb85045b68181585d,0x30644e72e131a029};
    FrRawElement pRawB9= {0x1,0x0,0x0,0x0};
    FrRawElement pRawResult9= {0x0,0x0,0x0,0x0};

    FrRawElement pRawResult0_c;
    FrRawElement pRawResult1_c;
    FrRawElement pRawResult2_c;
    FrRawElement pRawResult3_c;
    FrRawElement pRawResult9_c;

    Fr_rawMMul1(pRawResult0_c, pRawA0, pRawB0[0]);
    Fr_rawMMul1(pRawResult1_c, pRawA1, pRawB1[0]);
    Fr_rawMMul1(pRawResult2_c, pRawA2, pRawB2[0]);
    Fr_rawMMul1(pRawResult3_c, pRawA3, pRawB3[0]);
    Fr_rawMMul1(pRawResult9_c, pRawA9, pRawB9[0]);

    compare_Result(pRawResult0, pRawResult0_c, pRawA0, pRawB0, 0, "Fr_Rw_mul1_unit_test");
    compare_Result(pRawResult1, pRawResult1_c, pRawA1, pRawB1, 1, "Fr_Rw_mul1_unit_test");
    compare_Result(pRawResult2, pRawResult2_c, pRawA2, pRawB2, 2, "Fr_Rw_mul1_unit_test");
    compare_Result(pRawResult3, pRawResult3_c, pRawA3, pRawB3, 3, "Fr_Rw_mul1_unit_test");
    compare_Result(pRawResult9, pRawResult9_c, pRawA9, pRawB9, 9, "Fr_Rw_mul1_unit_test");

}

void Fr_Rw_ToMontgomery_unit_test()
{
    //Fr_Rw_ToMontgomery_test 0:
    FrRawElement pRawA0= {0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014};
    FrRawElement pRawResult0= {0xcba5e0bbd0000003,0x789bb8d96d2c51b3,0x28f0d12384840917,0x112ceb58a394e07d};
    //Fr_Rw_ToMontgomery_test 1:
    FrRawElement pRawA1= {0x1,0x0,0x0,0x0};
    FrRawElement pRawResult1= {0xac96341c4ffffffb,0x36fc76959f60cd29,0x666ea36f7879462e,0xe0a77c19a07df2f};
    //Fr_Rw_ToMontgomery_test 2:
    FrRawElement pRawA2= {0xfffffffffffffffe,0x0,0x0,0x0};
    FrRawElement pRawResult2= {0x5b9a85c0dc5fb590,0x293a0258129f96b,0xd31fd70514055493,0x546132966296a07};
    //Fr_Rw_ToMontgomery_test 3:
    FrRawElement pRawA3= {0xfffffffffffffffe,0xfffffffffffffffe,0xfffffffffffffffe,0xfffffffffffffffe};
    FrRawElement pRawResult3= {0x8eaddd03c0bcc45a,0x1d0775cf53f57853,0xacb9a1fdb8079310,0x1b7838d45d9b3577};

    FrRawElement pRawResult0_c;
    FrRawElement pRawResult1_c;
    FrRawElement pRawResult2_c;
    FrRawElement pRawResult3_c;

    Fr_rawToMontgomery(pRawResult0_c, pRawA0);
    Fr_rawToMontgomery(pRawResult1_c, pRawA1);
    Fr_rawToMontgomery(pRawResult2_c, pRawA2);
    Fr_rawToMontgomery(pRawResult3_c, pRawA3);

    compare_Result(pRawResult0, pRawResult0_c, pRawA0, pRawA0, 0, "Fr_Rw_ToMontgomery_unit_test");
    compare_Result(pRawResult1, pRawResult1_c, pRawA1, pRawA1, 1, "Fr_Rw_ToMontgomery_unit_test");
    compare_Result(pRawResult2, pRawResult2_c, pRawA2, pRawA2, 2, "Fr_Rw_ToMontgomery_unit_test");
    compare_Result(pRawResult3, pRawResult3_c, pRawA3, pRawA3, 3, "Fr_Rw_ToMontgomery_unit_test");
}

void Fr_Rw_IsEq_unit_test()
{
    //Fr_rawIsEq 0:
    FrRawElement pRawA0= {0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014};
    FrRawElement pRawB0= {0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5};
    FrRawElement pRawResult0= {0x0};
    //Fr_rawIsEq 1:
    FrRawElement pRawA1= {0x1,0x0,0x0,0x0};
    FrRawElement pRawB1= {0x1,0x0,0x0,0x0};
    FrRawElement pRawResult1= {0x1};
    //Fr_rawIsEq 2:
    FrRawElement pRawA2= {0xffffffffffffffff,0x0,0x0,0x0};
    FrRawElement pRawB2= {0xffffffffffffffff,0x0,0x0,0x0};
    FrRawElement pRawResult2= {0x1};
    //Fr_rawIsEq 3:
    FrRawElement pRawA3= {0xfffffffffffffffe,0xfffffffffffffffe,0xfffffffffffffffe,0xfffffffffffffffe};
    FrRawElement pRawB3= {0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff};
    FrRawElement pRawResult3= {0x0};

    //Fr_rawIsEq 7:
    FrRawElement pRawA7= {0x43e1f593f0000001,0x2833e84879b97091,0xb85045b68181585d,0x30644e72e131a029};
    FrRawElement pRawB7= {0x43e1f593f0000001,0x2833e84879b97091,0xb85045b68181585d,0x30644e72e131a029};
    FrRawElement pRawResult7= {0x1};

    FrRawElement pRawResult0_c = {0};
    FrRawElement pRawResult1_c = {0};
    FrRawElement pRawResult2_c = {0};
    FrRawElement pRawResult3_c = {0};
    FrRawElement pRawResult7_c = {0};

    pRawResult0_c[0] = Fr_rawIsEq(pRawA0, pRawB0);
    pRawResult1_c[0] = Fr_rawIsEq(pRawA1, pRawB1);
    pRawResult2_c[0] = Fr_rawIsEq(pRawA2, pRawB2);
    pRawResult3_c[0] = Fr_rawIsEq(pRawA3, pRawB3);
    pRawResult7_c[0] = Fr_rawIsEq(pRawA7, pRawB7);

    compare_Result(pRawResult0, pRawResult0_c, pRawA0, pRawB0, 0, "Fr_Rw_IsEq_unit_test");
    compare_Result(pRawResult1, pRawResult1_c, pRawA1, pRawB1, 1, "Fr_Rw_IsEq_unit_test");
    compare_Result(pRawResult2, pRawResult2_c, pRawA2, pRawB2, 2, "Fr_Rw_IsEq_unit_test");
    compare_Result(pRawResult3, pRawResult3_c, pRawA3, pRawB3, 3, "Fr_Rw_IsEq_unit_test");
    compare_Result(pRawResult7, pRawResult7_c, pRawA7, pRawB7, 7, "Fr_Rw_IsEq_unit_test");
}

void Fr_rawIsZero_unit_test()
{
    //Fr_rawIsZero_test 0:
    FrRawElement pRawA0= {0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014};
    FrRawElement pRawResult0= {0x0};
    //Fr_rawIsZero_test 1:
    FrRawElement pRawA1= {0x0,0x0,0x0,0x0};
    FrRawElement pRawResult1= {0x1};
    //Fr_rawIsZero_test 2:
    FrRawElement pRawA2= {0xfffffffffffffffe,0x0,0x0,0x0};
    FrRawElement pRawResult2= {0x0};
    //Fr_rawIsZero_test 3:
    FrRawElement pRawA3= {0xfffffffffffffffe,0xfffffffffffffffe,0xfffffffffffffffe,0xfffffffffffffffe};
    FrRawElement pRawResult3= {0x0};

    //Fr_rawIsZero_test 5:
    FrRawElement pRawA5= {0x0,0x0,0x0,0x0};
    FrRawElement pRawResult5= {0x1};

    FrRawElement pRawResult0_c = {0};
    FrRawElement pRawResult1_c = {0};
    FrRawElement pRawResult2_c = {0};
    FrRawElement pRawResult3_c = {0};
    FrRawElement pRawResult5_c = {0};

    pRawResult0_c[0] = Fr_rawIsZero(pRawA0);
    pRawResult1_c[0] = Fr_rawIsZero(pRawA1);
    pRawResult2_c[0] = Fr_rawIsZero(pRawA2);
    pRawResult3_c[0] = Fr_rawIsZero(pRawA3);
    pRawResult5_c[0] = Fr_rawIsZero(pRawA5);

    compare_Result(pRawResult0, pRawResult0_c, pRawA0, pRawA0, 0, "Fr_rawIsZero_unit_test");
    compare_Result(pRawResult1, pRawResult1_c, pRawA1, pRawA1, 1, "Fr_rawIsZero_unit_test");
    compare_Result(pRawResult2, pRawResult2_c, pRawA2, pRawA2, 2, "Fr_rawIsZero_unit_test");
    compare_Result(pRawResult3, pRawResult3_c, pRawA3, pRawA3, 3, "Fr_rawIsZero_unit_test");
    compare_Result(pRawResult5, pRawResult5_c, pRawA5, pRawA5, 5, "Fr_rawIsZero_unit_test");
}

void Fr_Rw_FromMontgomery_unit_test()
{
    //Fr_Rw_FromMontgomery_test 0:
    FrRawElement pRawA0= {0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014};
    FrRawElement pRawResult0= {0x55b425913927735a,0xa3ac6d7389307a4d,0x543d3ec42a2529ae,0x256e51ca1fcef59b};
    //Fr_Rw_FromMontgomery_test 1:
    FrRawElement pRawA1= {0x1,0x0,0x0,0x0};
    FrRawElement pRawResult1= {0xdc5ba0056db1194e,0x90ef5a9e111ec87,0xc8260de4aeb85d5d,0x15ebf95182c5551c};
    //Fr_Rw_FromMontgomery_test 2:
    FrRawElement pRawA2= {0xfffffffffffffffe,0x0,0x0,0x0};
    FrRawElement pRawResult2= {0x26d7659f271a8bb3,0x21364eeee929d8a6,0xd869189184a2650f,0x2f92867a259f026d};
    //Fr_Rw_FromMontgomery_test 3:
    FrRawElement pRawA3= {0xfffffffffffffffe,0xfffffffffffffffe,0xfffffffffffffffe,0xfffffffffffffffe};
    FrRawElement pRawResult3= {0x3114fb0a8790445e,0x3c686fb82b0dbda3,0xa509fd6ff15d77e,0x247132c3c886548};

    FrRawElement pRawResult0_c;
    FrRawElement pRawResult1_c;
    FrRawElement pRawResult2_c;
    FrRawElement pRawResult3_c;

    Fr_rawFromMontgomery(pRawResult0_c, pRawA0);
    Fr_rawFromMontgomery(pRawResult1_c, pRawA1);
    Fr_rawFromMontgomery(pRawResult2_c, pRawA2);
    Fr_rawFromMontgomery(pRawResult3_c, pRawA3);

    compare_Result(pRawResult0, pRawResult0_c, pRawA0, pRawA0, 0, "Fr_Rw_FromMontgomery_unit_test");
    compare_Result(pRawResult1, pRawResult1_c, pRawA1, pRawA1, 1, "Fr_Rw_FromMontgomery_unit_test");
    compare_Result(pRawResult2, pRawResult2_c, pRawA2, pRawA2, 2, "Fr_Rw_FromMontgomery_unit_test");
    compare_Result(pRawResult3, pRawResult3_c, pRawA3, pRawA3, 3, "Fr_Rw_FromMontgomery_unit_test");
}


void Fr_copy_unit_test()
{
    //Fr_copy_test 0:
    FrElement pA0= {0xa1f0,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pResult0= {0xa1f0,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    //Fr_copy_test 1:
    FrElement pA1= {0xa1f0,0x40000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pResult1= {0xa1f0,0x40000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    //Fr_copy_test 2:
    FrElement pA2= {0xa1f0,0x80000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pResult2= {0xa1f0,0x80000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    //Fr_copy_test 3:
    FrElement pA3= {0xa1f0,0xc0000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pResult3= {0xa1f0,0xc0000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};


    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_copy(&Result0_c, &pA0);
    Fr_copy(&Result1_c, &pA1);
    Fr_copy(&Result2_c, &pA2);
    Fr_copy(&Result3_c, &pA3);

    compare_Result(&pResult0, &Result0_c, &pA0, &pA0, 0, "Fr_copy_unit_test");
    compare_Result(&pResult1, &Result1_c, &pA1, &pA1, 1, "Fr_copy_unit_test");
    compare_Result(&pResult2, &Result2_c, &pA2, &pA2, 2, "Fr_copy_unit_test");
    compare_Result(&pResult3, &Result3_c, &pA3, &pA3, 3, "Fr_copy_unit_test");
}

void Fr_copyn_unit_test()
{
    //Fr_copy_test 0:
    FrElement pA0= {0xa1f0,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pResult0= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_copy_test 1:
    FrElement pA1= {0xa1f0,0x40000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pResult1= {0xa1f0,0x40000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    //Fr_copy_test 2:
    FrElement pA2= {0xa1f0,0x80000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pResult2= {0xa1f0,0x80000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    //Fr_copy_test 3:
    FrElement pA3= {0xa1f0,0xc0000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pResult3= {0x0,0x0,{0x0,0x0,0x0,0x0}};


    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_copyn(&Result0_c, &pA0,0);
    Fr_copyn(&Result1_c, &pA1,1);
    Fr_copyn(&Result2_c, &pA2,1);
    Fr_copyn(&Result3_c, &pA3,0);

    compare_Result(&pResult0, &Result0_c, &pA0, &pA0, 0, "Fr_copyn_unit_test");
    compare_Result(&pResult1, &Result1_c, &pA1, &pA1, 1, "Fr_copyn_unit_test");
    compare_Result(&pResult2, &Result2_c, &pA2, &pA2, 2, "Fr_copyn_unit_test");
    compare_Result(&pResult3, &Result3_c, &pA3, &pA3, 3, "Fr_copyn_unit_test");
}



void Fr_toNormal_unit_test()
{
    //Fr_toNormal_test 0:
    FrElement pA0= {0xa1f0,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pResult0= {0xa1f0,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    //Fr_toNormal_test 1:
    FrElement pA1= {0xa1f0,0x40000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pResult1= {0xa1f0,0x40000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    //Fr_toNormal_test 2:
    FrElement pA2= {0xa1f0,0x80000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pResult2= {0xa1f0,0x80000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    //Fr_toNormal_test 3:
    FrElement pA3= {0xa1f0,0xc0000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pResult3= {0x0,0x80000000,{0x55b425913927735a,0xa3ac6d7389307a4d,0x543d3ec42a2529ae,0x256e51ca1fcef59b}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_toNormal(&Result0_c, &pA0);
    Fr_toNormal(&Result1_c, &pA1);
    Fr_toNormal(&Result2_c, &pA2);
    Fr_toNormal(&Result3_c, &pA3);

    compare_Result(&pResult0, &Result0_c, &pA0, &pA0, 0, "Fr_toNormal_unit_test");
    compare_Result(&pResult1, &Result1_c, &pA1, &pA1, 1, "Fr_toNormal_unit_test");
    compare_Result(&pResult2, &Result2_c, &pA2, &pA2, 2, "Fr_toNormal_unit_test");
    compare_Result(&pResult3, &Result3_c, &pA3, &pA3, 3, "Fr_toNormal_unit_test");
}

void Fr_mul_s1s2_unit_test()
{
    //Fr_mul_s1s2_test 0:
    FrElement pA_s1s20= {0x1,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_s1s20= {0x2,0x0,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_s1s20= {0x0,0x80000000,{0x2,0x0,0x0,0x0}};
    //Fr_mul_s1s2_test 1:
    FrElement pA_s1s21= {0x0,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_s1s21= {0x2,0x0,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_s1s21= {0x0,0x80000000,{0x0,0x0,0x0,0x0}};
    //Fr_mul_s1s2_test 2:
    FrElement pA_s1s22= {0xa1f0,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_s1s22= {0x1bb8,0x0,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_s1s22= {0x0,0x80000000,{0x1188b480,0x0,0x0,0x0}};
    //Fr_mul_s1s2_test 3:
    FrElement pA_s1s23= {0x7fffffff,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_s1s23= {0x7fffffff,0x0,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_s1s23= {0x0,0x80000000,{0x3fffffff00000001,0x0,0x0,0x0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_mul(&Result0_c, &pA_s1s20, &pB_s1s20);
    Fr_mul(&Result1_c, &pA_s1s21, &pB_s1s21);
    Fr_mul(&Result2_c, &pA_s1s22, &pB_s1s22);
    Fr_mul(&Result3_c, &pA_s1s23, &pB_s1s23);

    compare_Result(&pResult_s1s20, &Result0_c, &pA_s1s20, &pB_s1s20, 0, "Fr_mul_s1s2_unit_test");
    compare_Result(&pResult_s1s21, &Result1_c, &pA_s1s21, &pB_s1s21, 1, "Fr_mul_s1s2_unit_test");
    compare_Result(&pResult_s1s22, &Result2_c, &pA_s1s22, &pB_s1s22, 2, "Fr_mul_s1s2_unit_test");
    compare_Result(&pResult_s1s23, &Result3_c, &pA_s1s23, &pB_s1s23, 3, "Fr_mul_s1s2_unit_test");
}

void Fr_mul_l1nl2n_unit_test()
{
    //Fr_mul_l1nl2n_test 0:
    FrElement pA_l1nl2n0= {0x1,0x80000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_l1nl2n0= {0x2,0x80000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1nl2n0= {0x0,0xc0000000,{0x592c68389ffffff6,0x6df8ed2b3ec19a53,0xccdd46def0f28c5c,0x1c14ef83340fbe5e}};
    //Fr_mul_l1nl2n_test 1:
    FrElement pA_l1nl2n1= {0x0,0x80000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_l1nl2n1= {0x2,0x80000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1nl2n1= {0x0,0xc0000000,{0x0,0x0,0x0,0x0}};
    //Fr_mul_l1nl2n_test 2:
    FrElement pA_l1nl2n2= {0xa1f0,0x80000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_l1nl2n2= {0x1bb8,0x80000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_l1nl2n2= {0x0,0xc0000000,{0x1497892315a07fe1,0x930f99e96b3b9535,0x73b1e28430b17066,0x29e821cd214b6d6b}};
    //Fr_mul_l1nl2n_test 3:
    FrElement pA_l1nl2n3= {0xffff,0x80000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_l1nl2n3= {0xffff,0x80000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_l1nl2n3= {0x0,0xc0000000,{0x19094ca438fc19d0,0x4f1502bc99846068,0x5cc3236f2303a977,0x17808a731cd75a48}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_mul(&Result0_c, &pA_l1nl2n0, &pB_l1nl2n0);
    Fr_mul(&Result1_c, &pA_l1nl2n1, &pB_l1nl2n1);
    Fr_mul(&Result2_c, &pA_l1nl2n2, &pB_l1nl2n2);
    Fr_mul(&Result3_c, &pA_l1nl2n3, &pB_l1nl2n3);

    compare_Result(&pResult_l1nl2n0, &Result0_c, &pA_l1nl2n0, &pB_l1nl2n0, 0, "Fr_mul_l1nl2n_unit_test");
    compare_Result(&pResult_l1nl2n1, &Result1_c, &pA_l1nl2n1, &pB_l1nl2n1, 1, "Fr_mul_l1nl2n_unit_test");
    compare_Result(&pResult_l1nl2n2, &Result2_c, &pA_l1nl2n2, &pB_l1nl2n2, 2, "Fr_mul_l1nl2n_unit_test");
    compare_Result(&pResult_l1nl2n3, &Result3_c, &pA_l1nl2n3, &pB_l1nl2n3, 3, "Fr_mul_l1nl2n_unit_test");
}

void Fr_mul_l1ml2n_unit_test()
{
    //Fr_mul_l1ml2n_test 0:
    FrElement pA_l1ml2n0= {0x1,0xc0000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_l1ml2n0= {0x2,0x80000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ml2n0= {0x0,0x80000000,{0xb8b7400adb62329c,0x121deb53c223d90f,0x904c1bc95d70baba,0x2bd7f2a3058aaa39}};
    //Fr_mul_l1ml2n_test 1:
    FrElement pA_l1ml2n1= {0x0,0xc0000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_l1ml2n1= {0x2,0x80000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ml2n1= {0x0,0x80000000,{0x0,0x0,0x0,0x0}};
    //Fr_mul_l1ml2n_test 2:
    FrElement pA_l1ml2n2= {0xa1f0,0xc0000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_l1ml2n2= {0x1bb8,0x80000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_l1ml2n2= {0x0,0x80000000,{0xcba5e0bbd0000003,0x789bb8d96d2c51b3,0x28f0d12384840917,0x112ceb58a394e07d}};
    //Fr_mul_l1ml2n_test 3:
    FrElement pA_l1ml2n3= {0xffff,0xc0000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_l1ml2n3= {0xffff,0x80000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_l1ml2n3= {0x0,0x80000000,{0xdea6a001d841e408,0xffd01934b5bef5d1,0xedc4ef0cf4a2b471,0x1d8f65bdb91d796f}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_mul(&Result0_c, &pA_l1ml2n0, &pB_l1ml2n0);
    Fr_mul(&Result1_c, &pA_l1ml2n1, &pB_l1ml2n1);
    Fr_mul(&Result2_c, &pA_l1ml2n2, &pB_l1ml2n2);
    Fr_mul(&Result3_c, &pA_l1ml2n3, &pB_l1ml2n3);

    compare_Result(&pResult_l1ml2n0, &Result0_c,&pA_l1ml2n0, &pB_l1ml2n0, 0, "Fr_mul_l1ml2n_unit_test");
    compare_Result(&pResult_l1ml2n1, &Result1_c,&pA_l1ml2n1, &pB_l1ml2n1, 1, "Fr_mul_l1ml2n_unit_test");
    compare_Result(&pResult_l1ml2n2, &Result2_c,&pA_l1ml2n2, &pB_l1ml2n2, 2, "Fr_mul_l1ml2n_unit_test");
    compare_Result(&pResult_l1ml2n3, &Result3_c,&pA_l1ml2n3, &pB_l1ml2n3, 3, "Fr_mul_l1ml2n_unit_test");
}

void Fr_mul_l1ml2m_unit_test()
{
    //Fr_mul_l1ml2m_test 0:
    FrElement pA_l1ml2m0= {0x1,0xc0000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_l1ml2m0= {0x2,0xc0000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ml2m0= {0x0,0xc0000000,{0xb8b7400adb62329c,0x121deb53c223d90f,0x904c1bc95d70baba,0x2bd7f2a3058aaa39}};
    //Fr_mul_l1ml2m_test 1:
    FrElement pA_l1ml2m1= {0x0,0xc0000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_l1ml2m1= {0x2,0xc0000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ml2m1= {0x0,0xc0000000,{0x0,0x0,0x0,0x0}};
    //Fr_mul_l1ml2m_test 2:
    FrElement pA_l1ml2m2= {0xa1f0,0xc0000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_l1ml2m2= {0x1bb8,0xc0000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_l1ml2m2= {0x0,0xc0000000,{0xcba5e0bbd0000003,0x789bb8d96d2c51b3,0x28f0d12384840917,0x112ceb58a394e07d}};
    //Fr_mul_l1ml2m_test 3:
    FrElement pA_l1ml2m3= {0xffff,0xc0000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_l1ml2m3= {0xffff,0xc0000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_l1ml2m3= {0x0,0xc0000000,{0xdea6a001d841e408,0xffd01934b5bef5d1,0xedc4ef0cf4a2b471,0x1d8f65bdb91d796f}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_mul(&Result0_c, &pA_l1ml2m0, &pB_l1ml2m0);
    Fr_mul(&Result1_c, &pA_l1ml2m1, &pB_l1ml2m1);
    Fr_mul(&Result2_c, &pA_l1ml2m2, &pB_l1ml2m2);
    Fr_mul(&Result3_c, &pA_l1ml2m3, &pB_l1ml2m3);

    compare_Result(&pResult_l1ml2m0, &Result0_c,&pA_l1ml2m0, &pB_l1ml2m0, 0, "Fr_mul_l1ml2m_unit_test");
    compare_Result(&pResult_l1ml2m1, &Result1_c,&pA_l1ml2m1, &pB_l1ml2m1, 1, "Fr_mul_l1ml2m_unit_test");
    compare_Result(&pResult_l1ml2m2, &Result2_c,&pA_l1ml2m2, &pB_l1ml2m2, 2, "Fr_mul_l1ml2m_unit_test");
    compare_Result(&pResult_l1ml2m3, &Result3_c,&pA_l1ml2m3, &pB_l1ml2m3, 3, "Fr_mul_l1ml2m_unit_test");
}

void Fr_mul_l1nl2m_unit_test()
{
    //Fr_mul_l1nl2m_test 0:
    FrElement pA_l1nl2m0= {0x1,0x80000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_l1nl2m0= {0x2,0xc0000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1nl2m0= {0x0,0x80000000,{0xb8b7400adb62329c,0x121deb53c223d90f,0x904c1bc95d70baba,0x2bd7f2a3058aaa39}};
    //Fr_mul_l1nl2m_test 1:
    FrElement pA_l1nl2m1= {0x0,0x80000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_l1nl2m1= {0x2,0xc0000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1nl2m1= {0x0,0x80000000,{0x0,0x0,0x0,0x0}};
    //Fr_mul_l1nl2m_test 2:
    FrElement pA_l1nl2m2= {0xa1f0,0x80000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_l1nl2m2= {0x1bb8,0xc0000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_l1nl2m2= {0x0,0x80000000,{0xcba5e0bbd0000003,0x789bb8d96d2c51b3,0x28f0d12384840917,0x112ceb58a394e07d}};
    //Fr_mul_l1nl2m_test 3:
    FrElement pA_l1nl2m3= {0xffff,0x80000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_l1nl2m3= {0xffff,0xc0000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_l1nl2m3= {0x0,0x80000000,{0xdea6a001d841e408,0xffd01934b5bef5d1,0xedc4ef0cf4a2b471,0x1d8f65bdb91d796f}};
    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_mul(&Result0_c, &pA_l1nl2m0, &pB_l1nl2m0);
    Fr_mul(&Result1_c, &pA_l1nl2m1, &pB_l1nl2m1);
    Fr_mul(&Result2_c, &pA_l1nl2m2, &pB_l1nl2m2);
    Fr_mul(&Result3_c, &pA_l1nl2m3, &pB_l1nl2m3);

    compare_Result(&pResult_l1nl2m0, &Result0_c,&pA_l1nl2m0, &pB_l1nl2m0, 0, "Fr_mul_l1nl2m_unit_test");
    compare_Result(&pResult_l1nl2m1, &Result1_c,&pA_l1nl2m1, &pB_l1nl2m1, 1, "Fr_mul_l1nl2m_unit_test");
    compare_Result(&pResult_l1nl2m2, &Result2_c,&pA_l1nl2m2, &pB_l1nl2m2, 2, "Fr_mul_l1nl2m_unit_test");
    compare_Result(&pResult_l1nl2m3, &Result3_c,&pA_l1nl2m3, &pB_l1nl2m3, 3, "Fr_mul_l1nl2m_unit_test");
}

void Fr_mul_l1ns2n_unit_test()
{
    //Fr_mul_l1ns2n_test 0:
    FrElement pA_l1ns2n0= {0x1,0x80000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_l1ns2n0= {0x2,0x0,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ns2n0= {0x0,0xc0000000,{0x592c68389ffffff6,0x6df8ed2b3ec19a53,0xccdd46def0f28c5c,0x1c14ef83340fbe5e}};
    //Fr_mul_l1ns2n_test 1:
    FrElement pA_l1ns2n1= {0x0,0x80000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_l1ns2n1= {0x2,0x0,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ns2n1= {0x0,0xc0000000,{0x0,0x0,0x0,0x0}};
    //Fr_mul_l1ns2n_test 2:
    FrElement pA_l1ns2n2= {0xa1f0,0x80000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_l1ns2n2= {0x1bb8,0x0,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_l1ns2n2= {0x0,0xc0000000,{0x2d67d8d2e0004952,0xaddd11ecde7f7ae3,0xed975f635da0de4d,0x1a7fe303489132eb}};
    //Fr_mul_l1ns2n_test 3:
    FrElement pA_l1ns2n3= {0x7fffffff,0x80000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_l1ns2n3= {-1,0x0,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_l1ns2n3= {0x0,0xc0000000,{0x90dd4dd6a1de9254,0xe2fe3be3bc047346,0xda25203224bdc5a8,0xbf3a7101ab99a89}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_mul(&Result0_c, &pA_l1ns2n0, &pB_l1ns2n0);
    Fr_mul(&Result1_c, &pA_l1ns2n1, &pB_l1ns2n1);
    Fr_mul(&Result2_c, &pA_l1ns2n2, &pB_l1ns2n2);
    Fr_mul(&Result3_c, &pA_l1ns2n3, &pB_l1ns2n3);

    compare_Result(&pResult_l1ns2n0, &Result0_c,&pA_l1ns2n0, &pB_l1ns2n0, 0, "Fr_mul_l1ns2n_unit_test");
    compare_Result(&pResult_l1ns2n1, &Result1_c,&pA_l1ns2n1, &pB_l1ns2n1, 1, "Fr_mul_l1ns2n_unit_test");
    compare_Result(&pResult_l1ns2n2, &Result2_c,&pA_l1ns2n2, &pB_l1ns2n2, 2, "Fr_mul_l1ns2n_unit_test");
    compare_Result(&pResult_l1ns2n3, &Result3_c,&pA_l1ns2n3, &pB_l1ns2n3, 3, "Fr_mul_l1ns2n_unit_test");
}

void Fr_mul_s1nl2n_unit_test()
{
    //Fr_mul_s1nl2n_test 0:
    FrElement pA_s1nl2n0= {0x1,0x0,{0x1,0x0,0x0,0x0}};
    FrElement pB_s1nl2n0= {0x2,0x80000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_s1nl2n0= {0x0,0xc0000000,{0x592c68389ffffff6,0x6df8ed2b3ec19a53,0xccdd46def0f28c5c,0x1c14ef83340fbe5e}};
    //Fr_mul_s1nl2n_test 1:
    FrElement pA_s1nl2n1= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    FrElement pB_s1nl2n1= {0x2,0x80000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_s1nl2n1= {0x0,0xc0000000,{0x0,0x0,0x0,0x0}};
    //Fr_mul_s1nl2n_test 2:
    FrElement pA_s1nl2n2= {0xa1f0,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_s1nl2n2= {0x1bb8,0x80000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_s1nl2n2= {0x0,0xc0000000,{0x3c79e7002385099,0x69bfe0da5a608f7b,0x3dbd93ce32b4e2b3,0x773561b6a940451}};
    //Fr_mul_s1nl2n_test 3:
    FrElement pA_s1nl2n3= {-1,0x0,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_s1nl2n3= {0x7fffffff,0x80000000,{0x7fffffffffffffff,0x7fffffffffffffff,0x7fffffffffffffff,0x7fffffffffffffff}};
    FrElement pResult_s1nl2n3= {0x0,0xc0000000,{0x7c8b07120fa19dd4,0x19b02d60cfbeb467,0xe1f374b7a57d8ed5,0x22a83208b264056d}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_mul(&Result0_c, &pA_s1nl2n0, &pB_s1nl2n0);
    Fr_mul(&Result1_c, &pA_s1nl2n1, &pB_s1nl2n1);
    Fr_mul(&Result2_c, &pA_s1nl2n2, &pB_s1nl2n2);
    Fr_mul(&Result3_c, &pA_s1nl2n3, &pB_s1nl2n3);

    compare_Result(&pResult_s1nl2n0, &Result0_c,&pA_s1nl2n0, &pB_s1nl2n0, 0, "Fr_mul_s1nl2n_unit_test");
    compare_Result(&pResult_s1nl2n1, &Result1_c,&pA_s1nl2n1, &pB_s1nl2n1, 1, "Fr_mul_s1nl2n_unit_test");
    compare_Result(&pResult_s1nl2n2, &Result2_c,&pA_s1nl2n2, &pB_s1nl2n2, 2, "Fr_mul_s1nl2n_unit_test");
    compare_Result(&pResult_s1nl2n3, &Result3_c,&pA_s1nl2n3, &pB_s1nl2n3, 3, "Fr_mul_s1nl2n_unit_test");
}

void Fr_mul_s1nl2m_unit_test()
{
    //Fr_mul_s1nl2m_test 0:
    FrElement pA_s1nl2m0= {0x1,0x0,{0x1,0x0,0x0,0x0}};
    FrElement pB_s1nl2m0= {0x2,0xc0000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_s1nl2m0= {0x0,0x80000000,{0xb8b7400adb62329c,0x121deb53c223d90f,0x904c1bc95d70baba,0x2bd7f2a3058aaa39}};
    //Fr_mul_s1nl2m_test 1:
    FrElement pA_s1nl2m1= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    FrElement pB_s1nl2m1= {0x2,0xc0000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_s1nl2m1= {0x0,0x80000000,{0x0,0x0,0x0,0x0}};
    //Fr_mul_s1nl2m_test 2:
    FrElement pA_s1nl2m2= {0xa1f0,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_s1nl2m2= {0x1bb8,0xc0000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_s1nl2m2= {0x0,0x80000000,{0xd708561abffca754,0x6c6d984a2702a36a,0xc0f6e8587da122fb,0x164b29d2c31ce3ab}};
    //Fr_mul_s1nl2m_test 3:
    FrElement pA_s1nl2m3= {-1,0x0,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_s1nl2m3= {0x7fffffff,0xc0000000,{0x7fffffffffffffff,0x7fffffffffffffff,0x7fffffffffffffff,0x7fffffffffffffff}};
    FrElement pResult_s1nl2m3= {0x0,0x80000000,{0xab57780eac37ddd2,0x9ffb06c643291bf,0xb327f5cb01f66c9e,0x2f40c4dcc2ed6d85}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_mul(&Result0_c, &pA_s1nl2m0, &pB_s1nl2m0);
    Fr_mul(&Result1_c, &pA_s1nl2m1, &pB_s1nl2m1);
    Fr_mul(&Result2_c, &pA_s1nl2m2, &pB_s1nl2m2);
    Fr_mul(&Result3_c, &pA_s1nl2m3, &pB_s1nl2m3);

    compare_Result(&pResult_s1nl2m0, &Result0_c,&pA_s1nl2m0, &pB_s1nl2m0, 0, "Fr_mul_s1nl2m_unit_test");
    compare_Result(&pResult_s1nl2m1, &Result1_c,&pA_s1nl2m1, &pB_s1nl2m1, 1, "Fr_mul_s1nl2m_unit_test");
    compare_Result(&pResult_s1nl2m2, &Result2_c,&pA_s1nl2m2, &pB_s1nl2m2, 2, "Fr_mul_s1nl2m_unit_test");
    compare_Result(&pResult_s1nl2m3, &Result3_c,&pA_s1nl2m3, &pB_s1nl2m3, 3, "Fr_mul_s1nl2m_unit_test");
}

void Fr_mul_l1ms2n_unit_test()
{
    //Fr_mul_l1ms2n_test 0:
    FrElement pA_l1ms2n0= {0x1,0xc0000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_l1ms2n0= {0x2,0x0,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ms2n0= {0x0,0x80000000,{0xb8b7400adb62329c,0x121deb53c223d90f,0x904c1bc95d70baba,0x2bd7f2a3058aaa39}};
    //Fr_mul_l1ms2n_test 1:
    FrElement pA_l1ms2n1= {0x0,0xc0000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_l1ms2n1= {0x2,0x0,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ms2n1= {0x0,0x80000000,{0x0,0x0,0x0,0x0}};
    //Fr_mul_l1ms2n_test 2:
    FrElement pA_l1ms2n2= {0xa1f0,0xc0000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_l1ms2n2= {0x1bb8,0x0,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_l1ms2n2= {0x0,0x80000000,{0x5d70bdff3d855140,0xfab648d14060e580,0xc8cd54f7f14513ba,0x23995be618ce6b27}};
    //Fr_mul_l1ms2n_test 3:
    FrElement pA_l1ms2n3= {0xffff,0xc0000000,{0x7fffffffffffffff,0x7fffffffffffffff,0x7fffffffffffffff,0x7fffffffffffffff}};
    FrElement pB_l1ms2n3= {-1,0x0,{0x7fffffffffffffff,0x7fffffffffffffff,0x7fffffffffffffff,0x7fffffffffffffff}};
    FrElement pResult_l1ms2n3= {0x0,0x80000000,{0xab57780eac37ddd2,0x9ffb06c643291bf,0xb327f5cb01f66c9e,0x2f40c4dcc2ed6d85}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_mul(&Result0_c, &pA_l1ms2n0, &pB_l1ms2n0);
    Fr_mul(&Result1_c, &pA_l1ms2n1, &pB_l1ms2n1);
    Fr_mul(&Result2_c, &pA_l1ms2n2, &pB_l1ms2n2);
    Fr_mul(&Result3_c, &pA_l1ms2n3, &pB_l1ms2n3);

    compare_Result(&pResult_l1ms2n0, &Result0_c,&pA_l1ms2n0, &pB_l1ms2n0, 0, "Fr_mul_l1ms2n_unit_test");
    compare_Result(&pResult_l1ms2n1, &Result1_c,&pA_l1ms2n1, &pB_l1ms2n1, 1, "Fr_mul_l1ms2n_unit_test");
    compare_Result(&pResult_l1ms2n2, &Result2_c,&pA_l1ms2n2, &pB_l1ms2n2, 2, "Fr_mul_l1ms2n_unit_test");
    compare_Result(&pResult_l1ms2n3, &Result3_c,&pA_l1ms2n3, &pB_l1ms2n3, 3, "Fr_mul_l1ms2n_unit_test");
}

void Fr_mul_l1ns2m_unit_test()
{
    //Fr_mul_l1ns2m_test 0:
    FrElement pA_l1ns2m0= {0x1,0x80000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_l1ns2m0= {0x2,0x40000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ns2m0= {0x0,0x80000000,{0xb8b7400adb62329c,0x121deb53c223d90f,0x904c1bc95d70baba,0x2bd7f2a3058aaa39}};
    //Fr_mul_l1ns2m_test 1:
    FrElement pA_l1ns2m1= {0x0,0x80000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_l1ns2m1= {0x2,0x40000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ns2m1= {0x0,0x80000000,{0x0,0x0,0x0,0x0}};
    //Fr_mul_l1ns2m_test 2:
    FrElement pA_l1ns2m2= {0xa1f0,0x80000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_l1ns2m2= {0x1bb8,0x40000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_l1ns2m2= {0x0,0x80000000,{0xcba5e0bbd0000003,0x789bb8d96d2c51b3,0x28f0d12384840917,0x112ceb58a394e07d}};
    //Fr_mul_l1ns2m_test 3:
    FrElement pA_l1ns2m3= {0xffff,0x80000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_l1ns2m3= {0xffff,0x40000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_l1ns2m3= {0x0,0x80000000,{0xdea6a001d841e408,0xffd01934b5bef5d1,0xedc4ef0cf4a2b471,0x1d8f65bdb91d796f}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_mul(&Result0_c, &pA_l1ns2m0, &pB_l1ns2m0);
    Fr_mul(&Result1_c, &pA_l1ns2m1, &pB_l1ns2m1);
    Fr_mul(&Result2_c, &pA_l1ns2m2, &pB_l1ns2m2);
    Fr_mul(&Result3_c, &pA_l1ns2m3, &pB_l1ns2m3);

    compare_Result(&pResult_l1ns2m0, &Result0_c,&pA_l1ns2m0, &pB_l1ns2m0, 0, "Fr_mul_l1ns2m_unit_test");
    compare_Result(&pResult_l1ns2m1, &Result1_c,&pA_l1ns2m1, &pB_l1ns2m1, 1, "Fr_mul_l1ns2m_unit_test");
    compare_Result(&pResult_l1ns2m2, &Result2_c,&pA_l1ns2m2, &pB_l1ns2m2, 2, "Fr_mul_l1ns2m_unit_test");
    compare_Result(&pResult_l1ns2m3, &Result3_c,&pA_l1ns2m3, &pB_l1ns2m3, 3, "Fr_mul_l1ns2m_unit_test");
}

void Fr_mul_l1ms2m_unit_test()
{
    //Fr_mul_l1ms2m_test 0:
    FrElement pA_l1ms2m0= {0x1,0xc0000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_l1ms2m0= {0x2,0x40000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ms2m0= {0x0,0xc0000000,{0xb8b7400adb62329c,0x121deb53c223d90f,0x904c1bc95d70baba,0x2bd7f2a3058aaa39}};
    //Fr_mul_l1ms2m_test 1:
    FrElement pA_l1ms2m1= {0x0,0xc0000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_l1ms2m1= {0x2,0x40000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ms2m1= {0x0,0xc0000000,{0x0,0x0,0x0,0x0}};
    //Fr_mul_l1ms2m_test 2:
    FrElement pA_l1ms2m2= {0xa1f0,0xc0000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_l1ms2m2= {0x1bb8,0x40000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_l1ms2m2= {0x0,0xc0000000,{0xcba5e0bbd0000003,0x789bb8d96d2c51b3,0x28f0d12384840917,0x112ceb58a394e07d}};
    //Fr_mul_l1ms2m_test 3:
    FrElement pA_l1ms2m3= {0xffff,0xc0000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_l1ms2m3= {0xffff,0x40000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_l1ms2m3= {0x0,0xc0000000,{0xdea6a001d841e408,0xffd01934b5bef5d1,0xedc4ef0cf4a2b471,0x1d8f65bdb91d796f}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_mul(&Result0_c, &pA_l1ms2m0, &pB_l1ms2m0);
    Fr_mul(&Result1_c, &pA_l1ms2m1, &pB_l1ms2m1);
    Fr_mul(&Result2_c, &pA_l1ms2m2, &pB_l1ms2m2);
    Fr_mul(&Result3_c, &pA_l1ms2m3, &pB_l1ms2m3);

    compare_Result(&pResult_l1ms2m0, &Result0_c,&pA_l1ms2m0, &pB_l1ms2m0, 0, "Fr_mul_l1ms2m_unit_test");
    compare_Result(&pResult_l1ms2m1, &Result1_c,&pA_l1ms2m1, &pB_l1ms2m1, 1, "Fr_mul_l1ms2m_unit_test");
    compare_Result(&pResult_l1ms2m2, &Result2_c,&pA_l1ms2m2, &pB_l1ms2m2, 2, "Fr_mul_l1ms2m_unit_test");
    compare_Result(&pResult_l1ms2m3, &Result3_c,&pA_l1ms2m3, &pB_l1ms2m3, 3, "Fr_mul_l1ms2m_unit_test");
}

void Fr_mul_s1ml2m_unit_test()
{
    //Fr_mul_s1ml2m_test 0:
    FrElement pA_s1ml2m0= {0x1,0x40000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_s1ml2m0= {0x2,0xc0000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_s1ml2m0= {0x0,0xc0000000,{0xb8b7400adb62329c,0x121deb53c223d90f,0x904c1bc95d70baba,0x2bd7f2a3058aaa39}};
    //Fr_mul_s1ml2m_test 1:
    FrElement pA_s1ml2m1= {0x0,0x40000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_s1ml2m1= {0x2,0xc0000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_s1ml2m1= {0x0,0xc0000000,{0x0,0x0,0x0,0x0}};
    //Fr_mul_s1ml2m_test 2:
    FrElement pA_s1ml2m2= {0xa1f0,0x40000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_s1ml2m2= {0x1bb8,0xc0000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_s1ml2m2= {0x0,0xc0000000,{0xcba5e0bbd0000003,0x789bb8d96d2c51b3,0x28f0d12384840917,0x112ceb58a394e07d}};
    //Fr_mul_s1ml2m_test 3:
    FrElement pA_s1ml2m3= {0xffff,0x40000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_s1ml2m3= {0xffff,0xc0000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_s1ml2m3= {0x0,0xc0000000,{0xdea6a001d841e408,0xffd01934b5bef5d1,0xedc4ef0cf4a2b471,0x1d8f65bdb91d796f}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_mul(&Result0_c, &pA_s1ml2m0, &pB_s1ml2m0);
    Fr_mul(&Result1_c, &pA_s1ml2m1, &pB_s1ml2m1);
    Fr_mul(&Result2_c, &pA_s1ml2m2, &pB_s1ml2m2);
    Fr_mul(&Result3_c, &pA_s1ml2m3, &pB_s1ml2m3);

    compare_Result(&pResult_s1ml2m0, &Result0_c,&pA_s1ml2m0, &pB_s1ml2m0, 0, "Fr_mul_s1ml2m_unit_test");
    compare_Result(&pResult_s1ml2m1, &Result1_c,&pA_s1ml2m1, &pB_s1ml2m1, 1, "Fr_mul_s1ml2m_unit_test");
    compare_Result(&pResult_s1ml2m2, &Result2_c,&pA_s1ml2m2, &pB_s1ml2m2, 2, "Fr_mul_s1ml2m_unit_test");
    compare_Result(&pResult_s1ml2m3, &Result3_c,&pA_s1ml2m3, &pB_s1ml2m3, 3, "Fr_mul_s1ml2m_unit_test");
}

void Fr_mul_s1ml2n_unit_test()
{
    //Fr_mul_s1ml2n_test 0:
    FrElement pA_s1ml2n0= {0x1,0x40000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_s1ml2n0= {0x2,0x80000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_s1ml2n0= {0x0,0x80000000,{0xb8b7400adb62329c,0x121deb53c223d90f,0x904c1bc95d70baba,0x2bd7f2a3058aaa39}};
    //Fr_mul_s1ml2n_test 1:
    FrElement pA_s1ml2n1= {0x0,0x40000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_s1ml2n1= {0x2,0x80000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_s1ml2n1= {0x0,0x80000000,{0x0,0x0,0x0,0x0}};
    //Fr_mul_s1ml2n_test 2:
    FrElement pA_s1ml2n2= {0xa1f0,0x40000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_s1ml2n2= {0x1bb8,0x80000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_s1ml2n2= {0x0,0x80000000,{0xcba5e0bbd0000003,0x789bb8d96d2c51b3,0x28f0d12384840917,0x112ceb58a394e07d}};
    //Fr_mul_s1ml2n_test 3:
    FrElement pA_s1ml2n3= {0xffff,0x40000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_s1ml2n3= {0xffff,0x80000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_s1ml2n3= {0x0,0x80000000,{0xdea6a001d841e408,0xffd01934b5bef5d1,0xedc4ef0cf4a2b471,0x1d8f65bdb91d796f}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_mul(&Result0_c, &pA_s1ml2n0, &pB_s1ml2n0);
    Fr_mul(&Result1_c, &pA_s1ml2n1, &pB_s1ml2n1);
    Fr_mul(&Result2_c, &pA_s1ml2n2, &pB_s1ml2n2);
    Fr_mul(&Result3_c, &pA_s1ml2n3, &pB_s1ml2n3);

    compare_Result(&pResult_s1ml2n0, &Result0_c,&pA_s1ml2n0, &pB_s1ml2n0, 0, "Fr_mul_s1ml2n_unit_test");
    compare_Result(&pResult_s1ml2n1, &Result1_c,&pA_s1ml2n1, &pB_s1ml2n1, 1, "Fr_mul_s1ml2n_unit_test");
    compare_Result(&pResult_s1ml2n2, &Result2_c,&pA_s1ml2n2, &pB_s1ml2n2, 2, "Fr_mul_s1ml2n_unit_test");
    compare_Result(&pResult_s1ml2n3, &Result3_c,&pA_s1ml2n3, &pB_s1ml2n3, 3, "Fr_mul_s1ml2n_unit_test");
}

void Fr_sub_s1s2_unit_test()
{
    //Fr_sub_s1s2_test 0:
    FrElement pA_s1s20= {0x1,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_s1s20= {0x2,0x0,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_s1s20= {-1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_sub_s1s2_test 1:
    FrElement pA_s1s21= {0x0,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_s1s21= {0x2,0x0,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_s1s21= {-2,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_sub_s1s2_test 2:
    FrElement pA_s1s22= {0xa1f0,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_s1s22= {0x1bb8,0x0,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_s1s22= {0x8638,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_sub_s1s2_test 3:
    FrElement pA_s1s23= {0x7fffffff,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_s1s23= {0x7fffffff,0x0,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_s1s23= {0x0,0x0,{0x0,0x0,0x0,0x0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_sub(&Result0_c, &pA_s1s20, &pB_s1s20);
    Fr_sub(&Result1_c, &pA_s1s21, &pB_s1s21);
    Fr_sub(&Result2_c, &pA_s1s22, &pB_s1s22);
    Fr_sub(&Result3_c, &pA_s1s23, &pB_s1s23);

    compare_Result(&pResult_s1s20, &Result0_c,&pA_s1s20, &pB_s1s20, 0, "Fr_sub_s1s2_unit_test");
    compare_Result(&pResult_s1s21, &Result1_c,&pA_s1s21, &pB_s1s21, 1, "Fr_sub_s1s2_unit_test");
    compare_Result(&pResult_s1s22, &Result2_c,&pA_s1s22, &pB_s1s22, 2, "Fr_sub_s1s2_unit_test");
    compare_Result(&pResult_s1s23, &Result3_c,&pA_s1s23, &pB_s1s23, 3, "Fr_sub_s1s2_unit_test");
}

void Fr_sub_l1nl2n_unit_test()
{
    //Fr_sub_l1nl2n_test 0:
    FrElement pA_l1nl2n0= {0x1,0x80000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_l1nl2n0= {0x2,0x80000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1nl2n0= {0x0,0x80000000,{0x43e1f593f0000000,0x2833e84879b97091,0xb85045b68181585d,0x30644e72e131a029}};
    //Fr_sub_l1nl2n_test 1:
    FrElement pA_l1nl2n1= {0x0,0x80000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_l1nl2n1= {0x2,0x80000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1nl2n1= {0x0,0x80000000,{0x43e1f593efffffff,0x2833e84879b97091,0xb85045b68181585d,0x30644e72e131a029}};
    //Fr_sub_l1nl2n_test 2:
    FrElement pA_l1nl2n2= {0xa1f0,0x80000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_l1nl2n2= {0x1bb8,0x80000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_l1nl2n2= {0x0,0x80000000,{0x8638148449de9259,0x401bb97259805e65,0x4fde9f9ded052ba9,0x161b5687f14a8b6f}};
    //Fr_sub_l1nl2n_test 3:
    FrElement pA_l1nl2n3= {0xffff,0x80000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_l1nl2n3= {0xffff,0x80000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_l1nl2n3= {0x0,0x80000000,{0x0,0x0,0x0,0x0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_sub(&Result0_c, &pA_l1nl2n0, &pB_l1nl2n0);
    Fr_sub(&Result1_c, &pA_l1nl2n1, &pB_l1nl2n1);
    Fr_sub(&Result2_c, &pA_l1nl2n2, &pB_l1nl2n2);
    Fr_sub(&Result3_c, &pA_l1nl2n3, &pB_l1nl2n3);

    compare_Result(&pResult_l1nl2n0, &Result0_c,&pA_l1nl2n0, &pB_l1nl2n0, 0, "Fr_sub_l1nl2n_unit_test");
    compare_Result(&pResult_l1nl2n1, &Result1_c,&pA_l1nl2n1, &pB_l1nl2n1, 1, "Fr_sub_l1nl2n_unit_test");
    compare_Result(&pResult_l1nl2n2, &Result2_c,&pA_l1nl2n2, &pB_l1nl2n2, 2, "Fr_sub_l1nl2n_unit_test");
    compare_Result(&pResult_l1nl2n3, &Result3_c,&pA_l1nl2n3, &pB_l1nl2n3, 3, "Fr_sub_l1nl2n_unit_test");
}

void Fr_sub_l1ml2n_unit_test()
{
    //Fr_sub_l1ml2n_test 0:
    FrElement pA_l1ml2n0= {0x1,0xc0000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_l1ml2n0= {0x2,0x80000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ml2n0= {0x0,0xc0000000,{0xeab58d5b5000000c,0xba3afb1d3af7d63d,0xeb72fed7908ecc00,0x144f5eefad21e1ca}};
    //Fr_sub_l1ml2n_test 1:
    FrElement pA_l1ml2n1= {0x0,0xc0000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_l1ml2n1= {0x2,0x80000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ml2n1= {0x0,0xc0000000,{0xeab58d5b5000000b,0xba3afb1d3af7d63d,0xeb72fed7908ecc00,0x144f5eefad21e1ca}};
    //Fr_sub_l1ml2n_test 2:
    FrElement pA_l1ml2n2= {0xa1f0,0xc0000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_l1ml2n2= {0x1bb8,0x80000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_l1ml2n2= {0x0,0xc0000000,{0x435c21e84340ffc0,0x69d157661fe10190,0x52eb5c769f20dc41,0xb39cdedf0cc6a98}};
    //Fr_sub_l1ml2n_test 3:
    FrElement pA_l1ml2n3= {0xffff,0xc0000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_l1ml2n3= {0xffff,0x80000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_l1ml2n3= {0x0,0xc0000000,{0x4cfb5842b1de9252,0xbaca539b424b02b5,0x21d4da7ba33c6d4b,0xdb8f589d3987fa60}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_sub(&Result0_c, &pA_l1ml2n0, &pB_l1ml2n0);
    Fr_sub(&Result1_c, &pA_l1ml2n1, &pB_l1ml2n1);
    Fr_sub(&Result2_c, &pA_l1ml2n2, &pB_l1ml2n2);
    Fr_sub(&Result3_c, &pA_l1ml2n3, &pB_l1ml2n3);

    compare_Result(&pResult_l1ml2n0, &Result0_c,&pA_l1ml2n0, &pB_l1ml2n0, 0, "Fr_sub_l1ml2n_unit_test");
    compare_Result(&pResult_l1ml2n1, &Result1_c,&pA_l1ml2n1, &pB_l1ml2n1, 1, "Fr_sub_l1ml2n_unit_test");
    compare_Result(&pResult_l1ml2n2, &Result2_c,&pA_l1ml2n2, &pB_l1ml2n2, 2, "Fr_sub_l1ml2n_unit_test");
    compare_Result(&pResult_l1ml2n3, &Result3_c,&pA_l1ml2n3, &pB_l1ml2n3, 3, "Fr_sub_l1ml2n_unit_test");
}

void Fr_sub_l1ml2m_unit_test()
{
    //Fr_sub_l1ml2m_test 0:
    FrElement pA_l1ml2m0= {0x1,0xc0000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_l1ml2m0= {0x2,0xc0000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ml2m0= {0x0,0xc0000000,{0x43e1f593f0000000,0x2833e84879b97091,0xb85045b68181585d,0x30644e72e131a029}};
    //Fr_sub_l1ml2m_test 1:
    FrElement pA_l1ml2m1= {0x0,0xc0000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_l1ml2m1= {0x2,0xc0000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ml2m1= {0x0,0xc0000000,{0x43e1f593efffffff,0x2833e84879b97091,0xb85045b68181585d,0x30644e72e131a029}};
    //Fr_sub_l1ml2m_test 2:
    FrElement pA_l1ml2m2= {0xa1f0,0xc0000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_l1ml2m2= {0x1bb8,0xc0000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_l1ml2m2= {0x0,0xc0000000,{0x8638148449de9259,0x401bb97259805e65,0x4fde9f9ded052ba9,0x161b5687f14a8b6f}};
    //Fr_sub_l1ml2m_test 3:
    FrElement pA_l1ml2m3= {0xffff,0xc0000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_l1ml2m3= {0xffff,0xc0000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_l1ml2m3= {0x0,0xc0000000,{0x0,0x0,0x0,0x0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_sub(&Result0_c, &pA_l1ml2m0, &pB_l1ml2m0);
    Fr_sub(&Result1_c, &pA_l1ml2m1, &pB_l1ml2m1);
    Fr_sub(&Result2_c, &pA_l1ml2m2, &pB_l1ml2m2);
    Fr_sub(&Result3_c, &pA_l1ml2m3, &pB_l1ml2m3);

    compare_Result(&pResult_l1ml2m0, &Result0_c,&pA_l1ml2m0, &pB_l1ml2m0, 0, "Fr_sub_l1ml2m_unit_test");
    compare_Result(&pResult_l1ml2m1, &Result1_c,&pA_l1ml2m1, &pB_l1ml2m1, 1, "Fr_sub_l1ml2m_unit_test");
    compare_Result(&pResult_l1ml2m2, &Result2_c,&pA_l1ml2m2, &pB_l1ml2m2, 2, "Fr_sub_l1ml2m_unit_test");
    compare_Result(&pResult_l1ml2m3, &Result3_c,&pA_l1ml2m3, &pB_l1ml2m3, 3, "Fr_sub_l1ml2m_unit_test");
}

void Fr_sub_l1nl2m_unit_test()
{
    //Fr_sub_l1nl2m_test 0:
    FrElement pA_l1nl2m0= {0x1,0x80000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_l1nl2m0= {0x2,0xc0000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1nl2m0= {0x0,0xc0000000,{0xac96341c4ffffff9,0x36fc76959f60cd29,0x666ea36f7879462e,0xe0a77c19a07df2f}};
    //Fr_sub_l1nl2m_test 1:
    FrElement pA_l1nl2m1= {0x0,0x80000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_l1nl2m1= {0x2,0xc0000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1nl2m1= {0x0,0xc0000000,{0x43e1f593efffffff,0x2833e84879b97091,0xb85045b68181585d,0x30644e72e131a029}};
    //Fr_sub_l1nl2m_test 2:
    FrElement pA_l1nl2m2= {0xa1f0,0x80000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_l1nl2m2= {0x1bb8,0xc0000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_l1nl2m2= {0x0,0xc0000000,{0xafecfa7621de925c,0x249d7e2789cff7d0,0x9ca74de630c88892,0xf161aa724469bd7}};
    //Fr_sub_l1nl2m_test 3:
    FrElement pA_l1nl2m3= {0xffff,0x80000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_l1nl2m3= {0xffff,0xc0000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_l1nl2m3= {0x0,0xc0000000,{0xf6e69d513e216daf,0x6d6994ad376e6ddb,0x967b6b3ade44eb11,0x54d4f5d5a7a9a5c9}};
    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_sub(&Result0_c, &pA_l1nl2m0, &pB_l1nl2m0);
    Fr_sub(&Result1_c, &pA_l1nl2m1, &pB_l1nl2m1);
    Fr_sub(&Result2_c, &pA_l1nl2m2, &pB_l1nl2m2);
    Fr_sub(&Result3_c, &pA_l1nl2m3, &pB_l1nl2m3);

    compare_Result(&pResult_l1nl2m0, &Result0_c,&pA_l1nl2m0, &pB_l1nl2m0, 0, "Fr_sub_l1nl2m_unit_test");
    compare_Result(&pResult_l1nl2m1, &Result1_c,&pA_l1nl2m1, &pB_l1nl2m1, 1, "Fr_sub_l1nl2m_unit_test");
    compare_Result(&pResult_l1nl2m2, &Result2_c,&pA_l1nl2m2, &pB_l1nl2m2, 2, "Fr_sub_l1nl2m_unit_test");
    compare_Result(&pResult_l1nl2m3, &Result3_c,&pA_l1nl2m3, &pB_l1nl2m3, 3, "Fr_sub_l1nl2m_unit_test");
}

void Fr_sub_s1nl2m_unit_test()
{
    //Fr_sub_s1nl2m_test 0:
    FrElement pA_s1nl2m0= {0x1,0x0,{0x1,0x0,0x0,0x0}};
    FrElement pB_s1nl2m0= {0x2,0xc0000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_s1nl2m0= {0x0,0xc0000000,{0xac96341c4ffffff9,0x36fc76959f60cd29,0x666ea36f7879462e,0xe0a77c19a07df2f}};
    //Fr_sub_s1nl2m_test 1:
    FrElement pA_s1nl2m1= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    FrElement pB_s1nl2m1= {0x2,0xc0000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_s1nl2m1= {0x0,0xc0000000,{0x43e1f593efffffff,0x2833e84879b97091,0xb85045b68181585d,0x30644e72e131a029}};
    //Fr_sub_s1nl2m_test 2:
    FrElement pA_s1nl2m2= {0xa1f0,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_s1nl2m2= {0x1bb8,0xc0000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_s1nl2m2= {0x0,0xc0000000,{0xbb4f6fd511db39ad,0x186f5d9843a64987,0x34ad651b29e5a276,0x1434592143ce9f06}};
    //Fr_sub_s1nl2m_test 3:
    FrElement pA_s1nl2m3= {-1,0x0,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_s1nl2m3= {0x7fffffff,0xc0000000,{0x7fffffffffffffff,0x7fffffffffffffff,0x7fffffffffffffff,0x7fffffffffffffff}};
    FrElement pResult_s1nl2m3= {0x0,0xc0000000,{0x5b2db70b90000008,0x996b59fb541213f9,0x8a31e7fd8a896a8c,0xd2be2524285b6124}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_sub(&Result0_c, &pA_s1nl2m0, &pB_s1nl2m0);
    Fr_sub(&Result1_c, &pA_s1nl2m1, &pB_s1nl2m1);
    Fr_sub(&Result2_c, &pA_s1nl2m2, &pB_s1nl2m2);
    Fr_sub(&Result3_c, &pA_s1nl2m3, &pB_s1nl2m3);

    compare_Result(&pResult_s1nl2m0, &Result0_c,&pA_s1nl2m0, &pB_s1nl2m0, 0, "Fr_sub_s1nl2m_unit_test");
    compare_Result(&pResult_s1nl2m1, &Result1_c,&pA_s1nl2m1, &pB_s1nl2m1, 1, "Fr_sub_s1nl2m_unit_test");
    compare_Result(&pResult_s1nl2m2, &Result2_c,&pA_s1nl2m2, &pB_s1nl2m2, 2, "Fr_sub_s1nl2m_unit_test");
    compare_Result(&pResult_s1nl2m3, &Result3_c,&pA_s1nl2m3, &pB_s1nl2m3, 3, "Fr_sub_s1nl2m_unit_test");
}

void Fr_sub_l1ms2n_unit_test()
{
    //Fr_sub_l1ms2n_test 0:
    FrElement pA_l1ms2n0= {0x1,0xc0000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_l1ms2n0= {0x2,0x0,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ms2n0= {0x0,0xc0000000,{0xeab58d5b5000000c,0xba3afb1d3af7d63d,0xeb72fed7908ecc00,0x144f5eefad21e1ca}};
    //Fr_sub_l1ms2n_test 1:
    FrElement pA_l1ms2n1= {0x0,0xc0000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_l1ms2n1= {0x2,0x0,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ms2n1= {0x0,0xc0000000,{0xeab58d5b5000000b,0xba3afb1d3af7d63d,0xeb72fed7908ecc00,0x144f5eefad21e1ca}};
    //Fr_sub_l1ms2n_test 2:
    FrElement pA_l1ms2n2= {0xa1f0,0xc0000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_l1ms2n2= {0x1bb8,0x0,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_l1ms2n2= {0x0,0xc0000000,{0xb8deb6dbc80092a3,0xc7a02fb580223d7d,0xff069beb7a81106c,0x1ccd9ecd208995c2}};
    //Fr_sub_l1ms2n_test 3:
    FrElement pA_l1ms2n3= {0xffff,0xc0000000,{0x7fffffffffffffff,0x7fffffffffffffff,0x7fffffffffffffff,0x7fffffffffffffff}};
    FrElement pB_l1ms2n3= {-1,0x0,{0x7fffffffffffffff,0x7fffffffffffffff,0x7fffffffffffffff,0x7fffffffffffffff}};
    FrElement pResult_l1ms2n3= {0x0,0xc0000000,{0xe8b43e885ffffff9,0x8ec88e4d25a75c97,0x2e1e5db8f6f7edd0,0x5da6294eb8d63f05}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_sub(&Result0_c, &pA_l1ms2n0, &pB_l1ms2n0);
    Fr_sub(&Result1_c, &pA_l1ms2n1, &pB_l1ms2n1);
    Fr_sub(&Result2_c, &pA_l1ms2n2, &pB_l1ms2n2);
    Fr_sub(&Result3_c, &pA_l1ms2n3, &pB_l1ms2n3);

    compare_Result(&pResult_l1ms2n0, &Result0_c,&pA_l1ms2n0, &pB_l1ms2n0, 0, "Fr_sub_l1ms2n_unit_test");
    compare_Result(&pResult_l1ms2n1, &Result1_c,&pA_l1ms2n1, &pB_l1ms2n1, 1, "Fr_sub_l1ms2n_unit_test");
    compare_Result(&pResult_l1ms2n2, &Result2_c,&pA_l1ms2n2, &pB_l1ms2n2, 2, "Fr_sub_l1ms2n_unit_test");
    compare_Result(&pResult_l1ms2n3, &Result3_c,&pA_l1ms2n3, &pB_l1ms2n3, 3, "Fr_sub_l1ms2n_unit_test");
}

void Fr_sub_l1ms2m_unit_test()
{
    //Fr_sub_l1ms2m_test 0:
    FrElement pA_l1ms2m0= {0x1,0xc0000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_l1ms2m0= {0x2,0x40000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ms2m0= {0x0,0xc0000000,{0x43e1f593f0000000,0x2833e84879b97091,0xb85045b68181585d,0x30644e72e131a029}};
    //Fr_sub_l1ms2m_test 1:
    FrElement pA_l1ms2m1= {0x0,0xc0000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_l1ms2m1= {0x2,0x40000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ms2m1= {0x0,0xc0000000,{0x43e1f593efffffff,0x2833e84879b97091,0xb85045b68181585d,0x30644e72e131a029}};
    //Fr_sub_l1ms2m_test 2:
    FrElement pA_l1ms2m2= {0xa1f0,0xc0000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_l1ms2m2= {0x1bb8,0x40000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_l1ms2m2= {0x0,0xc0000000,{0x8638148449de9259,0x401bb97259805e65,0x4fde9f9ded052ba9,0x161b5687f14a8b6f}};
    //Fr_sub_l1ms2m_test 3:
    FrElement pA_l1ms2m3= {0xffff,0xc0000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_l1ms2m3= {0xffff,0x40000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_l1ms2m3= {0x0,0xc0000000,{0x0,0x0,0x0,0x0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_sub(&Result0_c, &pA_l1ms2m0, &pB_l1ms2m0);
    Fr_sub(&Result1_c, &pA_l1ms2m1, &pB_l1ms2m1);
    Fr_sub(&Result2_c, &pA_l1ms2m2, &pB_l1ms2m2);
    Fr_sub(&Result3_c, &pA_l1ms2m3, &pB_l1ms2m3);

    compare_Result(&pResult_l1ms2m0, &Result0_c,&pA_l1ms2m0, &pB_l1ms2m0, 0, "Fr_sub_l1ms2m_unit_test");
    compare_Result(&pResult_l1ms2m1, &Result1_c,&pA_l1ms2m1, &pB_l1ms2m1, 1, "Fr_sub_l1ms2m_unit_test");
    compare_Result(&pResult_l1ms2m2, &Result2_c,&pA_l1ms2m2, &pB_l1ms2m2, 2, "Fr_sub_l1ms2m_unit_test");
    compare_Result(&pResult_l1ms2m3, &Result3_c,&pA_l1ms2m3, &pB_l1ms2m3, 3, "Fr_sub_l1ms2m_unit_test");
}

void Fr_sub_s1ml2m_unit_test()
{
    //Fr_sub_s1ml2m_test 0:
    FrElement pA_s1ml2m0= {0x1,0x40000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_s1ml2m0= {0x2,0xc0000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_s1ml2m0= {0x0,0xc0000000,{0x43e1f593f0000000,0x2833e84879b97091,0xb85045b68181585d,0x30644e72e131a029}};
    //Fr_sub_s1ml2m_test 1:
    FrElement pA_s1ml2m1= {0x0,0x40000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_s1ml2m1= {0x2,0xc0000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_s1ml2m1= {0x0,0xc0000000,{0x43e1f593efffffff,0x2833e84879b97091,0xb85045b68181585d,0x30644e72e131a029}};
    //Fr_sub_s1ml2m_test 2:
    FrElement pA_s1ml2m2= {0xa1f0,0x40000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_s1ml2m2= {0x1bb8,0xc0000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_s1ml2m2= {0x0,0xc0000000,{0x8638148449de9259,0x401bb97259805e65,0x4fde9f9ded052ba9,0x161b5687f14a8b6f}};
    //Fr_sub_s1ml2m_test 3:
    FrElement pA_s1ml2m3= {0xffff,0x40000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_s1ml2m3= {0xffff,0xc0000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_s1ml2m3= {0x0,0xc0000000,{0x0,0x0,0x0,0x0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_sub(&Result0_c, &pA_s1ml2m0, &pB_s1ml2m0);
    Fr_sub(&Result1_c, &pA_s1ml2m1, &pB_s1ml2m1);
    Fr_sub(&Result2_c, &pA_s1ml2m2, &pB_s1ml2m2);
    Fr_sub(&Result3_c, &pA_s1ml2m3, &pB_s1ml2m3);

    compare_Result(&pResult_s1ml2m0, &Result0_c,&pA_s1ml2m0, &pB_s1ml2m0, 0, "Fr_sub_s1ml2m_unit_test");
    compare_Result(&pResult_s1ml2m1, &Result1_c,&pA_s1ml2m1, &pB_s1ml2m1, 1, "Fr_sub_s1ml2m_unit_test");
    compare_Result(&pResult_s1ml2m2, &Result2_c,&pA_s1ml2m2, &pB_s1ml2m2, 2, "Fr_sub_s1ml2m_unit_test");
    compare_Result(&pResult_s1ml2m3, &Result3_c,&pA_s1ml2m3, &pB_s1ml2m3, 3, "Fr_sub_s1ml2m_unit_test");
}

void Fr_sub_l1ns2_unit_test()
{
    //Fr_sub_l1ns2_test 0:
    FrElement pA_l1ns20= {0x1,0x80000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_l1ns20= {0x2,0x0,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ns20= {0x0,0x80000000,{0x43e1f593f0000000,0x2833e84879b97091,0xb85045b68181585d,0x30644e72e131a029}};
    //Fr_sub_l1ns2_test 1:
    FrElement pA_l1ns21= {0x0,0x80000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_l1ns21= {0x2,0x0,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ns21= {0x0,0x80000000,{0x43e1f593efffffff,0x2833e84879b97091,0xb85045b68181585d,0x30644e72e131a029}};
    //Fr_sub_l1ns2_test 2:
    FrElement pA_l1ns22= {0xa1f0,0x80000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_l1ns22= {0x1bb8,0x0,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_l1ns22= {0x0,0x80000000,{0xa1f0fac9f7ffe448,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    //Fr_sub_l1ns2_test 3:
    FrElement pA_l1ns23= {0xffff,0x80000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_l1ns23= {0xffff,0x0,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_l1ns23= {0x0,0x80000000,{0xffffffffffff0000,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_sub(&Result0_c, &pA_l1ns20, &pB_l1ns20);
    Fr_sub(&Result1_c, &pA_l1ns21, &pB_l1ns21);
    Fr_sub(&Result2_c, &pA_l1ns22, &pB_l1ns22);
    Fr_sub(&Result3_c, &pA_l1ns23, &pB_l1ns23);

    compare_Result(&pResult_l1ns20, &Result0_c,&pA_l1ns20, &pB_l1ns20, 0, "Fr_sub_l1ns2_unit_test");
    compare_Result(&pResult_l1ns21, &Result1_c, &pA_l1ns21, &pB_l1ns21, 1, "Fr_sub_l1ns2_unit_test");
    compare_Result(&pResult_l1ns22, &Result2_c, &pA_l1ns22, &pB_l1ns22, 2, "Fr_sub_l1ns2_unit_test");
    compare_Result(&pResult_l1ns23, &Result3_c,&pA_l1ns23, &pB_l1ns23, 3, "Fr_sub_l1ns2_unit_test");
}

void Fr_sub_s1l2n_unit_test()
{
    //Fr_sub_s1l2n_test 0:
    FrElement pA_s1l2n0= {0x1,0x0,{0x1,0x0,0x0,0x0}};
    FrElement pB_s1l2n0= {0x2,0x80000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_s1l2n0= {0x0,0x80000000,{0x43e1f593f0000000,0x2833e84879b97091,0xb85045b68181585d,0x30644e72e131a029}};
    //Fr_sub_s1l2n_test 1:
    FrElement pA_s1l2n1= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    FrElement pB_s1l2n1= {0x2,0x80000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_s1l2n1= {0x0,0x80000000,{0x43e1f593efffffff,0x2833e84879b97091,0xb85045b68181585d,0x30644e72e131a029}};
    //Fr_sub_s1l2n_test 2:
    FrElement pA_s1l2n2= {0xa1f0,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_s1l2n2= {0x1bb8,0x80000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_s1l2n2= {0x0,0x80000000,{0x28290f4e41df344a,0xd435ad96965d16ae,0x2c06c2792dc5d7d7,0x2e4d7dc161e35b84}};
    //Fr_sub_s1l2n_test 3:
    FrElement pA_s1l2n3= {0xffff,0x0,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_s1l2n3= {0xffff,0x80000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_s1l2n3= {0x0,0x80000000,{0x43e1f593f0010001,0x2833e84879b97091,0xb85045b68181585d,0x30644e72e131a029}};
    //Fr_sub_s1l2n_test 4:
    FrElement pA_s1l2n4= {-1,0x0,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_s1l2n4= {0xffff,0x80000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_s1l2n4= {0x0,0x80000000,{0x87c3eb27e0000002,0x5067d090f372e122,0x70a08b6d0302b0ba,0x60c89ce5c2634053}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};
    FrElement Result4_c= {0,0,{0,0,0,0}};

    Fr_sub(&Result0_c, &pA_s1l2n0, &pB_s1l2n0);
    Fr_sub(&Result1_c, &pA_s1l2n1, &pB_s1l2n1);
    Fr_sub(&Result2_c, &pA_s1l2n2, &pB_s1l2n2);
    Fr_sub(&Result3_c, &pA_s1l2n3, &pB_s1l2n3);
    Fr_sub(&Result4_c, &pA_s1l2n4, &pB_s1l2n4);

    compare_Result(&pResult_s1l2n0, &Result0_c,&pA_s1l2n0, &pB_s1l2n0, 0, "Fr_sub_s1l2n_unit_test");
    compare_Result(&pResult_s1l2n1, &Result1_c,&pA_s1l2n1, &pB_s1l2n1, 1, "Fr_sub_s1l2n_unit_test");
    compare_Result(&pResult_s1l2n2, &Result2_c,&pA_s1l2n2, &pB_s1l2n2, 2, "Fr_sub_s1l2n_unit_test");
    compare_Result(&pResult_s1l2n3, &Result3_c,&pA_s1l2n3, &pB_s1l2n3, 3, "Fr_sub_s1l2n_unit_test");
    compare_Result(&pResult_s1l2n4, &Result4_c,&pA_s1l2n4, &pB_s1l2n4, 4, "Fr_sub_s1l2n_unit_test");
}

void Fr_add_s1s2_unit_test()
{
    //Fr_add_s1s2_test 0:
    FrElement pA_s1s20= {0x1,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_s1s20= {0x2,0x0,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_s1s20= {0x3,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_add_s1s2_test 1:
    FrElement pA_s1s21= {0x0,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_s1s21= {0x2,0x0,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_s1s21= {0x2,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_add_s1s2_test 2:
    FrElement pA_s1s22= {0xa1f0,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_s1s22= {0x1bb8,0x0,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_s1s22= {0xbda8,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_add_s1s2_test 3:
    FrElement pA_s1s23= {0x7fffffff,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_s1s23= {0x7fffffff,0x0,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_s1s23= {0x0,0x80000000,{0xfffffffe,0x0,0x0,0x0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_add(&Result0_c, &pA_s1s20, &pB_s1s20);
    Fr_add(&Result1_c, &pA_s1s21, &pB_s1s21);
    Fr_add(&Result2_c, &pA_s1s22, &pB_s1s22);
    Fr_add(&Result3_c, &pA_s1s23, &pB_s1s23);

    compare_Result(&pResult_s1s20, &Result0_c,&pA_s1s20, &pB_s1s20, 0, "Fr_add_s1s2_unit_test");
    compare_Result(&pResult_s1s21, &Result1_c,&pA_s1s21, &pB_s1s21, 1, "Fr_add_s1s2_unit_test");
    compare_Result(&pResult_s1s22, &Result2_c,&pA_s1s22, &pB_s1s22, 2, "Fr_add_s1s2_unit_test");
    compare_Result(&pResult_s1s23, &Result3_c,&pA_s1s23, &pB_s1s23, 3, "Fr_add_s1s2_unit_test");
}

void Fr_add_l1nl2n_unit_test()
{
    //Fr_add_l1nl2n_test 0:
    FrElement pA_l1nl2n0= {0x1,0x80000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_l1nl2n0= {0x2,0x80000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1nl2n0= {0x0,0x80000000,{0x3,0x0,0x0,0x0}};
    //Fr_add_l1nl2n_test 1:
    FrElement pA_l1nl2n1= {0x0,0x80000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_l1nl2n1= {0x2,0x80000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1nl2n1= {0x0,0x80000000,{0x2,0x0,0x0,0x0}};
    //Fr_add_l1nl2n_test 2:
    FrElement pA_l1nl2n2= {0xa1f0,0x80000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_l1nl2n2= {0x1bb8,0x80000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_l1nl2n2= {0x0,0x80000000,{0xbda9e10fa6216da7,0xe8182ed62039122b,0x6871a618947c2cb3,0x1a48f7eaefe714ba}};
    //Fr_add_l1nl2n_test 3:
    FrElement pA_l1nl2n3= {0xffff,0x80000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_l1nl2n3= {0xffff,0x80000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_l1nl2n3= {0x0,0x80000000,{0xbc1e0a6c0ffffffd,0xd7cc17b786468f6e,0x47afba497e7ea7a2,0xcf9bb18d1ece5fd6}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_add(&Result0_c, &pA_l1nl2n0, &pB_l1nl2n0);
    Fr_add(&Result1_c, &pA_l1nl2n1, &pB_l1nl2n1);
    Fr_add(&Result2_c, &pA_l1nl2n2, &pB_l1nl2n2);
    Fr_add(&Result3_c, &pA_l1nl2n3, &pB_l1nl2n3);

    compare_Result(&pResult_l1nl2n0, &Result0_c,&pA_l1nl2n0, &pB_l1nl2n0, 0, "Fr_add_l1nl2n_unit_test");
    compare_Result(&pResult_l1nl2n1, &Result1_c,&pA_l1nl2n1, &pB_l1nl2n1, 1, "Fr_add_l1nl2n_unit_test");
    compare_Result(&pResult_l1nl2n2, &Result2_c,&pA_l1nl2n2, &pB_l1nl2n2, 2, "Fr_add_l1nl2n_unit_test");
    compare_Result(&pResult_l1nl2n3, &Result3_c,&pA_l1nl2n3, &pB_l1nl2n3, 3, "Fr_add_l1nl2n_unit_test");
}

void Fr_add_l1ml2n_unit_test()
{
    //Fr_add_l1ml2n_test 0:
    FrElement pA_l1ml2n0= {0x1,0xc0000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_l1ml2n0= {0x2,0x80000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ml2n0= {0x0,0xc0000000,{0x592c68389ffffff7,0x6df8ed2b3ec19a53,0xccdd46def0f28c5c,0x1c14ef83340fbe5e}};
    //Fr_add_l1ml2n_test 1:
    FrElement pA_l1ml2n1= {0x0,0xc0000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_l1ml2n1= {0x2,0x80000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ml2n1= {0x0,0xc0000000,{0x592c68389ffffff6,0x6df8ed2b3ec19a53,0xccdd46def0f28c5c,0x1c14ef83340fbe5e}};
    //Fr_add_l1ml2n_test 2:
    FrElement pA_l1ml2n2= {0xa1f0,0xc0000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_l1ml2n2= {0x1bb8,0x80000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_l1ml2n2= {0x0,0xc0000000,{0x85d3abacbf0040,0xbe6290e259d86f01,0x6564e93fe2607c1b,0x252a8084f0653591}};
    //Fr_add_l1ml2n_test 3:
    FrElement pA_l1ml2n3= {0xffff,0xc0000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_l1ml2n3= {0xffff,0x80000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_l1ml2n3= {0x0,0xc0000000,{0x6f22b2295e216dab,0x1d01c41c43fb8cb9,0x25dadfcddb423a57,0xf40c58efe5466576}};
    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_add(&Result0_c, &pA_l1ml2n0, &pB_l1ml2n0);
    Fr_add(&Result1_c, &pA_l1ml2n1, &pB_l1ml2n1);
    Fr_add(&Result2_c, &pA_l1ml2n2, &pB_l1ml2n2);
    Fr_add(&Result3_c, &pA_l1ml2n3, &pB_l1ml2n3);

    compare_Result(&pResult_l1ml2n0, &Result0_c,&pA_l1ml2n0, &pB_l1ml2n0, 0, "Fr_add_l1ml2n_unit_test");
    compare_Result(&pResult_l1ml2n1, &Result1_c,&pA_l1ml2n1, &pB_l1ml2n1, 1, "Fr_add_l1ml2n_unit_test");
    compare_Result(&pResult_l1ml2n2, &Result2_c,&pA_l1ml2n2, &pB_l1ml2n2, 2, "Fr_add_l1ml2n_unit_test");
    compare_Result(&pResult_l1ml2n3, &Result3_c,&pA_l1ml2n3, &pB_l1ml2n3, 3, "Fr_add_l1ml2n_unit_test");
}

void Fr_add_l1ml2m_unit_test()
{
    //Fr_add_l1ml2m_test 0:
    FrElement pA_l1ml2m0= {0x1,0xc0000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_l1ml2m0= {0x2,0xc0000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ml2m0= {0x0,0xc0000000,{0x3,0x0,0x0,0x0}};
    //Fr_add_l1ml2m_test 1:
    FrElement pA_l1ml2m1= {0x0,0xc0000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_l1ml2m1= {0x2,0xc0000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ml2m1= {0x0,0xc0000000,{0x2,0x0,0x0,0x0}};
    //Fr_add_l1ml2m_test 2:
    FrElement pA_l1ml2m2= {0xa1f0,0xc0000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_l1ml2m2= {0x1bb8,0xc0000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_l1ml2m2= {0x0,0xc0000000,{0xbda9e10fa6216da7,0xe8182ed62039122b,0x6871a618947c2cb3,0x1a48f7eaefe714ba}};
    //Fr_add_l1ml2m_test 3:
    FrElement pA_l1ml2m3= {0xffff,0xc0000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_l1ml2m3= {0xffff,0xc0000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_l1ml2m3= {0x0,0xc0000000,{0xbc1e0a6c0ffffffd,0xd7cc17b786468f6e,0x47afba497e7ea7a2,0xcf9bb18d1ece5fd6}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_add(&Result0_c, &pA_l1ml2m0, &pB_l1ml2m0);
    Fr_add(&Result1_c, &pA_l1ml2m1, &pB_l1ml2m1);
    Fr_add(&Result2_c, &pA_l1ml2m2, &pB_l1ml2m2);
    Fr_add(&Result3_c, &pA_l1ml2m3, &pB_l1ml2m3);

    compare_Result(&pResult_l1ml2m0, &Result0_c,&pA_l1ml2m0, &pB_l1ml2m0, 0, "Fr_add_l1ml2m_unit_test");
    compare_Result(&pResult_l1ml2m1, &Result1_c,&pA_l1ml2m1, &pB_l1ml2m1, 1, "Fr_add_l1ml2m_unit_test");
    compare_Result(&pResult_l1ml2m2, &Result2_c,&pA_l1ml2m2, &pB_l1ml2m2, 2, "Fr_add_l1ml2m_unit_test");
    compare_Result(&pResult_l1ml2m3, &Result3_c,&pA_l1ml2m3, &pB_l1ml2m3, 3, "Fr_add_l1ml2m_unit_test");
}

void Fr_add_l1nl2m_unit_test()
{
    //Fr_add_l1nl2m_test 0:
    FrElement pA_l1nl2m0= {0x1,0x80000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_l1nl2m0= {0x2,0xc0000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1nl2m0= {0x0,0xc0000000,{0xac96341c4ffffffd,0x36fc76959f60cd29,0x666ea36f7879462e,0xe0a77c19a07df2f}};
    //Fr_add_l1nl2m_test 1:
    FrElement pA_l1nl2m1= {0x0,0x80000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_l1nl2m1= {0x2,0xc0000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1nl2m1= {0x0,0xc0000000,{0x2,0x0,0x0,0x0}};
    //Fr_add_l1nl2m_test 2:
    FrElement pA_l1nl2m2= {0xa1f0,0x80000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_l1nl2m2= {0x1bb8,0xc0000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_l1nl2m2= {0x0,0xc0000000,{0xe75ec7017e216daa,0xcc99f38b5088ab96,0xb53a5460d83f899c,0x1343bc0a22e32522}};
    //Fr_add_l1nl2m_test 3:
    FrElement pA_l1nl2m3= {0xffff,0x80000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_l1nl2m3= {0xffff,0xc0000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_l1nl2m3= {0x0,0xc0000000,{0x6f22b2295e216dab,0x1d01c41c43fb8cb9,0x25dadfcddb423a57,0xf40c58efe5466576}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_add(&Result0_c, &pA_l1nl2m0, &pB_l1nl2m0);
    Fr_add(&Result1_c, &pA_l1nl2m1, &pB_l1nl2m1);
    Fr_add(&Result2_c, &pA_l1nl2m2, &pB_l1nl2m2);
    Fr_add(&Result3_c, &pA_l1nl2m3, &pB_l1nl2m3);

    compare_Result(&pResult_l1nl2m0, &Result0_c,&pA_l1nl2m0, &pB_l1nl2m0, 0, "Fr_add_l1nl2m_unit_test");
    compare_Result(&pResult_l1nl2m1, &Result1_c,&pA_l1nl2m1, &pB_l1nl2m1, 1, "Fr_add_l1nl2m_unit_test");
    compare_Result(&pResult_l1nl2m2, &Result2_c,&pA_l1nl2m2, &pB_l1nl2m2, 2, "Fr_add_l1nl2m_unit_test");
    compare_Result(&pResult_l1nl2m3, &Result3_c,&pA_l1nl2m3, &pB_l1nl2m3, 3, "Fr_add_l1nl2m_unit_test");
}

void Fr_add_s1nl2m_unit_test()
{
    //Fr_add_s1nl2m_test 0:
    FrElement pA_s1nl2m0= {0x1,0x0,{0x1,0x0,0x0,0x0}};
    FrElement pB_s1nl2m0= {0x2,0xc0000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_s1nl2m0= {0x0,0xc0000000,{0xac96341c4ffffffd,0x36fc76959f60cd29,0x666ea36f7879462e,0xe0a77c19a07df2f}};
    //Fr_add_s1nl2m_test 1:
    FrElement pA_s1nl2m1= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    FrElement pB_s1nl2m1= {0x2,0xc0000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_s1nl2m1= {0x0,0xc0000000,{0x2,0x0,0x0,0x0}};
    //Fr_add_s1nl2m_test 2:
    FrElement pA_s1nl2m2= {0xa1f0,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_s1nl2m2= {0x1bb8,0xc0000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_s1nl2m2= {0x0,0xc0000000,{0xf2c13c606e1e14fb,0xc06bd2fc0a5efd4d,0x4d406b95d15ca380,0x1861fa84426b2851}};
    //Fr_add_s1nl2m_test 3:
    FrElement pA_s1nl2m3= {-1,0x0,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_s1nl2m3= {0x7fffffff,0xc0000000,{0x7fffffffffffffff,0x7fffffffffffffff,0x7fffffffffffffff,0x7fffffffffffffff}};
    FrElement pResult_s1nl2m3= {0x0,0xc0000000,{0xd369cbe3b0000004,0x4903896a609f32d5,0x19915c908786b9d1,0x71f5883e65f820d0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_add(&Result0_c, &pA_s1nl2m0, &pB_s1nl2m0);
    Fr_add(&Result1_c, &pA_s1nl2m1, &pB_s1nl2m1);
    Fr_add(&Result2_c, &pA_s1nl2m2, &pB_s1nl2m2);
    Fr_add(&Result3_c, &pA_s1nl2m3, &pB_s1nl2m3);

    compare_Result(&pResult_s1nl2m0, &Result0_c,&pA_s1nl2m0, &pB_s1nl2m0, 0, "Fr_add_s1nl2m_unit_test");
    compare_Result(&pResult_s1nl2m1, &Result1_c,&pA_s1nl2m1, &pB_s1nl2m1, 1, "Fr_add_s1nl2m_unit_test");
    compare_Result(&pResult_s1nl2m2, &Result2_c,&pA_s1nl2m2, &pB_s1nl2m2, 2, "Fr_add_s1nl2m_unit_test");
    compare_Result(&pResult_s1nl2m3, &Result3_c,&pA_s1nl2m3, &pB_s1nl2m3, 3, "Fr_add_s1nl2m_unit_test");
}

void Fr_add_l1ms2n_unit_test()
{
    //Fr_add_l1ms2n_test 0:
    FrElement pA_l1ms2n0= {0x1,0xc0000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_l1ms2n0= {0x2,0x0,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ms2n0= {0x0,0xc0000000,{0x592c68389ffffff7,0x6df8ed2b3ec19a53,0xccdd46def0f28c5c,0x1c14ef83340fbe5e}};
    //Fr_add_l1ms2n_test 1:
    FrElement pA_l1ms2n1= {0x0,0xc0000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_l1ms2n1= {0x2,0x0,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ms2n1= {0x0,0xc0000000,{0x592c68389ffffff6,0x6df8ed2b3ec19a53,0xccdd46def0f28c5c,0x1c14ef83340fbe5e}};
    //Fr_add_l1ms2n_test 2:
    FrElement pA_l1ms2n2= {0xa1f0,0xc0000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_l1ms2n2= {0x1bb8,0x0,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_l1ms2n2= {0x0,0xc0000000,{0x8b033eb827ff6d5d,0x6093b892f9973313,0xb949a9cb070047f0,0x1396afa5c0a80a66}};
    //Fr_add_l1ms2n_test 3:
    FrElement pA_l1ms2n3= {0xffff,0xc0000000,{0x7fffffffffffffff,0x7fffffffffffffff,0x7fffffffffffffff,0x7fffffffffffffff}};
    FrElement pB_l1ms2n3= {-1,0x0,{0x7fffffffffffffff,0x7fffffffffffffff,0x7fffffffffffffff,0x7fffffffffffffff}};
    FrElement pResult_l1ms2n3= {0x0,0xc0000000,{0xd369cbe3b0000004,0x4903896a609f32d5,0x19915c908786b9d1,0x71f5883e65f820d0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_add(&Result0_c, &pA_l1ms2n0, &pB_l1ms2n0);
    Fr_add(&Result1_c, &pA_l1ms2n1, &pB_l1ms2n1);
    Fr_add(&Result2_c, &pA_l1ms2n2, &pB_l1ms2n2);
    Fr_add(&Result3_c, &pA_l1ms2n3, &pB_l1ms2n3);

    compare_Result(&pResult_l1ms2n0, &Result0_c,&pA_l1ms2n0, &pB_l1ms2n0, 0, "Fr_add_l1ms2n_unit_test");
    compare_Result(&pResult_l1ms2n1, &Result1_c,&pA_l1ms2n1, &pB_l1ms2n1, 1, "Fr_add_l1ms2n_unit_test");
    compare_Result(&pResult_l1ms2n2, &Result2_c,&pA_l1ms2n2, &pB_l1ms2n2, 2, "Fr_add_l1ms2n_unit_test");
    compare_Result(&pResult_l1ms2n3, &Result3_c,&pA_l1ms2n3, &pB_l1ms2n3, 3, "Fr_add_l1ms2n_unit_test");
}

void Fr_add_l1ms2m_unit_test()
{
    //Fr_add_l1ms2m_test 0:
    FrElement pA_l1ms2m0= {0x1,0xc0000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_l1ms2m0= {0x2,0x40000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ms2m0= {0x0,0xc0000000,{0x3,0x0,0x0,0x0}};
    //Fr_add_l1ms2m_test 1:
    FrElement pA_l1ms2m1= {0x0,0xc0000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_l1ms2m1= {0x2,0x40000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ms2m1= {0x0,0xc0000000,{0x2,0x0,0x0,0x0}};
    //Fr_add_l1ms2m_test 2:
    FrElement pA_l1ms2m2= {0xa1f0,0xc0000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_l1ms2m2= {0x1bb8,0x40000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_l1ms2m2= {0x0,0xc0000000,{0xbda9e10fa6216da7,0xe8182ed62039122b,0x6871a618947c2cb3,0x1a48f7eaefe714ba}};
    //Fr_add_l1ms2m_test 3:
    FrElement pA_l1ms2m3= {0xffff,0xc0000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_l1ms2m3= {0xffff,0x40000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_l1ms2m3= {0x0,0xc0000000,{0xbc1e0a6c0ffffffd,0xd7cc17b786468f6e,0x47afba497e7ea7a2,0xcf9bb18d1ece5fd6}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_add(&Result0_c, &pA_l1ms2m0, &pB_l1ms2m0);
    Fr_add(&Result1_c, &pA_l1ms2m1, &pB_l1ms2m1);
    Fr_add(&Result2_c, &pA_l1ms2m2, &pB_l1ms2m2);
    Fr_add(&Result3_c, &pA_l1ms2m3, &pB_l1ms2m3);

    compare_Result(&pResult_l1ms2m0, &Result0_c,&pA_l1ms2m0, &pB_l1ms2m0, 0, "Fr_add_l1ms2m_unit_test");
    compare_Result(&pResult_l1ms2m1, &Result1_c,&pA_l1ms2m1, &pB_l1ms2m1, 1, "Fr_add_l1ms2m_unit_test");
    compare_Result(&pResult_l1ms2m2, &Result2_c,&pA_l1ms2m2, &pB_l1ms2m2, 2, "Fr_add_l1ms2m_unit_test");
    compare_Result(&pResult_l1ms2m3, &Result3_c,&pA_l1ms2m3, &pB_l1ms2m3, 3, "Fr_add_l1ms2m_unit_test");
}

void Fr_add_s1ml2m_unit_test()
{
    //Fr_add_s1ml2m_test 0:
    FrElement pA_s1ml2m0= {0x1,0x40000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_s1ml2m0= {0x2,0xc0000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_s1ml2m0= {0x0,0xc0000000,{0x3,0x0,0x0,0x0}};
    //Fr_add_s1ml2m_test 1:
    FrElement pA_s1ml2m1= {0x0,0x40000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_s1ml2m1= {0x2,0xc0000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_s1ml2m1= {0x0,0xc0000000,{0x2,0x0,0x0,0x0}};
    //Fr_add_s1ml2m_test 2:
    FrElement pA_s1ml2m2= {0xa1f0,0x40000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_s1ml2m2= {0x1bb8,0xc0000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_s1ml2m2= {0x0,0xc0000000,{0xbda9e10fa6216da7,0xe8182ed62039122b,0x6871a618947c2cb3,0x1a48f7eaefe714ba}};
    //Fr_add_s1ml2m_test 3:
    FrElement pA_s1ml2m3= {0xffff,0x40000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_s1ml2m3= {0xffff,0xc0000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_s1ml2m3= {0x0,0xc0000000,{0xbc1e0a6c0ffffffd,0xd7cc17b786468f6e,0x47afba497e7ea7a2,0xcf9bb18d1ece5fd6}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_add(&Result0_c, &pA_s1ml2m0, &pB_s1ml2m0);
    Fr_add(&Result1_c, &pA_s1ml2m1, &pB_s1ml2m1);
    Fr_add(&Result2_c, &pA_s1ml2m2, &pB_s1ml2m2);
    Fr_add(&Result3_c, &pA_s1ml2m3, &pB_s1ml2m3);

    compare_Result(&pResult_s1ml2m0, &Result0_c,&pA_s1ml2m0, &pB_s1ml2m0, 0, "Fr_add_s1ml2m_unit_test");
    compare_Result(&pResult_s1ml2m1, &Result1_c,&pA_s1ml2m1, &pB_s1ml2m1, 1, "Fr_add_s1ml2m_unit_test");
    compare_Result(&pResult_s1ml2m2, &Result2_c,&pA_s1ml2m2, &pB_s1ml2m2, 2, "Fr_add_s1ml2m_unit_test");
    compare_Result(&pResult_s1ml2m3, &Result3_c,&pA_s1ml2m3, &pB_s1ml2m3, 3, "Fr_add_s1ml2m_unit_test");
}

void Fr_add_l1ns2_unit_test()
{
    //Fr_add_l1ns2_test 0:
    FrElement pA_l1ns20= {0x1,0x80000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_l1ns20= {0x2,0x0,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ns20= {0x0,0x80000000,{0x3,0x0,0x0,0x0}};
    //Fr_add_l1ns2_test 1:
    FrElement pA_l1ns21= {0x0,0x80000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_l1ns21= {0x2,0x0,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ns21= {0x0,0x80000000,{0x2,0x0,0x0,0x0}};
    //Fr_add_l1ns2_test 2:
    FrElement pA_l1ns22= {0xa1f0,0x80000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_l1ns22= {0x1bb8,0x0,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_l1ns22= {0x0,0x80000000,{0xa1f0fac9f8001bb8,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    //Fr_add_l1ns2_test 3:
    FrElement pA_l1ns23= {0xffff,0x80000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_l1ns23= {0xffff,0x0,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_l1ns23= {0x0,0x80000000,{0xbc1e0a6c1000fffd,0xd7cc17b786468f6e,0x47afba497e7ea7a2,0xcf9bb18d1ece5fd6}};
    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_add(&Result0_c, &pA_l1ns20, &pB_l1ns20);
    Fr_add(&Result1_c, &pA_l1ns21, &pB_l1ns21);
    Fr_add(&Result2_c, &pA_l1ns22, &pB_l1ns22);
    Fr_add(&Result3_c, &pA_l1ns23, &pB_l1ns23);

    compare_Result(&pResult_l1ns20, &Result0_c,&pA_l1ns20, &pB_l1ns20, 0, "Fr_add_l1ns2_unit_test");
    compare_Result(&pResult_l1ns21, &Result1_c,&pA_l1ns21, &pB_l1ns21, 1, "Fr_add_l1ns2_unit_test");
    compare_Result(&pResult_l1ns22, &Result2_c,&pA_l1ns22, &pB_l1ns22, 2, "Fr_add_l1ns2_unit_test");
    compare_Result(&pResult_l1ns23, &Result3_c,&pA_l1ns23, &pB_l1ns23, 3, "Fr_add_l1ns2_unit_test");
}

void Fr_add_s1l2n_unit_test()
{
    //Fr_add_s1l2n_test 0:
    FrElement pA_s1l2n0= {0x1,0x0,{0x1,0x0,0x0,0x0}};
    FrElement pB_s1l2n0= {0x2,0x80000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_s1l2n0= {0x0,0x80000000,{0x3,0x0,0x0,0x0}};
    //Fr_add_s1l2n_test 1:
    FrElement pA_s1l2n1= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    FrElement pB_s1l2n1= {0x2,0x80000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_s1l2n1= {0x0,0x80000000,{0x2,0x0,0x0,0x0}};
    //Fr_add_s1l2n_test 2:
    FrElement pA_s1l2n2= {0xa1f0,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_s1l2n2= {0x1bb8,0x80000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_s1l2n2= {0x0,0x80000000,{0x1bb8e645ae220f97,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    //Fr_add_s1l2n_test 3:
    FrElement pA_s1l2n3= {0xffff,0x0,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_s1l2n3= {0xffff,0x80000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_s1l2n3= {0x0,0x80000000,{0xbc1e0a6c1000fffd,0xd7cc17b786468f6e,0x47afba497e7ea7a2,0xcf9bb18d1ece5fd6}};
    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_add(&Result0_c, &pA_s1l2n0, &pB_s1l2n0);
    Fr_add(&Result1_c, &pA_s1l2n1, &pB_s1l2n1);
    Fr_add(&Result2_c, &pA_s1l2n2, &pB_s1l2n2);
    Fr_add(&Result3_c, &pA_s1l2n3, &pB_s1l2n3);

    compare_Result(&pResult_s1l2n0, &Result0_c,&pA_s1l2n0, &pB_s1l2n0, 0, "Fr_add_s1l2n_unit_test");
    compare_Result(&pResult_s1l2n1, &Result1_c,&pA_s1l2n1, &pB_s1l2n1, 1, "Fr_add_s1l2n_unit_test");
    compare_Result(&pResult_s1l2n2, &Result2_c,&pA_s1l2n2, &pB_s1l2n2, 2, "Fr_add_s1l2n_unit_test");
    compare_Result(&pResult_s1l2n3, &Result3_c,&pA_s1l2n3, &pB_s1l2n3, 3, "Fr_add_s1l2n_unit_test");
}

void Fr_toInt_unit_test()
{
    //Fr_toInt_test 0:
    FrElement pA0= {0xa1f0,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrRawElement pRawResult0= {0xa1f0};
    //Fr_toInt_test 1:
    FrElement pA1= {0xa1f0,0x40000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrRawElement pRawResult1= {0xa1f0};
    //Fr_toInt_test 2:
    FrElement pA2= {0x0,0x80000000,{0xa1f0,0x0,0x0,0x0}};
    FrRawElement pRawResult2= {0xa1f0};

    FrRawElement pRawResult0_c = {0};
    FrRawElement pRawResult1_c = {0};
    FrRawElement pRawResult2_c = {0};

    pRawResult0_c[0] = Fr_toInt(&pA0);
    pRawResult1_c[0] = Fr_toInt(&pA1);
    pRawResult2_c[0] = Fr_toInt(&pA2);

    compare_Result(pRawResult0, pRawResult0_c,&pA0,&pA0, 0, "Fr_toInt_unit_test");
    compare_Result(pRawResult1, pRawResult1_c,&pA1,&pA1, 1, "Fr_toInt_unit_test");
    compare_Result(pRawResult2, pRawResult2_c,&pA2,&pA2, 2, "Fr_toInt_unit_test");
    //compare_rawResult(pRawResult3, pRawResult3_c,pA2,pA2, 3, "Fr_toInt_unit_test");
}

void Fr_lt_s1s2_unit_test()
{
    //Fr_lt_s1s2_test 0:
    FrElement pA_s1s20= {0x1,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_s1s20= {0x2,0x0,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_s1s20= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_lt_s1s2_test 1:
    FrElement pA_s1s21= {0x0,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_s1s21= {0x2,0x0,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_s1s21= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_lt_s1s2_test 2:
    FrElement pA_s1s22= {0xa1f0,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_s1s22= {0x1bb8,0x0,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_s1s22= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_lt_s1s2_test 3:
    FrElement pA_s1s23= {0x7fffffff,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_s1s23= {0x7fffffff,0x0,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_s1s23= {0x0,0x0,{0x0,0x0,0x0,0x0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_lt(&Result0_c, &pA_s1s20, &pB_s1s20);
    Fr_lt(&Result1_c, &pA_s1s21, &pB_s1s21);
    Fr_lt(&Result2_c, &pA_s1s22, &pB_s1s22);
    Fr_lt(&Result3_c, &pA_s1s23, &pB_s1s23);

    compare_Result(&pResult_s1s20, &Result0_c,&pA_s1s20, &pB_s1s20, 0, "Fr_lt_s1s2_unit_test");
    compare_Result(&pResult_s1s21, &Result1_c,&pA_s1s21, &pB_s1s21, 1, "Fr_lt_s1s2_unit_test");
    compare_Result(&pResult_s1s22, &Result2_c,&pA_s1s22, &pB_s1s22, 2, "Fr_lt_s1s2_unit_test");
    compare_Result(&pResult_s1s23, &Result3_c,&pA_s1s23, &pB_s1s23, 3, "Fr_lt_s1s2_unit_test");
}

void Fr_lt_l1nl2n_unit_test()
{
    //Fr_lt_l1nl2n_test 0:
    FrElement pA_l1nl2n0= {0x1,0x80000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_l1nl2n0= {0x2,0x80000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1nl2n0= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_lt_l1nl2n_test 1:
    FrElement pA_l1nl2n1= {0x0,0x80000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_l1nl2n1= {0x2,0x80000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1nl2n1= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_lt_l1nl2n_test 2:
    FrElement pA_l1nl2n2= {0xa1f0,0x80000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_l1nl2n2= {0x1bb8,0x80000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_l1nl2n2= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_lt_l1nl2n_test 3:
    FrElement pA_l1nl2n3= {0xffff,0x80000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_l1nl2n3= {0xffff,0x80000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_l1nl2n3= {0x0,0x0,{0x0,0x0,0x0,0x0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_lt(&Result0_c, &pA_l1nl2n0, &pB_l1nl2n0);
    Fr_lt(&Result1_c, &pA_l1nl2n1, &pB_l1nl2n1);
    Fr_lt(&Result2_c, &pA_l1nl2n2, &pB_l1nl2n2);
    Fr_lt(&Result3_c, &pA_l1nl2n3, &pB_l1nl2n3);

    compare_Result(&pResult_l1nl2n0, &Result0_c,&pA_l1nl2n0, &pB_l1nl2n0, 0, "Fr_lt_l1nl2n_unit_test");
    compare_Result(&pResult_l1nl2n1, &Result1_c,&pA_l1nl2n1, &pB_l1nl2n1, 1, "Fr_lt_l1nl2n_unit_test");
    compare_Result(&pResult_l1nl2n2, &Result2_c,&pA_l1nl2n2, &pB_l1nl2n2, 2, "Fr_lt_l1nl2n_unit_test");
    compare_Result(&pResult_l1nl2n3, &Result3_c,&pA_l1nl2n3, &pB_l1nl2n3, 3, "Fr_lt_l1nl2n_unit_test");
}

void Fr_lt_l1ml2n_unit_test()
{
    //Fr_lt_l1ml2n_test 0:
    FrElement pA_l1ml2n0= {0x1,0xc0000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_l1ml2n0= {0x2,0x80000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ml2n0= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_lt_l1ml2n_test 1:
    FrElement pA_l1ml2n1= {0x0,0xc0000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_l1ml2n1= {0x2,0x80000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ml2n1= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_lt_l1ml2n_test 2:
    FrElement pA_l1ml2n2= {0xa1f0,0xc0000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_l1ml2n2= {0x1bb8,0x80000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_l1ml2n2= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_lt_l1ml2n_test 3:
    FrElement pA_l1ml2n3= {0xffff,0xc0000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_l1ml2n3= {0xffff,0x80000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_l1ml2n3= {0x1,0x0,{0x0,0x0,0x0,0x0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_lt(&Result0_c, &pA_l1ml2n0, &pB_l1ml2n0);
    Fr_lt(&Result1_c, &pA_l1ml2n1, &pB_l1ml2n1);
    Fr_lt(&Result2_c, &pA_l1ml2n2, &pB_l1ml2n2);
    Fr_lt(&Result3_c, &pA_l1ml2n3, &pB_l1ml2n3);

    compare_Result(&pResult_l1ml2n0, &Result0_c,&pA_l1ml2n0, &pB_l1ml2n0, 0, "Fr_lt_l1ml2n_unit_test");
    compare_Result(&pResult_l1ml2n1, &Result1_c,&pA_l1ml2n1, &pB_l1ml2n1, 1, "Fr_lt_l1ml2n_unit_test");
    compare_Result(&pResult_l1ml2n2, &Result2_c,&pA_l1ml2n2, &pB_l1ml2n2, 2, "Fr_lt_l1ml2n_unit_test");
    compare_Result(&pResult_l1ml2n3, &Result3_c,&pA_l1ml2n3, &pB_l1ml2n3, 3, "Fr_lt_l1ml2n_unit_test");
}

void Fr_lt_l1ml2m_unit_test()
{
    //Fr_lt_l1ml2m_test 0:
    FrElement pA_l1ml2m0= {0x1,0xc0000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_l1ml2m0= {0x2,0xc0000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ml2m0= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_lt_l1ml2m_test 1:
    FrElement pA_l1ml2m1= {0x0,0xc0000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_l1ml2m1= {0x2,0xc0000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ml2m1= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_lt_l1ml2m_test 2:
    FrElement pA_l1ml2m2= {0xa1f0,0xc0000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_l1ml2m2= {0x1bb8,0xc0000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_l1ml2m2= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_lt_l1ml2m_test 3:
    FrElement pA_l1ml2m3= {0xffff,0xc0000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_l1ml2m3= {0xffff,0xc0000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_l1ml2m3= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_lt(&Result0_c, &pA_l1ml2m0, &pB_l1ml2m0);
    Fr_lt(&Result1_c, &pA_l1ml2m1, &pB_l1ml2m1);
    Fr_lt(&Result2_c, &pA_l1ml2m2, &pB_l1ml2m2);
    Fr_lt(&Result3_c, &pA_l1ml2m3, &pB_l1ml2m3);

    compare_Result(&pResult_l1ml2m0, &Result0_c,&pA_l1ml2m0, &pB_l1ml2m0, 0, "Fr_lt_l1ml2m_unit_test");
    compare_Result(&pResult_l1ml2m1, &Result1_c,&pA_l1ml2m1, &pB_l1ml2m1, 1, "Fr_lt_l1ml2m_unit_test");
    compare_Result(&pResult_l1ml2m2, &Result2_c,&pA_l1ml2m2, &pB_l1ml2m2, 2, "Fr_lt_l1ml2m_unit_test");
    compare_Result(&pResult_l1ml2m3, &Result3_c,&pA_l1ml2m3, &pB_l1ml2m3, 3, "Fr_lt_l1ml2m_unit_test");
}

void Fr_lt_l1nl2m_unit_test()
{
    //Fr_lt_l1nl2m_test 0:
    FrElement pA_l1nl2m0= {0x1,0x80000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_l1nl2m0= {0x2,0xc0000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1nl2m0= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_lt_l1nl2m_test 1:
    FrElement pA_l1nl2m1= {0x0,0x80000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_l1nl2m1= {0x2,0xc0000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1nl2m1= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_lt_l1nl2m_test 2:
    FrElement pA_l1nl2m2= {0xa1f0,0x80000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_l1nl2m2= {0x1bb8,0xc0000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_l1nl2m2= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_lt_l1nl2m_test 3:
    FrElement pA_l1nl2m3= {0xffff,0x80000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_l1nl2m3= {0xffff,0xc0000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_l1nl2m3= {0x0,0x0,{0x0,0x0,0x0,0x0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_lt(&Result0_c, &pA_l1nl2m0, &pB_l1nl2m0);
    Fr_lt(&Result1_c, &pA_l1nl2m1, &pB_l1nl2m1);
    Fr_lt(&Result2_c, &pA_l1nl2m2, &pB_l1nl2m2);
    Fr_lt(&Result3_c, &pA_l1nl2m3, &pB_l1nl2m3);

    compare_Result(&pResult_l1nl2m0, &Result0_c,&pA_l1nl2m0, &pB_l1nl2m0, 0, "Fr_lt_l1nl2m_unit_test");
    compare_Result(&pResult_l1nl2m1, &Result1_c,&pA_l1nl2m1, &pB_l1nl2m1, 1, "Fr_lt_l1nl2m_unit_test");
    compare_Result(&pResult_l1nl2m2, &Result2_c,&pA_l1nl2m2, &pB_l1nl2m2, 2, "Fr_lt_l1nl2m_unit_test");
    compare_Result(&pResult_l1nl2m3, &Result3_c,&pA_l1nl2m3, &pB_l1nl2m3, 3, "Fr_lt_l1nl2m_unit_test");
}

// 6
void Fr_lt_s1l2m_unit_test()
{
    //Fr_lt_s1l2m_test 0:
    FrElement pA_s1l2m0= {0x1,0x0,{0x1,0x0,0x0,0x0}};
    FrElement pB_s1l2m0= {0x2,0xc0000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_s1l2m0= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_lt_s1l2m_test 1:
    FrElement pA_s1l2m1= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    FrElement pB_s1l2m1= {0x2,0xc0000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_s1l2m1= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_lt_s1l2m_test 2:
    FrElement pA_s1l2m2= {0xa1f0,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_s1l2m2= {0x1bb8,0xc0000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_s1l2m2= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_lt_s1l2m_test 3:
    FrElement pA_s1l2m3= {0xffff,0x0,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_s1l2m3= {0xffff,0xc0000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_s1l2m3= {0x0,0x0,{0x0,0x0,0x0,0x0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_lt(&Result0_c, &pA_s1l2m0, &pB_s1l2m0);
    Fr_lt(&Result1_c, &pA_s1l2m1, &pB_s1l2m1);
    Fr_lt(&Result2_c, &pA_s1l2m2, &pB_s1l2m2);
    Fr_lt(&Result3_c, &pA_s1l2m3, &pB_s1l2m3);

    compare_Result(&pResult_s1l2m0, &Result0_c,&pA_s1l2m0, &pB_s1l2m0, 0, "Fr_lt_s1l2m_unit_test");
    compare_Result(&pResult_s1l2m1, &Result1_c,&pA_s1l2m1, &pB_s1l2m1, 1, "Fr_lt_s1l2m_unit_test");
    compare_Result(&pResult_s1l2m2, &Result2_c,&pA_s1l2m2, &pB_s1l2m2, 2, "Fr_lt_s1l2m_unit_test");
    compare_Result(&pResult_s1l2m3, &Result3_c,&pA_s1l2m3, &pB_s1l2m3, 3, "Fr_lt_s1l2m_unit_test");
}

void Fr_lt_l1ms2_unit_test()
{
    //Fr_lt_l1ms2_test 0:
    FrElement pA_l1ms20= {0x1,0xc0000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_l1ms20= {0x2,0x0,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ms20= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_lt_l1ms2_test 1:
    FrElement pA_l1ms21= {0x0,0xc0000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_l1ms21= {0x2,0x0,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ms21= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_lt_l1ms2_test 2:
    FrElement pA_l1ms22= {0xa1f0,0xc0000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_l1ms22= {0x1bb8,0x0,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_l1ms22= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_lt_l1ms2_test 3:
    FrElement pA_l1ms23= {0xffff,0xc0000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_l1ms23= {0xffff,0x0,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_l1ms23= {0x1,0x0,{0x0,0x0,0x0,0x0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_lt(&Result0_c, &pA_l1ms20, &pB_l1ms20);
    Fr_lt(&Result1_c, &pA_l1ms21, &pB_l1ms21);
    Fr_lt(&Result2_c, &pA_l1ms22, &pB_l1ms22);
    Fr_lt(&Result3_c, &pA_l1ms23, &pB_l1ms23);

    compare_Result(&pResult_l1ms20, &Result0_c,&pA_l1ms20, &pB_l1ms20, 0, "Fr_lt_l1ms2_unit_test");
    compare_Result(&pResult_l1ms21, &Result1_c,&pA_l1ms21, &pB_l1ms21, 1, "Fr_lt_l1ms2_unit_test");
    compare_Result(&pResult_l1ms22, &Result2_c,&pA_l1ms22, &pB_l1ms22, 2, "Fr_lt_l1ms2_unit_test");
    compare_Result(&pResult_l1ms23, &Result3_c,&pA_l1ms23, &pB_l1ms23, 3, "Fr_lt_l1ms2_unit_test");
}

void Fr_lt_l1ns2_unit_test()
{
    //Fr_lt_l1ns2_test 0:
    FrElement pA_l1ns20= {0x1,0x80000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_l1ns20= {0x2,0x0,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ns20= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_lt_l1ns2_test 1:
    FrElement pA_l1ns21= {0x0,0x80000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_l1ns21= {0x2,0x0,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ns21= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_lt_l1ns2_test 2:
    FrElement pA_l1ns22= {0xa1f0,0x80000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_l1ns22= {0x1bb8,0x0,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_l1ns22= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_lt_l1ns2_test 3:
    FrElement pA_l1ns23= {0xffff,0x80000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_l1ns23= {0xffff,0x0,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_l1ns23= {0x1,0x0,{0x0,0x0,0x0,0x0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_lt(&Result0_c, &pA_l1ns20, &pB_l1ns20);
    Fr_lt(&Result1_c, &pA_l1ns21, &pB_l1ns21);
    Fr_lt(&Result2_c, &pA_l1ns22, &pB_l1ns22);
    Fr_lt(&Result3_c, &pA_l1ns23, &pB_l1ns23);

    compare_Result(&pResult_l1ns20, &Result0_c,&pA_l1ns20, &pB_l1ns20, 0, "Fr_lt_l1ns2_unit_test");
    compare_Result(&pResult_l1ns21, &Result1_c,&pA_l1ns21, &pB_l1ns21, 1, "Fr_lt_l1ns2_unit_test");
    compare_Result(&pResult_l1ns22, &Result2_c,&pA_l1ns22, &pB_l1ns22, 2, "Fr_lt_l1ns2_unit_test");
    compare_Result(&pResult_l1ns23, &Result3_c,&pA_l1ns23, &pB_l1ns23, 3, "Fr_lt_l1ns2_unit_test");
}

void Fr_lt_s1l2n_unit_test()
{
    //Fr_lt_s1l2n_test 0:
    FrElement pA_s1l2n0= {0x1,0x0,{0x1,0x0,0x0,0x0}};
    FrElement pB_s1l2n0= {0x2,0x80000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_s1l2n0= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_lt_s1l2n_test 1:
    FrElement pA_s1l2n1= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    FrElement pB_s1l2n1= {0x2,0x80000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_s1l2n1= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_lt_s1l2n_test 2:
    FrElement pA_s1l2n2= {0xa1f0,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_s1l2n2= {0x1bb8,0x80000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_s1l2n2= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_lt_s1l2n_test 3:
    FrElement pA_s1l2n3= {0xffff,0x0,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_s1l2n3= {0xffff,0x80000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_s1l2n3= {0x0,0x0,{0x0,0x0,0x0,0x0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_lt(&Result0_c, &pA_s1l2n0, &pB_s1l2n0);
    Fr_lt(&Result1_c, &pA_s1l2n1, &pB_s1l2n1);
    Fr_lt(&Result2_c, &pA_s1l2n2, &pB_s1l2n2);
    Fr_lt(&Result3_c, &pA_s1l2n3, &pB_s1l2n3);

    compare_Result(&pResult_s1l2n0, &Result0_c,&pA_s1l2n0, &pB_s1l2n0, 0, "Fr_lt_s1l2n_unit_test");
    compare_Result(&pResult_s1l2n1, &Result1_c,&pA_s1l2n1, &pB_s1l2n1, 1, "Fr_lt_s1l2n_unit_test");
    compare_Result(&pResult_s1l2n2, &Result2_c,&pA_s1l2n2, &pB_s1l2n2, 2, "Fr_lt_s1l2n_unit_test");
    compare_Result(&pResult_s1l2n3, &Result3_c,&pA_s1l2n3, &pB_s1l2n3, 3, "Fr_lt_s1l2n_unit_test");
}

void Fr_geq_s1s2_unit_test()
{
    //Fr_geq_s1s2_test 0:
    FrElement pA_s1s20= {0x1,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_s1s20= {0x2,0x0,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_s1s20= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_geq_s1s2_test 1:
    FrElement pA_s1s21= {0x0,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_s1s21= {0x2,0x0,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_s1s21= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_geq_s1s2_test 2:
    FrElement pA_s1s22= {0xa1f0,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_s1s22= {0x1bb8,0x0,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_s1s22= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_geq_s1s2_test 3:
    FrElement pA_s1s23= {0x7fffffff,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_s1s23= {0x7fffffff,0x0,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_s1s23= {0x1,0x0,{0x0,0x0,0x0,0x0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_geq(&Result0_c, &pA_s1s20, &pB_s1s20);
    Fr_geq(&Result1_c, &pA_s1s21, &pB_s1s21);
    Fr_geq(&Result2_c, &pA_s1s22, &pB_s1s22);
    Fr_geq(&Result3_c, &pA_s1s23, &pB_s1s23);

    compare_Result(&pResult_s1s20, &Result0_c,&pA_s1s20, &pB_s1s20, 0, "Fr_geq_s1s2_unit_test");
    compare_Result(&pResult_s1s21, &Result1_c,&pA_s1s21, &pB_s1s21, 1, "Fr_geq_s1s2_unit_test");
    compare_Result(&pResult_s1s22, &Result2_c,&pA_s1s22, &pB_s1s22, 2, "Fr_geq_s1s2_unit_test");
    compare_Result(&pResult_s1s23, &Result3_c,&pA_s1s23, &pB_s1s23, 3, "Fr_geq_s1s2_unit_test");
}

void Fr_geq_l1nl2n_unit_test()
{
    //Fr_geq_l1nl2n_test 0:
    FrElement pA_l1nl2n0= {0x1,0x80000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_l1nl2n0= {0x2,0x80000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1nl2n0= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_geq_l1nl2n_test 1:
    FrElement pA_l1nl2n1= {0x0,0x80000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_l1nl2n1= {0x2,0x80000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1nl2n1= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_geq_l1nl2n_test 2:
    FrElement pA_l1nl2n2= {0xa1f0,0x80000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_l1nl2n2= {0x1bb8,0x80000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_l1nl2n2= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_geq_l1nl2n_test 3:
    FrElement pA_l1nl2n3= {0xffff,0x80000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_l1nl2n3= {0xffff,0x80000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_l1nl2n3= {0x1,0x0,{0x0,0x0,0x0,0x0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_geq(&Result0_c, &pA_l1nl2n0, &pB_l1nl2n0);
    Fr_geq(&Result1_c, &pA_l1nl2n1, &pB_l1nl2n1);
    Fr_geq(&Result2_c, &pA_l1nl2n2, &pB_l1nl2n2);
    Fr_geq(&Result3_c, &pA_l1nl2n3, &pB_l1nl2n3);

    compare_Result(&pResult_l1nl2n0, &Result0_c,&pA_l1nl2n0, &pB_l1nl2n0, 0, "Fr_geq_l1nl2n_unit_test");
    compare_Result(&pResult_l1nl2n1, &Result1_c,&pA_l1nl2n1, &pB_l1nl2n1, 1, "Fr_geq_l1nl2n_unit_test");
    compare_Result(&pResult_l1nl2n2, &Result2_c,&pA_l1nl2n2, &pB_l1nl2n2, 2, "Fr_geq_l1nl2n_unit_test");
    compare_Result(&pResult_l1nl2n3, &Result3_c,&pA_l1nl2n3, &pB_l1nl2n3, 3, "Fr_geq_l1nl2n_unit_test");
}

void Fr_geq_l1ml2n_unit_test()
{
    //Fr_geq_l1ml2n_test 0:
    FrElement pA_l1ml2n0= {0x1,0xc0000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_l1ml2n0= {0x2,0x80000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ml2n0= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_geq_l1ml2n_test 1:
    FrElement pA_l1ml2n1= {0x0,0xc0000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_l1ml2n1= {0x2,0x80000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ml2n1= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_geq_l1ml2n_test 2:
    FrElement pA_l1ml2n2= {0xa1f0,0xc0000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_l1ml2n2= {0x1bb8,0x80000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_l1ml2n2= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_geq_l1ml2n_test 3:
    FrElement pA_l1ml2n3= {0xffff,0xc0000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_l1ml2n3= {0xffff,0x80000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_l1ml2n3= {0x0,0x0,{0x0,0x0,0x0,0x0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_geq(&Result0_c, &pA_l1ml2n0, &pB_l1ml2n0);
    Fr_geq(&Result1_c, &pA_l1ml2n1, &pB_l1ml2n1);
    Fr_geq(&Result2_c, &pA_l1ml2n2, &pB_l1ml2n2);
    Fr_geq(&Result3_c, &pA_l1ml2n3, &pB_l1ml2n3);

    compare_Result(&pResult_l1ml2n0, &Result0_c,&pA_l1ml2n0, &pB_l1ml2n0, 0, "Fr_geq_l1ml2n_unit_test");
    compare_Result(&pResult_l1ml2n1, &Result1_c,&pA_l1ml2n1, &pB_l1ml2n1, 1, "Fr_geq_l1ml2n_unit_test");
    compare_Result(&pResult_l1ml2n2, &Result2_c,&pA_l1ml2n2, &pB_l1ml2n2, 2, "Fr_geq_l1ml2n_unit_test");
    compare_Result(&pResult_l1ml2n3, &Result3_c,&pA_l1ml2n3, &pB_l1ml2n3, 3, "Fr_geq_l1ml2n_unit_test");
}

void Fr_geq_l1ml2m_unit_test()
{
    //Fr_geq_l1ml2m_test 0:
    FrElement pA_l1ml2m0= {0x1,0xc0000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_l1ml2m0= {0x2,0xc0000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ml2m0= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_geq_l1ml2m_test 1:
    FrElement pA_l1ml2m1= {0x0,0xc0000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_l1ml2m1= {0x2,0xc0000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ml2m1= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_geq_l1ml2m_test 2:
    FrElement pA_l1ml2m2= {0xa1f0,0xc0000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_l1ml2m2= {0x1bb8,0xc0000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_l1ml2m2= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_geq_l1ml2m_test 3:
    FrElement pA_l1ml2m3= {0xffff,0xc0000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_l1ml2m3= {0xffff,0xc0000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_l1ml2m3= {0x1,0x0,{0x0,0x0,0x0,0x0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_geq(&Result0_c, &pA_l1ml2m0, &pB_l1ml2m0);
    Fr_geq(&Result1_c, &pA_l1ml2m1, &pB_l1ml2m1);
    Fr_geq(&Result2_c, &pA_l1ml2m2, &pB_l1ml2m2);
    Fr_geq(&Result3_c, &pA_l1ml2m3, &pB_l1ml2m3);

    compare_Result(&pResult_l1ml2m0, &Result0_c,&pA_l1ml2m0, &pB_l1ml2m0, 0, "Fr_geq_l1ml2m_unit_test");
    compare_Result(&pResult_l1ml2m1, &Result1_c,&pA_l1ml2m1, &pB_l1ml2m1, 1, "Fr_geq_l1ml2m_unit_test");
    compare_Result(&pResult_l1ml2m2, &Result2_c,&pA_l1ml2m2, &pB_l1ml2m2, 2, "Fr_geq_l1ml2m_unit_test");
    compare_Result(&pResult_l1ml2m3, &Result3_c,&pA_l1ml2m3, &pB_l1ml2m3, 3, "Fr_geq_l1ml2m_unit_test");
}

void Fr_geq_l1nl2m_unit_test()
{
    //Fr_geq_l1nl2m_test 0:
    FrElement pA_l1nl2m0= {0x1,0x80000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_l1nl2m0= {0x2,0xc0000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1nl2m0= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_geq_l1nl2m_test 1:
    FrElement pA_l1nl2m1= {0x0,0x80000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_l1nl2m1= {0x2,0xc0000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1nl2m1= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_geq_l1nl2m_test 2:
    FrElement pA_l1nl2m2= {0xa1f0,0x80000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_l1nl2m2= {0x1bb8,0xc0000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_l1nl2m2= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_geq_l1nl2m_test 3:
    FrElement pA_l1nl2m3= {0xffff,0x80000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_l1nl2m3= {0xffff,0xc0000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_l1nl2m3= {0x1,0x0,{0x0,0x0,0x0,0x0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_geq(&Result0_c, &pA_l1nl2m0, &pB_l1nl2m0);
    Fr_geq(&Result1_c, &pA_l1nl2m1, &pB_l1nl2m1);
    Fr_geq(&Result2_c, &pA_l1nl2m2, &pB_l1nl2m2);
    Fr_geq(&Result3_c, &pA_l1nl2m3, &pB_l1nl2m3);

    compare_Result(&pResult_l1nl2m0, &Result0_c,&pA_l1nl2m0, &pB_l1nl2m0, 0, "Fr_geq_l1nl2m_unit_test");
    compare_Result(&pResult_l1nl2m1, &Result1_c,&pA_l1nl2m1, &pB_l1nl2m1, 1, "Fr_geq_l1nl2m_unit_test");
    compare_Result(&pResult_l1nl2m2, &Result2_c,&pA_l1nl2m2, &pB_l1nl2m2, 2, "Fr_geq_l1nl2m_unit_test");
    compare_Result(&pResult_l1nl2m3, &Result3_c,&pA_l1nl2m3, &pB_l1nl2m3, 3, "Fr_geq_l1nl2m_unit_test");
}

void Fr_geq_s1l2m_unit_test()
{
    //Fr_geq_s1l2m_test 0:
    FrElement pA_s1l2m0= {0x1,0x0,{0x1,0x0,0x0,0x0}};
    FrElement pB_s1l2m0= {0x2,0xc0000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_s1l2m0= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_geq_s1l2m_test 1:
    FrElement pA_s1l2m1= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    FrElement pB_s1l2m1= {0x2,0xc0000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_s1l2m1= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_geq_s1l2m_test 2:
    FrElement pA_s1l2m2= {0xa1f0,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_s1l2m2= {0x1bb8,0xc0000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_s1l2m2= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_geq_s1l2m_test 3:
    FrElement pA_s1l2m3= {0xffff,0x0,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_s1l2m3= {0xffff,0xc0000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_s1l2m3= {0x1,0x0,{0x0,0x0,0x0,0x0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_geq(&Result0_c, &pA_s1l2m0, &pB_s1l2m0);
    Fr_geq(&Result1_c, &pA_s1l2m1, &pB_s1l2m1);
    Fr_geq(&Result2_c, &pA_s1l2m2, &pB_s1l2m2);
    Fr_geq(&Result3_c, &pA_s1l2m3, &pB_s1l2m3);

    compare_Result(&pResult_s1l2m0, &Result0_c,&pA_s1l2m0, &pB_s1l2m0, 0, "Fr_geq_s1l2m_unit_test");
    compare_Result(&pResult_s1l2m1, &Result1_c,&pA_s1l2m1, &pB_s1l2m1, 1, "Fr_geq_s1l2m_unit_test");
    compare_Result(&pResult_s1l2m2, &Result2_c,&pA_s1l2m2, &pB_s1l2m2, 2, "Fr_geq_s1l2m_unit_test");
    compare_Result(&pResult_s1l2m3, &Result3_c,&pA_s1l2m3, &pB_s1l2m3, 3, "Fr_geq_s1l2m_unit_test");
}

void Fr_geq_l1ms2_unit_test()
{
    //Fr_geq_l1ms2_test 0:
    FrElement pA_l1ms20= {0x1,0xc0000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_l1ms20= {0x2,0x0,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ms20= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_geq_l1ms2_test 1:
    FrElement pA_l1ms21= {0x0,0xc0000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_l1ms21= {0x2,0x0,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ms21= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_geq_l1ms2_test 2:
    FrElement pA_l1ms22= {0xa1f0,0xc0000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_l1ms22= {0x1bb8,0x0,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_l1ms22= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_geq_l1ms2_test 3:
    FrElement pA_l1ms23= {0xffff,0xc0000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_l1ms23= {0xffff,0x0,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_l1ms23= {0x0,0x0,{0x0,0x0,0x0,0x0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_geq(&Result0_c, &pA_l1ms20, &pB_l1ms20);
    Fr_geq(&Result1_c, &pA_l1ms21, &pB_l1ms21);
    Fr_geq(&Result2_c, &pA_l1ms22, &pB_l1ms22);
    Fr_geq(&Result3_c, &pA_l1ms23, &pB_l1ms23);

    compare_Result(&pResult_l1ms20, &Result0_c,&pA_l1ms20, &pB_l1ms20, 0, "Fr_geq_l1ms2_unit_test");
    compare_Result(&pResult_l1ms21, &Result1_c,&pA_l1ms21, &pB_l1ms21, 1, "Fr_geq_l1ms2_unit_test");
    compare_Result(&pResult_l1ms22, &Result2_c,&pA_l1ms22, &pB_l1ms22, 2, "Fr_geq_l1ms2_unit_test");
    compare_Result(&pResult_l1ms23, &Result3_c, &pA_l1ms23, &pB_l1ms23,3, "Fr_geq_l1ms2_unit_test");
}

void Fr_geq_l1ns2_unit_test()
{
    //Fr_geq_l1ns2_test 0:
    FrElement pA_l1ns20= {0x1,0x80000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_l1ns20= {0x2,0x0,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ns20= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_geq_l1ns2_test 1:
    FrElement pA_l1ns21= {0x0,0x80000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_l1ns21= {0x2,0x0,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ns21= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_geq_l1ns2_test 2:
    FrElement pA_l1ns22= {0xa1f0,0x80000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_l1ns22= {0x1bb8,0x0,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_l1ns22= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_geq_l1ns2_test 3:
    FrElement pA_l1ns23= {0xffff,0x80000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_l1ns23= {0xffff,0x0,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_l1ns23= {0x0,0x0,{0x0,0x0,0x0,0x0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_geq(&Result0_c, &pA_l1ns20, &pB_l1ns20);
    Fr_geq(&Result1_c, &pA_l1ns21, &pB_l1ns21);
    Fr_geq(&Result2_c, &pA_l1ns22, &pB_l1ns22);
    Fr_geq(&Result3_c, &pA_l1ns23, &pB_l1ns23);

    compare_Result(&pResult_l1ns20, &Result0_c, &pA_l1ns20, &pB_l1ns20, 0, "Fr_geq_l1ns2_unit_test");
    compare_Result(&pResult_l1ns21, &Result1_c,&pA_l1ns21, &pB_l1ns21, 1, "Fr_geq_l1ns2_unit_test");
    compare_Result(&pResult_l1ns22, &Result2_c,&pA_l1ns22, &pB_l1ns22, 2, "Fr_geq_l1ns2_unit_test");
    compare_Result(&pResult_l1ns23, &Result3_c,&pA_l1ns23, &pB_l1ns23, 3, "Fr_geq_l1ns2_unit_test");
}

void Fr_geq_s1l2n_unit_test()
{
    //Fr_geq_s1l2n_test 0:
    FrElement pA_s1l2n0= {0x1,0x0,{0x1,0x0,0x0,0x0}};
    FrElement pB_s1l2n0= {0x2,0x80000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_s1l2n0= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_geq_s1l2n_test 1:
    FrElement pA_s1l2n1= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    FrElement pB_s1l2n1= {0x2,0x80000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_s1l2n1= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_geq_s1l2n_test 2:
    FrElement pA_s1l2n2= {0xa1f0,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_s1l2n2= {0x1bb8,0x80000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_s1l2n2= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_geq_s1l2n_test 3:
    FrElement pA_s1l2n3= {0xffff,0x0,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_s1l2n3= {0xffff,0x80000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_s1l2n3= {0x1,0x0,{0x0,0x0,0x0,0x0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_geq(&Result0_c, &pA_s1l2n0, &pB_s1l2n0);
    Fr_geq(&Result1_c, &pA_s1l2n1, &pB_s1l2n1);
    Fr_geq(&Result2_c, &pA_s1l2n2, &pB_s1l2n2);
    Fr_geq(&Result3_c, &pA_s1l2n3, &pB_s1l2n3);

    compare_Result(&pResult_s1l2n0, &Result0_c,&pA_s1l2n0, &pB_s1l2n0, 0, "Fr_geq_s1l2n_unit_test");
    compare_Result(&pResult_s1l2n1, &Result1_c,&pA_s1l2n1, &pB_s1l2n1, 1, "Fr_geq_s1l2n_unit_test");
    compare_Result(&pResult_s1l2n2, &Result2_c,&pA_s1l2n2, &pB_s1l2n2, 2, "Fr_geq_s1l2n_unit_test");
    compare_Result(&pResult_s1l2n3, &Result3_c,&pA_s1l2n3, &pB_s1l2n3, 3, "Fr_geq_s1l2n_unit_test");
}

void Fr_neg_unit_test()
{
    //Fr_neg_test 0:
    FrElement pA0= {0xa1f0,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    //FrElement pResult0= {0xffff5e10,0x0,{0x0,0x0,0x0,0x0}};
    FrElement pResult0= {-41456,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_neg_test 1:
    FrElement pA1= {0xa1f0,0x40000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pResult1= {-41456,0x0,{0x0,0x0,0x0,0x0}};
    //FrElement pResult1= {0xffff5e10,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_neg_test 2:
    FrElement pA2= {0xa1f0,0x80000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pResult2= {0xa1f0,0x80000000,{0xa1f0fac9f8000001,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    //Fr_neg_test 3:
    FrElement pA3= {0xa1f0,0xc0000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pResult3= {0xa1f0,0xc0000000,{0xa1f0fac9f8000001,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};

    //Fr_neg_test 4:
    FrElement pA4= {INT_MIN,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pResult4= {0x0,0x80000000,{0x80000000,0x0,0x0,0x0}};

    //Fr_neg_test 5:
    FrElement pA5= {INT_MAX,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pResult5= {INT_MIN+1, 0x0,{0x0,0x0,0x0,0x0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};
    FrElement Result4_c= {0,0,{0,0,0,0}};
    FrElement Result5_c= {0,0,{0,0,0,0}};

    Fr_neg(&Result0_c, &pA0);
    Fr_neg(&Result1_c, &pA1);
    Fr_neg(&Result2_c, &pA2);
    Fr_neg(&Result3_c, &pA3);
    Fr_neg(&Result4_c, &pA4);
    Fr_neg(&Result5_c, &pA5);

    compare_Result(&pResult0, &Result0_c,&pA0,&pA0, 0, "Fr_neg_unit_test");
    compare_Result(&pResult1, &Result1_c,&pA1,&pA1, 1, "Fr_neg_unit_test");
    compare_Result(&pResult2, &Result2_c,&pA2,&pA2, 2, "Fr_neg_unit_test");
    compare_Result(&pResult3, &Result3_c,&pA3,&pA3, 3, "Fr_neg_unit_test");
    compare_Result(&pResult4, &Result4_c,&pA4,&pA4, 4, "Fr_neg_unit_test");
    compare_Result(&pResult5, &Result5_c,&pA5,&pA5, 5, "Fr_neg_unit_test");
}

void Fr_eq_s1s2_unit_test()
{
    //Fr_eq_s1s2_test 0:
    FrElement pA_s1s20= {0x1,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_s1s20= {0x2,0x0,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_s1s20= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_eq_s1s2_test 1:
    FrElement pA_s1s21= {0x0,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_s1s21= {0x2,0x0,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_s1s21= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_eq_s1s2_test 2:
    FrElement pA_s1s22= {0xa1f0,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_s1s22= {0x1bb8,0x0,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_s1s22= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_eq_s1s2_test 3:
    FrElement pA_s1s23= {0x7fffffff,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_s1s23= {0x7fffffff,0x0,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_s1s23= {0x1,0x0,{0x0,0x0,0x0,0x0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_eq(&Result0_c, &pA_s1s20, &pB_s1s20);
    Fr_eq(&Result1_c, &pA_s1s21, &pB_s1s21);
    Fr_eq(&Result2_c, &pA_s1s22, &pB_s1s22);
    Fr_eq(&Result3_c, &pA_s1s23, &pB_s1s23);

    compare_Result(&pResult_s1s20, &Result0_c,&pA_s1s20, &pB_s1s20, 0, "Fr_eq_s1s2_unit_test");
    compare_Result(&pResult_s1s21, &Result1_c,&pA_s1s21, &pB_s1s21, 1, "Fr_eq_s1s2_unit_test");
    compare_Result(&pResult_s1s22, &Result2_c,&pA_s1s22, &pB_s1s22, 2, "Fr_eq_s1s2_unit_test");
    compare_Result(&pResult_s1s23, &Result3_c,&pA_s1s23, &pB_s1s23, 3, "Fr_eq_s1s2_unit_test");
}

void Fr_eq_l1nl2n_unit_test()
{
    //Fr_eq_l1nl2n_test 0:
    FrElement pA_l1nl2n0= {0x1,0x80000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_l1nl2n0= {0x2,0x80000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1nl2n0= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_eq_l1nl2n_test 1:
    FrElement pA_l1nl2n1= {0x0,0x80000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_l1nl2n1= {0x2,0x80000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1nl2n1= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_eq_l1nl2n_test 2:
    FrElement pA_l1nl2n2= {0xa1f0,0x80000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_l1nl2n2= {0x1bb8,0x80000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_l1nl2n2= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_eq_l1nl2n_test 3:
    FrElement pA_l1nl2n3= {0xffff,0x80000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_l1nl2n3= {0xffff,0x80000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_l1nl2n3= {0x1,0x0,{0x0,0x0,0x0,0x0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_eq(&Result0_c, &pA_l1nl2n0, &pB_l1nl2n0);
    Fr_eq(&Result1_c, &pA_l1nl2n1, &pB_l1nl2n1);
    Fr_eq(&Result2_c, &pA_l1nl2n2, &pB_l1nl2n2);
    Fr_eq(&Result3_c, &pA_l1nl2n3, &pB_l1nl2n3);

    compare_Result(&pResult_l1nl2n0, &Result0_c,&pA_l1nl2n0, &pB_l1nl2n0, 0, "Fr_eq_l1nl2n_unit_test");
    compare_Result(&pResult_l1nl2n1, &Result1_c,&pA_l1nl2n1, &pB_l1nl2n1, 1, "Fr_eq_l1nl2n_unit_test");
    compare_Result(&pResult_l1nl2n2, &Result2_c,&pA_l1nl2n2, &pB_l1nl2n2, 2, "Fr_eq_l1nl2n_unit_test");
    compare_Result(&pResult_l1nl2n3, &Result3_c,&pA_l1nl2n3, &pB_l1nl2n3, 3, "Fr_eq_l1nl2n_unit_test");
}

void Fr_eq_l1ml2n_unit_test()
{
    //Fr_eq_l1ml2n_test 0:
    FrElement pA_l1ml2n0= {0x1,0xc0000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_l1ml2n0= {0x2,0x80000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ml2n0= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_eq_l1ml2n_test 1:
    FrElement pA_l1ml2n1= {0x0,0xc0000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_l1ml2n1= {0x2,0x80000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ml2n1= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_eq_l1ml2n_test 2:
    FrElement pA_l1ml2n2= {0xa1f0,0xc0000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_l1ml2n2= {0x1bb8,0x80000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_l1ml2n2= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_eq_l1ml2n_test 3:
    FrElement pA_l1ml2n3= {0xffff,0xc0000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_l1ml2n3= {0xffff,0x80000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_l1ml2n3= {0x0,0x0,{0x0,0x0,0x0,0x0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_eq(&Result0_c, &pA_l1ml2n0, &pB_l1ml2n0);
    Fr_eq(&Result1_c, &pA_l1ml2n1, &pB_l1ml2n1);
    Fr_eq(&Result2_c, &pA_l1ml2n2, &pB_l1ml2n2);
    Fr_eq(&Result3_c, &pA_l1ml2n3, &pB_l1ml2n3);

    compare_Result(&pResult_l1ml2n0, &Result0_c,&pA_l1ml2n0, &pB_l1ml2n0, 0, "Fr_eq_l1ml2n_unit_test");
    compare_Result(&pResult_l1ml2n1, &Result1_c,&pA_l1ml2n1, &pB_l1ml2n1, 1, "Fr_eq_l1ml2n_unit_test");
    compare_Result(&pResult_l1ml2n2, &Result2_c,&pA_l1ml2n2, &pB_l1ml2n2, 2, "Fr_eq_l1ml2n_unit_test");
    compare_Result(&pResult_l1ml2n3, &Result3_c,&pA_l1ml2n3, &pB_l1ml2n3, 3, "Fr_eq_l1ml2n_unit_test");
}

void Fr_eq_l1ml2m_unit_test()
{
    //Fr_eq_l1ml2m_test 0:
    FrElement pA_l1ml2m0= {0x1,0xc0000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_l1ml2m0= {0x2,0xc0000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ml2m0= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_eq_l1ml2m_test 1:
    FrElement pA_l1ml2m1= {0x0,0xc0000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_l1ml2m1= {0x2,0xc0000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ml2m1= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_eq_l1ml2m_test 2:
    FrElement pA_l1ml2m2= {0xa1f0,0xc0000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_l1ml2m2= {0x1bb8,0xc0000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_l1ml2m2= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_eq_l1ml2m_test 3:
    FrElement pA_l1ml2m3= {0xffff,0xc0000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_l1ml2m3= {0xffff,0xc0000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_l1ml2m3= {0x1,0x0,{0x0,0x0,0x0,0x0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_eq(&Result0_c, &pA_l1ml2m0, &pB_l1ml2m0);
    Fr_eq(&Result1_c, &pA_l1ml2m1, &pB_l1ml2m1);
    Fr_eq(&Result2_c, &pA_l1ml2m2, &pB_l1ml2m2);
    Fr_eq(&Result3_c, &pA_l1ml2m3, &pB_l1ml2m3);

    compare_Result(&pResult_l1ml2m0, &Result0_c,&pA_l1ml2m0, &pB_l1ml2m0, 0, "Fr_eq_l1ml2m_unit_test");
    compare_Result(&pResult_l1ml2m1, &Result1_c,&pA_l1ml2m1, &pB_l1ml2m1, 1, "Fr_eq_l1ml2m_unit_test");
    compare_Result(&pResult_l1ml2m2, &Result2_c,&pA_l1ml2m2, &pB_l1ml2m2, 2, "Fr_eq_l1ml2m_unit_test");
    compare_Result(&pResult_l1ml2m3, &Result3_c,&pA_l1ml2m3, &pB_l1ml2m3, 3, "Fr_eq_l1ml2m_unit_test");
}

void Fr_eq_l1nl2m_unit_test()
{
    //Fr_eq_l1nl2m_test 0:
    FrElement pA_l1nl2m0= {0x1,0x80000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_l1nl2m0= {0x2,0xc0000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1nl2m0= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_eq_l1nl2m_test 1:
    FrElement pA_l1nl2m1= {0x0,0x80000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_l1nl2m1= {0x2,0xc0000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1nl2m1= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_eq_l1nl2m_test 2:
    FrElement pA_l1nl2m2= {0xa1f0,0x80000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_l1nl2m2= {0x1bb8,0xc0000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_l1nl2m2= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_eq_l1nl2m_test 3:
    FrElement pA_l1nl2m3= {0xffff,0x80000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_l1nl2m3= {0xffff,0xc0000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_l1nl2m3= {0x0,0x0,{0x0,0x0,0x0,0x0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_eq(&Result0_c, &pA_l1nl2m0, &pB_l1nl2m0);
    Fr_eq(&Result1_c, &pA_l1nl2m1, &pB_l1nl2m1);
    Fr_eq(&Result2_c, &pA_l1nl2m2, &pB_l1nl2m2);
    Fr_eq(&Result3_c, &pA_l1nl2m3, &pB_l1nl2m3);

    compare_Result(&pResult_l1nl2m0, &Result0_c,&pA_l1nl2m0, &pB_l1nl2m0, 0, "Fr_eq_l1nl2m_unit_test");
    compare_Result(&pResult_l1nl2m1, &Result1_c,&pA_l1nl2m1, &pB_l1nl2m1, 1, "Fr_eq_l1nl2m_unit_test");
    compare_Result(&pResult_l1nl2m2, &Result2_c,&pA_l1nl2m2, &pB_l1nl2m2, 2, "Fr_eq_l1nl2m_unit_test");
    compare_Result(&pResult_l1nl2m3, &Result3_c,&pA_l1nl2m3, &pB_l1nl2m3, 3, "Fr_eq_l1nl2m_unit_test");
}

void Fr_eq_s1l2m_unit_test()
{
    //Fr_eq_s1l2m_test 0:
    FrElement pA_s1l2m0= {0x1,0x0,{0x1,0x0,0x0,0x0}};
    FrElement pB_s1l2m0= {0x2,0xc0000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_s1l2m0= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_eq_s1l2m_test 1:
    FrElement pA_s1l2m1= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    FrElement pB_s1l2m1= {0x2,0xc0000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_s1l2m1= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_eq_s1l2m_test 2:
    FrElement pA_s1l2m2= {0xa1f0,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_s1l2m2= {0x1bb8,0xc0000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_s1l2m2= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_eq_s1l2m_test 3:
    FrElement pA_s1l2m3= {0xffff,0x0,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_s1l2m3= {0xffff,0xc0000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_s1l2m3= {0x0,0x0,{0x0,0x0,0x0,0x0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_eq(&Result0_c, &pA_s1l2m0, &pB_s1l2m0);
    Fr_eq(&Result1_c, &pA_s1l2m1, &pB_s1l2m1);
    Fr_eq(&Result2_c, &pA_s1l2m2, &pB_s1l2m2);
    Fr_eq(&Result3_c, &pA_s1l2m3, &pB_s1l2m3);

    compare_Result(&pResult_s1l2m0, &Result0_c,&pA_s1l2m0, &pB_s1l2m0, 0, "Fr_eq_s1l2m_unit_test");
    compare_Result(&pResult_s1l2m1, &Result1_c,&pA_s1l2m1, &pB_s1l2m1, 1, "Fr_eq_s1l2m_unit_test");
    compare_Result(&pResult_s1l2m2, &Result2_c, &pA_s1l2m2, &pB_s1l2m2, 2, "Fr_eq_s1l2m_unit_test");
    compare_Result(&pResult_s1l2m3, &Result3_c,&pA_s1l2m3, &pB_s1l2m3, 3, "Fr_eq_s1l2m_unit_test");
}

void Fr_eq_l1ms2_unit_test()
{
    //Fr_eq_l1ms2_test 0:
    FrElement pA_l1ms20= {0x1,0xc0000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_l1ms20= {0x2,0x0,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ms20= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_eq_l1ms2_test 1:
    FrElement pA_l1ms21= {0x0,0xc0000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_l1ms21= {0x2,0x0,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ms21= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_eq_l1ms2_test 2:
    FrElement pA_l1ms22= {0xa1f0,0xc0000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_l1ms22= {0x1bb8,0x0,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_l1ms22= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_eq_l1ms2_test 3:
    FrElement pA_l1ms23= {0xffff,0xc0000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_l1ms23= {0xffff,0x0,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_l1ms23= {0x0,0x0,{0x0,0x0,0x0,0x0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_eq(&Result0_c, &pA_l1ms20, &pB_l1ms20);
    Fr_eq(&Result1_c, &pA_l1ms21, &pB_l1ms21);
    Fr_eq(&Result2_c, &pA_l1ms22, &pB_l1ms22);
    Fr_eq(&Result3_c, &pA_l1ms23, &pB_l1ms23);

    compare_Result(&pResult_l1ms20, &Result0_c,&pA_l1ms20, &pB_l1ms20, 0, "Fr_eq_l1ms2_unit_test");
    compare_Result(&pResult_l1ms21, &Result1_c,&pA_l1ms21, &pB_l1ms21, 1, "Fr_eq_l1ms2_unit_test");
    compare_Result(&pResult_l1ms22, &Result2_c,&pA_l1ms22, &pB_l1ms22, 2, "Fr_eq_l1ms2_unit_test");
    compare_Result(&pResult_l1ms23, &Result3_c,&pA_l1ms23, &pB_l1ms23, 3, "Fr_eq_l1ms2_unit_test");
}

void Fr_eq_l1ns2_unit_test()
{
    //Fr_eq_l1ns2_test 0:
    FrElement pA_l1ns20= {0x1,0x80000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_l1ns20= {0x2,0x0,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ns20= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_eq_l1ns2_test 1:
    FrElement pA_l1ns21= {0x0,0x80000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_l1ns21= {0x2,0x0,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ns21= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_eq_l1ns2_test 2:
    FrElement pA_l1ns22= {0xa1f0,0x80000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_l1ns22= {0x1bb8,0x0,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_l1ns22= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_eq_l1ns2_test 3:
    FrElement pA_l1ns23= {0xffff,0x80000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_l1ns23= {0xffff,0x0,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_l1ns23= {0x0,0x0,{0x0,0x0,0x0,0x0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_eq(&Result0_c, &pA_l1ns20, &pB_l1ns20);
    Fr_eq(&Result1_c, &pA_l1ns21, &pB_l1ns21);
    Fr_eq(&Result2_c, &pA_l1ns22, &pB_l1ns22);
    Fr_eq(&Result3_c, &pA_l1ns23, &pB_l1ns23);

    compare_Result(&pResult_l1ns20, &Result0_c,&pA_l1ns20, &pB_l1ns20, 0, "Fr_eq_l1ns2_unit_test");
    compare_Result(&pResult_l1ns21, &Result1_c,&pA_l1ns21, &pB_l1ns21, 1, "Fr_eq_l1ns2_unit_test");
    compare_Result(&pResult_l1ns22, &Result2_c,&pA_l1ns22, &pB_l1ns22, 2, "Fr_eq_l1ns2_unit_test");
    compare_Result(&pResult_l1ns23, &Result3_c,&pA_l1ns23, &pB_l1ns23, 3, "Fr_eq_l1ns2_unit_test");
}

void Fr_eq_s1l2n_unit_test()
{
    //Fr_eq_s1l2n_test 0:
    FrElement pA_s1l2n0= {0x1,0x0,{0x1,0x0,0x0,0x0}};
    FrElement pB_s1l2n0= {0x2,0x80000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_s1l2n0= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_eq_s1l2n_test 1:
    FrElement pA_s1l2n1= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    FrElement pB_s1l2n1= {0x2,0x80000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_s1l2n1= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_eq_s1l2n_test 2:
    FrElement pA_s1l2n2= {0xa1f0,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_s1l2n2= {0x1bb8,0x80000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_s1l2n2= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_eq_s1l2n_test 3:
    FrElement pA_s1l2n3= {0xffff,0x0,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_s1l2n3= {0xffff,0x80000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_s1l2n3= {0x0,0x0,{0x0,0x0,0x0,0x0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_eq(&Result0_c, &pA_s1l2n0, &pB_s1l2n0);
    Fr_eq(&Result1_c, &pA_s1l2n1, &pB_s1l2n1);
    Fr_eq(&Result2_c, &pA_s1l2n2, &pB_s1l2n2);
    Fr_eq(&Result3_c, &pA_s1l2n3, &pB_s1l2n3);

    compare_Result(&pResult_s1l2n0, &Result0_c,&pA_s1l2n0, &pB_s1l2n0, 0, "Fr_eq_s1l2n_unit_test");
    compare_Result(&pResult_s1l2n1, &Result1_c,&pA_s1l2n1, &pB_s1l2n1, 1, "Fr_eq_s1l2n_unit_test");
    compare_Result(&pResult_s1l2n2, &Result2_c,&pA_s1l2n2, &pB_s1l2n2, 2, "Fr_eq_s1l2n_unit_test");
    compare_Result(&pResult_s1l2n3, &Result3_c,&pA_s1l2n3, &pB_s1l2n3, 3, "Fr_eq_s1l2n_unit_test");
}

void Fr_neq_s1s2_unit_test()
{
    //Fr_neq_s1s2_test 0:
    FrElement pA_s1s20= {0x1,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_s1s20= {0x2,0x0,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_s1s20= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_neq_s1s2_test 1:
    FrElement pA_s1s21= {0x0,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_s1s21= {0x2,0x0,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_s1s21= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_neq_s1s2_test 2:
    FrElement pA_s1s22= {0xa1f0,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_s1s22= {0x1bb8,0x0,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_s1s22= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_neq_s1s2_test 3:
    FrElement pA_s1s23= {0x7fffffff,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_s1s23= {0x7fffffff,0x0,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_s1s23= {0x0,0x0,{0x0,0x0,0x0,0x0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_neq(&Result0_c, &pA_s1s20, &pB_s1s20);
    Fr_neq(&Result1_c, &pA_s1s21, &pB_s1s21);
    Fr_neq(&Result2_c, &pA_s1s22, &pB_s1s22);
    Fr_neq(&Result3_c, &pA_s1s23, &pB_s1s23);

    compare_Result(&pResult_s1s20, &Result0_c,&pA_s1s20, &pB_s1s20, 0, "Fr_neq_s1s2_unit_test");
    compare_Result(&pResult_s1s21, &Result1_c,&pA_s1s21, &pB_s1s21, 1, "Fr_neq_s1s2_unit_test");
    compare_Result(&pResult_s1s22, &Result2_c,&pA_s1s22, &pB_s1s22, 2, "Fr_neq_s1s2_unit_test");
    compare_Result(&pResult_s1s23, &Result3_c,&pA_s1s23, &pB_s1s23, 3, "Fr_neq_s1s2_unit_test");
}

void Fr_neq_l1nl2n_unit_test()
{
    //Fr_neq_l1nl2n_test 0:
    FrElement pA_l1nl2n0= {0x1,0x80000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_l1nl2n0= {0x2,0x80000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1nl2n0= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_neq_l1nl2n_test 1:
    FrElement pA_l1nl2n1= {0x0,0x80000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_l1nl2n1= {0x2,0x80000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1nl2n1= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_neq_l1nl2n_test 2:
    FrElement pA_l1nl2n2= {0xa1f0,0x80000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_l1nl2n2= {0x1bb8,0x80000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_l1nl2n2= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_neq_l1nl2n_test 3:
    FrElement pA_l1nl2n3= {0xffff,0x80000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_l1nl2n3= {0xffff,0x80000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_l1nl2n3= {0x0,0x0,{0x0,0x0,0x0,0x0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_neq(&Result0_c, &pA_l1nl2n0, &pB_l1nl2n0);
    Fr_neq(&Result1_c, &pA_l1nl2n1, &pB_l1nl2n1);
    Fr_neq(&Result2_c, &pA_l1nl2n2, &pB_l1nl2n2);
    Fr_neq(&Result3_c, &pA_l1nl2n3, &pB_l1nl2n3);

    compare_Result(&pResult_l1nl2n0, &Result0_c,&pA_l1nl2n0, &pB_l1nl2n0, 0, "Fr_neq_l1nl2n_unit_test");
    compare_Result(&pResult_l1nl2n1, &Result1_c,&pA_l1nl2n1, &pB_l1nl2n1, 1, "Fr_neq_l1nl2n_unit_test");
    compare_Result(&pResult_l1nl2n2, &Result2_c,&pA_l1nl2n2, &pB_l1nl2n2, 2, "Fr_neq_l1nl2n_unit_test");
    compare_Result(&pResult_l1nl2n3, &Result3_c,&pA_l1nl2n3, &pB_l1nl2n3, 3, "Fr_neq_l1nl2n_unit_test");
}

void Fr_neq_l1ml2n_unit_test()
{
    //Fr_neq_l1ml2n_test 0:
    FrElement pA_l1ml2n0= {0x1,0xc0000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_l1ml2n0= {0x2,0x80000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ml2n0= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_neq_l1ml2n_test 1:
    FrElement pA_l1ml2n1= {0x0,0xc0000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_l1ml2n1= {0x2,0x80000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ml2n1= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_neq_l1ml2n_test 2:
    FrElement pA_l1ml2n2= {0xa1f0,0xc0000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_l1ml2n2= {0x1bb8,0x80000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_l1ml2n2= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_neq_l1ml2n_test 3:
    FrElement pA_l1ml2n3= {0xffff,0xc0000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_l1ml2n3= {0xffff,0x80000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_l1ml2n3= {0x1,0x0,{0x0,0x0,0x0,0x0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_neq(&Result0_c, &pA_l1ml2n0, &pB_l1ml2n0);
    Fr_neq(&Result1_c, &pA_l1ml2n1, &pB_l1ml2n1);
    Fr_neq(&Result2_c, &pA_l1ml2n2, &pB_l1ml2n2);
    Fr_neq(&Result3_c, &pA_l1ml2n3, &pB_l1ml2n3);

    compare_Result(&pResult_l1ml2n0, &Result0_c,&pA_l1ml2n0, &pB_l1ml2n0, 0, "Fr_neq_l1ml2n_unit_test");
    compare_Result(&pResult_l1ml2n1, &Result1_c,&pA_l1ml2n1, &pB_l1ml2n1, 1, "Fr_neq_l1ml2n_unit_test");
    compare_Result(&pResult_l1ml2n2, &Result2_c,&pA_l1ml2n2, &pB_l1ml2n2, 2, "Fr_neq_l1ml2n_unit_test");
    compare_Result(&pResult_l1ml2n3, &Result3_c,&pA_l1ml2n3, &pB_l1ml2n3, 3, "Fr_neq_l1ml2n_unit_test");
}

void Fr_neq_l1ml2m_unit_test()
{
    //Fr_neq_l1ml2m_test 0:
    FrElement pA_l1ml2m0= {0x1,0xc0000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_l1ml2m0= {0x2,0xc0000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ml2m0= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_neq_l1ml2m_test 1:
    FrElement pA_l1ml2m1= {0x0,0xc0000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_l1ml2m1= {0x2,0xc0000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ml2m1= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_neq_l1ml2m_test 2:
    FrElement pA_l1ml2m2= {0xa1f0,0xc0000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_l1ml2m2= {0x1bb8,0xc0000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_l1ml2m2= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_neq_l1ml2m_test 3:
    FrElement pA_l1ml2m3= {0xffff,0xc0000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_l1ml2m3= {0xffff,0xc0000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_l1ml2m3= {0x0,0x0,{0x0,0x0,0x0,0x0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_neq(&Result0_c, &pA_l1ml2m0, &pB_l1ml2m0);
    Fr_neq(&Result1_c, &pA_l1ml2m1, &pB_l1ml2m1);
    Fr_neq(&Result2_c, &pA_l1ml2m2, &pB_l1ml2m2);
    Fr_neq(&Result3_c, &pA_l1ml2m3, &pB_l1ml2m3);

    compare_Result(&pResult_l1ml2m0, &Result0_c,&pA_l1ml2m0, &pB_l1ml2m0, 0, "Fr_neq_l1ml2m_unit_test");
    compare_Result(&pResult_l1ml2m1, &Result1_c,&pA_l1ml2m1, &pB_l1ml2m1, 1, "Fr_neq_l1ml2m_unit_test");
    compare_Result(&pResult_l1ml2m2, &Result2_c,&pA_l1ml2m2, &pB_l1ml2m2, 2, "Fr_neq_l1ml2m_unit_test");
    compare_Result(&pResult_l1ml2m3, &Result3_c,&pA_l1ml2m3, &pB_l1ml2m3, 3, "Fr_neq_l1ml2m_unit_test");
}

void Fr_neq_l1nl2m_unit_test()
{
    //Fr_neq_l1nl2m_test 0:
    FrElement pA_l1nl2m0= {0x1,0x80000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_l1nl2m0= {0x2,0xc0000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1nl2m0= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_neq_l1nl2m_test 1:
    FrElement pA_l1nl2m1= {0x0,0x80000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_l1nl2m1= {0x2,0xc0000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1nl2m1= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_neq_l1nl2m_test 2:
    FrElement pA_l1nl2m2= {0xa1f0,0x80000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_l1nl2m2= {0x1bb8,0xc0000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_l1nl2m2= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_neq_l1nl2m_test 3:
    FrElement pA_l1nl2m3= {0xffff,0x80000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_l1nl2m3= {0xffff,0xc0000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_l1nl2m3= {0x1,0x0,{0x0,0x0,0x0,0x0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_neq(&Result0_c, &pA_l1nl2m0, &pB_l1nl2m0);
    Fr_neq(&Result1_c, &pA_l1nl2m1, &pB_l1nl2m1);
    Fr_neq(&Result2_c, &pA_l1nl2m2, &pB_l1nl2m2);
    Fr_neq(&Result3_c, &pA_l1nl2m3, &pB_l1nl2m3);

    compare_Result(&pResult_l1nl2m0, &Result0_c,&pA_l1nl2m0, &pB_l1nl2m0, 0, "Fr_neq_l1nl2m_unit_test");
    compare_Result(&pResult_l1nl2m1, &Result1_c,&pA_l1nl2m1, &pB_l1nl2m1, 1, "Fr_neq_l1nl2m_unit_test");
    compare_Result(&pResult_l1nl2m2, &Result2_c,&pA_l1nl2m2, &pB_l1nl2m2, 2, "Fr_neq_l1nl2m_unit_test");
    compare_Result(&pResult_l1nl2m3, &Result3_c,&pA_l1nl2m3, &pB_l1nl2m3, 3, "Fr_neq_l1nl2m_unit_test");
}

// 6
void Fr_neq_s1l2m_unit_test()
{
    //Fr_neq_s1l2m_test 0:
    FrElement pA_s1l2m0= {0x1,0x0,{0x1,0x0,0x0,0x0}};
    FrElement pB_s1l2m0= {0x2,0xc0000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_s1l2m0= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_neq_s1l2m_test 1:
    FrElement pA_s1l2m1= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    FrElement pB_s1l2m1= {0x2,0xc0000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_s1l2m1= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_neq_s1l2m_test 2:
    FrElement pA_s1l2m2= {0xa1f0,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_s1l2m2= {0x1bb8,0xc0000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_s1l2m2= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_neq_s1l2m_test 3:
    FrElement pA_s1l2m3= {0xffff,0x0,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_s1l2m3= {0xffff,0xc0000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_s1l2m3= {0x1,0x0,{0x0,0x0,0x0,0x0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_neq(&Result0_c, &pA_s1l2m0, &pB_s1l2m0);
    Fr_neq(&Result1_c, &pA_s1l2m1, &pB_s1l2m1);
    Fr_neq(&Result2_c, &pA_s1l2m2, &pB_s1l2m2);
    Fr_neq(&Result3_c, &pA_s1l2m3, &pB_s1l2m3);

    compare_Result(&pResult_s1l2m0, &Result0_c,&pA_s1l2m0, &pB_s1l2m0, 0, "Fr_neq_s1l2m_unit_test");
    compare_Result(&pResult_s1l2m1, &Result1_c,&pA_s1l2m1, &pB_s1l2m1, 1, "Fr_neq_s1l2m_unit_test");
    compare_Result(&pResult_s1l2m2, &Result2_c,&pA_s1l2m2, &pB_s1l2m2, 2, "Fr_neq_s1l2m_unit_test");
    compare_Result(&pResult_s1l2m3, &Result3_c,&pA_s1l2m3, &pB_s1l2m3, 3, "Fr_neq_s1l2m_unit_test");
}

void Fr_neq_l1ms2_unit_test()
{
    //Fr_neq_l1ms2_test 0:
    FrElement pA_l1ms20= {0x1,0xc0000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_l1ms20= {0x2,0x0,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ms20= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_neq_l1ms2_test 1:
    FrElement pA_l1ms21= {0x0,0xc0000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_l1ms21= {0x2,0x0,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ms21= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_neq_l1ms2_test 2:
    FrElement pA_l1ms22= {0xa1f0,0xc0000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_l1ms22= {0x1bb8,0x0,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_l1ms22= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_neq_l1ms2_test 3:
    FrElement pA_l1ms23= {0xffff,0xc0000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_l1ms23= {0xffff,0x0,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_l1ms23= {0x1,0x0,{0x0,0x0,0x0,0x0}};


    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_neq(&Result0_c, &pA_l1ms20, &pB_l1ms20);
    Fr_neq(&Result1_c, &pA_l1ms21, &pB_l1ms21);
    Fr_neq(&Result2_c, &pA_l1ms22, &pB_l1ms22);
    Fr_neq(&Result3_c, &pA_l1ms23, &pB_l1ms23);

    compare_Result(&pResult_l1ms20, &Result0_c,&pA_l1ms20, &pB_l1ms20, 0, "Fr_neq_l1ms2_unit_test");
    compare_Result(&pResult_l1ms21, &Result1_c,&pA_l1ms21, &pB_l1ms21, 1, "Fr_neq_l1ms2_unit_test");
    compare_Result(&pResult_l1ms22, &Result2_c,&pA_l1ms22, &pB_l1ms22, 2, "Fr_neq_l1ms2_unit_test");
    compare_Result(&pResult_l1ms23, &Result3_c,&pA_l1ms23, &pB_l1ms23, 3, "Fr_neq_l1ms2_unit_test");
}

void Fr_neq_l1ns2_unit_test()
{
    //Fr_neq_l1ns2_test 0:
    FrElement pA_l1ns20= {0x1,0x80000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_l1ns20= {0x2,0x0,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ns20= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_neq_l1ns2_test 1:
    FrElement pA_l1ns21= {0x0,0x80000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_l1ns21= {0x2,0x0,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ns21= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_neq_l1ns2_test 2:
    FrElement pA_l1ns22= {0xa1f0,0x80000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_l1ns22= {0x1bb8,0x0,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_l1ns22= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_neq_l1ns2_test 3:
    FrElement pA_l1ns23= {0xffff,0x80000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_l1ns23= {0xffff,0x0,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_l1ns23= {0x1,0x0,{0x0,0x0,0x0,0x0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_neq(&Result0_c, &pA_l1ns20, &pB_l1ns20);
    Fr_neq(&Result1_c, &pA_l1ns21, &pB_l1ns21);
    Fr_neq(&Result2_c, &pA_l1ns22, &pB_l1ns22);
    Fr_neq(&Result3_c, &pA_l1ns23, &pB_l1ns23);

    compare_Result(&pResult_l1ns20, &Result0_c,&pA_l1ns20, &pB_l1ns20, 0, "Fr_neq_l1ns2_unit_test");
    compare_Result(&pResult_l1ns21, &Result1_c,&pA_l1ns21, &pB_l1ns21, 1, "Fr_neq_l1ns2_unit_test");
    compare_Result(&pResult_l1ns22, &Result2_c,&pA_l1ns22, &pB_l1ns22, 2, "Fr_neq_l1ns2_unit_test");
    compare_Result(&pResult_l1ns23, &Result3_c,&pA_l1ns23, &pB_l1ns23, 3, "Fr_neq_l1ns2_unit_test");
}

void Fr_neq_s1l2n_unit_test()
{
    //Fr_neq_s1l2n_test 0:
    FrElement pA_s1l2n0= {0x1,0x0,{0x1,0x0,0x0,0x0}};
    FrElement pB_s1l2n0= {0x2,0x80000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_s1l2n0= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_neq_s1l2n_test 1:
    FrElement pA_s1l2n1= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    FrElement pB_s1l2n1= {0x2,0x80000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_s1l2n1= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_neq_s1l2n_test 2:
    FrElement pA_s1l2n2= {0xa1f0,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_s1l2n2= {0x1bb8,0x80000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_s1l2n2= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_neq_s1l2n_test 3:
    FrElement pA_s1l2n3= {0xffff,0x0,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_s1l2n3= {0xffff,0x80000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_s1l2n3= {0x1,0x0,{0x0,0x0,0x0,0x0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_neq(&Result0_c, &pA_s1l2n0, &pB_s1l2n0);
    Fr_neq(&Result1_c, &pA_s1l2n1, &pB_s1l2n1);
    Fr_neq(&Result2_c, &pA_s1l2n2, &pB_s1l2n2);
    Fr_neq(&Result3_c, &pA_s1l2n3, &pB_s1l2n3);

    compare_Result(&pResult_s1l2n0, &Result0_c,&pA_s1l2n0, &pB_s1l2n0, 0, "Fr_neq_s1l2n_unit_test");
    compare_Result(&pResult_s1l2n1, &Result1_c,&pA_s1l2n1, &pB_s1l2n1, 1, "Fr_neq_s1l2n_unit_test");
    compare_Result(&pResult_s1l2n2, &Result2_c,&pA_s1l2n2, &pB_s1l2n2, 2, "Fr_neq_s1l2n_unit_test");
    compare_Result(&pResult_s1l2n3, &Result3_c,&pA_s1l2n3, &pB_s1l2n3, 3, "Fr_neq_s1l2n_unit_test");
}

void Fr_gt_s1s2_unit_test()
{
    //Fr_gt_s1s2_test 0:
    FrElement pA_s1s20= {0x1,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_s1s20= {0x2,0x0,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_s1s20= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_gt_s1s2_test 1:
    FrElement pA_s1s21= {0x0,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_s1s21= {0x2,0x0,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_s1s21= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_gt_s1s2_test 2:
    FrElement pA_s1s22= {0xa1f0,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_s1s22= {0x1bb8,0x0,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_s1s22= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_gt_s1s2_test 3:
    FrElement pA_s1s23= {0x7fffffff,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_s1s23= {0x7fffffff,0x0,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_s1s23= {0x0,0x0,{0x0,0x0,0x0,0x0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_gt(&Result0_c, &pA_s1s20, &pB_s1s20);
    Fr_gt(&Result1_c, &pA_s1s21, &pB_s1s21);
    Fr_gt(&Result2_c, &pA_s1s22, &pB_s1s22);
    Fr_gt(&Result3_c, &pA_s1s23, &pB_s1s23);

    compare_Result(&pResult_s1s20, &Result0_c,&pA_s1s20, &pB_s1s20, 0, "Fr_gt_s1s2_unit_test");
    compare_Result(&pResult_s1s21, &Result1_c,&pA_s1s21, &pB_s1s21, 1, "Fr_gt_s1s2_unit_test");
    compare_Result(&pResult_s1s22, &Result2_c,&pA_s1s22, &pB_s1s22, 2, "Fr_gt_s1s2_unit_test");
    compare_Result(&pResult_s1s23, &Result3_c,&pA_s1s23, &pB_s1s23, 3, "Fr_gt_s1s2_unit_test");
}

void Fr_gt_l1nl2n_unit_test()
{
    //Fr_gt_l1nl2n_test 0:
    FrElement pA_l1nl2n0= {0x1,0x80000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_l1nl2n0= {0x2,0x80000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1nl2n0= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_gt_l1nl2n_test 1:
    FrElement pA_l1nl2n1= {0x0,0x80000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_l1nl2n1= {0x2,0x80000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1nl2n1= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_gt_l1nl2n_test 2:
    FrElement pA_l1nl2n2= {0xa1f0,0x80000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_l1nl2n2= {0x1bb8,0x80000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_l1nl2n2= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_gt_l1nl2n_test 3:
    FrElement pA_l1nl2n3= {0xffff,0x80000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_l1nl2n3= {0xffff,0x80000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_l1nl2n3= {0x0,0x0,{0x0,0x0,0x0,0x0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_gt(&Result0_c, &pA_l1nl2n0, &pB_l1nl2n0);
    Fr_gt(&Result1_c, &pA_l1nl2n1, &pB_l1nl2n1);
    Fr_gt(&Result2_c, &pA_l1nl2n2, &pB_l1nl2n2);
    Fr_gt(&Result3_c, &pA_l1nl2n3, &pB_l1nl2n3);

    compare_Result(&pResult_l1nl2n0, &Result0_c,&pA_l1nl2n0, &pB_l1nl2n0, 0, "Fr_gt_l1nl2n_unit_test");
    compare_Result(&pResult_l1nl2n1, &Result1_c,&pA_l1nl2n1, &pB_l1nl2n1, 1, "Fr_gt_l1nl2n_unit_test");
    compare_Result(&pResult_l1nl2n2, &Result2_c,&pA_l1nl2n2, &pB_l1nl2n2, 2, "Fr_gt_l1nl2n_unit_test");
    compare_Result(&pResult_l1nl2n3, &Result3_c,&pA_l1nl2n3, &pB_l1nl2n3, 3, "Fr_gt_l1nl2n_unit_test");
}

void Fr_gt_l1ml2n_unit_test()
{
    //Fr_gt_l1ml2n_test 0:
    FrElement pA_l1ml2n0= {0x1,0xc0000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_l1ml2n0= {0x2,0x80000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ml2n0= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_gt_l1ml2n_test 1:
    FrElement pA_l1ml2n1= {0x0,0xc0000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_l1ml2n1= {0x2,0x80000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ml2n1= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_gt_l1ml2n_test 2:
    FrElement pA_l1ml2n2= {0xa1f0,0xc0000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_l1ml2n2= {0x1bb8,0x80000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_l1ml2n2= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_gt_l1ml2n_test 3:
    FrElement pA_l1ml2n3= {0xffff,0xc0000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_l1ml2n3= {0xffff,0x80000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_l1ml2n3= {0x0,0x0,{0x0,0x0,0x0,0x0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_gt(&Result0_c, &pA_l1ml2n0, &pB_l1ml2n0);
    Fr_gt(&Result1_c, &pA_l1ml2n1, &pB_l1ml2n1);
    Fr_gt(&Result2_c, &pA_l1ml2n2, &pB_l1ml2n2);
    Fr_gt(&Result3_c, &pA_l1ml2n3, &pB_l1ml2n3);

    compare_Result(&pResult_l1ml2n0, &Result0_c,&pA_l1ml2n0, &pB_l1ml2n0, 0, "Fr_gt_l1ml2n_unit_test");
    compare_Result(&pResult_l1ml2n1, &Result1_c,&pA_l1ml2n1, &pB_l1ml2n1, 1, "Fr_gt_l1ml2n_unit_test");
    compare_Result(&pResult_l1ml2n2, &Result2_c,&pA_l1ml2n2, &pB_l1ml2n2, 2, "Fr_gt_l1ml2n_unit_test");
    compare_Result(&pResult_l1ml2n3, &Result3_c,&pA_l1ml2n3, &pB_l1ml2n3, 3, "Fr_gt_l1ml2n_unit_test");
}

void Fr_gt_l1ml2m_unit_test()
{
    //Fr_gt_l1ml2m_test 0:
    FrElement pA_l1ml2m0= {0x1,0xc0000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_l1ml2m0= {0x2,0xc0000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ml2m0= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_gt_l1ml2m_test 1:
    FrElement pA_l1ml2m1= {0x0,0xc0000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_l1ml2m1= {0x2,0xc0000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ml2m1= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_gt_l1ml2m_test 2:
    FrElement pA_l1ml2m2= {0xa1f0,0xc0000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_l1ml2m2= {0x1bb8,0xc0000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_l1ml2m2= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_gt_l1ml2m_test 3:
    FrElement pA_l1ml2m3= {0xffff,0xc0000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_l1ml2m3= {0xffff,0xc0000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_l1ml2m3= {0x0,0x0,{0x0,0x0,0x0,0x0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_gt(&Result0_c, &pA_l1ml2m0, &pB_l1ml2m0);
    Fr_gt(&Result1_c, &pA_l1ml2m1, &pB_l1ml2m1);
    Fr_gt(&Result2_c, &pA_l1ml2m2, &pB_l1ml2m2);
    Fr_gt(&Result3_c, &pA_l1ml2m3, &pB_l1ml2m3);

    compare_Result(&pResult_l1ml2m0, &Result0_c,&pA_l1ml2m0, &pB_l1ml2m0, 0, "Fr_gt_l1ml2m_unit_test");
    compare_Result(&pResult_l1ml2m1, &Result1_c,&pA_l1ml2m1, &pB_l1ml2m1, 1, "Fr_gt_l1ml2m_unit_test");
    compare_Result(&pResult_l1ml2m2, &Result2_c,&pA_l1ml2m2, &pB_l1ml2m2, 2, "Fr_gt_l1ml2m_unit_test");
    compare_Result(&pResult_l1ml2m3, &Result3_c,&pA_l1ml2m3, &pB_l1ml2m3, 3, "Fr_gt_l1ml2m_unit_test");
}

void Fr_gt_l1nl2m_unit_test()
{
    //Fr_gt_l1nl2m_test 0:
    FrElement pA_l1nl2m0= {0x1,0x80000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_l1nl2m0= {0x2,0xc0000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1nl2m0= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_gt_l1nl2m_test 1:
    FrElement pA_l1nl2m1= {0x0,0x80000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_l1nl2m1= {0x2,0xc0000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1nl2m1= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_gt_l1nl2m_test 2:
    FrElement pA_l1nl2m2= {0xa1f0,0x80000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_l1nl2m2= {0x1bb8,0xc0000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_l1nl2m2= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_gt_l1nl2m_test 3:
    FrElement pA_l1nl2m3= {0xffff,0x80000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_l1nl2m3= {0xffff,0xc0000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_l1nl2m3= {0x1,0x0,{0x0,0x0,0x0,0x0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_gt(&Result0_c, &pA_l1nl2m0, &pB_l1nl2m0);
    Fr_gt(&Result1_c, &pA_l1nl2m1, &pB_l1nl2m1);
    Fr_gt(&Result2_c, &pA_l1nl2m2, &pB_l1nl2m2);
    Fr_gt(&Result3_c, &pA_l1nl2m3, &pB_l1nl2m3);

    compare_Result(&pResult_l1nl2m0, &Result0_c,&pA_l1nl2m0, &pB_l1nl2m0,0, "Fr_gt_l1nl2m_unit_test");
    compare_Result(&pResult_l1nl2m1, &Result1_c,&pA_l1nl2m1, &pB_l1nl2m1,1, "Fr_gt_l1nl2m_unit_test");
    compare_Result(&pResult_l1nl2m2, &Result2_c,&pA_l1nl2m2, &pB_l1nl2m2,2, "Fr_gt_l1nl2m_unit_test");
    compare_Result(&pResult_l1nl2m3, &Result3_c,&pA_l1nl2m3, &pB_l1nl2m3,3, "Fr_gt_l1nl2m_unit_test");
}

void Fr_gt_s1l2m_unit_test()
{
    //Fr_gt_s1l2m_test 0:
    FrElement pA_s1l2m0= {0x1,0x0,{0x1,0x0,0x0,0x0}};
    FrElement pB_s1l2m0= {0x2,0xc0000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_s1l2m0= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_gt_s1l2m_test 1:
    FrElement pA_s1l2m1= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    FrElement pB_s1l2m1= {0x2,0xc0000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_s1l2m1= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_gt_s1l2m_test 2:
    FrElement pA_s1l2m2= {0xa1f0,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_s1l2m2= {0x1bb8,0xc0000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_s1l2m2= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_gt_s1l2m_test 3:
    FrElement pA_s1l2m3= {0xffff,0x0,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_s1l2m3= {0xffff,0xc0000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_s1l2m3= {0x1,0x0,{0x0,0x0,0x0,0x0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_gt(&Result0_c, &pA_s1l2m0, &pB_s1l2m0);
    Fr_gt(&Result1_c, &pA_s1l2m1, &pB_s1l2m1);
    Fr_gt(&Result2_c, &pA_s1l2m2, &pB_s1l2m2);
    Fr_gt(&Result3_c, &pA_s1l2m3, &pB_s1l2m3);

    compare_Result(&pResult_s1l2m0, &Result0_c,&pA_s1l2m0, &pB_s1l2m0, 0, "Fr_gt_s1l2m_unit_test");
    compare_Result(&pResult_s1l2m1, &Result1_c,&pA_s1l2m1, &pB_s1l2m1, 1, "Fr_gt_s1l2m_unit_test");
    compare_Result(&pResult_s1l2m2, &Result2_c,&pA_s1l2m2, &pB_s1l2m2, 2, "Fr_gt_s1l2m_unit_test");
    compare_Result(&pResult_s1l2m3, &Result3_c,&pA_s1l2m3, &pB_s1l2m3, 3, "Fr_gt_s1l2m_unit_test");
}

void Fr_gt_l1ms2_unit_test()
{
    //Fr_gt_l1ms2_test 0:
    FrElement pA_l1ms20= {0x1,0xc0000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_l1ms20= {0x2,0x0,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ms20= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_gt_l1ms2_test 1:
    FrElement pA_l1ms21= {0x0,0xc0000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_l1ms21= {0x2,0x0,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ms21= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_gt_l1ms2_test 2:
    FrElement pA_l1ms22= {0xa1f0,0xc0000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_l1ms22= {0x1bb8,0x0,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_l1ms22= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_gt_l1ms2_test 3:
    FrElement pA_l1ms23= {0xffff,0xc0000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_l1ms23= {0xffff,0x0,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_l1ms23= {0x0,0x0,{0x0,0x0,0x0,0x0}};


    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_gt(&Result0_c, &pA_l1ms20, &pB_l1ms20);
    Fr_gt(&Result1_c, &pA_l1ms21, &pB_l1ms21);
    Fr_gt(&Result2_c, &pA_l1ms22, &pB_l1ms22);
    Fr_gt(&Result3_c, &pA_l1ms23, &pB_l1ms23);

    compare_Result(&pResult_l1ms20, &Result0_c,&pA_l1ms20, &pB_l1ms20, 0, "Fr_gt_l1ms2_unit_test");
    compare_Result(&pResult_l1ms21, &Result1_c,&pA_l1ms21, &pB_l1ms21, 1, "Fr_gt_l1ms2_unit_test");
    compare_Result(&pResult_l1ms22, &Result2_c,&pA_l1ms22, &pB_l1ms22, 2, "Fr_gt_l1ms2_unit_test");
    compare_Result(&pResult_l1ms23, &Result3_c,&pA_l1ms23, &pB_l1ms23, 3, "Fr_gt_l1ms2_unit_test");
}

void Fr_gt_l1ns2_unit_test()
{
    //Fr_gt_l1ns2_test 0:
    FrElement pA_l1ns20= {0x1,0x80000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_l1ns20= {0x2,0x0,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ns20= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_gt_l1ns2_test 1:
    FrElement pA_l1ns21= {0x0,0x80000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_l1ns21= {0x2,0x0,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ns21= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_gt_l1ns2_test 2:
    FrElement pA_l1ns22= {0xa1f0,0x80000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_l1ns22= {0x1bb8,0x0,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_l1ns22= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_gt_l1ns2_test 3:
    FrElement pA_l1ns23= {0xffff,0x80000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_l1ns23= {0xffff,0x0,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_l1ns23= {0x0,0x0,{0x0,0x0,0x0,0x0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_gt(&Result0_c, &pA_l1ns20, &pB_l1ns20);
    Fr_gt(&Result1_c, &pA_l1ns21, &pB_l1ns21);
    Fr_gt(&Result2_c, &pA_l1ns22, &pB_l1ns22);
    Fr_gt(&Result3_c, &pA_l1ns23, &pB_l1ns23);

    compare_Result(&pResult_l1ns20, &Result0_c,&pA_l1ns20, &pB_l1ns20, 0, "Fr_gt_l1ns2_unit_test");
    compare_Result(&pResult_l1ns21, &Result1_c,&pA_l1ns21, &pB_l1ns21, 1, "Fr_gt_l1ns2_unit_test");
    compare_Result(&pResult_l1ns22, &Result2_c,&pA_l1ns22, &pB_l1ns22, 2, "Fr_gt_l1ns2_unit_test");
    compare_Result(&pResult_l1ns23, &Result3_c,&pA_l1ns23, &pB_l1ns23, 3, "Fr_gt_l1ns2_unit_test");
}

void Fr_gt_s1l2n_unit_test()
{
    //Fr_gt_s1l2n_test 0:
    FrElement pA_s1l2n0= {0x1,0x0,{0x1,0x0,0x0,0x0}};
    FrElement pB_s1l2n0= {0x2,0x80000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_s1l2n0= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_gt_s1l2n_test 1:
    FrElement pA_s1l2n1= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    FrElement pB_s1l2n1= {0x2,0x80000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_s1l2n1= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_gt_s1l2n_test 2:
    FrElement pA_s1l2n2= {0xa1f0,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_s1l2n2= {0x1bb8,0x80000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_s1l2n2= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_gt_s1l2n_test 3:
    FrElement pA_s1l2n3= {0xffff,0x0,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_s1l2n3= {0xffff,0x80000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_s1l2n3= {0x1,0x0,{0x0,0x0,0x0,0x0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_gt(&Result0_c, &pA_s1l2n0, &pB_s1l2n0);
    Fr_gt(&Result1_c, &pA_s1l2n1, &pB_s1l2n1);
    Fr_gt(&Result2_c, &pA_s1l2n2, &pB_s1l2n2);
    Fr_gt(&Result3_c, &pA_s1l2n3, &pB_s1l2n3);

    compare_Result(&pResult_s1l2n0, &Result0_c,&pA_s1l2n0, &pB_s1l2n0, 0, "Fr_gt_s1l2n_unit_test");
    compare_Result(&pResult_s1l2n1, &Result1_c,&pA_s1l2n1, &pB_s1l2n1, 1, "Fr_gt_s1l2n_unit_test");
    compare_Result(&pResult_s1l2n2, &Result2_c,&pA_s1l2n2, &pB_s1l2n2, 2, "Fr_gt_s1l2n_unit_test");
    compare_Result(&pResult_s1l2n3, &Result3_c,&pA_s1l2n3, &pB_s1l2n3, 3, "Fr_gt_s1l2n_unit_test");
}

void Fr_leq_s1l2n_unit_test()
{
    //Fr_leq_s1l2n_test 0:
    FrElement pA_s1l2n0= {0x1,0x0,{0x1,0x0,0x0,0x0}};
    FrElement pB_s1l2n0= {0x2,0x80000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_s1l2n0= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_leq_s1l2n_test 1:
    FrElement pA_s1l2n1= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    FrElement pB_s1l2n1= {0x2,0x80000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_s1l2n1= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_leq_s1l2n_test 2:
    FrElement pA_s1l2n2= {0xa1f0,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_s1l2n2= {0x1bb8,0x80000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_s1l2n2= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_leq_s1l2n_test 3:
    FrElement pA_s1l2n3= {0xffff,0x0,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_s1l2n3= {0xffff,0x80000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_s1l2n3= {0x0,0x0,{0x0,0x0,0x0,0x0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_leq(&Result0_c, &pA_s1l2n0, &pB_s1l2n0);
    Fr_leq(&Result1_c, &pA_s1l2n1, &pB_s1l2n1);
    Fr_leq(&Result2_c, &pA_s1l2n2, &pB_s1l2n2);
    Fr_leq(&Result3_c, &pA_s1l2n3, &pB_s1l2n3);

    compare_Result(&pResult_s1l2n0, &Result0_c,&pA_s1l2n0, &pB_s1l2n0, 0, "Fr_leq_s1l2n_unit_test");
    compare_Result(&pResult_s1l2n1, &Result1_c,&pA_s1l2n1, &pB_s1l2n1, 1, "Fr_leq_s1l2n_unit_test");
    compare_Result(&pResult_s1l2n2, &Result2_c,&pA_s1l2n2, &pB_s1l2n2, 2, "Fr_leq_s1l2n_unit_test");
    compare_Result(&pResult_s1l2n3, &Result3_c,&pA_s1l2n3, &pB_s1l2n3, 3, "Fr_leq_s1l2n_unit_test");
}

void Fr_band_s1s2_unit_test()
{
    //Fr_band_s1s2_test 0:
    FrElement pA_s1s20= {0x1,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_s1s20= {0x2,0x0,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_s1s20= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_band_s1s2_test 1:
    FrElement pA_s1s21= {0x0,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_s1s21= {0x2,0x0,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_s1s21= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_band_s1s2_test 2:
    FrElement pA_s1s22= {0xa1f0,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_s1s22= {0x1bb8,0x0,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_s1s22= {0x1b0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_band_s1s2_test 3:
    FrElement pA_s1s23= {0x7fffffff,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_s1s23= {0x7fffffff,0x0,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_s1s23= {0x7fffffff,0x0,{0x0,0x0,0x0,0x0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_band(&Result0_c, &pA_s1s20, &pB_s1s20);
    Fr_band(&Result1_c, &pA_s1s21, &pB_s1s21);
    Fr_band(&Result2_c, &pA_s1s22, &pB_s1s22);
    Fr_band(&Result3_c, &pA_s1s23, &pB_s1s23);

    compare_Result(&pResult_s1s20, &Result0_c,&pA_s1s20, &pB_s1s20, 0, "Fr_band_s1s2_unit_test");
    compare_Result(&pResult_s1s21, &Result1_c,&pA_s1s21, &pB_s1s21, 1, "Fr_band_s1s2_unit_test");
    compare_Result(&pResult_s1s22, &Result2_c,&pA_s1s22, &pB_s1s22, 2, "Fr_band_s1s2_unit_test");
    compare_Result(&pResult_s1s23, &Result3_c,&pA_s1s23, &pB_s1s23, 3, "Fr_band_s1s2_unit_test");
}

void Fr_band_l1nl2n_unit_test()
{
    //Fr_band_l1nl2n_test 0:
    FrElement pA_l1nl2n0= {0x1,0x80000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_l1nl2n0= {0x2,0x80000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1nl2n0= {0x0,0x80000000,{0x0,0x0,0x0,0x0}};
    //Fr_band_l1nl2n_test 1:
    FrElement pA_l1nl2n1= {0x0,0x80000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_l1nl2n1= {0x2,0x80000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1nl2n1= {0x0,0x80000000,{0x0,0x0,0x0,0x0}};
    //Fr_band_l1nl2n_test 2:
    FrElement pA_l1nl2n2= {0xa1f0,0x80000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_l1nl2n2= {0x1bb8,0x80000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_l1nl2n2= {0x0,0x80000000,{0x1b0e241a8000000,0x10183020205c1840,0x8c08021940808004,0x12003170084004}};
    //Fr_band_l1nl2n_test 3:
    FrElement pA_l1nl2n3= {0xffff,0x80000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_l1nl2n3= {0xffff,0x80000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_l1nl2n3= {0x0,0x80000000,{0xbc1e0a6c0ffffffe,0xd7cc17b786468f6e,0x47afba497e7ea7a2,0xf9bb18d1ece5fd6}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_band(&Result0_c, &pA_l1nl2n0, &pB_l1nl2n0);
    Fr_band(&Result1_c, &pA_l1nl2n1, &pB_l1nl2n1);
    Fr_band(&Result2_c, &pA_l1nl2n2, &pB_l1nl2n2);
    Fr_band(&Result3_c, &pA_l1nl2n3, &pB_l1nl2n3);

    compare_Result(&pResult_l1nl2n0, &Result0_c,&pA_l1nl2n0, &pB_l1nl2n0, 0, "Fr_band_l1nl2n_unit_test");
    compare_Result(&pResult_l1nl2n1, &Result1_c,&pA_l1nl2n1, &pB_l1nl2n1, 1, "Fr_band_l1nl2n_unit_test");
    compare_Result(&pResult_l1nl2n2, &Result2_c,&pA_l1nl2n2, &pB_l1nl2n2, 2, "Fr_band_l1nl2n_unit_test");
    compare_Result(&pResult_l1nl2n3, &Result3_c,&pA_l1nl2n3, &pB_l1nl2n3, 3, "Fr_band_l1nl2n_unit_test");
}

void Fr_band_l1ml2n_unit_test()
{
    //Fr_band_l1ml2n_test 0:
    FrElement pA_l1ml2n0= {0x1,0xc0000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_l1ml2n0= {0x2,0x80000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ml2n0= {0x0,0x80000000,{0x2,0x0,0x0,0x0}};
    //Fr_band_l1ml2n_test 1:
    FrElement pA_l1ml2n1= {0x0,0xc0000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_l1ml2n1= {0x2,0x80000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ml2n1= {0x0,0x80000000,{0x0,0x0,0x0,0x0}};
    //Fr_band_l1ml2n_test 2:
    FrElement pA_l1ml2n2= {0xa1f0,0xc0000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_l1ml2n2= {0x1bb8,0x80000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_l1ml2n2= {0x0,0x80000000,{0x11b0240128216102,0x3ac283181105841,0x409020402210084,0x650801f4e4481}};
    //Fr_band_l1ml2n_test 3:
    FrElement pA_l1ml2n3= {0xffff,0xc0000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_l1ml2n3= {0xffff,0x80000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_l1ml2n3= {0x0,0x80000000,{0x6786558e824ee6b4,0x1f24f29e98a78409,0xf02a37d1d2c8fb00,0x1a7855215e6c4b0c}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_band(&Result0_c, &pA_l1ml2n0, &pB_l1ml2n0);
    Fr_band(&Result1_c, &pA_l1ml2n1, &pB_l1ml2n1);
    Fr_band(&Result2_c, &pA_l1ml2n2, &pB_l1ml2n2);
    Fr_band(&Result3_c, &pA_l1ml2n3, &pB_l1ml2n3);

    compare_Result(&pResult_l1ml2n0, &Result0_c,&pA_l1ml2n0, &pB_l1ml2n0, 0, "Fr_band_l1ml2n_unit_test");
    compare_Result(&pResult_l1ml2n1, &Result1_c,&pA_l1ml2n1, &pB_l1ml2n1, 1, "Fr_band_l1ml2n_unit_test");
    compare_Result(&pResult_l1ml2n2, &Result2_c,&pA_l1ml2n2, &pB_l1ml2n2, 2, "Fr_band_l1ml2n_unit_test");
    compare_Result(&pResult_l1ml2n3, &Result3_c,&pA_l1ml2n3, &pB_l1ml2n3, 3, "Fr_band_l1ml2n_unit_test");
}

void Fr_band_l1ml2m_unit_test()
{
    //Fr_band_l1ml2m_test 0:
    FrElement pA_l1ml2m0= {0x1,0xc0000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_l1ml2m0= {0x2,0xc0000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ml2m0= {0x0,0x80000000,{0x981300004920100c,0xce101c001c807,0x800409c00c301818,0x1c3f00100800018}};
    //Fr_band_l1ml2m_test 1:
    FrElement pA_l1ml2m1= {0x0,0xc0000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_l1ml2m1= {0x2,0xc0000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ml2m1= {0x0,0x80000000,{0x0,0x0,0x0,0x0}};
    //Fr_band_l1ml2m_test 2:
    FrElement pA_l1ml2m2= {0xa1f0,0xc0000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_l1ml2m2= {0x1bb8,0xc0000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_l1ml2m2= {0x0,0x80000000,{0x49424100927735a,0x22ac641189204809,0x442c22442821002e,0x40a51c01a06d50b}};
    //Fr_band_l1ml2m_test 3:
    FrElement pA_l1ml2m3= {0xffff,0xc0000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_l1ml2m3= {0xffff,0xc0000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_l1ml2m3= {0x0,0x80000000,{0x6786558e824ee6b4,0x1f24f29e98a78409,0xf02a37d1d2c8fb00,0x1a7855215e6c4b0c}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_band(&Result0_c, &pA_l1ml2m0, &pB_l1ml2m0);
    Fr_band(&Result1_c, &pA_l1ml2m1, &pB_l1ml2m1);
    Fr_band(&Result2_c, &pA_l1ml2m2, &pB_l1ml2m2);
    Fr_band(&Result3_c, &pA_l1ml2m3, &pB_l1ml2m3);

    compare_Result(&pResult_l1ml2m0, &Result0_c,&pA_l1ml2m0, &pB_l1ml2m0, 0, "Fr_band_l1ml2m_unit_test");
    compare_Result(&pResult_l1ml2m1, &Result1_c,&pA_l1ml2m1, &pB_l1ml2m1, 1, "Fr_band_l1ml2m_unit_test");
    compare_Result(&pResult_l1ml2m2, &Result2_c,&pA_l1ml2m2, &pB_l1ml2m2, 2, "Fr_band_l1ml2m_unit_test");
    compare_Result(&pResult_l1ml2m3, &Result3_c,&pA_l1ml2m3, &pB_l1ml2m3, 3, "Fr_band_l1ml2m_unit_test");
}

void Fr_band_l1nl2m_unit_test()
{
    //Fr_band_l1nl2m_test 0:
    FrElement pA_l1nl2m0= {0x1,0x80000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_l1nl2m0= {0x2,0xc0000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1nl2m0= {0x0,0x80000000,{0x0,0x0,0x0,0x0}};
    //Fr_band_l1nl2m_test 1:
    FrElement pA_l1nl2m1= {0x0,0x80000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_l1nl2m1= {0x2,0xc0000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1nl2m1= {0x0,0x80000000,{0x0,0x0,0x0,0x0}};
    //Fr_band_l1nl2m_test 2:
    FrElement pA_l1nl2m2= {0xa1f0,0x80000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_l1nl2m2= {0x1bb8,0xc0000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_l1nl2m2= {0x0,0x80000000,{0xa090300848000000,0x141874041c408808,0x4428224b4040042e,0x80227011000d004}};
    //Fr_band_l1nl2m_test 3:
    FrElement pA_l1nl2m3= {0xffff,0x80000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_l1nl2m3= {0xffff,0xc0000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_l1nl2m3= {0x0,0x80000000,{0x6786558e824ee6b4,0x1f24f29e98a78409,0xf02a37d1d2c8fb00,0x1a7855215e6c4b0c}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_band(&Result0_c, &pA_l1nl2m0, &pB_l1nl2m0);
    Fr_band(&Result1_c, &pA_l1nl2m1, &pB_l1nl2m1);
    Fr_band(&Result2_c, &pA_l1nl2m2, &pB_l1nl2m2);
    Fr_band(&Result3_c, &pA_l1nl2m3, &pB_l1nl2m3);

    compare_Result(&pResult_l1nl2m0, &Result0_c,&pA_l1nl2m0, &pB_l1nl2m0, 0, "Fr_band_l1nl2m_unit_test");
    compare_Result(&pResult_l1nl2m1, &Result1_c,&pA_l1nl2m1, &pB_l1nl2m1, 1, "Fr_band_l1nl2m_unit_test");
    compare_Result(&pResult_l1nl2m2, &Result2_c,&pA_l1nl2m2, &pB_l1nl2m2, 2, "Fr_band_l1nl2m_unit_test");
    compare_Result(&pResult_l1nl2m3, &Result3_c,&pA_l1nl2m3, &pB_l1nl2m3, 3, "Fr_band_l1nl2m_unit_test");
}

void Fr_band_s1l2m_unit_test()
{
    //Fr_band_s1l2m_test 0:
    FrElement pA_s1l2m0= {0x1,0x0,{0x1,0x0,0x0,0x0}};
    FrElement pB_s1l2m0= {0x2,0xc0000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_s1l2m0= {0x0,0x80000000,{0x0,0x0,0x0,0x0}};
    //Fr_band_s1l2m_test 1:
    FrElement pA_s1l2m1= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    FrElement pB_s1l2m1= {0x2,0xc0000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_s1l2m1= {0x0,0x80000000,{0x0,0x0,0x0,0x0}};
    //Fr_band_s1l2m_test 2:
    FrElement pA_s1l2m2= {0xa1f0,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_s1l2m2= {0x1bb8,0xc0000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_s1l2m2= {0x0,0x80000000,{0xa1f0,0x0,0x0,0x0}};
    //Fr_band_s1l2m_test 3:
    FrElement pA_s1l2m3= {0xffff,0x0,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_s1l2m3= {0xffff,0xc0000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_s1l2m3= {0x0,0x80000000,{0xe6b4,0x0,0x0,0x0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_band(&Result0_c, &pA_s1l2m0, &pB_s1l2m0);
    Fr_band(&Result1_c, &pA_s1l2m1, &pB_s1l2m1);
    Fr_band(&Result2_c, &pA_s1l2m2, &pB_s1l2m2);
    Fr_band(&Result3_c, &pA_s1l2m3, &pB_s1l2m3);

    compare_Result(&pResult_s1l2m0, &Result0_c,&pA_s1l2m0, &pB_s1l2m0, 0, "Fr_band_s1l2m_unit_test");
    compare_Result(&pResult_s1l2m1, &Result1_c,&pA_s1l2m1, &pB_s1l2m1, 1, "Fr_band_s1l2m_unit_test");
    compare_Result(&pResult_s1l2m2, &Result2_c,&pA_s1l2m2, &pB_s1l2m2, 2, "Fr_band_s1l2m_unit_test");
    compare_Result(&pResult_s1l2m3, &Result3_c,&pA_s1l2m3, &pB_s1l2m3, 3, "Fr_band_s1l2m_unit_test");
}

void Fr_band_l1ms2_unit_test()
{
    //Fr_band_l1ms2_test 0:
    FrElement pA_l1ms20= {0x1,0xc0000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_l1ms20= {0x2,0x0,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ms20= {0x0,0x80000000,{0x2,0x0,0x0,0x0}};
    //Fr_band_l1ms2_test 1:
    FrElement pA_l1ms21= {0x0,0xc0000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_l1ms21= {0x2,0x0,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ms21= {0x0,0x80000000,{0x0,0x0,0x0,0x0}};
    //Fr_band_l1ms2_test 2:
    FrElement pA_l1ms22= {0xa1f0,0xc0000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_l1ms22= {0x1bb8,0x0,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_l1ms22= {0x0,0x80000000,{0x1318,0x0,0x0,0x0}};
    //Fr_band_l1ms2_test 3:
    FrElement pA_l1ms23= {0xffff,0xc0000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_l1ms23= {0xffff,0x0,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_l1ms23= {0x0,0x80000000,{0xe6b4,0x0,0x0,0x0}};


    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_band(&Result0_c, &pA_l1ms20, &pB_l1ms20);
    Fr_band(&Result1_c, &pA_l1ms21, &pB_l1ms21);
    Fr_band(&Result2_c, &pA_l1ms22, &pB_l1ms22);
    Fr_band(&Result3_c, &pA_l1ms23, &pB_l1ms23);

    compare_Result(&pResult_l1ms20, &Result0_c,&pA_l1ms20, &pB_l1ms20, 0, "Fr_band_l1ms2_unit_test");
    compare_Result(&pResult_l1ms21, &Result1_c,&pA_l1ms21, &pB_l1ms21, 1, "Fr_band_l1ms2_unit_test");
    compare_Result(&pResult_l1ms22, &Result2_c,&pA_l1ms22, &pB_l1ms22, 2, "Fr_band_l1ms2_unit_test");
    compare_Result(&pResult_l1ms23, &Result3_c,&pA_l1ms23, &pB_l1ms23, 3, "Fr_band_l1ms2_unit_test");
}

void Fr_band_l1ns2_unit_test()
{
    //Fr_band_l1ns2_test 0:
    FrElement pA_l1ns20= {0x1,0x80000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_l1ns20= {0x2,0x0,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ns20= {0x0,0x80000000,{0x0,0x0,0x0,0x0}};
    //Fr_band_l1ns2_test 1:
    FrElement pA_l1ns21= {0x0,0x80000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_l1ns21= {0x2,0x0,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ns21= {0x0,0x80000000,{0x0,0x0,0x0,0x0}};
    //Fr_band_l1ns2_test 2:
    FrElement pA_l1ns22= {0xa1f0,0x80000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_l1ns22= {0x1bb8,0x0,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_l1ns22= {0x0,0x80000000,{0x0,0x0,0x0,0x0}};
    //Fr_band_l1ns2_test 3:
    FrElement pA_l1ns23= {0xffff,0x80000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_l1ns23= {0xffff,0x0,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_l1ns23= {0x0,0x80000000,{0xffff,0x0,0x0,0x0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_band(&Result0_c, &pA_l1ns20, &pB_l1ns20);
    Fr_band(&Result1_c, &pA_l1ns21, &pB_l1ns21);
    Fr_band(&Result2_c, &pA_l1ns22, &pB_l1ns22);
    Fr_band(&Result3_c, &pA_l1ns23, &pB_l1ns23);

    compare_Result(&pResult_l1ns20, &Result0_c,&pA_l1ns20, &pB_l1ns20, 0, "Fr_band_l1ns2_unit_test");
    compare_Result(&pResult_l1ns21, &Result1_c,&pA_l1ns21, &pB_l1ns21, 1, "Fr_band_l1ns2_unit_test");
    compare_Result(&pResult_l1ns22, &Result2_c,&pA_l1ns22, &pB_l1ns22, 2, "Fr_band_l1ns2_unit_test");
    compare_Result(&pResult_l1ns23, &Result3_c,&pA_l1ns23, &pB_l1ns23, 3, "Fr_band_l1ns2_unit_test");
}

void Fr_band_s1l2n_unit_test()
{
    //Fr_band_s1l2n_test 0:
    FrElement pA_s1l2n0= {0x1,0x0,{0x1,0x0,0x0,0x0}};
    FrElement pB_s1l2n0= {0x2,0x80000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_s1l2n0= {0x0,0x80000000,{0x0,0x0,0x0,0x0}};
    //Fr_band_s1l2n_test 1:
    FrElement pA_s1l2n1= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    FrElement pB_s1l2n1= {0x2,0x80000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_s1l2n1= {0x0,0x80000000,{0x0,0x0,0x0,0x0}};
    //Fr_band_s1l2n_test 2:
    FrElement pA_s1l2n2= {0xa1f0,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_s1l2n2= {0x1bb8,0x80000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_s1l2n2= {0x0,0x80000000,{0x21a0,0x0,0x0,0x0}};
    //Fr_band_s1l2n_test 3:
    FrElement pA_s1l2n3= {0xffff,0x0,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_s1l2n3= {0xffff,0x80000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_s1l2n3= {0x0,0x80000000,{0xffff,0x0,0x0,0x0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_band(&Result0_c, &pA_s1l2n0, &pB_s1l2n0);
    Fr_band(&Result1_c, &pA_s1l2n1, &pB_s1l2n1);
    Fr_band(&Result2_c, &pA_s1l2n2, &pB_s1l2n2);
    Fr_band(&Result3_c, &pA_s1l2n3, &pB_s1l2n3);

    compare_Result(&pResult_s1l2n0, &Result0_c,&pA_s1l2n0, &pB_s1l2n0, 0, "Fr_band_s1l2n_unit_test");
    compare_Result(&pResult_s1l2n1, &Result1_c,&pA_s1l2n1, &pB_s1l2n1, 1, "Fr_band_s1l2n_unit_test");
    compare_Result(&pResult_s1l2n2, &Result2_c,&pA_s1l2n2, &pB_s1l2n2, 2, "Fr_band_s1l2n_unit_test");
    compare_Result(&pResult_s1l2n3, &Result3_c,&pA_s1l2n3, &pB_s1l2n3, 3, "Fr_band_s1l2n_unit_test");
}

void Fr_land_s1s2_unit_test()
{
    //Fr_land_s1s2_test 0:
    FrElement pA_s1s20= {0x1,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_s1s20= {0x2,0x0,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_s1s20= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_land_s1s2_test 1:
    FrElement pA_s1s21= {0x0,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_s1s21= {0x2,0x0,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_s1s21= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_land_s1s2_test 2:
    FrElement pA_s1s22= {0xa1f0,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_s1s22= {0x1bb8,0x0,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_s1s22= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_land_s1s2_test 3:
    FrElement pA_s1s23= {0x7fffffff,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_s1s23= {0x7fffffff,0x0,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_s1s23= {0x1,0x0,{0x0,0x0,0x0,0x0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_land(&Result0_c, &pA_s1s20, &pB_s1s20);
    Fr_land(&Result1_c, &pA_s1s21, &pB_s1s21);
    Fr_land(&Result2_c, &pA_s1s22, &pB_s1s22);
    Fr_land(&Result3_c, &pA_s1s23, &pB_s1s23);

    compare_Result(&pResult_s1s20, &Result0_c,&pA_s1s20, &pB_s1s20, 0, "Fr_land_s1s2_unit_test");
    compare_Result(&pResult_s1s21, &Result1_c,&pA_s1s21, &pB_s1s21, 1, "Fr_land_s1s2_unit_test");
    compare_Result(&pResult_s1s22, &Result2_c,&pA_s1s22, &pB_s1s22, 2, "Fr_land_s1s2_unit_test");
    compare_Result(&pResult_s1s23, &Result3_c,&pA_s1s23, &pB_s1s23, 3, "Fr_land_s1s2_unit_test");
}

void Fr_land_l1nl2n_unit_test()
{
    //Fr_land_l1nl2n_test 0:
    FrElement pA_l1nl2n0= {0x1,0x80000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_l1nl2n0= {0x2,0x80000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1nl2n0= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_land_l1nl2n_test 1:
    FrElement pA_l1nl2n1= {0x0,0x80000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_l1nl2n1= {0x2,0x80000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1nl2n1= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_land_l1nl2n_test 2:
    FrElement pA_l1nl2n2= {0xa1f0,0x80000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_l1nl2n2= {0x1bb8,0x80000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_l1nl2n2= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_land_l1nl2n_test 3:
    FrElement pA_l1nl2n3= {0xffff,0x80000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_l1nl2n3= {0xffff,0x80000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_l1nl2n3= {0x1,0x0,{0x0,0x0,0x0,0x0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_land(&Result0_c, &pA_l1nl2n0, &pB_l1nl2n0);
    Fr_land(&Result1_c, &pA_l1nl2n1, &pB_l1nl2n1);
    Fr_land(&Result2_c, &pA_l1nl2n2, &pB_l1nl2n2);
    Fr_land(&Result3_c, &pA_l1nl2n3, &pB_l1nl2n3);

    compare_Result(&pResult_l1nl2n0, &Result0_c,&pA_l1nl2n0, &pB_l1nl2n0, 0, "Fr_land_l1nl2n_unit_test");
    compare_Result(&pResult_l1nl2n1, &Result1_c,&pA_l1nl2n1, &pB_l1nl2n1, 1, "Fr_land_l1nl2n_unit_test");
    compare_Result(&pResult_l1nl2n2, &Result2_c,&pA_l1nl2n2, &pB_l1nl2n2, 2, "Fr_land_l1nl2n_unit_test");
    compare_Result(&pResult_l1nl2n3, &Result3_c,&pA_l1nl2n3, &pB_l1nl2n3, 3, "Fr_land_l1nl2n_unit_test");
}

void Fr_land_l1ml2n_unit_test()
{
    //Fr_land_l1ml2n_test 0:
    FrElement pA_l1ml2n0= {0x1,0xc0000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_l1ml2n0= {0x2,0x80000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ml2n0= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_land_l1ml2n_test 1:
    FrElement pA_l1ml2n1= {0x0,0xc0000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_l1ml2n1= {0x2,0x80000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ml2n1= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_land_l1ml2n_test 2:
    FrElement pA_l1ml2n2= {0xa1f0,0xc0000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_l1ml2n2= {0x1bb8,0x80000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_l1ml2n2= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_land_l1ml2n_test 3:
    FrElement pA_l1ml2n3= {0xffff,0xc0000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_l1ml2n3= {0xffff,0x80000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_l1ml2n3= {0x1,0x0,{0x0,0x0,0x0,0x0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_land(&Result0_c, &pA_l1ml2n0, &pB_l1ml2n0);
    Fr_land(&Result1_c, &pA_l1ml2n1, &pB_l1ml2n1);
    Fr_land(&Result2_c, &pA_l1ml2n2, &pB_l1ml2n2);
    Fr_land(&Result3_c, &pA_l1ml2n3, &pB_l1ml2n3);

    compare_Result(&pResult_l1ml2n0, &Result0_c,&pA_l1ml2n0, &pB_l1ml2n0, 0, "Fr_land_l1ml2n_unit_test");
    compare_Result(&pResult_l1ml2n1, &Result1_c,&pA_l1ml2n1, &pB_l1ml2n1, 1, "Fr_land_l1ml2n_unit_test");
    compare_Result(&pResult_l1ml2n2, &Result2_c,&pA_l1ml2n2, &pB_l1ml2n2, 2, "Fr_land_l1ml2n_unit_test");
    compare_Result(&pResult_l1ml2n3, &Result3_c,&pA_l1ml2n3, &pB_l1ml2n3, 3, "Fr_land_l1ml2n_unit_test");
}

void Fr_land_l1ml2m_unit_test()
{
    //Fr_land_l1ml2m_test 0:
    FrElement pA_l1ml2m0= {0x1,0xc0000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_l1ml2m0= {0x2,0xc0000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ml2m0= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_land_l1ml2m_test 1:
    FrElement pA_l1ml2m1= {0x0,0xc0000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_l1ml2m1= {0x2,0xc0000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ml2m1= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_land_l1ml2m_test 2:
    FrElement pA_l1ml2m2= {0xa1f0,0xc0000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_l1ml2m2= {0x1bb8,0xc0000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_l1ml2m2= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_land_l1ml2m_test 3:
    FrElement pA_l1ml2m3= {0xffff,0xc0000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_l1ml2m3= {0xffff,0xc0000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_l1ml2m3= {0x1,0x0,{0x0,0x0,0x0,0x0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_land(&Result0_c, &pA_l1ml2m0, &pB_l1ml2m0);
    Fr_land(&Result1_c, &pA_l1ml2m1, &pB_l1ml2m1);
    Fr_land(&Result2_c, &pA_l1ml2m2, &pB_l1ml2m2);
    Fr_land(&Result3_c, &pA_l1ml2m3, &pB_l1ml2m3);

    compare_Result(&pResult_l1ml2m0, &Result0_c,&pA_l1ml2m0, &pB_l1ml2m0, 0, "Fr_land_l1ml2m_unit_test");
    compare_Result(&pResult_l1ml2m1, &Result1_c,&pA_l1ml2m1, &pB_l1ml2m1, 1, "Fr_land_l1ml2m_unit_test");
    compare_Result(&pResult_l1ml2m2, &Result2_c,&pA_l1ml2m2, &pB_l1ml2m2, 2, "Fr_land_l1ml2m_unit_test");
    compare_Result(&pResult_l1ml2m3, &Result3_c,&pA_l1ml2m3, &pB_l1ml2m3, 3, "Fr_land_l1ml2m_unit_test");
}

void Fr_land_l1nl2m_unit_test()
{
    //Fr_land_l1nl2m_test 0:
    FrElement pA_l1nl2m0= {0x1,0x80000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_l1nl2m0= {0x2,0xc0000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1nl2m0= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_land_l1nl2m_test 1:
    FrElement pA_l1nl2m1= {0x0,0x80000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_l1nl2m1= {0x2,0xc0000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1nl2m1= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_land_l1nl2m_test 2:
    FrElement pA_l1nl2m2= {0xa1f0,0x80000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_l1nl2m2= {0x1bb8,0xc0000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_l1nl2m2= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_land_l1nl2m_test 3:
    FrElement pA_l1nl2m3= {0xffff,0x80000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_l1nl2m3= {0xffff,0xc0000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_l1nl2m3= {0x1,0x0,{0x0,0x0,0x0,0x0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_land(&Result0_c, &pA_l1nl2m0, &pB_l1nl2m0);
    Fr_land(&Result1_c, &pA_l1nl2m1, &pB_l1nl2m1);
    Fr_land(&Result2_c, &pA_l1nl2m2, &pB_l1nl2m2);
    Fr_land(&Result3_c, &pA_l1nl2m3, &pB_l1nl2m3);

    compare_Result(&pResult_l1nl2m0, &Result0_c,&pA_l1nl2m0, &pB_l1nl2m0, 0, "Fr_land_l1nl2m_unit_test");
    compare_Result(&pResult_l1nl2m1, &Result1_c,&pA_l1nl2m1, &pB_l1nl2m1, 1, "Fr_land_l1nl2m_unit_test");
    compare_Result(&pResult_l1nl2m2, &Result2_c,&pA_l1nl2m2, &pB_l1nl2m2, 2, "Fr_land_l1nl2m_unit_test");
    compare_Result(&pResult_l1nl2m3, &Result3_c,&pA_l1nl2m3, &pB_l1nl2m3, 3, "Fr_land_l1nl2m_unit_test");
}

// 6
void Fr_land_s1l2m_unit_test()
{
    //Fr_land_s1l2m_test 0:
    FrElement pA_s1l2m0= {0x1,0x0,{0x1,0x0,0x0,0x0}};
    FrElement pB_s1l2m0= {0x2,0xc0000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_s1l2m0= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_land_s1l2m_test 1:
    FrElement pA_s1l2m1= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    FrElement pB_s1l2m1= {0x2,0xc0000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_s1l2m1= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_land_s1l2m_test 2:
    FrElement pA_s1l2m2= {0xa1f0,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_s1l2m2= {0x1bb8,0xc0000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_s1l2m2= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_land_s1l2m_test 3:
    FrElement pA_s1l2m3= {0xffff,0x0,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_s1l2m3= {0xffff,0xc0000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_s1l2m3= {0x1,0x0,{0x0,0x0,0x0,0x0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_land(&Result0_c, &pA_s1l2m0, &pB_s1l2m0);
    Fr_land(&Result1_c, &pA_s1l2m1, &pB_s1l2m1);
    Fr_land(&Result2_c, &pA_s1l2m2, &pB_s1l2m2);
    Fr_land(&Result3_c, &pA_s1l2m3, &pB_s1l2m3);

    compare_Result(&pResult_s1l2m0, &Result0_c,&pA_s1l2m0, &pB_s1l2m0, 0, "Fr_land_s1l2m_unit_test");
    compare_Result(&pResult_s1l2m1, &Result1_c,&pA_s1l2m1, &pB_s1l2m1, 1, "Fr_land_s1l2m_unit_test");
    compare_Result(&pResult_s1l2m2, &Result2_c,&pA_s1l2m2, &pB_s1l2m2, 2, "Fr_land_s1l2m_unit_test");
    compare_Result(&pResult_s1l2m3, &Result3_c,&pA_s1l2m3, &pB_s1l2m3, 3, "Fr_land_s1l2m_unit_test");
}

void Fr_land_l1ms2_unit_test()
{
    //Fr_land_l1ms2_test 0:
    FrElement pA_l1ms20= {0x1,0xc0000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_l1ms20= {0x2,0x0,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ms20= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_land_l1ms2_test 1:
    FrElement pA_l1ms21= {0x0,0xc0000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_l1ms21= {0x2,0x0,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ms21= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_land_l1ms2_test 2:
    FrElement pA_l1ms22= {0xa1f0,0xc0000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_l1ms22= {0x1bb8,0x0,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_l1ms22= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_land_l1ms2_test 3:
    FrElement pA_l1ms23= {0xffff,0xc0000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_l1ms23= {0xffff,0x0,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_l1ms23= {0x1,0x0,{0x0,0x0,0x0,0x0}};


    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_land(&Result0_c, &pA_l1ms20, &pB_l1ms20);
    Fr_land(&Result1_c, &pA_l1ms21, &pB_l1ms21);
    Fr_land(&Result2_c, &pA_l1ms22, &pB_l1ms22);
    Fr_land(&Result3_c, &pA_l1ms23, &pB_l1ms23);

    compare_Result(&pResult_l1ms20, &Result0_c,&pA_l1ms20, &pB_l1ms20, 0, "Fr_land_l1ms2_unit_test");
    compare_Result(&pResult_l1ms21, &Result1_c,&pA_l1ms21, &pB_l1ms21, 1, "Fr_land_l1ms2_unit_test");
    compare_Result(&pResult_l1ms22, &Result2_c,&pA_l1ms22, &pB_l1ms22, 2, "Fr_land_l1ms2_unit_test");
    compare_Result(&pResult_l1ms23, &Result3_c,&pA_l1ms23, &pB_l1ms23, 3, "Fr_land_l1ms2_unit_test");
}

void Fr_land_l1ns2_unit_test()
{
    //Fr_land_l1ns2_test 0:
    FrElement pA_l1ns20= {0x1,0x80000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_l1ns20= {0x2,0x0,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ns20= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_land_l1ns2_test 1:
    FrElement pA_l1ns21= {0x0,0x80000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_l1ns21= {0x2,0x0,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ns21= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_land_l1ns2_test 2:
    FrElement pA_l1ns22= {0xa1f0,0x80000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_l1ns22= {0x1bb8,0x0,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_l1ns22= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_land_l1ns2_test 3:
    FrElement pA_l1ns23= {0xffff,0x80000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_l1ns23= {0xffff,0x0,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_l1ns23= {0x1,0x0,{0x0,0x0,0x0,0x0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_land(&Result0_c, &pA_l1ns20, &pB_l1ns20);
    Fr_land(&Result1_c, &pA_l1ns21, &pB_l1ns21);
    Fr_land(&Result2_c, &pA_l1ns22, &pB_l1ns22);
    Fr_land(&Result3_c, &pA_l1ns23, &pB_l1ns23);

    compare_Result(&pResult_l1ns20, &Result0_c,&pA_l1ns20, &pB_l1ns20, 0, "Fr_land_l1ns2_unit_test");
    compare_Result(&pResult_l1ns21, &Result1_c,&pA_l1ns21, &pB_l1ns21, 1, "Fr_land_l1ns2_unit_test");
    compare_Result(&pResult_l1ns22, &Result2_c,&pA_l1ns22, &pB_l1ns22, 2, "Fr_land_l1ns2_unit_test");
    compare_Result(&pResult_l1ns23, &Result3_c,&pA_l1ns23, &pB_l1ns23, 3, "Fr_land_l1ns2_unit_test");
}

void Fr_land_s1l2n_unit_test()
{
    //Fr_land_s1l2n_test 0:
    FrElement pA_s1l2n0= {0x1,0x0,{0x1,0x0,0x0,0x0}};
    FrElement pB_s1l2n0= {0x2,0x80000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_s1l2n0= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_land_s1l2n_test 1:
    FrElement pA_s1l2n1= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    FrElement pB_s1l2n1= {0x2,0x80000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_s1l2n1= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_land_s1l2n_test 2:
    FrElement pA_s1l2n2= {0xa1f0,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_s1l2n2= {0x1bb8,0x80000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_s1l2n2= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_land_s1l2n_test 3:
    FrElement pA_s1l2n3= {0xffff,0x0,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_s1l2n3= {0xffff,0x80000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_s1l2n3= {0x1,0x0,{0x0,0x0,0x0,0x0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_land(&Result0_c, &pA_s1l2n0, &pB_s1l2n0);
    Fr_land(&Result1_c, &pA_s1l2n1, &pB_s1l2n1);
    Fr_land(&Result2_c, &pA_s1l2n2, &pB_s1l2n2);
    Fr_land(&Result3_c, &pA_s1l2n3, &pB_s1l2n3);

    compare_Result(&pResult_s1l2n0, &Result0_c,&pA_s1l2n0, &pB_s1l2n0, 0, "Fr_land_s1l2n_unit_test");
    compare_Result(&pResult_s1l2n1, &Result1_c,&pA_s1l2n1, &pB_s1l2n1, 1, "Fr_land_s1l2n_unit_test");
    compare_Result(&pResult_s1l2n2, &Result2_c,&pA_s1l2n2, &pB_s1l2n2, 2, "Fr_land_s1l2n_unit_test");
    compare_Result(&pResult_s1l2n3, &Result3_c,&pA_s1l2n3, &pB_s1l2n3, 3, "Fr_land_s1l2n_unit_test");
}

void Fr_lor_s1s2_unit_test()
{
    //Fr_lor_s1s2_test 0:
    FrElement pA_s1s20= {0x1,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_s1s20= {0x2,0x0,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_s1s20= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_lor_s1s2_test 1:
    FrElement pA_s1s21= {0x0,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_s1s21= {0x2,0x0,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_s1s21= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_lor_s1s2_test 2:
    FrElement pA_s1s22= {0xa1f0,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_s1s22= {0x1bb8,0x0,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_s1s22= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_lor_s1s2_test 3:
    FrElement pA_s1s23= {0x7fffffff,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_s1s23= {0x7fffffff,0x0,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_s1s23= {0x1,0x0,{0x0,0x0,0x0,0x0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_lor(&Result0_c, &pA_s1s20, &pB_s1s20);
    Fr_lor(&Result1_c, &pA_s1s21, &pB_s1s21);
    Fr_lor(&Result2_c, &pA_s1s22, &pB_s1s22);
    Fr_lor(&Result3_c, &pA_s1s23, &pB_s1s23);

    compare_Result(&pResult_s1s20, &Result0_c,&pA_s1s20, &pB_s1s20, 0, "Fr_lor_s1s2_unit_test");
    compare_Result(&pResult_s1s21, &Result1_c,&pA_s1s21, &pB_s1s21, 1, "Fr_lor_s1s2_unit_test");
    compare_Result(&pResult_s1s22, &Result2_c,&pA_s1s22, &pB_s1s22, 2, "Fr_lor_s1s2_unit_test");
    compare_Result(&pResult_s1s23, &Result3_c,&pA_s1s23, &pB_s1s23, 3, "Fr_lor_s1s2_unit_test");
}

void Fr_lor_l1nl2n_unit_test()
{
    //Fr_lor_l1nl2n_test 0:
    FrElement pA_l1nl2n0= {0x1,0x80000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_l1nl2n0= {0x2,0x80000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1nl2n0= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_lor_l1nl2n_test 1:
    FrElement pA_l1nl2n1= {0x0,0x80000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_l1nl2n1= {0x2,0x80000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1nl2n1= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_lor_l1nl2n_test 2:
    FrElement pA_l1nl2n2= {0xa1f0,0x80000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_l1nl2n2= {0x1bb8,0x80000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_l1nl2n2= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_lor_l1nl2n_test 3:
    FrElement pA_l1nl2n3= {0xffff,0x80000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_l1nl2n3= {0xffff,0x80000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_l1nl2n3= {0x1,0x0,{0x0,0x0,0x0,0x0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_lor(&Result0_c, &pA_l1nl2n0, &pB_l1nl2n0);
    Fr_lor(&Result1_c, &pA_l1nl2n1, &pB_l1nl2n1);
    Fr_lor(&Result2_c, &pA_l1nl2n2, &pB_l1nl2n2);
    Fr_lor(&Result3_c, &pA_l1nl2n3, &pB_l1nl2n3);

    compare_Result(&pResult_l1nl2n0, &Result0_c,&pA_l1nl2n0, &pB_l1nl2n0, 0, "Fr_lor_l1nl2n_unit_test");
    compare_Result(&pResult_l1nl2n1, &Result1_c,&pA_l1nl2n1, &pB_l1nl2n1, 1, "Fr_lor_l1nl2n_unit_test");
    compare_Result(&pResult_l1nl2n2, &Result2_c,&pA_l1nl2n2, &pB_l1nl2n2, 2, "Fr_lor_l1nl2n_unit_test");
    compare_Result(&pResult_l1nl2n3, &Result3_c,&pA_l1nl2n3, &pB_l1nl2n3, 3, "Fr_lor_l1nl2n_unit_test");
}

void Fr_lor_l1ml2n_unit_test()
{
    //Fr_lor_l1ml2n_test 0:
    FrElement pA_l1ml2n0= {0x1,0xc0000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_l1ml2n0= {0x2,0x80000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ml2n0= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_lor_l1ml2n_test 1:
    FrElement pA_l1ml2n1= {0x0,0xc0000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_l1ml2n1= {0x2,0x80000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ml2n1= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_lor_l1ml2n_test 2:
    FrElement pA_l1ml2n2= {0xa1f0,0xc0000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_l1ml2n2= {0x1bb8,0x80000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_l1ml2n2= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_lor_l1ml2n_test 3:
    FrElement pA_l1ml2n3= {0xffff,0xc0000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_l1ml2n3= {0xffff,0x80000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_l1ml2n3= {0x1,0x0,{0x0,0x0,0x0,0x0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_lor(&Result0_c, &pA_l1ml2n0, &pB_l1ml2n0);
    Fr_lor(&Result1_c, &pA_l1ml2n1, &pB_l1ml2n1);
    Fr_lor(&Result2_c, &pA_l1ml2n2, &pB_l1ml2n2);
    Fr_lor(&Result3_c, &pA_l1ml2n3, &pB_l1ml2n3);

    compare_Result(&pResult_l1ml2n0, &Result0_c,&pA_l1ml2n0, &pB_l1ml2n0, 0, "Fr_lor_l1ml2n_unit_test");
    compare_Result(&pResult_l1ml2n1, &Result1_c,&pA_l1ml2n1, &pB_l1ml2n1, 1, "Fr_lor_l1ml2n_unit_test");
    compare_Result(&pResult_l1ml2n2, &Result2_c,&pA_l1ml2n2, &pB_l1ml2n2, 2, "Fr_lor_l1ml2n_unit_test");
    compare_Result(&pResult_l1ml2n3, &Result3_c,&pA_l1ml2n3, &pB_l1ml2n3, 3, "Fr_lor_l1ml2n_unit_test");
}

void Fr_lor_l1ml2m_unit_test()
{
    //Fr_lor_l1ml2m_test 0:
    FrElement pA_l1ml2m0= {0x1,0xc0000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_l1ml2m0= {0x2,0xc0000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ml2m0= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_lor_l1ml2m_test 1:
    FrElement pA_l1ml2m1= {0x0,0xc0000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_l1ml2m1= {0x2,0xc0000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ml2m1= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_lor_l1ml2m_test 2:
    FrElement pA_l1ml2m2= {0xa1f0,0xc0000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_l1ml2m2= {0x1bb8,0xc0000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_l1ml2m2= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_lor_l1ml2m_test 3:
    FrElement pA_l1ml2m3= {0xffff,0xc0000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_l1ml2m3= {0xffff,0xc0000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_l1ml2m3= {0x1,0x0,{0x0,0x0,0x0,0x0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_lor(&Result0_c, &pA_l1ml2m0, &pB_l1ml2m0);
    Fr_lor(&Result1_c, &pA_l1ml2m1, &pB_l1ml2m1);
    Fr_lor(&Result2_c, &pA_l1ml2m2, &pB_l1ml2m2);
    Fr_lor(&Result3_c, &pA_l1ml2m3, &pB_l1ml2m3);

    compare_Result(&pResult_l1ml2m0, &Result0_c,&pA_l1ml2m0, &pB_l1ml2m0, 0, "Fr_lor_l1ml2m_unit_test");
    compare_Result(&pResult_l1ml2m1, &Result1_c,&pA_l1ml2m1, &pB_l1ml2m1, 1, "Fr_lor_l1ml2m_unit_test");
    compare_Result(&pResult_l1ml2m2, &Result2_c,&pA_l1ml2m2, &pB_l1ml2m2, 2, "Fr_lor_l1ml2m_unit_test");
    compare_Result(&pResult_l1ml2m3, &Result3_c,&pA_l1ml2m3, &pB_l1ml2m3, 3, "Fr_lor_l1ml2m_unit_test");
}

void Fr_lor_l1nl2m_unit_test()
{
    //Fr_lor_l1nl2m_test 0:
    FrElement pA_l1nl2m0= {0x1,0x80000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_l1nl2m0= {0x2,0xc0000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1nl2m0= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_lor_l1nl2m_test 1:
    FrElement pA_l1nl2m1= {0x0,0x80000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_l1nl2m1= {0x2,0xc0000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1nl2m1= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_lor_l1nl2m_test 2:
    FrElement pA_l1nl2m2= {0xa1f0,0x80000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_l1nl2m2= {0x1bb8,0xc0000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_l1nl2m2= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_lor_l1nl2m_test 3:
    FrElement pA_l1nl2m3= {0xffff,0x80000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_l1nl2m3= {0xffff,0xc0000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_l1nl2m3= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_lor(&Result0_c, &pA_l1nl2m0, &pB_l1nl2m0);
    Fr_lor(&Result1_c, &pA_l1nl2m1, &pB_l1nl2m1);
    Fr_lor(&Result2_c, &pA_l1nl2m2, &pB_l1nl2m2);
    Fr_lor(&Result3_c, &pA_l1nl2m3, &pB_l1nl2m3);

    compare_Result(&pResult_l1nl2m0, &Result0_c,&pA_l1nl2m0, &pB_l1nl2m0, 0, "Fr_lor_l1nl2m_unit_test");
    compare_Result(&pResult_l1nl2m1, &Result1_c,&pA_l1nl2m1, &pB_l1nl2m1, 1, "Fr_lor_l1nl2m_unit_test");
    compare_Result(&pResult_l1nl2m2, &Result2_c,&pA_l1nl2m2, &pB_l1nl2m2, 2, "Fr_lor_l1nl2m_unit_test");
    compare_Result(&pResult_l1nl2m3, &Result3_c,&pA_l1nl2m3, &pB_l1nl2m3, 3, "Fr_lor_l1nl2m_unit_test");
}

// 6
void Fr_lor_s1l2m_unit_test()
{
    //Fr_lor_s1l2m_test 0:
    FrElement pA_s1l2m0= {0x1,0x0,{0x1,0x0,0x0,0x0}};
    FrElement pB_s1l2m0= {0x2,0xc0000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_s1l2m0= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_lor_s1l2m_test 1:
    FrElement pA_s1l2m1= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    FrElement pB_s1l2m1= {0x2,0xc0000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_s1l2m1= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_lor_s1l2m_test 2:
    FrElement pA_s1l2m2= {0xa1f0,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_s1l2m2= {0x1bb8,0xc0000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_s1l2m2= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_lor_s1l2m_test 3:
    FrElement pA_s1l2m3= {0xffff,0x0,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_s1l2m3= {0xffff,0xc0000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_s1l2m3= {0x1,0x0,{0x0,0x0,0x0,0x0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_lor(&Result0_c, &pA_s1l2m0, &pB_s1l2m0);
    Fr_lor(&Result1_c, &pA_s1l2m1, &pB_s1l2m1);
    Fr_lor(&Result2_c, &pA_s1l2m2, &pB_s1l2m2);
    Fr_lor(&Result3_c, &pA_s1l2m3, &pB_s1l2m3);

    compare_Result(&pResult_s1l2m0, &Result0_c,&pA_s1l2m0, &pB_s1l2m0, 0, "Fr_lor_s1l2m_unit_test");
    compare_Result(&pResult_s1l2m1, &Result1_c,&pA_s1l2m1, &pB_s1l2m1, 1, "Fr_lor_s1l2m_unit_test");
    compare_Result(&pResult_s1l2m2, &Result2_c,&pA_s1l2m2, &pB_s1l2m2, 2, "Fr_lor_s1l2m_unit_test");
    compare_Result(&pResult_s1l2m3, &Result3_c,&pA_s1l2m3, &pB_s1l2m3, 3, "Fr_lor_s1l2m_unit_test");
}

void Fr_lor_l1ms2_unit_test()
{
    //Fr_lor_l1ms2_test 0:
    FrElement pA_l1ms20= {0x1,0xc0000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_l1ms20= {0x2,0x0,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ms20= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_lor_l1ms2_test 1:
    FrElement pA_l1ms21= {0x0,0xc0000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_l1ms21= {0x2,0x0,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ms21= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_lor_l1ms2_test 2:
    FrElement pA_l1ms22= {0xa1f0,0xc0000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_l1ms22= {0x1bb8,0x0,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_l1ms22= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_lor_l1ms2_test 3:
    FrElement pA_l1ms23= {0xffff,0xc0000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_l1ms23= {0xffff,0x0,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_l1ms23= {0x1,0x0,{0x0,0x0,0x0,0x0}};


    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_lor(&Result0_c, &pA_l1ms20, &pB_l1ms20);
    Fr_lor(&Result1_c, &pA_l1ms21, &pB_l1ms21);
    Fr_lor(&Result2_c, &pA_l1ms22, &pB_l1ms22);
    Fr_lor(&Result3_c, &pA_l1ms23, &pB_l1ms23);

    compare_Result(&pResult_l1ms20, &Result0_c,&pA_l1ms20, &pB_l1ms20, 0, "Fr_lor_l1ms2_unit_test");
    compare_Result(&pResult_l1ms21, &Result1_c,&pA_l1ms21, &pB_l1ms21, 1, "Fr_lor_l1ms2_unit_test");
    compare_Result(&pResult_l1ms22, &Result2_c,&pA_l1ms22, &pB_l1ms22, 2, "Fr_lor_l1ms2_unit_test");
    compare_Result(&pResult_l1ms23, &Result3_c,&pA_l1ms23, &pB_l1ms23, 3, "Fr_lor_l1ms2_unit_test");
}

void Fr_lor_l1ns2_unit_test()
{
    //Fr_lor_l1ns2_test 0:
    FrElement pA_l1ns20= {0x1,0x80000000,{0x1,0x0,0x0,0x0}};
    FrElement pB_l1ns20= {0x2,0x0,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ns20= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_lor_l1ns2_test 1:
    FrElement pA_l1ns21= {0x0,0x80000000,{0x0,0x0,0x0,0x0}};
    FrElement pB_l1ns21= {0x2,0x0,{0x2,0x0,0x0,0x0}};
    FrElement pResult_l1ns21= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_lor_l1ns2_test 2:
    FrElement pA_l1ns22= {0xa1f0,0x80000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_l1ns22= {0x1bb8,0x0,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_l1ns22= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_lor_l1ns2_test 3:
    FrElement pA_l1ns23= {0xffff,0x80000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_l1ns23= {0xffff,0x0,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_l1ns23= {0x1,0x0,{0x0,0x0,0x0,0x0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_lor(&Result0_c, &pA_l1ns20, &pB_l1ns20);
    Fr_lor(&Result1_c, &pA_l1ns21, &pB_l1ns21);
    Fr_lor(&Result2_c, &pA_l1ns22, &pB_l1ns22);
    Fr_lor(&Result3_c, &pA_l1ns23, &pB_l1ns23);

    compare_Result(&pResult_l1ns20, &Result0_c,&pA_l1ns20, &pB_l1ns20, 0, "Fr_lor_l1ns2_unit_test");
    compare_Result(&pResult_l1ns21, &Result1_c,&pA_l1ns21, &pB_l1ns21, 1, "Fr_lor_l1ns2_unit_test");
    compare_Result(&pResult_l1ns22, &Result2_c,&pA_l1ns22, &pB_l1ns22, 2, "Fr_lor_l1ns2_unit_test");
    compare_Result(&pResult_l1ns23, &Result3_c,&pA_l1ns23, &pB_l1ns23, 3, "Fr_lor_l1ns2_unit_test");
}

void Fr_lor_s1l2n_unit_test()
{
    //Fr_lor_s1l2n_test 0:
    FrElement pA_s1l2n0= {0x1,0x0,{0x1,0x0,0x0,0x0}};
    FrElement pB_s1l2n0= {0x2,0x80000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_s1l2n0= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_lor_s1l2n_test 1:
    FrElement pA_s1l2n1= {0x0,0x0,{0x0,0x0,0x0,0x0}};
    FrElement pB_s1l2n1= {0x2,0x80000000,{0x2,0x0,0x0,0x0}};
    FrElement pResult_s1l2n1= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_lor_s1l2n_test 2:
    FrElement pA_s1l2n2= {0xa1f0,0x0,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pB_s1l2n2= {0x1bb8,0x80000000,{0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5}};
    FrElement pResult_s1l2n2= {0x1,0x0,{0x0,0x0,0x0,0x0}};
    //Fr_lor_s1l2n_test 3:
    FrElement pA_s1l2n3= {0xffff,0x0,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pB_s1l2n3= {0xffff,0x80000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_s1l2n3= {0x1,0x0,{0x0,0x0,0x0,0x0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_lor(&Result0_c, &pA_s1l2n0, &pB_s1l2n0);
    Fr_lor(&Result1_c, &pA_s1l2n1, &pB_s1l2n1);
    Fr_lor(&Result2_c, &pA_s1l2n2, &pB_s1l2n2);
    Fr_lor(&Result3_c, &pA_s1l2n3, &pB_s1l2n3);

    compare_Result(&pResult_s1l2n0, &Result0_c,&pA_s1l2n0, &pB_s1l2n0, 0, "Fr_lor_s1l2n_unit_test");
    compare_Result(&pResult_s1l2n1, &Result1_c,&pA_s1l2n1, &pB_s1l2n1, 1, "Fr_lor_s1l2n_unit_test");
    compare_Result(&pResult_s1l2n2, &Result2_c,&pA_s1l2n2, &pB_s1l2n2, 2, "Fr_lor_s1l2n_unit_test");
    compare_Result(&pResult_s1l2n3, &Result3_c,&pA_s1l2n3, &pB_s1l2n3, 3, "Fr_lor_s1l2n_unit_test");
}

void Fr_lnot_unit_test()
{
    FrElement pA_l1ns20= {0x1,0x80000000,{0x1,0x0,0x0,0x0}};
    FrElement pResult_l1ns20= {0x0,0x0,{0x0,0x0,0x0,0x0}};

    FrElement pA_l1ns21= {0x0,0x80000000,{0x0,0x0,0x0,0x0}};
    FrElement pResult_l1ns21= {0x1,0x0,{0x0,0x0,0x0,0x0}};

    FrElement pA_l1ns22= {0xa1f0,0x80000000,{0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014}};
    FrElement pResult_l1ns22= {0x0,0x0,{0x0,0x0,0x0,0x0}};

    FrElement pA_l1ns23= {0xffff,0x80000000,{0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff}};
    FrElement pResult_l1ns23= {0x0,0x0,{0x0,0x0,0x0,0x0}};

    FrElement Result0_c = {0,0,{0,0,0,0}};
    FrElement Result1_c = {0,0,{0,0,0,0}};
    FrElement Result2_c= {0,0,{0,0,0,0}};
    FrElement Result3_c= {0,0,{0,0,0,0}};

    Fr_lnot(&Result0_c, &pA_l1ns20);
    Fr_lnot(&Result1_c, &pA_l1ns21);
    Fr_lnot(&Result2_c, &pA_l1ns22);
    Fr_lnot(&Result3_c, &pA_l1ns23);

    compare_Result(&pResult_l1ns20, &Result0_c,&pA_l1ns20, 0, "Fr_lnot_unit_test");
    compare_Result(&pResult_l1ns21, &Result1_c,&pA_l1ns21, 1, "Fr_lnot_unit_test");
    compare_Result(&pResult_l1ns22, &Result2_c,&pA_l1ns22, 2, "Fr_lnot_unit_test");
    compare_Result(&pResult_l1ns23, &Result3_c,&pA_l1ns23, 3, "Fr_lnot_unit_test");
}


void Fr_shr_test(FrElement r_expected, FrElement a, FrElement b, int index)
{
    FrElement r_computed = {0,0,{0,0,0,0}};

    Fr_shr(&r_computed, &a, &b);

    compare_Result(&r_expected, &r_computed, &a, &b, index, __func__);
}

void Fr_shr_short_test(int32_t r_expected, int32_t a, int32_t b, int index)
{
    Fr_shr_test(fr_short(r_expected), fr_short(a), fr_short(b), index);
}

void Fr_shr_mshort_test(int32_t r_expected, int32_t a, int32_t b, int index)
{
    Fr_shr_test(fr_mshort(r_expected), fr_mshort(a), fr_short(b), index);
}

void Fr_shr_unit_test()
{
    Fr_shr_short_test(        0,     0xa1f0, 0x1bb8,   0);
    Fr_shr_short_test(   0xa1f0,     0xa1f0,       0,  1);
    Fr_shr_short_test(   0x50f8,     0xa1f0,       1,  2);
    Fr_shr_short_test(  0x143e0,     0xa1f0,      -1,  3);
    Fr_shr_short_test(0x000287c,     0xa1f0,       2,  4);
    Fr_shr_short_test(0x00287c0,     0xa1f0,      -2,  5);
    Fr_shr_short_test(      0xa,     0xa1f0,      12,  6);
    Fr_shr_short_test(0xa1f0000,     0xa1f0,     -12,  7);
    Fr_shr_short_test(        7, 0x7000a1ff,      28,  8);
    Fr_shr_short_test(        0,     0xa1f0,      31,  9);
    Fr_shr_short_test(        0,     0xa1f0,      67, 10);
    Fr_shr_short_test(        0,     0xa1f0,     256, 11);

    FrElement a21 = fr_long(0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014);
    FrElement b21 = fr_long(0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5);

    FrElement a22 = fr_mlong(0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014);
    FrElement b22 = fr_mlong(0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5);

    FrElement a23 = fr_long(0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014);
    FrElement b23 = fr_long(0xfbb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5);

    FrElement a24 = fr_mlong(0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014);
    FrElement b24 = fr_mlong(0xfbb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5);

    FrElement a25 = fr_long(0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014);
    FrElement b25 = fr_long(0x1bb8e645ae216da7);

    FrElement a26 = fr_mlong(0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014);
    FrElement b26 = fr_mlong(0x1bb8e645ae216da7);

    Fr_shr_test(fr_short(0), a21, b21, 21);
    Fr_shr_test(fr_short(0), a22, b22, 22);
    Fr_shr_test(fr_short(0), a23, b23, 23);
    Fr_shr_test(fr_short(0), a24, b24, 24);
    Fr_shr_test(fr_short(0), a25, b25, 25);
    Fr_shr_test(fr_short(0), a26, b26, 26);

    FrElement r31 = fr_long(0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014);
    FrElement r32 = fr_long(0x50f87d64fc000000,0x4a0cfa121e6e5c24,0x6e14116da0605617,0x0c19139cb84c680a);
    FrElement r33 = fr_long(0x450f87d64fc00000,0x74a0cfa121e6e5c2,0xa6e14116da060561,0x00c19139cb84c680);
    FrElement r34 = fr_long(0x848a1f0fac9f8000,0xc2e9419f4243cdcb,0x014dc2822db40c0a,0x000183227397098d);
    FrElement r35 = fr_long(0x72e12287c3eb27e0,0x02b0ba5067d090f3,0x63405370a08b6d03,0x00000060c89ce5c2);
    FrElement r36 = fr_long(0x3cdcb848a1f0fac9,0x40c0ac2e9419f424,0x7098d014dc2822db,0x0000000018322739);
    FrElement r37 = fr_long(0x4dc2822db40c0ac2,0x0183227397098d01,0x0000000000000000,0x0000000000000000);
    FrElement r38 = fr_long(0x0000000000183227,0x0000000000000000,0x0000000000000000,0x0000000000000000);
    FrElement r41 = fr_long(0x43e1f593f0000000,0x2833e84879b97091,0xb85045b68181585d,0x30644e72e131a029);
    FrElement r42 = fr_long(0x3e1f593f00000000,0x833e84879b970914,0x85045b68181585d2,0x0644e72e131a029b);
    FrElement r43 = fr_long(0x0fac9f8000000000,0x9f4243cdcb848a1f,0x822db40c0ac2e941,0x227397098d014dc2);
    FrElement r44 = fr_long(0xb27e000000000000,0x090f372e12287c3e,0xb6d0302b0ba5067d,0x0e5c263405370a08);
    FrElement r45 = fr_long(0xb41e0a6c0fffffff,0x14a8d00028378a38,0x8870667812989bc7,0x003481a1faf682b1);
    FrElement r46 = fr_long(0x0000000000000000,0x0000000000000000,0x1f0fac9f80000000,0x019f4243cdcb848a);

    Fr_shr_test(r31,         a21, fr_short(0),    31);
    Fr_shr_test(r32,         a21, fr_short(1),    32);
    Fr_shr_test(r33,         a21, fr_short(5),    33);
    Fr_shr_test(r34,         a21, fr_short(12),   34);
    Fr_shr_test(r35,         a21, fr_short(22),   35);
    Fr_shr_test(r36,         a21, fr_short(32),   36);
    Fr_shr_test(r37,         a21, fr_short(132),  37);
    Fr_shr_test(r38,         a21, fr_short(232),  38);
    Fr_shr_test(fr_short(0), a21, fr_short(432),  39);

    Fr_shr_test(r41,         a21, fr_short(-1),   41);
    Fr_shr_test(r42,         a21, fr_short(-5),   42);
    Fr_shr_test(r43,         a21, fr_short(-12),  43);
    Fr_shr_test(r44,         a21, fr_short(-22),  44);
    Fr_shr_test(r45,         a21, fr_short(-32),  45);
    Fr_shr_test(r46,         a21, fr_short(-132), 46);
    Fr_shr_test(fr_long(0),  a21, fr_short(-232), 47);
    Fr_shr_test(fr_short(0), a21, fr_short(-332), 48);
    Fr_shr_test(fr_short(0), a21, fr_short(-432), 49);

    Fr_shr_test(r31,         a21, fr_long(0),    51);
    Fr_shr_test(r32,         a21, fr_long(1),    52);
    Fr_shr_test(r33,         a21, fr_long(5),    53);
    Fr_shr_test(r34,         a21, fr_long(12),   54);
    Fr_shr_test(r35,         a21, fr_long(22),   55);
    Fr_shr_test(r36,         a21, fr_long(32),   56);
    Fr_shr_test(r37,         a21, fr_long(132),  57);
    Fr_shr_test(r38,         a21, fr_long(232),  58);
    Fr_shr_test(fr_short(0), a21, fr_long(432),  59);

    Fr_shr_test(fr_short(0), a21, fr_long(-1),   61);
    Fr_shr_test(fr_short(0), a21, fr_long(-5),   62);
    Fr_shr_test(fr_short(0), a21, fr_long(-12),  63);
    Fr_shr_test(fr_short(0), a21, fr_long(-22),  64);
    Fr_shr_test(fr_short(0), a21, fr_long(-32),  65);
    Fr_shr_test(fr_short(0), a21, fr_long(-132), 66);
    Fr_shr_test(fr_short(0), a21, fr_long(-232), 67);
    Fr_shr_test(fr_short(0), a21, fr_long(-332), 68);
    Fr_shr_test(fr_short(0), a21, fr_long(-432), 69);

    Fr_shr_test(fr_short(0), a21, fr_mlong(1),    71);
    Fr_shr_test(fr_short(0), a21, fr_mlong(12),   72);
    Fr_shr_test(fr_short(0), a21, fr_mlong(32),   73);
    Fr_shr_test(fr_short(0), a21, fr_mlong(132),  74);
    Fr_shr_test(fr_short(0), a21, fr_mlong(432),  75);
    Fr_shr_test(fr_short(0), a21, fr_mlong(-1),   76);
    Fr_shr_test(fr_short(0), a21, fr_mlong(-5),   77);
    Fr_shr_test(fr_short(0), a21, fr_mlong(-12),  78);

    FrElement r80 = fr_long(0x55b425913927735a,0xa3ac6d7389307a4d,0x543d3ec42a2529ae,0x256e51ca1fcef59b);
    FrElement r81 = fr_long(0xaada12c89c93b9ad,0x51d636b9c4983d26,0xaa1e9f62151294d7,0x12b728e50fe77acd);
    FrElement r82 = fr_long(0xa4d55b4259139277,0x9aea3ac6d7389307,0x59b543d3ec42a252,0x000256e51ca1fcef);
    FrElement r83 = fr_long(0x89307a4d55b42591,0x2a2529aea3ac6d73,0x1fcef59b543d3ec4,0x00000000256e51ca);
    FrElement r84 = fr_long(0xb543d3ec42a2529a,0x0256e51ca1fcef59,0x0000000000000000,0x0000000000000000);
    FrElement r85 = fr_short(0);
    FrElement r86 = fr_long(0xab684b22724ee6b4,0x4758dae71260f49a,0xa87a7d88544a535d,0x0adca3943f9deb36);
    FrElement r87 = fr_long(0x3927735a00000000,0x89307a4d55b42591,0x2a2529aea3ac6d73,0x1fcef59b543d3ec4);
    FrElement r88 = fr_long(0xbc1e0a6c0fffffff,0xd7cc17b786468f6e,0xa2f2135d10f5dd42,0x0a6288c5b1d604ab);
    FrElement r89 = fr_short(0);

    Fr_shr_test(r80, a22, fr_short(0),    80);
    Fr_shr_test(r81, a22, fr_short(1),    81);
    Fr_shr_test(r82, a22, fr_short(12),   82);
    Fr_shr_test(r83, a22, fr_short(32),   83);
    Fr_shr_test(r84, a22, fr_short(132),  84);
    Fr_shr_test(r85, a22, fr_short(432),  85);
    Fr_shr_test(r86, a22, fr_short(-1),   86);
    Fr_shr_test(r87, a22, fr_short(-32),  87);
    Fr_shr_test(r88, a22, fr_short(-132), 88);
    Fr_shr_test(r89, a22, fr_short(-432), 89);
}

void Fr_shl_test(FrElement r_expected, FrElement a, FrElement b, int index)
{
    FrElement r_computed = {0,0,{0,0,0,0}};

    Fr_shl(&r_computed, &a, &b);

    compare_Result(&r_expected, &r_computed, &a, &b, index, __func__);
}

void Fr_shl_short_test(int32_t r_expected, int32_t a, int32_t b, int index)
{
    Fr_shl_test(fr_short(r_expected), fr_short(a), fr_short(b), index);
}

void Fr_shl_mshort_test(int32_t r_expected, int32_t a, int32_t b, int index)
{
    Fr_shl_test(fr_mshort(r_expected), fr_mshort(a), fr_short(b), index);
}

void Fr_shl_unit_test()
{
    Fr_shl_short_test(        0,     0xa1f0, 0x1bb8,   0);
    Fr_shl_short_test(   0xa1f0,     0xa1f0,       0,  1);
    Fr_shl_short_test(0x000143e0,    0xa1f0,       1,  2);
    Fr_shl_short_test(0x000050f8,    0xa1f0,      -1,  3);
    Fr_shl_short_test(0x000287c0,    0xa1f0,       2,  4);
    Fr_shl_short_test(0x0000287c,    0xa1f0,      -2,  5);
    Fr_shl_short_test(0x0000050f,    0xa1f0,      -5,  6);
    Fr_shl_short_test(0x0a1f0000,    0xa1f0,      12,  7);
    Fr_shl_short_test(      0xa,     0xa1f0,     -12,  8);
    Fr_shl_short_test(        0,     0xa1f0,     -22,  9);
    Fr_shl_short_test(        0,     0xa1f0,     256, 10);


    FrElement a21 = fr_long(0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014);
    FrElement b21 = fr_long(0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5);

    FrElement a22 = fr_mlong(0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014);
    FrElement b22 = fr_mlong(0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5);

    FrElement a23 = fr_long(0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014);
    FrElement b23 = fr_long(0xfbb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5);

    FrElement a24 = fr_mlong(0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014);
    FrElement b24 = fr_mlong(0xfbb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5);

    FrElement a25 = fr_long(0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014);
    FrElement b25 = fr_long(0x1bb8e645ae216da7);

    FrElement a26 = fr_mlong(0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014);
    FrElement b26 = fr_mlong(0x1bb8e645ae216da7);


    Fr_shl_test(fr_short(0), a21, b21, 21);
    Fr_shl_test(fr_short(0), a22, b22, 22);
    Fr_shl_test(fr_short(0), a23, b23, 23);
    Fr_shl_test(fr_short(0), a24, b24, 24);
    Fr_shl_test(fr_short(0), a25, b25, 25);
    Fr_shl_test(fr_short(0), a26, b26, 26);


    FrElement r31 = fr_long(0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014);
    FrElement r32 = fr_long(0x43e1f593f0000000,0x2833e84879b97091,0xb85045b68181585d,0x30644e72e131a029);
    FrElement r33 = fr_long(0x3e1f593f00000000,0x833e84879b970914,0x85045b68181585d2,0x0644e72e131a029b);
    FrElement r34 = fr_long(0x0fac9f8000000000,0x9f4243cdcb848a1f,0x822db40c0ac2e941,0x227397098d014dc2);
    FrElement r35 = fr_long(0xb27e000000000000,0x090f372e12287c3e,0xb6d0302b0ba5067d,0x0e5c263405370a08);
    FrElement r36 = fr_long(0xb41e0a6c0fffffff,0x14a8d00028378a38,0x8870667812989bc7,0x003481a1faf682b1);
    FrElement r37 = fr_long(0x0000000000000000,0x0000000000000000,0x1f0fac9f80000000,0x019f4243cdcb848a);
    FrElement r41 = fr_long(0x50f87d64fc000000,0x4a0cfa121e6e5c24,0x6e14116da0605617,0x0c19139cb84c680a);
    FrElement r42 = fr_long(0x450f87d64fc00000,0x74a0cfa121e6e5c2,0xa6e14116da060561,0x00c19139cb84c680);
    FrElement r43 = fr_long(0x848a1f0fac9f8000,0xc2e9419f4243cdcb,0x014dc2822db40c0a,0x000183227397098d);
    FrElement r44 = fr_long(0x72e12287c3eb27e0,0x02b0ba5067d090f3,0x63405370a08b6d03,0x00000060c89ce5c2);
    FrElement r45 = fr_long(0x3cdcb848a1f0fac9,0x40c0ac2e9419f424,0x7098d014dc2822db,0x0000000018322739);
    FrElement r46 = fr_long(0x4dc2822db40c0ac2,0x0183227397098d01,0x0000000000000000,0x0000000000000000);
    FrElement r47 = fr_long(0x0000000000183227,0x0000000000000000,0x0000000000000000,0x0000000000000000);

    Fr_shl_test(r31,         a21, fr_short(0),    31);
    Fr_shl_test(r32,         a21, fr_short(1),    32);
    Fr_shl_test(r33,         a21, fr_short(5),    33);
    Fr_shl_test(r34,         a21, fr_short(12),   34);
    Fr_shl_test(r35,         a21, fr_short(22),   35);
    Fr_shl_test(r36,         a21, fr_short(32),   36);
    Fr_shl_test(r37,         a21, fr_short(132),  37);
    Fr_shl_test(fr_long(0),  a21, fr_short(232),  38);
    Fr_shl_test(fr_short(0), a21, fr_short(432),  39);

    Fr_shl_test(r41,         a21, fr_short(-1),   41);
    Fr_shl_test(r42,         a21, fr_short(-5),   42);
    Fr_shl_test(r43,         a21, fr_short(-12),  43);
    Fr_shl_test(r44,         a21, fr_short(-22),  44);
    Fr_shl_test(r45,         a21, fr_short(-32),  45);
    Fr_shl_test(r46,         a21, fr_short(-132), 46);
    Fr_shl_test(r47,         a21, fr_short(-232), 47);
    Fr_shl_test(fr_short(0), a21, fr_short(-332), 48);
    Fr_shl_test(fr_short(0), a21, fr_short(-432), 49);

    FrElement r51 = fr_long(0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014);
    FrElement r52 = fr_long(0x43e1f593f0000000,0x2833e84879b97091,0xb85045b68181585d,0x30644e72e131a029);
    FrElement r53 = fr_long(0x3e1f593f00000000,0x833e84879b970914,0x85045b68181585d2,0x0644e72e131a029b);
    FrElement r54 = fr_long(0x0fac9f8000000000,0x9f4243cdcb848a1f,0x822db40c0ac2e941,0x227397098d014dc2);
    FrElement r55 = fr_long(0xb27e000000000000,0x090f372e12287c3e,0xb6d0302b0ba5067d,0x0e5c263405370a08);
    FrElement r56 = fr_long(0xb41e0a6c0fffffff,0x14a8d00028378a38,0x8870667812989bc7,0x003481a1faf682b1);
    FrElement r57 = fr_long(0x0000000000000000,0x0000000000000000,0x1f0fac9f80000000,0x019f4243cdcb848a);

    Fr_shl_test(r51,         a21, fr_long(0),    51);
    Fr_shl_test(r52,         a21, fr_long(1),    52);
    Fr_shl_test(r53,         a21, fr_long(5),    53);
    Fr_shl_test(r54,         a21, fr_long(12),   54);
    Fr_shl_test(r55,         a21, fr_long(22),   55);
    Fr_shl_test(r56,         a21, fr_long(32),   56);
    Fr_shl_test(r57,         a21, fr_long(132),  57);
    Fr_shl_test(fr_long(0),  a21, fr_long(232),  58);
    Fr_shl_test(fr_short(0), a21, fr_long(432),  59);

    Fr_shl_test(fr_short(0), a21, fr_long(-1),   61);
    Fr_shl_test(fr_short(0), a21, fr_long(-5),   62);
    Fr_shl_test(fr_short(0), a21, fr_long(-12),  63);
    Fr_shl_test(fr_short(0), a21, fr_long(-22),  64);
    Fr_shl_test(fr_short(0), a21, fr_long(-32),  65);
    Fr_shl_test(fr_short(0), a21, fr_long(-132), 66);
    Fr_shl_test(fr_short(0), a21, fr_long(-232), 67);
    Fr_shl_test(fr_short(0), a21, fr_long(-332), 68);
    Fr_shl_test(fr_short(0), a21, fr_long(-432), 69);

    Fr_shl_test(fr_short(0), a21, fr_mlong(1),    71);
    Fr_shl_test(fr_short(0), a21, fr_mlong(12),   72);
    Fr_shl_test(fr_short(0), a21, fr_mlong(32),   73);
    Fr_shl_test(fr_short(0), a21, fr_mlong(132),  74);
    Fr_shl_test(fr_short(0), a21, fr_mlong(432),  75);
    Fr_shl_test(fr_short(0), a21, fr_mlong(-1),   76);
    Fr_shl_test(fr_short(0), a21, fr_mlong(-5),   77);
    Fr_shl_test(fr_short(0), a21, fr_mlong(-12),  78);

    FrElement r80 = fr_long(0x55b425913927735a,0xa3ac6d7389307a4d,0x543d3ec42a2529ae,0x256e51ca1fcef59b);
    FrElement r81 = fr_long(0xab684b22724ee6b4,0x4758dae71260f49a,0xa87a7d88544a535d,0x0adca3943f9deb36);
    FrElement r82 = fr_long(0x425913927735a000,0xc6d7389307a4d55b,0xd3ec42a2529aea3a,0x251ca1fcef59b543);
    FrElement r83 = fr_long(0x3927735a00000000,0x89307a4d55b42591,0x2a2529aea3ac6d73,0x1fcef59b543d3ec4);
    FrElement r84 = fr_long(0xbc1e0a6c0fffffff,0xd7cc17b786468f6e,0xa2f2135d10f5dd42,0x0a6288c5b1d604ab);
    FrElement r85 = fr_short(0);
    FrElement r86 = fr_long(0xaada12c89c93b9ad,0x51d636b9c4983d26,0xaa1e9f62151294d7,0x12b728e50fe77acd);
    FrElement r87 = fr_long(0x89307a4d55b42591,0x2a2529aea3ac6d73,0x1fcef59b543d3ec4,0x00000000256e51ca);
    FrElement r88 = fr_long(0xb543d3ec42a2529a,0x0256e51ca1fcef59,0x0000000000000000,0x0000000000000000);
    FrElement r89 = fr_short(0);

    Fr_shl_test(r80, a22, fr_short(0),    80);
    Fr_shl_test(r81, a22, fr_short(1),    81);
    Fr_shl_test(r82, a22, fr_short(12),   82);
    Fr_shl_test(r83, a22, fr_short(32),   83);
    Fr_shl_test(r84, a22, fr_short(132),  84);
    Fr_shl_test(r85, a22, fr_short(432),  85);
    Fr_shl_test(r86, a22, fr_short(-1),   86);
    Fr_shl_test(r87, a22, fr_short(-32),  87);
    Fr_shl_test(r88, a22, fr_short(-132), 88);
    Fr_shl_test(r89, a22, fr_short(-432), 89);
}

void Fr_rawShr_test(FrRawElement r_expected, FrRawElement a, uint64_t b)
{
    FrRawElement r_computed = {0xbadbadbadbadbadb,0xadbadbadbadbadba,0xdbadbadbadbadbad,0xbadbadbadbadbadb};

    Fr_rawShr(r_computed, a, b);

    compare_Result(r_expected, r_computed, a, b, (int)b, __func__);
}

void Fr_rawShr_unit_test()
{
    FrRawElement rawA1     = {0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff};
    FrRawElement rawA2     = {0xaaaaaaaaaaaaaaaa,0xaaaaaaaaaaaaaaaa,0xaaaaaaaaaaaaaaaa,0xaaaaaaaaaaaaaaaa};

    FrRawElement result1   = {0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0x7fffffffffffffff};
    FrRawElement result2   = {0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0x3fffffffffffffff};
    FrRawElement result3   = {0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0x1fffffffffffffff};
    FrRawElement result4   = {0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0x0fffffffffffffff};

    FrRawElement result7   = {0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0x01ffffffffffffff};
    FrRawElement result8   = {0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0x00ffffffffffffff};
    FrRawElement result9   = {0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0x007fffffffffffff};

    FrRawElement result15  = {0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0x0001ffffffffffff};
    FrRawElement result16  = {0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0x0000ffffffffffff};
    FrRawElement result17  = {0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0x00007fffffffffff};

    FrRawElement result30  = {0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0x00000003ffffffff};
    FrRawElement result31  = {0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0x00000001ffffffff};
    FrRawElement result32  = {0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0x00000000ffffffff};
    FrRawElement result33  = {0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0x000000007fffffff};
    FrRawElement result34  = {0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0x000000003fffffff};

    FrRawElement result63  = {0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0x0000000000000001};
    FrRawElement result64  = {0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0x0000000000000000};
    FrRawElement result65  = {0xffffffffffffffff,0xffffffffffffffff,0x7fffffffffffffff,0x0000000000000000};

    FrRawElement result95  = {0xffffffffffffffff,0xffffffffffffffff,0x00000001ffffffff,0x0000000000000000};
    FrRawElement result96  = {0xffffffffffffffff,0xffffffffffffffff,0x00000000ffffffff,0x0000000000000000};
    FrRawElement result97  = {0xffffffffffffffff,0xffffffffffffffff,0x000000007fffffff,0x0000000000000000};

    FrRawElement result127 = {0xffffffffffffffff,0xffffffffffffffff,0x0000000000000001,0x0000000000000000};
    FrRawElement result128 = {0xffffffffffffffff,0xffffffffffffffff,0x0000000000000000,0x0000000000000000};
    FrRawElement result129 = {0xffffffffffffffff,0x7fffffffffffffff,0x0000000000000000,0x0000000000000000};

    FrRawElement result159 = {0x5555555555555555,0x0000000155555555,0x0000000000000000,0x0000000000000000};
    FrRawElement result160 = {0xaaaaaaaaaaaaaaaa,0x00000000aaaaaaaa,0x0000000000000000,0x0000000000000000};
    FrRawElement result161 = {0x5555555555555555,0x0000000055555555,0x0000000000000000,0x0000000000000000};

    FrRawElement result191 = {0x5555555555555555,0x0000000000000001,0x0000000000000000,0x0000000000000000};
    FrRawElement result192 = {0xaaaaaaaaaaaaaaaa,0x0000000000000000,0x0000000000000000,0x0000000000000000};
    FrRawElement result193 = {0x5555555555555555,0x0000000000000000,0x0000000000000000,0x0000000000000000};

    FrRawElement result223 = {0x0000000155555555,0x0000000000000000,0x0000000000000000,0x0000000000000000};
    FrRawElement result224 = {0x00000000aaaaaaaa,0x0000000000000000,0x0000000000000000,0x0000000000000000};
    FrRawElement result225 = {0x0000000055555555,0x0000000000000000,0x0000000000000000,0x0000000000000000};

    FrRawElement result250 = {0x000000000000003f,0x0000000000000000,0x0000000000000000,0x0000000000000000};
    FrRawElement result251 = {0x000000000000001f,0x0000000000000000,0x0000000000000000,0x0000000000000000};
    FrRawElement result252 = {0x000000000000000f,0x0000000000000000,0x0000000000000000,0x0000000000000000};
    FrRawElement result253 = {0x0000000000000007,0x0000000000000000,0x0000000000000000,0x0000000000000000};

    Fr_rawShr_test(result1, rawA1, 1);
    Fr_rawShr_test(result2, rawA1, 2);
    Fr_rawShr_test(result3, rawA1, 3);
    Fr_rawShr_test(result4, rawA1, 4);

    Fr_rawShr_test(result7, rawA1, 7);
    Fr_rawShr_test(result8, rawA1, 8);
    Fr_rawShr_test(result9, rawA1, 9);

    Fr_rawShr_test(result15, rawA1, 15);
    Fr_rawShr_test(result16, rawA1, 16);
    Fr_rawShr_test(result17, rawA1, 17);

    Fr_rawShr_test(result30, rawA1, 30);
    Fr_rawShr_test(result31, rawA1, 31);
    Fr_rawShr_test(result32, rawA1, 32);
    Fr_rawShr_test(result33, rawA1, 33);
    Fr_rawShr_test(result34, rawA1, 34);

    Fr_rawShr_test(result63, rawA1, 63);
    Fr_rawShr_test(result64, rawA1, 64);
    Fr_rawShr_test(result65, rawA1, 65);

    Fr_rawShr_test(result95, rawA1, 95);
    Fr_rawShr_test(result96, rawA1, 96);
    Fr_rawShr_test(result97, rawA1, 97);

    Fr_rawShr_test(result127, rawA1, 127);
    Fr_rawShr_test(result128, rawA1, 128);
    Fr_rawShr_test(result129, rawA1, 129);

    Fr_rawShr_test(result159, rawA2, 159);
    Fr_rawShr_test(result160, rawA2, 160);
    Fr_rawShr_test(result161, rawA2, 161);

    Fr_rawShr_test(result191, rawA2, 191);
    Fr_rawShr_test(result192, rawA2, 192);
    Fr_rawShr_test(result193, rawA2, 193);

    Fr_rawShr_test(result223, rawA2, 223);
    Fr_rawShr_test(result224, rawA2, 224);
    Fr_rawShr_test(result225, rawA2, 225);

    Fr_rawShr_test(result250, rawA1, 250);
    Fr_rawShr_test(result251, rawA1, 251);
    Fr_rawShr_test(result252, rawA1, 252);
    Fr_rawShr_test(result253, rawA1, 253);
}

void Fr_rawShl_test(FrRawElement r_expected, FrRawElement a, uint64_t b)
{
    FrRawElement r_computed = {0xbadbadbadbadbadb,0xadbadbadbadbadba,0xdbadbadbadbadbad,0xbadbadbadbadbadb};

    Fr_rawShl(r_computed, a, b);

    compare_Result(r_expected, r_computed, a, b, (int)b, __func__);
}

void Fr_rawShl_unit_test()
{
    FrRawElement rawA1     = {0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff};
    FrRawElement rawA2     = {0xaaaaaaaaaaaaaaaa,0xaaaaaaaaaaaaaaaa,0xaaaaaaaaaaaaaaaa,0xaaaaaaaaaaaaaaaa};

    FrRawElement result1   = {0xbc1e0a6c0ffffffd,0xd7cc17b786468f6e,0x47afba497e7ea7a2,0x0f9bb18d1ece5fd6};
    FrRawElement result2   = {0xbc1e0a6c0ffffffb,0xd7cc17b786468f6e,0x47afba497e7ea7a2,0x0f9bb18d1ece5fd6};
    FrRawElement result3   = {0xbc1e0a6c0ffffff7,0xd7cc17b786468f6e,0x47afba497e7ea7a2,0x0f9bb18d1ece5fd6};
    FrRawElement result4   = {0xbc1e0a6c0fffffef,0xd7cc17b786468f6e,0x47afba497e7ea7a2,0x0f9bb18d1ece5fd6};

    FrRawElement result7   = {0xbc1e0a6c0fffff7f,0xd7cc17b786468f6e,0x47afba497e7ea7a2,0x0f9bb18d1ece5fd6};
    FrRawElement result8   = {0xbc1e0a6c0ffffeff,0xd7cc17b786468f6e,0x47afba497e7ea7a2,0x0f9bb18d1ece5fd6};
    FrRawElement result9   = {0xbc1e0a6c0ffffdff,0xd7cc17b786468f6e,0x47afba497e7ea7a2,0x0f9bb18d1ece5fd6};

    FrRawElement result15  = {0xbc1e0a6c0fff7fff,0xd7cc17b786468f6e,0x47afba497e7ea7a2,0x0f9bb18d1ece5fd6};
    FrRawElement result16  = {0xbc1e0a6c0ffeffff,0xd7cc17b786468f6e,0x47afba497e7ea7a2,0x0f9bb18d1ece5fd6};
    FrRawElement result17  = {0xbc1e0a6c0ffdffff,0xd7cc17b786468f6e,0x47afba497e7ea7a2,0x0f9bb18d1ece5fd6};

    FrRawElement result30  = {0xbc1e0a6bcfffffff,0xd7cc17b786468f6e,0x47afba497e7ea7a2,0x0f9bb18d1ece5fd6};
    FrRawElement result31  = {0xbc1e0a6b8fffffff,0xd7cc17b786468f6e,0x47afba497e7ea7a2,0x0f9bb18d1ece5fd6};
    FrRawElement result32  = {0xbc1e0a6b0fffffff,0xd7cc17b786468f6e,0x47afba497e7ea7a2,0x0f9bb18d1ece5fd6};
    FrRawElement result33  = {0xbc1e0a6a0fffffff,0xd7cc17b786468f6e,0x47afba497e7ea7a2,0x0f9bb18d1ece5fd6};
    FrRawElement result34  = {0xbc1e0a680fffffff,0xd7cc17b786468f6e,0x47afba497e7ea7a2,0x0f9bb18d1ece5fd6};

    FrRawElement result63  = {0x3c1e0a6c0fffffff,0xd7cc17b786468f6e,0x47afba497e7ea7a2,0x0f9bb18d1ece5fd6};
    FrRawElement result64  = {0xbc1e0a6c0fffffff,0xd7cc17b786468f6d,0x47afba497e7ea7a2,0x0f9bb18d1ece5fd6};
    FrRawElement result65  = {0xbc1e0a6c0fffffff,0xd7cc17b786468f6c,0x47afba497e7ea7a2,0x0f9bb18d1ece5fd6};

    FrRawElement result95  = {0xbc1e0a6c0fffffff,0xd7cc17b706468f6e,0x47afba497e7ea7a2,0x0f9bb18d1ece5fd6};
    FrRawElement result96  = {0xbc1e0a6c0fffffff,0xd7cc17b686468f6e,0x47afba497e7ea7a2,0x0f9bb18d1ece5fd6};
    FrRawElement result97  = {0xbc1e0a6c0fffffff,0xd7cc17b586468f6e,0x47afba497e7ea7a2,0x0f9bb18d1ece5fd6};

    FrRawElement result127 = {0xbc1e0a6c0fffffff,0x57cc17b786468f6e,0x47afba497e7ea7a2,0x0f9bb18d1ece5fd6};
    FrRawElement result128 = {0xbc1e0a6c0fffffff,0xd7cc17b786468f6e,0x47afba497e7ea7a1,0x0f9bb18d1ece5fd6};
    FrRawElement result129 = {0xbc1e0a6c0fffffff,0xd7cc17b786468f6e,0x47afba497e7ea7a0,0x0f9bb18d1ece5fd6};

    FrRawElement result159 = {0x0000000000000000,0x0000000000000000,0x5555555500000000,0x1555555555555555};
    FrRawElement result160 = {0x0000000000000000,0x0000000000000000,0xaaaaaaaa00000000,0x2aaaaaaaaaaaaaaa};
    FrRawElement result161 = {0x0000000000000000,0x0000000000000000,0x5555555400000000,0x1555555555555555};

    FrRawElement result191 = {0x0000000000000000,0x0000000000000000,0x0000000000000000,0x1555555555555555};
    FrRawElement result192 = {0x0000000000000000,0x0000000000000000,0x0000000000000000,0x2aaaaaaaaaaaaaaa};
    FrRawElement result193 = {0x0000000000000000,0x0000000000000000,0x0000000000000000,0x1555555555555554};

    FrRawElement result223 = {0x0000000000000000,0x0000000000000000,0x0000000000000000,0x1555555500000000};
    FrRawElement result224 = {0x0000000000000000,0x0000000000000000,0x0000000000000000,0x2aaaaaaa00000000};
    FrRawElement result225 = {0x0000000000000000,0x0000000000000000,0x0000000000000000,0x1555555400000000};

    FrRawElement result250 = {0xbc1e0a6c0fffffff,0xd7cc17b786468f6e,0x47afba497e7ea7a2,0x0b9bb18d1ece5fd6};
    FrRawElement result251 = {0xbc1e0a6c0fffffff,0xd7cc17b786468f6e,0x47afba497e7ea7a2,0x079bb18d1ece5fd6};
    FrRawElement result252 = {0x0000000000000000,0x0000000000000000,0x0000000000000000,0x3000000000000000};
    FrRawElement result253 = {0x0000000000000000,0x0000000000000000,0x0000000000000000,0x2000000000000000};

    Fr_rawShl_test(result1, rawA1, 1);
    Fr_rawShl_test(result2, rawA1, 2);
    Fr_rawShl_test(result3, rawA1, 3);
    Fr_rawShl_test(result4, rawA1, 4);

    Fr_rawShl_test(result7, rawA1, 7);
    Fr_rawShl_test(result8, rawA1, 8);
    Fr_rawShl_test(result9, rawA1, 9);

    Fr_rawShl_test(result15, rawA1, 15);
    Fr_rawShl_test(result16, rawA1, 16);
    Fr_rawShl_test(result17, rawA1, 17);

    Fr_rawShl_test(result30, rawA1, 30);
    Fr_rawShl_test(result31, rawA1, 31);
    Fr_rawShl_test(result32, rawA1, 32);
    Fr_rawShl_test(result33, rawA1, 33);
    Fr_rawShl_test(result34, rawA1, 34);

    Fr_rawShl_test(result63, rawA1, 63);
    Fr_rawShl_test(result64, rawA1, 64);
    Fr_rawShl_test(result65, rawA1, 65);

    Fr_rawShl_test(result95, rawA1, 95);
    Fr_rawShl_test(result96, rawA1, 96);
    Fr_rawShl_test(result97, rawA1, 97);

    Fr_rawShl_test(result127, rawA1, 127);
    Fr_rawShl_test(result128, rawA1, 128);
    Fr_rawShl_test(result129, rawA1, 129);

    Fr_rawShl_test(result159, rawA2, 159);
    Fr_rawShl_test(result160, rawA2, 160);
    Fr_rawShl_test(result161, rawA2, 161);

    Fr_rawShl_test(result191, rawA2, 191);
    Fr_rawShl_test(result192, rawA2, 192);
    Fr_rawShl_test(result193, rawA2, 193);

    Fr_rawShl_test(result223, rawA2, 223);
    Fr_rawShl_test(result224, rawA2, 224);
    Fr_rawShl_test(result225, rawA2, 225);

    Fr_rawShl_test(result250, rawA1, 250);
    Fr_rawShl_test(result251, rawA1, 251);
    Fr_rawShl_test(result252, rawA1, 252);
    Fr_rawShl_test(result253, rawA1, 253);
}


void Fr_square_test(FrElement r_expected, FrElement a, int index)
{
    FrElement r_computed = {0,0,{0,0,0,0}};

    Fr_square(&r_computed, &a);

    compare_Result(&r_expected, &r_computed, &a, index, __func__);
}

void Fr_square_short_test(int64_t r_expected, int32_t a, int index)
{
    Fr_square_test(fr_long(r_expected), fr_short(a), index);
}

void Fr_square_unit_test()
{
    Fr_square_short_test(0,                0, 0);
    Fr_square_short_test(1,                1, 1);
    Fr_square_short_test(1,               -1, 2);
    Fr_square_short_test(4,                2, 3);
    Fr_square_short_test(4,               -2, 4);
    Fr_square_short_test(65536,          256, 5);
    Fr_square_short_test(65536,         -256, 6);
    Fr_square_short_test(1067851684,   32678, 7);
    Fr_square_short_test(4294967296,   65536, 8);
    Fr_square_short_test(68719476736, 262144, 9);

    FrElement a1 = fr_short(1048576);
    FrElement a2 = fr_short(16777216);
    FrElement a3 = fr_short(-16777216);
    FrElement a4 = fr_short(2147483647);
    FrElement a5 = fr_short(-2147483647);

    FrElement r1 = fr_long(0x0000010000000000,0x0000000000000000,0x0000000000000000,0x0000000000000000);
    FrElement r2 = fr_long(0x0001000000000000,0x0000000000000000,0x0000000000000000,0x0000000000000000);
    FrElement r3 = fr_long(0x0001000000000000,0x0000000000000000,0x0000000000000000,0x0000000000000000);
    FrElement r4 = fr_long(0x3fffffff00000001,0x0000000000000000,0x0000000000000000,0x0000000000000000);
    FrElement r5 = fr_long(0x3fffffff00000001,0x0000000000000000,0x0000000000000000,0x0000000000000000);

    Fr_square_test(r1, a1, 11);
    Fr_square_test(r2, a2, 12);
    Fr_square_test(r3, a3, 13);
    Fr_square_test(r4, a4, 14);
    Fr_square_test(r5, a5, 15);

    FrElement a21 = fr_long(0x43e1f593f0000001,0x2833e84879b97091,0xb85045b68181585d,0x30644e72e131a029);
    FrElement a22 = fr_long(0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x0216d0b17f4e44a5);
    FrElement a23 = fr_long(0x5e94d8e1b4bf0040,0x2a489cbe1cfbb6b8,0x893cc664a19fcfed,0x0cf8594b7fcc657c);
    FrElement a24 = fr_long(0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014);
    FrElement a25 = fr_long(0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5);
    FrElement a26 = fr_long(0x1bb8e645ae216da7);

    FrElement r21 = fr_mlong(0x0000000000000000,0x0000000000000000,0x0000000000000000,0x0000000000000000);
    FrElement r22 = fr_mlong(0x00915951a17a2cef,0xbf25f2dd9fd7425c,0xfb6cfdc4a7eeefb8,0x06eaaa4fb32c8ec9);
    FrElement r23 = fr_mlong(0xbd21a87879979b42,0xc838a7401d9b5225,0x97846f8ea771a174,0x00ae773b6f7fa82d);
    FrElement r24 = fr_mlong(0xbc1e0a6c0fffffff,0xd7cc17b786468f6e,0x47afba497e7ea7a2,0x0f9bb18d1ece5fd6);
    FrElement r25 = fr_mlong(0x00915951a17a2cef,0xbf25f2dd9fd7425c,0xfb6cfdc4a7eeefb8,0x06eaaa4fb32c8ec9);
    FrElement r26 = fr_mlong(0x907220cfe9de6aa5,0xcbe953472316eb2c,0x2336c1a61ae5f272,0x136f2bc2b41ee96e);

    Fr_square_test(r21, a21, 21);
    Fr_square_test(r22, a22, 22);
    Fr_square_test(r23, a23, 23);
    Fr_square_test(r24, a24, 24);
    Fr_square_test(r25, a25, 25);
    Fr_square_test(r26, a26, 26);

    FrElement a31 = fr_mlong(0x43e1f593f0000001,0x2833e84879b97091,0xb85045b68181585d,0x30644e72e131a029);
    FrElement a32 = fr_mlong(0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x0216d0b17f4e44a5);
    FrElement a33 = fr_mlong(0x5e94d8e1b4bf0040,0x2a489cbe1cfbb6b8,0x893cc664a19fcfed,0x0cf8594b7fcc657c);
    FrElement a34 = fr_mlong(0xa1f0fac9f8000000,0x9419f4243cdcb848,0xdc2822db40c0ac2e,0x183227397098d014);
    FrElement a35 = fr_mlong(0x1bb8e645ae216da7,0x53fe3ab1e35c59e3,0x8c49833d53bb8085,0x216d0b17f4e44a5);
    FrElement a36 = fr_mlong(0x1bb8e645ae216da7);

    FrElement r31 = fr_mlong(0x0000000000000000,0x0000000000000000,0x0000000000000000,0x0000000000000000);
    FrElement r32 = fr_mlong(0x5e94d8e1b4bf0040,0x2a489cbe1cfbb6b8,0x893cc664a19fcfed,0x0cf8594b7fcc657c);
    FrElement r33 = fr_mlong(0x00915951a17a2cef,0xbf25f2dd9fd7425c,0xfb6cfdc4a7eeefb8,0x06eaaa4fb32c8ec9);
    FrElement r34 = fr_mlong(0x9907e2cb536c4654,0xd65db18eb521336a,0x0e31a6546c6ec385,0x1dad258dd14a255c);
    FrElement r35 = fr_mlong(0x5e94d8e1b4bf0040,0x2a489cbe1cfbb6b8,0x893cc664a19fcfed,0x0cf8594b7fcc657c);
    FrElement r36 = fr_mlong(0xa53f1bf76b3483d6,0x368cb00a6a77e255,0x7b8b05c69920615c,0x0248823bc34637b8);

    Fr_square_test(r31, a31, 31);
    Fr_square_test(r32, a32, 32);
    Fr_square_test(r33, a33, 33);
    Fr_square_test(r34, a34, 34);
    Fr_square_test(r35, a35, 35);
    Fr_square_test(r36, a36, 36);
}


void Fr_bor_test(FrElement r_expected, FrElement a, FrElement b, int index)
{
    FrElement r_computed = {0,0,{0,0,0,0}};

    Fr_bor(&r_computed, &a, &b);

    compare_Result(&r_expected, &r_computed, &a, &b, index, __func__);
}

void Fr_bor_unit_test()
{
    FrElement s0  = fr_short(0);
    FrElement sf  = fr_short(0x7fffffff);
    FrElement s5  = fr_short(0x55555555);
    FrElement s9  = fr_short(0x99999999);
    FrElement sf1 = fr_short(-1);
    FrElement sf5 = fr_short(0xf5555555);
    FrElement sf9 = fr_short(0xf9999999);

    FrElement r2 = fr_long(0x43e1f5938999999a,0x2833e84879b97091,0xb85045b68181585d,0x30644e72e131a029);
    FrElement r3 = fr_long(0x43e1f593f0000000,0x2833e84879b97091,0xb85045b68181585d,0x30644e72e131a029);
    FrElement r4 = fr_long(0x43e1f593e5555556,0x2833e84879b97091,0xb85045b68181585d,0x30644e72e131a029);
    FrElement r5 = fr_long(0x43e1f593e999999a,0x2833e84879b97091,0xb85045b68181585d,0x30644e72e131a029);

    FrElement r12 = fr_long(0x43e1f593dddddddf,0x2833e84879b97091,0xb85045b68181585d,0x30644e72e131a029);
    FrElement r13 = fr_long(0x000000000ffffffe,0x0000000000000000,0x0000000000000000,0x0000000000000000);
    FrElement r14 = fr_long(0x43e1f593dddddddf,0x2833e84879b97091,0xb85045b68181585d,0x30644e72e131a029);
    FrElement r15 = fr_long(0x000000000ffffffe,0x0000000000000000,0x0000000000000000,0x0000000000000000);


    Fr_bor_test(sf, s0, sf,  0);
    Fr_bor_test(s5, s0, s5,  1);
    Fr_bor_test(r2, s0, s9,  2);
    Fr_bor_test(r3, s0, sf1, 3);
    Fr_bor_test(r4, s0, sf5, 4);
    Fr_bor_test(r5, s0, sf9, 5);

    Fr_bor_test(sf, sf,  s0, 6);
    Fr_bor_test(s5, s5,  s0, 7);
    Fr_bor_test(r2, s9,  s0, 8);
    Fr_bor_test(r3, sf1, s0, 9);
    Fr_bor_test(r4, sf5, s0, 10);
    Fr_bor_test(r5, sf9, s0, 11);

    Fr_bor_test(r12, s5,  s9, 12);
    Fr_bor_test(r13, sf1, sf, 13);
    Fr_bor_test(r14, s9,  s5, 14);
    Fr_bor_test(r15, sf, sf1, 15);

    FrElement l0 = fr_long(0);
    FrElement l1 = fr_long(0x43e1f593f0000001,0x0cf8594b7fcc657c,0xb85045b68181585d,0x30644e72e131a029);
    FrElement l2 = fr_long(0xffe1f593e999999a,0x2833e84879b97091,0xb85045b68181585d,0xf9999999);
    FrElement l5 = fr_long(0xf5555555);
    FrElement l9 = fr_long(0xf9999999);

    FrElement r21 = fr_long(0x43e1f593f0000001,0x0cf8594b7fcc657c,0xb85045b68181585d,0x30644e72e131a029);
    FrElement r22 = fr_long(0xffe1f593e999999a,0x2833e84879b97091,0xb85045b68181585d,0x00000000f9999999);
    FrElement r23 = fr_long(0x00000000f5555555,0x0000000000000000,0x0000000000000000,0x0000000000000000);
    FrElement r24 = fr_long(0x00000000f9999999,0x0000000000000000,0x0000000000000000,0x0000000000000000);
    FrElement r25 = fr_long(0x43e1f593f0000001,0x0cf8594b7fcc657c,0xb85045b68181585d,0x30644e72e131a029);
    FrElement r26 = fr_long(0xffe1f593e999999a,0x2833e84879b97091,0xb85045b68181585d,0x00000000f9999999);
    FrElement r27 = fr_long(0x00000000f5555555,0x0000000000000000,0x0000000000000000,0x0000000000000000);
    FrElement r28 = fr_long(0x00000000f9999999,0x0000000000000000,0x0000000000000000,0x0000000000000000);
    FrElement r29 = fr_long(0x43e1f593f5555555,0x0cf8594b7fcc657c,0xb85045b68181585d,0x30644e72e131a029);
    FrElement r30 = fr_long(0x43e1f593f9999999,0x0cf8594b7fcc657c,0xb85045b68181585d,0x30644e72e131a029);
    FrElement r31 = fr_long(0xbc0000000999999a,0x04c811030644056c,0x0000000000000000,0x0000000018881990);
    FrElement r32 = fr_long(0xffe1f593fddddddf,0x2833e84879b97091,0xb85045b68181585d,0x00000000f9999999);
    FrElement r33 = fr_long(0xffe1f593f999999b,0x2833e84879b97091,0xb85045b68181585d,0x00000000f9999999);
    FrElement r34 = fr_long(0xbc0000000999999a,0x04c811030644056c,0x0000000000000000,0x0000000018881990);
    FrElement r35 = fr_long(0x00000000fddddddd,0x0000000000000000,0x0000000000000000,0x0000000000000000);

    Fr_bor_test(r21, l0, l1, 21);
    Fr_bor_test(r22, l0, l2, 22);
    Fr_bor_test(r23, l0, l5, 23);
    Fr_bor_test(r24, l0, l9, 24);
    Fr_bor_test(r25, l1, l0, 25);
    Fr_bor_test(r26, l2, l0, 26);
    Fr_bor_test(r27, l5, l0, 27);
    Fr_bor_test(r28, l9, l0, 28);
    Fr_bor_test(r29, l1, l5, 29);
    Fr_bor_test(r30, l1, l9, 30);
    Fr_bor_test(r31, l1, l2, 31);
    Fr_bor_test(r32, l2, l5, 32);
    Fr_bor_test(r33, l2, l9, 33);
    Fr_bor_test(r34, l2, l1, 34);
    Fr_bor_test(r35, l5, l9, 35);

    FrElement m0 = fr_mlong(0);
    FrElement m1 = fr_mlong(0x43e1f593f0000001,0x0cf8594b7fcc657c,0xb85045b68181585d,0x30644e72e131a029);
    FrElement m5 = fr_mlong(0xf5555555);

    FrElement r41 = fr_long(0x0000000000000000,0x0000000000000000,0x0000000000000000,0x0000000000000000);
    FrElement r42 = fr_long(0x7385aa3557a85e96,0x192cf64388bea21e,0x7ca3821d26ad9cfe,0x24ee27250a2cfac1);
    FrElement r43 = fr_long(0x6656931836f71fc0,0xd91d972332e0fff9,0x6d1dc7a7d4dfb843,0x1151f9979bbe9426);
    FrElement r44 = fr_long(0x33f5c5a987ff5fd5,0xb10a0f1b41458f6e,0xc56f8209757e64a2,0x059bb144ba8d5ebd);
    FrElement r45 = fr_long(0x33f5c5a987ff5fd5,0xb10a0f1b41458f6e,0xc56f8209757e64a2,0x059bb144ba8d5ebd);
    FrElement r46 = fr_long(0x6656931836f71fc0,0xd91d972332e0fff9,0x6d1dc7a7d4dfb843,0x1151f9979bbe9426);

    Fr_bor_test(r41, m0, m0, 41);
    Fr_bor_test(r42, m0, m1, 42);
    Fr_bor_test(r43, m0, m5, 43);
    Fr_bor_test(r44, m1, m5, 44);
    Fr_bor_test(r45, m5, m1, 45);
    Fr_bor_test(r46, m5, m0, 46);

    FrElement r51 = fr_long(0x30040a23efb9df9d,0x110c16038006820e,0x44a38209262c84a2,0x048a21050a0c5ac0);
    FrElement r52 = fr_long(0xbbfffffff9999999,0x0000000000000000,0x0000000000000000,0x0000000018881990);
    FrElement r53 = fr_long(0x7385aa357fffffff,0x192cf64388bea21e,0x7ca3821d26ad9cfe,0x24ee27250a2cfac1);
    FrElement r54 = fr_long(0xffe1f593ffffffff,0x2833e84879b97091,0xb85045b68181585d,0x00000000f9999999);
    FrElement r55 = fr_long(0xffe5ffb7ffb9df9e,0x393ffe4bf9bff29f,0xfcf3c7bfa7addcff,0x24ee2725fbbdfbd9);
    FrElement r56 = fr_long(0xffe5ffb7ffb9df9e,0x393ffe4bf9bff29f,0xfcf3c7bfa7addcff,0x24ee2725fbbdfbd9);
    FrElement r57 = fr_long(0x30040a23efb9df9d,0x110c16038006820e,0x44a38209262c84a2,0x048a21050a0c5ac0);
    FrElement r58 = fr_long(0xbbfffffff9999999,0x0000000000000000,0x0000000000000000,0x0000000018881990);
    FrElement r59 = fr_long(0x7385aa357fffffff,0x192cf64388bea21e,0x7ca3821d26ad9cfe,0x24ee27250a2cfac1);
    FrElement r50 = fr_long(0xffe1f593ffffffff,0x2833e84879b97091,0xb85045b68181585d,0x00000000f9999999);

    Fr_bor_test(r51, s9, m1, 51);
    Fr_bor_test(r52, s9, l2, 52);
    Fr_bor_test(r53, sf, m1, 53);
    Fr_bor_test(r54, sf, l2, 54);
    Fr_bor_test(r55, l2, m1, 55);
    Fr_bor_test(r56, m1, l2, 56);
    Fr_bor_test(r57, m1, s9, 57);
    Fr_bor_test(r58, l2, s9, 58);
    Fr_bor_test(r59, m1, sf, 59);
    Fr_bor_test(r50, l2, sf, 50);
}

void Fr_bxor_test(FrElement r_expected, FrElement a, FrElement b, int index)
{
    FrElement r_computed = {0,0,{0,0,0,0}};

    Fr_bxor(&r_computed, &a, &b);

    compare_Result(&r_expected, &r_computed, &a, &b, index, __func__);
}

void Fr_bxor_unit_test()
{
    FrElement s0  = fr_short(0);
    FrElement sf  = fr_short(0x7fffffff);
    FrElement s5  = fr_short(0x55555555);
    FrElement s9  = fr_short(0x99999999);
    FrElement sf1 = fr_short(-1);
    FrElement sf5 = fr_short(0xf5555555);
    FrElement sf9 = fr_short(0xf9999999);

    FrElement r2 = fr_long(0x43e1f5938999999a,0x2833e84879b97091,0xb85045b68181585d,0x30644e72e131a029);
    FrElement r3 = fr_long(0x43e1f593f0000000,0x2833e84879b97091,0xb85045b68181585d,0x30644e72e131a029);
    FrElement r4 = fr_long(0x43e1f593e5555556,0x2833e84879b97091,0xb85045b68181585d,0x30644e72e131a029);
    FrElement r5 = fr_long(0x43e1f593e999999a,0x2833e84879b97091,0xb85045b68181585d,0x30644e72e131a029);

    FrElement r12 = fr_long(0x43e1f593dccccccf,0x2833e84879b97091,0xb85045b68181585d,0x30644e72e131a029);
    FrElement r13 = fr_long(0x43e1f5938fffffff,0x2833e84879b97091,0xb85045b68181585d,0x30644e72e131a029);
    FrElement r14 = fr_long(0x43e1f593dccccccf,0x2833e84879b97091,0xb85045b68181585d,0x30644e72e131a029);
    FrElement r15 = fr_long(0x43e1f5938fffffff,0x2833e84879b97091,0xb85045b68181585d,0x30644e72e131a029);

    Fr_bxor_test(sf, s0, sf,  0);
    Fr_bxor_test(s5, s0, s5,  1);
    Fr_bxor_test(r2, s0, s9,  2);
    Fr_bxor_test(r3, s0, sf1, 3);
    Fr_bxor_test(r4, s0, sf5, 4);
    Fr_bxor_test(r5, s0, sf9, 5);

    Fr_bxor_test(sf, sf,  s0, 6);
    Fr_bxor_test(s5, s5,  s0, 7);
    Fr_bxor_test(r2, s9,  s0, 8);
    Fr_bxor_test(r3, sf1, s0, 9);
    Fr_bxor_test(r4, sf5, s0, 10);
    Fr_bxor_test(r5, sf9, s0, 11);

    Fr_bxor_test(r12, s5,  s9, 12);
    Fr_bxor_test(r13, sf1, sf, 13);
    Fr_bxor_test(r14, s9,  s5, 14);
    Fr_bxor_test(r15, sf, sf1, 15);

    FrElement l0 = fr_long(0);
    FrElement l1 = fr_long(0x43e1f593f0000001,0x0cf8594b7fcc657c,0xb85045b68181585d,0x30644e72e131a029);
    FrElement l2 = fr_long(0xffe1f593e999999a,0x2833e84879b97091,0xb85045b68181585d,0xf9999999);
    FrElement l5 = fr_long(0xf5555555);
    FrElement l9 = fr_long(0xf9999999);

    FrElement r21 = fr_long(0x43e1f593f0000001,0x0cf8594b7fcc657c,0xb85045b68181585d,0x30644e72e131a029);
    FrElement r22 = fr_long(0xffe1f593e999999a,0x2833e84879b97091,0xb85045b68181585d,0x00000000f9999999);
    FrElement r23 = fr_long(0x00000000f5555555,0x0000000000000000,0x0000000000000000,0x0000000000000000);
    FrElement r24 = fr_long(0x00000000f9999999,0x0000000000000000,0x0000000000000000,0x0000000000000000);
    FrElement r25 = fr_long(0x43e1f593f0000001,0x0cf8594b7fcc657c,0xb85045b68181585d,0x30644e72e131a029);
    FrElement r26 = fr_long(0xffe1f593e999999a,0x2833e84879b97091,0xb85045b68181585d,0x00000000f9999999);
    FrElement r27 = fr_long(0x00000000f5555555,0x0000000000000000,0x0000000000000000,0x0000000000000000);
    FrElement r28 = fr_long(0x00000000f9999999,0x0000000000000000,0x0000000000000000,0x0000000000000000);
    FrElement r29 = fr_long(0x43e1f59305555554,0x0cf8594b7fcc657c,0xb85045b68181585d,0x30644e72e131a029);
    FrElement r30 = fr_long(0x43e1f59309999998,0x0cf8594b7fcc657c,0xb85045b68181585d,0x30644e72e131a029);
    FrElement r31 = fr_long(0xbc0000001999999b,0x24cbb103067515ed,0x0000000000000000,0x30644e7218a839b0);
    FrElement r32 = fr_long(0xffe1f5931ccccccf,0x2833e84879b97091,0xb85045b68181585d,0x00000000f9999999);
    FrElement r33 = fr_long(0xffe1f59310000003,0x2833e84879b97091,0xb85045b68181585d,0x00000000f9999999);
    FrElement r34 = fr_long(0xbc0000001999999b,0x24cbb103067515ed,0x0000000000000000,0x30644e7218a839b0);
    FrElement r35 = fr_long(0x000000000ccccccc,0x0000000000000000,0x0000000000000000,0x0000000000000000);

    Fr_bxor_test(r21, l0, l1, 21);
    Fr_bxor_test(r22, l0, l2, 22);
    Fr_bxor_test(r23, l0, l5, 23);
    Fr_bxor_test(r24, l0, l9, 24);
    Fr_bxor_test(r25, l1, l0, 25);
    Fr_bxor_test(r26, l2, l0, 26);
    Fr_bxor_test(r27, l5, l0, 27);
    Fr_bxor_test(r28, l9, l0, 28);
    Fr_bxor_test(r29, l1, l5, 29);
    Fr_bxor_test(r30, l1, l9, 30);
    Fr_bxor_test(r31, l1, l2, 31);
    Fr_bxor_test(r32, l2, l5, 32);
    Fr_bxor_test(r33, l2, l9, 33);
    Fr_bxor_test(r34, l2, l1, 34);
    Fr_bxor_test(r35, l5, l9, 35);

    FrElement m0 = fr_mlong(0);
    FrElement m1 = fr_mlong(0x43e1f593f0000001,0x0cf8594b7fcc657c,0xb85045b68181585d,0x30644e72e131a029);
    FrElement m5 = fr_mlong(0xf5555555);

    FrElement r41 = fr_long(0x0000000000000000,0x0000000000000000,0x0000000000000000,0x0000000000000000);
    FrElement r42 = fr_long(0x7385aa3557a85e96,0x192cf64388bea21e,0x7ca3821d26ad9cfe,0x24ee27250a2cfac1);
    FrElement r43 = fr_long(0x6656931836f71fc0,0xd91d972332e0fff9,0x6d1dc7a7d4dfb843,0x1151f9979bbe9426);
    FrElement r44 = fr_long(0xd1f14399715f4155,0x97fd791840a4ed55,0x596e000470f0cc60,0x055b903fb060cebd);
    FrElement r45 = fr_long(0xd1f14399715f4155,0x97fd791840a4ed55,0x596e000470f0cc60,0x055b903fb060cebd);
    FrElement r46 = fr_long(0x6656931836f71fc0,0xd91d972332e0fff9,0x6d1dc7a7d4dfb843,0x1151f9979bbe9426);

    Fr_bxor_test(r41, m0, m0, 41);
    Fr_bxor_test(r42, m0, m1, 42);
    Fr_bxor_test(r43, m0, m5, 43);
    Fr_bxor_test(r44, m1, m5, 44);
    Fr_bxor_test(r45, m5, m1, 45);
    Fr_bxor_test(r46, m5, m0, 46);

    FrElement r51 = fr_long(0x30645fa6de31c70c,0x311f1e0bf107d28f,0xc4f3c7aba72cc4a3,0x148a6957eb1d5ae8);
    FrElement r52 = fr_long(0xbc00000060000000,0x0000000000000000,0x0000000000000000,0x30644e7218a839b0);
    FrElement r53 = fr_long(0x7385aa352857a169,0x192cf64388bea21e,0x7ca3821d26ad9cfe,0x24ee27250a2cfac1);
    FrElement r54 = fr_long(0xffe1f59396666665,0x2833e84879b97091,0xb85045b68181585d,0x00000000f9999999);
    FrElement r55 = fr_long(0x8c645fa6be31c70c,0x311f1e0bf107d28f,0xc4f3c7aba72cc4a3,0x24ee2725f3b56358);
    FrElement r56 = fr_long(0x8c645fa6be31c70c,0x311f1e0bf107d28f,0xc4f3c7aba72cc4a3,0x24ee2725f3b56358);
    FrElement r57 = fr_long(0x30645fa6de31c70c,0x311f1e0bf107d28f,0xc4f3c7aba72cc4a3,0x148a6957eb1d5ae8);
    FrElement r58 = fr_long(0xbc00000060000000,0x0000000000000000,0x0000000000000000,0x30644e7218a839b0);
    FrElement r59 = fr_long(0x7385aa352857a169,0x192cf64388bea21e,0x7ca3821d26ad9cfe,0x24ee27250a2cfac1);
    FrElement r50 = fr_long(0xffe1f59396666665,0x2833e84879b97091,0xb85045b68181585d,0x00000000f9999999);

    Fr_bxor_test(r51, s9, m1, 51);
    Fr_bxor_test(r52, s9, l2, 52);
    Fr_bxor_test(r53, sf, m1, 53);
    Fr_bxor_test(r54, sf, l2, 54);
    Fr_bxor_test(r55, l2, m1, 55);
    Fr_bxor_test(r56, m1, l2, 56);
    Fr_bxor_test(r57, m1, s9, 57);
    Fr_bxor_test(r58, l2, s9, 58);
    Fr_bxor_test(r59, m1, sf, 59);
    Fr_bxor_test(r50, l2, sf, 50);
}


void Fr_bnot_test(FrElement r_expected, FrElement a, int index)
{
    FrElement r_computed = {0,0,{0,0,0,0}};

    Fr_bnot(&r_computed, &a);

    compare_Result(&r_expected, &r_computed, &a, index, __func__);
}

void Fr_bnot_unit_test()
{
    FrElement s0  = fr_short(0);
    FrElement s1  = fr_short(0x7fffffff);
    FrElement s2  = fr_short(0xffffffff);
    FrElement s3  = fr_short(0x55555555);
    FrElement s4  = fr_short(0x99999999);

    FrElement r0 = fr_long(0xbc1e0a6c0ffffffe,0xd7cc17b786468f6e,0x47afba497e7ea7a2,0x0f9bb18d1ece5fd6);
    FrElement r1 = fr_long(0xbc1e0a6b8fffffff,0xd7cc17b786468f6e,0x47afba497e7ea7a2,0x0f9bb18d1ece5fd6);
    FrElement r2 = fr_long(0xbc1e0a6c0fffffff,0xd7cc17b786468f6e,0x47afba497e7ea7a2,0x0f9bb18d1ece5fd6);
    FrElement r3 = fr_long(0xbc1e0a6bbaaaaaa9,0xd7cc17b786468f6e,0x47afba497e7ea7a2,0x0f9bb18d1ece5fd6);
    FrElement r4 = fr_long(0xbc1e0a6c76666665,0xd7cc17b786468f6e,0x47afba497e7ea7a2,0x0f9bb18d1ece5fd6);

    Fr_bnot_test(r0, s0, 0);
    Fr_bnot_test(r1, s1, 1);
    Fr_bnot_test(r2, s2, 2);
    Fr_bnot_test(r3, s3, 3);
    Fr_bnot_test(r4, s4, 4);

    FrElement l0 = fr_long(0);
    FrElement l1 = fr_long(0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff);
    FrElement l2 = fr_long(0x5555555555555555,0x5555555555555555,0x5555555555555555,0x5555555555555555);
    FrElement l3 = fr_long(0x9999999999999999,0x9999999999999999,0x9999999999999999,0x9999999999999999);

    FrElement r10 = fr_long(0xbc1e0a6c0ffffffe,0xd7cc17b786468f6e,0x47afba497e7ea7a2,0x0f9bb18d1ece5fd6);
    FrElement r11 = fr_long(0x0000000000000000,0x0000000000000000,0x0000000000000000,0x0000000000000000);
    FrElement r12 = fr_long(0xaaaaaaaaaaaaaaaa,0xaaaaaaaaaaaaaaaa,0xaaaaaaaaaaaaaaaa,0x2aaaaaaaaaaaaaaa);
    FrElement r13 = fr_long(0x6666666666666666,0x6666666666666666,0x6666666666666666,0x2666666666666666);

    Fr_bnot_test(r10, l0, 10);
    Fr_bnot_test(r11, l1, 11);
    Fr_bnot_test(r12, l2, 12);
    Fr_bnot_test(r13, l3, 13);

    FrElement m0 = fr_mlong(0);
    FrElement m1 = fr_mlong(0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff,0xffffffffffffffff);
    FrElement m2 = fr_mlong(0x5555555555555555,0x5555555555555555,0x5555555555555555,0x5555555555555555);
    FrElement m3 = fr_mlong(0x9999999999999999,0x9999999999999999,0x9999999999999999,0x9999999999999999);

    FrElement r20 = fr_long(0xbc1e0a6c0ffffffe,0xd7cc17b786468f6e,0x47afba497e7ea7a2,0x0f9bb18d1ece5fd6);
    FrElement r21 = fr_long(0x9879aa717db1194b,0xe0db0d6167587bf6,0x0fd5c82e2d3704ff,0x2587aadea193b4f3);
    FrElement r22 = fr_long(0x0591ea6ddf3b086d,0xdad114457bf7339c,0x8a6714406366c6c1,0x16ea59fd9fbad18a);
    FrElement r23 = fr_long(0xbec76e9a8b6a425f,0x99f38166dca0bd1f,0x0fa67389b38655e8,0x09678e29acca860a);

    Fr_bnot_test(r20, m0, 20);
    Fr_bnot_test(r21, m1, 21);
    Fr_bnot_test(r22, m2, 22);
    Fr_bnot_test(r23, m3, 23);
}

void print_results()
{
    std::cout << "Results: " << std::dec << tests_run << " tests were run, " << tests_failed << " failed." << std::endl;
}

int main()
{
    Fr_Rw_add_unit_test();
    Fr_Rw_sub_unit_test();
    Fr_Rw_copy_unit_test();
    Fr_Rw_Neg_unit_test();
    Fr_Rw_mul_unit_test();
    Fr_Rw_Msquare_unit_test();
    Fr_Rw_mul1_unit_test();
    Fr_Rw_ToMontgomery_unit_test();
    Fr_Rw_IsEq_unit_test();
    Fr_rawIsZero_unit_test();
    Fr_Rw_FromMontgomery_unit_test();
    Fr_toNormal_unit_test();
    Fr_copy_unit_test();
    Fr_copyn_unit_test();
    Fr_mul_s1s2_unit_test();
    Fr_mul_l1nl2n_unit_test();
    Fr_mul_l1ml2n_unit_test();
    Fr_mul_l1ml2m_unit_test();
    Fr_mul_l1nl2m_unit_test();
    Fr_mul_l1ns2n_unit_test();
    Fr_mul_s1nl2n_unit_test();
    Fr_mul_s1nl2m_unit_test();
    Fr_mul_l1ms2n_unit_test();
    Fr_mul_l1ns2m_unit_test();
    Fr_mul_l1ms2m_unit_test();
    Fr_mul_s1ml2m_unit_test();
    Fr_mul_s1ml2n_unit_test();
    Fr_sub_s1s2_unit_test();
    Fr_sub_l1nl2n_unit_test();
    Fr_sub_l1ml2n_unit_test();
    Fr_sub_l1ml2m_unit_test();
    Fr_sub_l1nl2m_unit_test();
    Fr_sub_s1nl2m_unit_test();
    Fr_sub_l1ms2n_unit_test();
    Fr_sub_l1ms2m_unit_test();
    Fr_sub_s1ml2m_unit_test();
    Fr_sub_l1ns2_unit_test();
    Fr_sub_s1l2n_unit_test();
    Fr_add_s1s2_unit_test();
    Fr_add_l1nl2n_unit_test();
    Fr_add_l1ml2n_unit_test();
    Fr_add_l1ml2m_unit_test();
    Fr_add_l1nl2m_unit_test();
    Fr_add_s1nl2m_unit_test();
    Fr_add_l1ms2n_unit_test();
    Fr_add_l1ms2m_unit_test();
    Fr_add_s1ml2m_unit_test();
    Fr_add_l1ns2_unit_test();
    Fr_add_s1l2n_unit_test();
    Fr_geq_s1s2_unit_test();
    Fr_geq_l1nl2n_unit_test();
    Fr_geq_l1ml2n_unit_test();
    Fr_geq_l1ml2m_unit_test();
    Fr_geq_l1nl2m_unit_test();
    Fr_geq_s1l2m_unit_test();
    Fr_geq_l1ms2_unit_test();
    Fr_geq_l1ns2_unit_test();
    Fr_geq_s1l2n_unit_test();
    Fr_eq_s1s2_unit_test();
    Fr_eq_l1nl2n_unit_test();
    Fr_eq_l1ml2n_unit_test();
    Fr_eq_l1ml2m_unit_test();
    Fr_eq_l1nl2m_unit_test();
    Fr_eq_s1l2m_unit_test();
    Fr_eq_l1ms2_unit_test();
    Fr_eq_l1ns2_unit_test();
    Fr_eq_s1l2n_unit_test();
    Fr_neq_s1s2_unit_test();
    Fr_neq_l1nl2n_unit_test();
    Fr_neq_l1ml2n_unit_test();
    Fr_neq_l1ml2m_unit_test();
    Fr_neq_l1nl2m_unit_test();
    Fr_neq_s1l2m_unit_test();
    Fr_neq_l1ms2_unit_test();
    Fr_neq_l1ns2_unit_test();
    Fr_neq_s1l2n_unit_test();
    Fr_gt_s1s2_unit_test();
    Fr_gt_l1nl2n_unit_test();
    Fr_gt_l1ml2n_unit_test();
    Fr_gt_l1ml2m_unit_test();
    Fr_gt_l1nl2m_unit_test();
    Fr_gt_s1l2m_unit_test();
    Fr_gt_l1ms2_unit_test();
    Fr_gt_l1ns2_unit_test();
    Fr_gt_s1l2n_unit_test();
    Fr_band_s1s2_unit_test();
    Fr_band_l1nl2n_unit_test();
    Fr_band_l1ml2n_unit_test();
    Fr_band_l1ml2m_unit_test();
    Fr_band_l1nl2m_unit_test();
    Fr_band_s1l2m_unit_test();
    Fr_band_l1ms2_unit_test();
    Fr_band_l1ns2_unit_test();
    Fr_band_s1l2n_unit_test();
    Fr_land_s1s2_unit_test();
    Fr_land_l1nl2n_unit_test();
    Fr_land_l1ml2n_unit_test();
    Fr_land_l1ml2m_unit_test();
    Fr_land_l1nl2m_unit_test();
    Fr_land_s1l2m_unit_test();
    Fr_land_l1ms2_unit_test();
    Fr_land_l1ns2_unit_test();
    Fr_land_s1l2n_unit_test();
    Fr_lor_s1s2_unit_test();
    Fr_lor_l1nl2n_unit_test();
    Fr_lor_l1ml2n_unit_test();
    Fr_lor_l1ml2m_unit_test();
    Fr_lor_l1nl2m_unit_test();
    Fr_lor_s1l2m_unit_test();
    Fr_lor_l1ms2_unit_test();
    Fr_lor_l1ns2_unit_test();
    Fr_lor_s1l2n_unit_test();
    Fr_lt_s1s2_unit_test();
    Fr_lt_l1nl2n_unit_test();
    Fr_lt_l1ml2n_unit_test();
    Fr_lt_l1ml2m_unit_test();
    Fr_lt_l1nl2m_unit_test();
    Fr_lt_s1l2m_unit_test();
    Fr_lt_l1ms2_unit_test();
    Fr_lt_l1ns2_unit_test();
    Fr_lt_s1l2n_unit_test();
    Fr_toInt_unit_test();
    Fr_neg_unit_test();
    Fr_shr_unit_test();
    Fr_shl_unit_test();
    Fr_rawShr_unit_test();
    Fr_rawShl_unit_test();
    Fr_square_unit_test();
    Fr_bor_unit_test();
    Fr_bxor_unit_test();
    Fr_bnot_unit_test();
    Fr_leq_s1l2n_unit_test();
    Fr_lnot_unit_test();


    print_results();

    return tests_failed ? EXIT_FAILURE : EXIT_SUCCESS;
}
