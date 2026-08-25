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

    /// @dev Same branch ranges/offsets as `_hexToNibble`, but reverts on invalid input instead of
    ///      silently returning 0. `_hexToNibble` must keep its silent-zero behavior for the
    ///      image-hash path, so this is a distinct helper rather than a shared one.
    function _hexCharToValue(uint8 c) private pure returns (uint8) {
        if (c >= 48 && c <= 57) return c - 48; // '0'-'9'
        if (c >= 65 && c <= 70) return c - 55; // 'A'-'F'
        if (c >= 97 && c <= 102) return c - 87; // 'a'-'f'
        revert("Invalid hex character");
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

    /// @notice Unpacks two PackBytes chunks holding 40 ASCII hex characters into an address.
    /// @dev The prover's attestation nonce carries the bare 40 hex characters of its address
    ///      with no `0x` prefix, so this is a pure hex decode. Unlike the two decoders above,
    ///      this one asserts it recovered exactly 40 characters and that neither chunk holds
    ///      more: a shorter or longer nonce would otherwise decode silently to a different
    ///      address.
    function unpackAndDecodeAddress(uint256 p0, uint256 p1) internal pure returns (address) {
        bytes memory hex40 = new bytes(40);
        uint256 idx;
        for (; p0 > 0 && idx < 31; idx++) {
            hex40[idx] = bytes1(uint8(p0 & 0xff));
            p0 >>= 8;
        }
        for (; p1 > 0 && idx < 40; idx++) {
            hex40[idx] = bytes1(uint8(p1 & 0xff));
            p1 >>= 8;
        }
        if (idx != 40) revert("Nonce is not 40 hex characters");
        if (p0 != 0 || p1 != 0) revert("Nonce exceeds 40 hex characters");

        uint256 result;
        for (uint256 i = 0; i < 40; i++) {
            result = result * 16 + _hexCharToValue(uint8(hex40[i]));
        }
        return address(uint160(result));
    }
}
