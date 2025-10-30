// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IPoseidonT3} from "../interfaces/IPoseidonT3.sol";
import {IIdentityVerificationHubV2} from "../interfaces/IIdentityVerificationHubV2.sol";
import {ISelfVerificationRoot} from "../interfaces/ISelfVerificationRoot.sol";
import {CircuitConstantsV2} from "../constants/CircuitConstantsV2.sol";
import {AttestationId} from "../constants/AttestationId.sol";
import {SelfUtils} from "../libraries/SelfUtils.sol";
import {Formatter} from "../libraries/Formatter.sol";

/**
 * @title SelfVerificationRoot
 * @notice Abstract base contract to be integrated with self's verification infrastructure
 * @dev Provides base functionality for verifying and disclosing identity credentials
 * @author Self Team
 */
abstract contract SelfVerificationRoot is ISelfVerificationRoot {
    // ====================================================
    // Constants
    // ====================================================

    /// @notice Contract version identifier used in verification process
    /// @dev This version is included in the hub data for protocol compatibility
    uint8 constant CONTRACT_VERSION = 2;

    // ====================================================
    // Storage Variables
    // ====================================================

    /// @notice The scope value that proofs must match
    /// @dev Used to validate that submitted proofs match the expected scope
    uint256 internal _scope;

    /// @notice Reference to the identity verification hub V2 contract
    /// @dev Immutable reference used for bytes-based proof verification
    IIdentityVerificationHubV2 internal immutable _identityVerificationHubV2;

    // ====================================================
    // Errors
    // ====================================================

    /// @notice Error thrown when the data format is invalid
    /// @dev Triggered when the provided bytes data doesn't have the expected format
    error InvalidDataFormat();

    /// @notice Error thrown when onVerificationSuccess is called by an unauthorized address
    /// @dev Only the identity verification hub V2 contract can call onVerificationSuccess
    error UnauthorizedCaller();

    // ====================================================
    // Events
    // ====================================================

    // ====================================================
    // Constructor
    // ====================================================

    /**
     * @notice Initializes the SelfVerificationRoot contract
     * @dev Sets up the immutable reference to the hub contract and generates scope automatically
     * @param identityVerificationHubV2Address The address of the Identity Verification Hub V2
     * @param scopeSeed The scope seed string to be hashed with contract address to generate the scope
     */
    constructor(address identityVerificationHubV2Address, string memory scopeSeed) {
        _identityVerificationHubV2 = IIdentityVerificationHubV2(identityVerificationHubV2Address);
        _scope = _calculateScope(address(this), scopeSeed, _getPoseidonAddress());
    }

    // ====================================================
    // Public Functions
    // ====================================================

    /**
     * @notice Returns the current scope value
     * @dev Public view function to access the current scope setting
     * @return The scope value that proofs must match
     */
    function scope() public view returns (uint256) {
        return _scope;
    }

    /**
     * @notice Verifies a self-proof using the bytes-based interface
     * @dev Parses relayer data format and validates against contract settings before calling hub V2
     * @param proofPayload Packed data from relayer in format: | 32 bytes attestationId | proof data |
     * @param userContextData User-defined data in format: | 32 bytes destChainId | 32 bytes userIdentifier | data |
     * @custom:data-format proofPayload = | 32 bytes attestationId | proofData |
     * @custom:data-format userContextData = | 32 bytes destChainId | 32 bytes userIdentifier | data |
     * @custom:data-format hubData = | 1 bytes contract version | 31 bytes buffer | 32 bytes scope | 32 bytes attestationId | proofData |
     */
    function verifySelfProof(bytes calldata proofPayload, bytes calldata userContextData) public {
        // Minimum expected length for proofData: 32 bytes attestationId + proof data
        if (proofPayload.length < 32) {
            revert InvalidDataFormat();
        }

        // Minimum userDefinedData length: 32 (destChainId) + 32 (userIdentifier) + 0 (userDefinedData) = 64 bytes
        if (userContextData.length < 64) {
            revert InvalidDataFormat();
        }

        bytes32 attestationId;
        assembly {
            // Load attestationId from the beginning of proofData (first 32 bytes)
            attestationId := calldataload(proofPayload.offset)
        }

        bytes32 destinationChainId = bytes32(userContextData[0:32]);
        bytes32 userIdentifier = bytes32(userContextData[32:64]);
        bytes memory userDefinedData = userContextData[64:];

        bytes32 configId = getConfigId(destinationChainId, userIdentifier, userDefinedData);

        // Hub data should be | 1 byte contractVersion | 31 bytes buffer | 32 bytes scope | 32 bytes attestationId | proof data
        bytes memory baseVerificationInput = abi.encodePacked(
            // 1 byte contractVersion
            CONTRACT_VERSION,
            // 31 bytes buffer (all zeros)
            bytes31(0),
            // 32 bytes scope
            _scope,
            proofPayload
        );

        // Call hub V2 verification
        _identityVerificationHubV2.verify(baseVerificationInput, bytes.concat(configId, userContextData));
    }

    /**
     * @notice Callback function called upon successful verification by the hub contract
     * @dev Only callable by the identity verification hub V2 contract for security
     * @param output The verification output data containing disclosed identity information
     * @param userData The user-defined data passed through the verification process
     * @custom:security Only the authorized hub contract can call this function
     * @custom:flow This function decodes the output and calls the customizable verification hook
     */
    function onVerificationSuccess(bytes memory output, bytes memory userData) public {
        // Only allow the identity verification hub V2 to call this function
        if (msg.sender != address(_identityVerificationHubV2)) {
            revert UnauthorizedCaller();
        }

        ISelfVerificationRoot.GenericDiscloseOutputV2 memory genericDiscloseOutput = abi.decode(
            output,
            (ISelfVerificationRoot.GenericDiscloseOutputV2)
        );

        // Call the customizable verification hook
        customVerificationHook(genericDiscloseOutput, userData);
    }

    /**
     * @notice Generates a configId for the user
     * @dev This function should be overridden by the implementing contract to provide custom configId logic
     * @param destinationChainId The destination chain ID
     * @param userIdentifier The user identifier
     * @param userDefinedData The user defined data
     * @return The configId
     */
    function getConfigId(
        bytes32 destinationChainId,
        bytes32 userIdentifier,
        bytes memory userDefinedData
    ) public view virtual returns (bytes32) {
        // Default implementation reverts; must be overridden in derived contract
        revert("SelfVerificationRoot: getConfigId must be overridden");
    }

    // ====================================================
    // Internal Functions
    // ====================================================

    /**
     * @notice Custom verification hook that can be overridden by implementing contracts
     * @dev This function is called after successful verification and hub address validation
     * @param output The verification output data from the hub containing disclosed identity information
     * @param userData The user-defined data passed through the verification process
     * @custom:override Override this function in derived contracts to add custom verification logic
     * @custom:security This function is only called after proper authentication by the hub contract
     */
    function customVerificationHook(
        ISelfVerificationRoot.GenericDiscloseOutputV2 memory output,
        bytes memory userData
    ) internal virtual {
        // Default implementation is empty - override in derived contracts to add custom logic
    }

    /**
     * @notice Gets the PoseidonT3 library address for the current chain
     * @dev Returns hardcoded addresses of pre-deployed PoseidonT3 library on current chain
     * @dev For local development networks, should create a setter function to set the scope manually
     * @return The address of the PoseidonT3 library on this chain
     */
    function _getPoseidonAddress() internal view returns (address) {
        uint256 chainId = block.chainid;

        // Celo Mainnet
        if (chainId == 42220) {
            return 0xF134707a4C4a3a76b8410fC0294d620A7c341581;
        }

        // Celo Sepolia
        if (chainId == 11142220) {
            return 0x0a782f7F9f8Aac6E0bacAF3cD4aA292C3275C6f2;
        }

        // For local/development networks or other chains, return zero address
        return address(0);
    }

    /**
     * @notice Calculates scope from contract address, scope seed, and PoseidonT3 address
     * @param contractAddress The contract address to hash
     * @param scopeSeed The scope seed string
     * @param poseidonT3Address The address of the PoseidonT3 library to use
     * @return The calculated scope value
     */
    function _calculateScope(
        address contractAddress,
        string memory scopeSeed,
        address poseidonT3Address
    ) internal view returns (uint256) {
        // Skip calculation if PoseidonT3 address is zero (local development)
        if (poseidonT3Address == address(0)) {
            return 0;
        }

        uint256 addressHash = _calculateAddressHashWithPoseidon(contractAddress, poseidonT3Address);
        uint256 scopeSeedAsUint = SelfUtils.stringToBigInt(scopeSeed);
        return IPoseidonT3(poseidonT3Address).hash([addressHash, scopeSeedAsUint]);
    }

    /**
     * @notice Calculates hash of contract address using frontend-compatible chunking with specific PoseidonT3
     * @dev Converts address to hex string, splits into 2 chunks (31+11), and hashes with provided PoseidonT3
     * @param addr The contract address to hash
     * @param poseidonT3Address The address of the PoseidonT3 library to use
     * @return The hash result equivalent to frontend's endpointHash for addresses
     */
    function _calculateAddressHashWithPoseidon(
        address addr,
        address poseidonT3Address
    ) internal view returns (uint256) {
        // Convert address to hex string (42 chars: "0x" + 40 hex digits)
        string memory addressString = SelfUtils.addressToHexString(addr);

        // Split into exactly 2 chunks: 31 + 11 characters
        // Chunk 1: characters 0-30 (31 chars)
        // Chunk 2: characters 31-41 (11 chars)
        uint256 chunk1BigInt = SelfUtils.stringToBigInt(Formatter.substring(addressString, 0, 31));
        uint256 chunk2BigInt = SelfUtils.stringToBigInt(Formatter.substring(addressString, 31, 42));

        return IPoseidonT3(poseidonT3Address).hash([chunk1BigInt, chunk2BigInt]);
    }
}
