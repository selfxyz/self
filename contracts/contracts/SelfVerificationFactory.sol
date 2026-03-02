// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import {SelfVerificationApp} from "./SelfVerificationApp.sol";

/**
 * @title SelfVerificationFactory
 * @notice Factory singleton that deploys and manages per-app verification clones.
 *         Each app gets an EIP-1167 minimal proxy with a unique address, ensuring
 *         cross-app unlinkability of nullifiers via distinct Poseidon scopes.
 * @dev UUPS upgradeable. Relayer-funded: only authorized relayers can create apps.
 *      Any contract or EOA can query `isVerified(appId, user)` trustlessly.
 */
contract SelfVerificationFactory is OwnableUpgradeable, UUPSUpgradeable {
    // ====================================================
    // ERC-7201 Namespaced Storage
    // ====================================================

    /// @custom:storage-location erc7201:self.storage.SelfVerificationFactory
    struct SelfVerificationFactoryStorage {
        address _appImplementation;
        uint256 _maxProofAge;
        mapping(uint256 appId => address) _apps;
        mapping(address => bool) _authorizedRelayers;
    }

    /// @dev keccak256(abi.encode(uint256(keccak256("self.storage.SelfVerificationFactory")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant STORAGE_LOCATION =
        0xdcd27e336867d691a6e0bc7ec3b74b223cc43a60985c7ecc9a6cd30c451efa00;

    function _getStorage() private pure returns (SelfVerificationFactoryStorage storage $) {
        assembly {
            $.slot := STORAGE_LOCATION
        }
    }

    // ====================================================
    // Events
    // ====================================================

    event AppCreated(uint256 indexed appId, address indexed clone, string name);
    event RelayerUpdated(address indexed relayer, bool authorized);
    event MaxProofAgeUpdated(uint256 newMaxProofAge);
    event AppImplementationUpdated(address indexed newImplementation);

    // ====================================================
    // Errors
    // ====================================================

    error AppAlreadyExists(uint256 appId);
    error AppNotFound(uint256 appId);
    error UnauthorizedRelayer();
    error ZeroAddress();

    // ====================================================
    // Modifiers
    // ====================================================

    modifier onlyRelayer() {
        SelfVerificationFactoryStorage storage $ = _getStorage();
        if (!$._authorizedRelayers[msg.sender]) revert UnauthorizedRelayer();
        _;
    }

    // ====================================================
    // Constructor (disables initializers on implementation)
    // ====================================================

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    // ====================================================
    // Initializer
    // ====================================================

    /**
     * @notice Initialize the factory.
     * @param owner_ Contract owner (can set relayers, update config)
     * @param appImplementation_ The SelfVerificationApp implementation address
     * @param relayer Initial authorized relayer
     * @param maxProofAge_ Default maximum proof validity in seconds (e.g., 365 days)
     */
    function initialize(
        address owner_,
        address appImplementation_,
        address relayer,
        uint256 maxProofAge_
    ) external initializer {
        __Ownable_init(owner_);
        __UUPSUpgradeable_init();

        SelfVerificationFactoryStorage storage $ = _getStorage();
        $._appImplementation = appImplementation_;
        $._maxProofAge = maxProofAge_;
        $._authorizedRelayers[relayer] = true;

        emit RelayerUpdated(relayer, true);
    }

    // ====================================================
    // App Lifecycle (relayer-only)
    // ====================================================

    /**
     * @notice Deploy a new app clone via EIP-1167 minimal proxy.
     * @dev Called lazily on first verification for an app. The clone gets a unique
     *      address which produces a unique Poseidon scope for unlinkable nullifiers.
     * @param appId Unique app identifier (assigned off-chain by the relayer)
     * @param name Human-readable app name
     * @param olderThan Minimum age requirement (0 = disabled)
     * @param ofacEnabled Whether OFAC checks are enabled
     * @param forbiddenCountries Array of 3-letter country codes
     * @return clone The deployed clone address
     */
    function createApp(
        uint256 appId,
        string calldata name,
        uint256 olderThan,
        bool ofacEnabled,
        string[] calldata forbiddenCountries
    ) external onlyRelayer returns (address clone) {
        SelfVerificationFactoryStorage storage $ = _getStorage();

        if ($._apps[appId] != address(0)) revert AppAlreadyExists(appId);

        // Deploy EIP-1167 minimal proxy
        clone = Clones.clone($._appImplementation);

        // Build scope seed unique to this app
        // Must be ≤ 31 bytes for SelfUtils.stringToBigInt (Poseidon input constraint).
        // Prefix "sv-" (3 chars) + max 28 digits = supports appId up to 10^28.
        string memory scopeSeed = string.concat("sv-", _uint256ToString(appId));

        // Initialize the clone
        SelfVerificationApp(clone).initialize(
            scopeSeed,
            name,
            olderThan,
            ofacEnabled,
            forbiddenCountries,
            $._maxProofAge
        );

        $._apps[appId] = clone;

        emit AppCreated(appId, clone, name);
    }

    // ====================================================
    // Queries (for any contract/EOA)
    // ====================================================

    /**
     * @notice Check if a user is verified for a given app.
     * @dev Delegates to the app clone. Returns false if app doesn't exist.
     * @param appId The app identifier
     * @param user The wallet address to check
     * @return True if the user has an active (non-expired) verification
     */
    function isVerified(uint256 appId, address user) external view returns (bool) {
        SelfVerificationFactoryStorage storage $ = _getStorage();
        address clone = $._apps[appId];
        if (clone == address(0)) return false;
        return SelfVerificationApp(clone).isVerified(user);
    }

    /**
     * @notice Get the clone address for an app.
     * @param appId The app identifier
     * @return The clone contract address (address(0) if not deployed)
     */
    function getApp(uint256 appId) external view returns (address) {
        return _getStorage()._apps[appId];
    }

    /**
     * @notice Check if an app clone has been deployed.
     * @param appId The app identifier
     * @return True if a clone exists for this appId
     */
    function appExists(uint256 appId) external view returns (bool) {
        return _getStorage()._apps[appId] != address(0);
    }

    /**
     * @notice Get the current app implementation address.
     */
    function appImplementation() external view returns (address) {
        return _getStorage()._appImplementation;
    }

    /**
     * @notice Get the current max proof age.
     */
    function maxProofAge() external view returns (uint256) {
        return _getStorage()._maxProofAge;
    }

    /**
     * @notice Check if an address is an authorized relayer.
     */
    function isAuthorizedRelayer(address relayer) external view returns (bool) {
        return _getStorage()._authorizedRelayers[relayer];
    }

    // ====================================================
    // Admin (owner-only)
    // ====================================================

    /**
     * @notice Add or remove an authorized relayer.
     * @param relayer The relayer address
     * @param authorized True to authorize, false to revoke
     */
    function setRelayer(address relayer, bool authorized) external onlyOwner {
        _getStorage()._authorizedRelayers[relayer] = authorized;
        emit RelayerUpdated(relayer, authorized);
    }

    /**
     * @notice Update the default max proof age for NEW app clones.
     * @dev Does not affect existing clones (their maxProofAge is set at initialization).
     * @param newMaxProofAge New value in seconds
     */
    function setMaxProofAge(uint256 newMaxProofAge) external onlyOwner {
        _getStorage()._maxProofAge = newMaxProofAge;
        emit MaxProofAgeUpdated(newMaxProofAge);
    }

    /**
     * @notice Update the app implementation address for NEW clones.
     * @dev Does not affect existing clones (they point to the old implementation).
     * @param newImpl New SelfVerificationApp implementation address
     */
    function setAppImplementation(address newImpl) external onlyOwner {
        if (newImpl == address(0)) revert ZeroAddress();
        _getStorage()._appImplementation = newImpl;
        emit AppImplementationUpdated(newImpl);
    }

    // ====================================================
    // Internal
    // ====================================================

    function _authorizeUpgrade(address) internal override onlyOwner {}

    /**
     * @dev Convert uint256 to decimal string (for scope seed generation).
     */
    function _uint256ToString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}
