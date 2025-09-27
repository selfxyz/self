// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;
import {SelfStructs} from "./SelfStructs.sol";

library SelfUtils {
    struct UnformattedVerificationConfigV2 {
        uint256 olderThan;
        string[] forbiddenCountries;
        bool ofacEnabled;
    }

    /**
     * @dev Packs an array of forbidden countries into chunks suitable for circuit inputs
     * @param forbiddenCountries Array of 3-character country codes
     * @return output Array of 4 uint256 values containing packed country data
     */
    function packForbiddenCountriesList(
        string[] memory forbiddenCountries
    ) internal pure returns (uint256[4] memory output) {
        uint256 MAX_BYTES_IN_FIELD = 31;
        uint256 REQUIRED_CHUNKS = 4;

        // Convert country codes to bytes array
        bytes memory packedBytes;

        // Validate and pack country codes
        for (uint256 i = 0; i < forbiddenCountries.length; i++) {
            bytes memory countryBytes = bytes(forbiddenCountries[i]);

            // Validate country code length
            require(countryBytes.length == 3, "Invalid country code: must be exactly 3 characters long");

            // Append country code bytes
            packedBytes = abi.encodePacked(packedBytes, countryBytes);
        }

        uint256 maxBytes = packedBytes.length;
        uint256 packSize = MAX_BYTES_IN_FIELD;
        uint256 numChunks = (maxBytes + packSize - 1) / packSize; // Ceiling division

        // Pack bytes into chunks
        for (uint256 i = 0; i < numChunks && i < REQUIRED_CHUNKS; i++) {
            uint256 sum = 0;

            for (uint256 j = 0; j < packSize; j++) {
                uint256 idx = packSize * i + j;
                if (idx < maxBytes) {
                    uint256 value = uint256(uint8(packedBytes[idx]));
                    uint256 shift = 8 * j;
                    sum += value << shift;
                }
            }

            output[i] = sum;
        }

        // Remaining elements are already initialized to 0
        return output;
    }

    /**
     * @dev Formats an unstructured verification configuration into the standardized circuit-compatible format
     *
     * This function transforms a simplified input structure into the complete verification configuration
     * required by the verification config required by the hub.
     *
     * @notice Enabled Status Logic:
     * - `olderThanEnabled`: Automatically set to `true` when `olderThan > 0`
     * - `forbiddenCountriesEnabled`: Automatically set to `true` when `forbiddenCountries.length > 0`
     * - `ofacEnabled`: Uses the provided boolean value, replicated across all 3 OFAC check levels
     *
     *
     * @param unformattedVerificationConfigV2 The simplified input configuration containing:
     *        - `olderThan`: Minimum age threshold (0 = disabled, >0 = enabled)
     *        - `forbiddenCountries`: Array of 3-letter country codes (empty = disabled, non-empty = enabled)
     *        - `ofacEnabled`: Boolean flag for all OFAC verification levels
     *
     * @return verificationConfigV2 The formatted configuration ready for circuit consumption with:
     *         - Auto-computed enabled flags based on input values
     *         - Packed forbidden countries list for efficient circuit processing
     *         - Replicated OFAC settings across all verification levels
     */
    function formatVerificationConfigV2(
        UnformattedVerificationConfigV2 memory unformattedVerificationConfigV2
    ) internal pure returns (SelfStructs.VerificationConfigV2 memory verificationConfigV2) {
        bool[3] memory ofacArray;
        ofacArray[0] = unformattedVerificationConfigV2.ofacEnabled;
        ofacArray[1] = unformattedVerificationConfigV2.ofacEnabled;
        ofacArray[2] = unformattedVerificationConfigV2.ofacEnabled;

        verificationConfigV2 = SelfStructs.VerificationConfigV2({
            olderThanEnabled: unformattedVerificationConfigV2.olderThan > 0,
            olderThan: unformattedVerificationConfigV2.olderThan,
            forbiddenCountriesEnabled: unformattedVerificationConfigV2.forbiddenCountries.length > 0,
            forbiddenCountriesListPacked: packForbiddenCountriesList(
                unformattedVerificationConfigV2.forbiddenCountries
            ),
            ofacEnabled: ofacArray
        });
    }

    /**
     * @notice Convert string to BigInt using ASCII encoding
     * @dev Converts each character to its ASCII value and packs them into a uint256
     * @param str The input string (must be ASCII only, max 31 bytes)
     * @return The resulting BigInt value
     */
    function stringToBigInt(string memory str) internal pure returns (uint256) {
        bytes memory strBytes = bytes(str);
        require(strBytes.length <= 31, "String too long for BigInt conversion");

        uint256 result = 0;
        for (uint256 i = 0; i < strBytes.length; i++) {
            // Ensure ASCII only (0-127)
            require(uint8(strBytes[i]) <= 127, "Non-ASCII character detected");
            result = (result << 8) | uint256(uint8(strBytes[i]));
        }
        return result;
    }

    /**
     * @notice Converts an address to its lowercase hex string representation
     * @dev Produces a string like "0x1234567890abcdef..." (42 characters total)
     * @param addr The address to convert
     * @return The hex string representation of the address
     */
    function addressToHexString(address addr) internal pure returns (string memory) {
        bytes32 value = bytes32(uint256(uint160(addr)));
        bytes memory alphabet = "0123456789abcdef";
        bytes memory str = new bytes(42);

        str[0] = "0";
        str[1] = "x";
        for (uint256 i = 0; i < 20; i++) {
            str[2 + i * 2] = alphabet[uint8(value[i + 12] >> 4)];
            str[3 + i * 2] = alphabet[uint8(value[i + 12] & 0x0f)];
        }

        return string(str);
    }
}
