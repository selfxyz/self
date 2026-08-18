// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "../libraries/GCPJWTHelper.sol";

/**
 * @title TestGCPJWTHelper
 * @notice Test contract to expose GCPJWTHelper library functions for unit testing
 */
contract TestGCPJWTHelper {
    /**
     * @notice Exposes unpackAndConvertImageHash for testing
     * @param p0 First packed field element (up to 31 bytes of hex chars)
     * @param p1 Second packed field element (up to 31 bytes of hex chars)
     * @param p2 Third packed field element (up to 2 bytes of hex chars)
     * @return 48-byte result with 16 leading zeros + 32-byte hash
     */
    function testUnpackAndConvertImageHash(uint256 p0, uint256 p1, uint256 p2) external pure returns (bytes memory) {
        return GCPJWTHelper.unpackAndConvertImageHash(p0, p1, p2);
    }

    /**
     * @notice Exposes unpackAndDecodeHexPubkey for testing (returns uint256 decoded from hex)
     * @param p0 First packed field element (up to 31 bytes of hex chars)
     * @param p1 Second packed field element (up to 31 bytes of hex chars)
     * @param p2 Third packed field element (remaining hex chars)
     * @return The decoded pubkey commitment as uint256
     */
    function testUnpackPubkeyString(uint256 p0, uint256 p1, uint256 p2) external pure returns (uint256) {
        return GCPJWTHelper.unpackAndDecodeHexPubkey(p0, p1, p2);
    }

    /**
     * @notice Helper to get a specific byte from the unpacked image hash result
     * @param p0 First packed field element
     * @param p1 Second packed field element
     * @param p2 Third packed field element
     * @param index The byte index to retrieve (0-47)
     * @return The byte at the specified index
     */
    function testGetImageHashByte(uint256 p0, uint256 p1, uint256 p2, uint256 index) external pure returns (uint8) {
        bytes memory result = GCPJWTHelper.unpackAndConvertImageHash(p0, p1, p2);
        require(index < result.length, "Index out of bounds");
        return uint8(result[index]);
    }

    /**
     * @notice Exposes unpackAndDecodeAddress for testing
     * @param p0 First packed field element (up to 31 bytes of hex chars)
     * @param p1 Second packed field element (remaining hex chars)
     * @return The decoded address
     */
    function testUnpackAndDecodeAddress(uint256 p0, uint256 p1) external pure returns (address) {
        return GCPJWTHelper.unpackAndDecodeAddress(p0, p1);
    }
}
