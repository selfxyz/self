// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

library GCPJWTHelper {
    function unpackAndConvertImageHash(uint256 p0, uint256 p1, uint256 p2) internal pure returns (bytes memory) {
        bytes memory hex64 = new bytes(64);
        uint256 idx;
        for (; p0 > 0 && idx < 31; idx++) {
            hex64[idx] = bytes1(uint8(p0 & 0xff));
            p0 >>= 8;
        }
        for (; p1 > 0 && idx < 62; idx++) {
            hex64[idx] = bytes1(uint8(p1 & 0xff));
            p1 >>= 8;
        }
        for (; p2 > 0 && idx < 64; idx++) {
            hex64[idx] = bytes1(uint8(p2 & 0xff));
            p2 >>= 8;
        }

        bytes memory result = new bytes(48);
        for (uint256 i; i < 32; i++) {
            uint8 hi = _hexToNibble(uint8(hex64[i * 2]));
            uint8 lo = _hexToNibble(uint8(hex64[i * 2 + 1]));
            result[16 + i] = bytes1((hi << 4) | lo);
        }
        return result;
    }

    function _hexToNibble(uint8 c) private pure returns (uint8) {
        if (c >= 48 && c <= 57) return c - 48;
        if (c >= 97 && c <= 102) return c - 87;
        if (c >= 65 && c <= 70) return c - 55;
        return 0;
    }

    function unpackAndDecodeHexPubkey(uint256 p0, uint256 p1, uint256 p2) internal pure returns (uint256) {
        bytes memory hex64 = new bytes(64);
        uint256 idx;
        for (; p0 > 0 && idx < 31; idx++) {
            hex64[idx] = bytes1(uint8(p0 & 0xff));
            p0 >>= 8;
        }
        for (; p1 > 0 && idx < 62; idx++) {
            hex64[idx] = bytes1(uint8(p1 & 0xff));
            p1 >>= 8;
        }
        for (; p2 > 0 && idx < 64; idx++) {
            hex64[idx] = bytes1(uint8(p2 & 0xff));
            p2 >>= 8;
        }

        uint256 result;
        for (uint256 i = 0; i < idx; i++) {
            uint8 c = uint8(hex64[i]);

            if (c >= 48 && c <= 57) {
                // '0' - '9'
                result = result * 16 + (c - 48);
            } else if (c >= 65 && c <= 70) {
                // 'A' - 'F'
                result = result * 16 + (c - 55);
            } else if (c >= 97 && c <= 102) {
                // 'a' - 'f'
                result = result * 16 + (c - 87);
            } else {
                revert("Invalid hex character");
            }
        }
        return result;
    }
}
