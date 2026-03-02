// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ISelfVerificationRoot} from "./interfaces/ISelfVerificationRoot.sol";
import {IIdentityVerificationHubV2} from "./interfaces/IIdentityVerificationHubV2.sol";
import {SelfVerificationRoot} from "./abstract/SelfVerificationRoot.sol";
import {SelfStructs} from "./libraries/SelfStructs.sol";
import {SelfUtils} from "./libraries/SelfUtils.sol";

/**
 * @title SelfVerificationApp
 * @notice Per-app verification contract deployed as an EIP-1167 minimal proxy.
 *         Stores only boolean verification results — no PII touches the chain.
 * @dev Extends SelfVerificationRoot (non-upgradeable). Each clone gets a unique address
 *      which produces a unique scope, ensuring cross-app unlinkability of nullifiers.
 */
contract SelfVerificationApp is SelfVerificationRoot {
    // ====================================================
    // Storage
    // ====================================================

    struct VerificationRecord {
        uint256 verifiedAt;
        uint256 expiresAt;
    }

    string public appName;
    bytes32 public configId;
    uint256 public maxProofAge;
    bool private _initialized;

    mapping(address user => VerificationRecord) public verifications;
    mapping(uint256 nullifier => address) public nullifierToUser;

    // ====================================================
    // Events
    // ====================================================

    event UserVerified(address indexed user, uint256 nullifier, uint256 expiresAt);

    // ====================================================
    // Errors
    // ====================================================

    error AlreadyInitialized();
    error DuplicateNullifier(uint256 nullifier);
    error InvalidUserIdentifier();

    // ====================================================
    // Constructor
    // ====================================================

    /**
     * @param hubV2 The Hub V2 address — stored as immutable in bytecode,
     *        shared by all clones since they delegate to this implementation.
     * @dev Sets _initialized = true on the implementation to prevent anyone from
     *      calling initialize() on it directly. Clones have fresh storage, so their
     *      _initialized starts as false, allowing the factory to initialize them.
     */
    constructor(address hubV2) SelfVerificationRoot(hubV2, "self-verification-app-impl") {
        _initialized = true;
    }

    // ====================================================
    // Initialization (called by factory after clone deployment)
    // ====================================================

    /**
     * @notice One-time initialization for a newly deployed clone.
     * @dev Callable only once. Sets the clone's scope (derived from its own address),
     *      registers the verification config with Hub V2, and stores app metadata.
     * @param scopeSeed Unique per app (e.g., "self-verification-app-{appId}")
     * @param name Human-readable app name
     * @param olderThan Minimum age requirement (0 = disabled)
     * @param ofacEnabled Whether OFAC checks are enabled
     * @param forbiddenCountries Array of 3-letter country codes
     * @param proofMaxAge Maximum proof validity in seconds
     */
    function initialize(
        string calldata scopeSeed,
        string calldata name,
        uint256 olderThan,
        bool ofacEnabled,
        string[] calldata forbiddenCountries,
        uint256 proofMaxAge
    ) external {
        if (_initialized) revert AlreadyInitialized();
        _initialized = true;

        appName = name;
        maxProofAge = proofMaxAge;

        // Calculate scope using THIS clone's address (unique per app)
        _scope = _calculateScope(address(this), scopeSeed, _getPoseidonAddress());

        // Build and register verification config with Hub V2
        SelfStructs.VerificationConfigV2 memory config = SelfUtils.formatVerificationConfigV2(
            SelfUtils.UnformattedVerificationConfigV2({
                olderThan: olderThan,
                forbiddenCountries: forbiddenCountries,
                ofacEnabled: ofacEnabled
            })
        );
        configId = _identityVerificationHubV2.setVerificationConfigV2(config);
    }

    // ====================================================
    // Queries
    // ====================================================

    /**
     * @notice Check if a user is verified and their verification has not expired.
     * @param user The wallet address to check
     * @return True if the user has an active (non-expired) verification
     */
    function isVerified(address user) external view returns (bool) {
        return verifications[user].expiresAt > block.timestamp;
    }

    // ====================================================
    // Overrides
    // ====================================================

    /**
     * @notice Returns the stored verification config ID for Hub V2 proof validation.
     */
    function getConfigId(
        bytes32,
        bytes32,
        bytes memory
    ) public view override returns (bytes32) {
        return configId;
    }

    /**
     * @notice Called by Hub V2 after successful ZK proof verification.
     *         Stores only boolean result + timestamps — no PII.
     * @dev Logic:
     *  1. Extract user address from userIdentifier
     *  2. Check nullifier: must be new OR belong to same user (re-verification)
     *  3. Parse document expiry date
     *  4. Store verification with expiry = min(docExpiry, now + maxProofAge)
     *  5. Map nullifier → user
     */
    function customVerificationHook(
        ISelfVerificationRoot.GenericDiscloseOutputV2 memory output,
        bytes memory
    ) internal override {
        // 1. Extract user address
        if (output.userIdentifier == 0) revert InvalidUserIdentifier();
        address userAddr = address(uint160(output.userIdentifier));

        // 2. Nullifier check — allow re-verification by same address
        address existingUser = nullifierToUser[output.nullifier];
        if (existingUser != address(0) && existingUser != userAddr) {
            revert DuplicateNullifier(output.nullifier);
        }

        // 3. Parse document expiry
        uint256 docExpiry = _parseYYMMDDToTimestamp(output.expiryDate);
        uint256 ageExpiry = block.timestamp + maxProofAge;
        uint256 expiresAt = (docExpiry > 0 && docExpiry < ageExpiry) ? docExpiry : ageExpiry;

        // 4. Store verification
        verifications[userAddr] = VerificationRecord({
            verifiedAt: block.timestamp,
            expiresAt: expiresAt
        });

        // 5. Map nullifier
        nullifierToUser[output.nullifier] = userAddr;

        emit UserVerified(userAddr, output.nullifier, expiresAt);
    }

    // ====================================================
    // Internal Helpers (date parsing from SelfAgentRegistry)
    // ====================================================

    function _daysInMonths(uint256 year, uint256 mm) internal pure returns (uint256) {
        uint256[12] memory days_ = [uint256(0), 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
        if (mm == 0 || mm > 12) return 0;
        uint256 d = days_[mm - 1];
        if (mm > 2 && (year % 4 == 0 && (year % 100 != 0 || year % 400 == 0))) d += 1;
        return d;
    }

    function _parseYYMMDDToTimestamp(string memory dateStr) internal pure returns (uint256) {
        bytes memory d = bytes(dateStr);
        if (d.length != 6) return 0;

        // Validate all characters are ASCII digits (0x30-0x39)
        for (uint256 i = 0; i < 6; i++) {
            if (uint8(d[i]) < 48 || uint8(d[i]) > 57) return 0;
        }

        uint256 yy = (uint8(d[0]) - 48) * 10 + (uint8(d[1]) - 48);
        uint256 mm = (uint8(d[2]) - 48) * 10 + (uint8(d[3]) - 48);
        uint256 dd = (uint8(d[4]) - 48) * 10 + (uint8(d[5]) - 48);

        // Guard: invalid month/day → return 0 (treated as no expiry)
        if (mm == 0 || mm > 12 || dd == 0 || dd > 31) return 0;

        uint256 year = yy < 50 ? 2000 + yy : 1900 + yy;

        // Guard: years before 1970 would underflow uint256 arithmetic
        if (year < 1970) return 0;

        uint256 daysSinceEpoch = (year - 1970) * 365 + (year - 1969) / 4 + _daysInMonths(year, mm) + dd - 1;
        return daysSinceEpoch * 1 days;
    }
}
