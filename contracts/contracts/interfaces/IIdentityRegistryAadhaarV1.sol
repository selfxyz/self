// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/**
 * @title IIdentityRegistryV1
 * @notice Interface for the Identity Registry v1.
 * @dev This interface exposes only the external functions accessible by regular callers,
 *      i.e. functions that are not owner-restricted.
 */
interface IIdentityRegistryAadhaarV1 {
    /**
     * @notice Retrieves the address of the registered identity verification hub.
     * @return The address of the hub.
     */
    function hub() external view returns (address);

    /**
     * @notice Checks if a specific nullifier is already registered for the given attestation.
     * @param nullifier The nullifier to check.
     * @return True if the nullifier is registered; otherwise, false.
     */
    function nullifiers(uint256 nullifier) external view returns (bool);

    /**
     * @notice Checks whether a UIDAI pubkey commitment is registered.
     * @param commitment The UIDAI pubkey commitment to check.
     * @return True if the commitment is registered, false otherwise.
     */
    function isRegisteredUidaiPubkeyCommitment(uint256 commitment) external view returns (bool);

    /**
     * @notice Retrieves the timestamp of the identity commitment Merkle tree root.
     * @param root The Merkle tree root to check.
     * @return The timestamp of the root.
     */
    function rootTimestamps(uint256 root) external view returns (uint256);

    /**
     * @notice Checks if the identity commitment Merkle tree contains the specified root.
     * @param root The Merkle tree root to check.
     * @return True if the root exists in the tree, false otherwise.
     */
    function checkIdentityCommitmentRoot(uint256 root) external view returns (bool);

    /**
     * @notice Retrieves the total number of identity commitments in the Merkle tree.
     * @return The size (i.e., count) of the identity commitment Merkle tree.
     */
    function getIdentityCommitmentMerkleTreeSize() external view returns (uint256);

    /**
     * @notice Retrieves the current Merkle root of the identity commitments.
     * @return The current identity commitment Merkle root.
     */
    function getIdentityCommitmentMerkleRoot() external view returns (uint256);

    /**
     * @notice Retrieves the index of a specific identity commitment in the Merkle tree.
     * @param commitment The identity commitment to locate.
     * @return The index position of the provided commitment.
     */
    function getIdentityCommitmentIndex(uint256 commitment) external view returns (uint256);

    /**
     * @notice Retrieves the current name and date of birth OFAC root.
     * @return The current name and date of birth OFAC root value.
     */
    function getNameAndDobOfacRoot() external view returns (uint256);

    /**
     * @notice Retrieves the current name and year of birth OFAC root.
     * @return The current name and year of birth OFAC root value.
     */
    function getNameAndYobOfacRoot() external view returns (uint256);

    /**
     * @notice Checks if the provided OFAC roots match the stored OFAC roots.
     * @param nameAndDobRoot The name and date of birth OFAC root to verify.
     * @param nameAndYobRoot The name and year of birth OFAC root to verify.
     * @return True if all provided roots match the stored values, false otherwise.
     */
    function checkOfacRoots(uint256 nameAndDobRoot, uint256 nameAndYobRoot) external view returns (bool);

    /**
     * @notice Checks if the provided UIDAI pubkey is stored in the registry and also if it's not expired.
     * @param commitment The UIDAI pubkey commitment to verify.
     * @return True if the given pubkey is stored in the registry and also if it's not expired, otherwise false.
     */
    function checkUidaiPubkey(uint256 commitment) external view returns (bool);

    /**
     * @notice Registers a new identity commitment.
     * @dev Must be called by the identity verification hub. Reverts if the nullifier has already been used.
     * @param nullifier A unique nullifier to prevent double registration.
     * @param commitment The identity commitment to register.
     */
    function registerCommitment(uint256 nullifier, uint256 commitment) external;

    /**
     * @notice Registers a new UIDAI pubkey commitment.
     * @dev Must be called by the identity verification hub. Reverts if the UIDAI pubkey commitment is already registered.
     * @param commitment The UIDAI pubkey commitment to register.
     */
    function registerUidaiPubkeyCommitment(uint256 commitment) external;
}
