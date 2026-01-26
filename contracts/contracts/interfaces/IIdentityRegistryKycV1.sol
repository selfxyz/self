// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/**
 * @title IIdentityRegistrySelfricaV1
 * @notice Interface for the Identity Registry Selfrica v1.
 * @dev This interface exposes only the external functions accessible by regular callers,
 *      i.e. functions that are not owner-restricted.
 */
interface IIdentityRegistryKycV1 {
    /**
     * @notice Retrieves the address of the registered identity verification hub.
     * @return The address of the hub.
     */
    function hub() external view returns (address);

    /**
     * @notice Retrieves the address of the registered PCR0Manager.
     * @return The address of the PCR0Manager.
     */
    function PCR0Manager() external view returns (address);

    /**
     * @notice Checks if the provided pubkey commitment is stored in the registry.
     * @param pubkeyCommitment The pubkey commitment to verify.
     * @return True if the pubkey commitment is stored in the registry, false otherwise.
     */
    function checkPubkeyCommitment(uint256 pubkeyCommitment) external view returns (bool);

    /**
     * @notice Checks if the identity commitment Merkle tree contains the specified root.
     * @param root The Merkle tree root to check.
     * @return True if the root exists in the tree, false otherwise.
     */
    function checkIdentityCommitmentRoot(uint256 root) external view returns (bool);

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
     * @notice Registers a new identity commitment.
     * @dev Must be called by the identity verification hub. Reverts if the nullifier has already been used.
     * @param nullifier A unique nullifier to prevent double registration.
     * @param commitment The identity commitment to register.
     */
    function registerCommitment(uint256 nullifier, uint256 commitment) external;
}
