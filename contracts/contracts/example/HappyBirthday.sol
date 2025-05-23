// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20, SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {ISelfVerificationRoot} from "../interfaces/ISelfVerificationRoot.sol";

import {SelfCircuitLibrary} from "../libraries/SelfCircuitLibrary.sol";
import {SelfVerificationRoot} from "../abstract/SelfVerificationRoot.sol";

/**
 * @title SelfHappyBirthday
 * @notice A contract that gives out USDC to users on their birthday
 * @dev Uses SelfVerificationRoot to handle verification with nullifier management for birthday claims
 */
contract SelfHappyBirthday is SelfVerificationRoot, Ownable {
    using SafeERC20 for IERC20;

    // ====================================================
    // Storage Variables
    // ====================================================

    /// @notice USDC token contract
    IERC20 public immutable usdc;

    /// @notice Default: 1 dollar (6 decimals for USDC)
    uint256 public claimableAmount = 1e6;

    /// @notice Default: 1 day window around birthday
    uint256 public claimableWindow = 1 days;

    /// @notice Tracks users who have claimed to prevent double claims
    mapping(uint256 nullifier => bool hasClaimed) public hasClaimed;

    // ====================================================
    // Events
    // ====================================================

    event USDCClaimed(address indexed claimer, uint256 amount);
    event ClaimableAmountUpdated(uint256 oldAmount, uint256 newAmount);
    event ClaimableWindowUpdated(uint256 oldWindow, uint256 newWindow);

    // ====================================================
    // Errors
    // ====================================================

    error NotWithinBirthdayWindow();
    error AlreadyClaimed();

    /**
     * @notice Initializes the HappyBirthday contract
     * @param _identityVerificationHubAddress The address of the Identity Verification Hub
     * @param _scopeValue The expected proof scope for user registration
     * @param _attestationIds Array of allowed attestation identifiers
     * @param _token The USDC token address
     */
    constructor(
        address _identityVerificationHubAddress,
        uint256 _scopeValue,
        uint256[] memory _attestationIds,
        address _token
    ) SelfVerificationRoot(_identityVerificationHubAddress, _scopeValue, _attestationIds) Ownable(_msgSender()) {
        usdc = IERC20(_token);
    }

    // ====================================================
    // External/Public Functions
    // ====================================================

    /**
     * @notice Sets the verification configuration
     * @param _newVerificationConfig The new verification settings
     */
    function setVerificationConfig(
        ISelfVerificationRoot.VerificationConfig memory _newVerificationConfig
    ) external onlyOwner {
        _setVerificationConfig(_newVerificationConfig);
    }

    /**
     * @notice Sets the claimable USDC amount
     * @param _newAmount The new claimable amount
     */
    function setClaimableAmount(uint256 _newAmount) external onlyOwner {
        uint256 _oldAmount = claimableAmount;
        claimableAmount = _newAmount;
        emit ClaimableAmountUpdated(_oldAmount, _newAmount);
    }

    /**
     * @notice Sets the claimable window around birthdays
     * @param _newWindow The new claimable window in seconds
     */
    function setClaimableWindow(uint256 _newWindow) external onlyOwner {
        uint256 _oldWindow = claimableWindow;
        claimableWindow = _newWindow;
        emit ClaimableWindowUpdated(_oldWindow, _newWindow);
    }

    /**
     * @notice Allows the owner to withdraw USDC from the contract
     * @param _to The address to withdraw to
     * @param _amount The amount to withdraw
     */
    function withdrawUSDC(address _to, uint256 _amount) external onlyOwner {
        usdc.safeTransfer(_to, _amount);
    }

    // ====================================================
    // Override Functions from SelfVerificationRoot
    // ====================================================

    /**
     * @notice Hook called after successful verification
     * @dev Checks user hasn't claimed, validates birthday window, and transfers USDC if eligible
     * @param _revealedDataPacked The packed revealed data from the proof
     * @param _userIdentifier The user identifier from the proof
     */
    function onBasicVerificationSuccess(
        uint256[3] memory _revealedDataPacked,
        uint256 _userIdentifier,
        uint256 _nullifier
    ) internal override {
        // Get user address from the proof's user identifier

        // Check if user has already claimed
        if (hasClaimed[_nullifier]) {
            revert AlreadyClaimed();
        }

        // Check if within birthday window
        if (_isWithinBirthdayWindow(_revealedDataPacked)) {
            // Mark user as claimed
            hasClaimed[_nullifier] = true;

            address _recipient = address(uint160(_userIdentifier));

            // Transfer USDC to the user
            usdc.safeTransfer(_recipient, claimableAmount);

            // Emit success event
            emit USDCClaimed(_recipient, claimableAmount);
        } else {
            revert NotWithinBirthdayWindow();
        }
    }

    // ====================================================
    // Internal Functions
    // ====================================================

    /**
     * @notice Checks if the current date is within the user's birthday window
     * @param _revealedDataPacked The packed revealed data containing DOB information
     * @return isWithinWindow True if within the birthday window
     */
    function _isWithinBirthdayWindow(uint256[3] memory _revealedDataPacked) internal view returns (bool) {
        string memory _dob = SelfCircuitLibrary.getDateOfBirth(_revealedDataPacked);

        bytes memory _dobBytes = bytes(_dob);
        bytes memory _dayBytes = new bytes(2);
        bytes memory _monthBytes = new bytes(2);

        _dayBytes[0] = _dobBytes[0];
        _dayBytes[1] = _dobBytes[1];

        _monthBytes[0] = _dobBytes[3];
        _monthBytes[1] = _dobBytes[4];

        string memory _day = string(_dayBytes);
        string memory _month = string(_monthBytes);
        string memory _dobInThisYear = string(abi.encodePacked("25", _month, _day));

        uint256 _dobInThisYearTimestamp = SelfCircuitLibrary.dateToTimestamp(_dobInThisYear);

        uint256 _currentTime = block.timestamp;
        uint256 _timeDifference;

        if (_currentTime > _dobInThisYearTimestamp) {
            _timeDifference = _currentTime - _dobInThisYearTimestamp;
        } else {
            _timeDifference = _dobInThisYearTimestamp - _currentTime;
        }

        return _timeDifference <= claimableWindow;
    }
}
