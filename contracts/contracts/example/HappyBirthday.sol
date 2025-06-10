// // SPDX-License-Identifier: MIT
// pragma solidity 0.8.28;

// import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
// import {IERC20, SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// import {ISelfVerificationRoot} from "../interfaces/ISelfVerificationRoot.sol";

// import {SelfCircuitLibrary} from "../libraries/SelfCircuitLibrary.sol";
// import {SelfVerificationRoot} from "../abstract/SelfVerificationRoot.sol";

// /**
//  * @title SelfHappyBirthday
//  * @notice A contract that gives out USDC to users on their birthday
//  * @dev Uses SelfVerificationRoot to handle verification with nullifier management for birthday claims
//  */
// contract SelfHappyBirthday is SelfVerificationRoot, Ownable {
//     using SafeERC20 for IERC20;

//     // ====================================================
//     // Storage Variables
//     // ====================================================

//     /// @notice USDC token contract
//     IERC20 public immutable usdc;

//     /// @notice Default: 1 dollar (6 decimals for USDC)
//     uint256 public claimableAmount = 1e6;

//     /// @notice Default: 1 day window around birthday
//     uint256 public claimableWindow = 1 days;

//     /// @notice Tracks users who have claimed to prevent double claims
//     mapping(uint256 nullifier => bool hasClaimed) public hasClaimed;

//     // ====================================================
//     // Events
//     // ====================================================

//     event USDCClaimed(address indexed claimer, uint256 amount);
//     event ClaimableAmountUpdated(uint256 oldAmount, uint256 newAmount);
//     event ClaimableWindowUpdated(uint256 oldWindow, uint256 newWindow);

//     // ====================================================
//     // Errors
//     // ====================================================

//     error NotWithinBirthdayWindow();
//     error AlreadyClaimed();

//     /**
//      * @notice Initializes the HappyBirthday contract
//      * @param identityVerificationHubAddress The address of the Identity Verification Hub
//      * @param scopeValue The expected proof scope for user registration
//      * @param contractVersion The contract version for validation
//      * @param attestationIds Array of allowed attestation identifiers
//      * @param token The USDC token address
//      */
//     constructor(
//         address identityVerificationHubAddress,
//         uint256 scopeValue,
//         uint8 contractVersion,
//         bytes32[] memory attestationIds,
//         address token
//     )
//         SelfVerificationRoot(identityVerificationHubAddress, scopeValue, contractVersion, attestationIds)
//         Ownable(_msgSender())
//     {
//         usdc = IERC20(token);
//     }

//     // ====================================================
//     // External/Public Functions
//     // ====================================================

//     /**
//      * @notice Sets the verification configuration
//      * @param newVerificationConfig The new verification settings
//      */
//     function setVerificationConfig(
//         ISelfVerificationRoot.VerificationConfig memory newVerificationConfig
//     ) external onlyOwner {
//         _setVerificationConfig(newVerificationConfig);
//     }

//     /**
//      * @notice Sets the claimable USDC amount
//      * @param newAmount The new claimable amount
//      */
//     function setClaimableAmount(uint256 newAmount) external onlyOwner {
//         uint256 oldAmount = claimableAmount;
//         claimableAmount = newAmount;
//         emit ClaimableAmountUpdated(oldAmount, newAmount);
//     }

//     /**
//      * @notice Sets the claimable window around birthdays
//      * @param newWindow The new claimable window in seconds
//      */
//     function setClaimableWindow(uint256 newWindow) external onlyOwner {
//         uint256 oldWindow = claimableWindow;
//         claimableWindow = newWindow;
//         emit ClaimableWindowUpdated(oldWindow, newWindow);
//     }

//     /**
//      * @notice Allows the owner to withdraw USDC from the contract
//      * @param to The address to withdraw to
//      * @param amount The amount to withdraw
//      */
//     function withdrawUSDC(address to, uint256 amount) external onlyOwner {
//         usdc.safeTransfer(to, amount);
//     }

//     // ====================================================
//     // Override Functions from SelfVerificationRoot
//     // ====================================================

//     /**
//      * @notice Hook called after successful verification
//      * @dev Checks user hasn't claimed, validates birthday window, and transfers USDC if eligible
//      * @param userIdentifier The user identifier from the proof
//      * @param nullifier The nullifier from the proof
//      * @param revealedDataPacked The packed revealed data from the proof
//      */
//     function onBasicVerificationSuccess(
//         bytes32 /* attestationId */,
//         uint256 /* scope */,
//         uint256 userIdentifier,
//         uint256 nullifier,
//         uint256 /* identityCommitmentRoot */,
//         uint256[] memory revealedDataPacked,
//         uint256[4] memory /* forbiddenCountriesListPacked */
//     ) internal override {
//         // Check if user has already claimed
//         if (hasClaimed[nullifier]) {
//             revert AlreadyClaimed();
//         }

//         // Check if within birthday window - only use first 3 elements for passport data
//         uint256[3] memory passportData;
//         for (uint256 i = 0; i < 3 && i < revealedDataPacked.length; i++) {
//             passportData[i] = revealedDataPacked[i];
//         }

//         if (_isWithinBirthdayWindow(passportData)) {
//             // Mark user as claimed
//             hasClaimed[nullifier] = true;

//             address recipient = address(uint160(userIdentifier));

//             // Transfer USDC to the user
//             usdc.safeTransfer(recipient, claimableAmount);

//             // Emit success event
//             emit USDCClaimed(recipient, claimableAmount);
//         } else {
//             revert NotWithinBirthdayWindow();
//         }
//     }

//     // ====================================================
//     // Internal Functions
//     // ====================================================

//     /**
//      * @notice Checks if the current date is within the user's birthday window
//      * @param revealedDataPacked The packed revealed data containing DOB information
//      * @return isWithinWindow True if within the birthday window
//      */
//     function _isWithinBirthdayWindow(uint256[3] memory revealedDataPacked) internal view returns (bool) {
//         string memory dob = SelfCircuitLibrary.getDateOfBirth(revealedDataPacked);

//         bytes memory dobBytes = bytes(dob);
//         bytes memory dayBytes = new bytes(2);
//         bytes memory monthBytes = new bytes(2);

//         dayBytes[0] = dobBytes[0];
//         dayBytes[1] = dobBytes[1];

//         monthBytes[0] = dobBytes[3];
//         monthBytes[1] = dobBytes[4];

//         string memory day = string(dayBytes);
//         string memory month = string(monthBytes);
//         string memory dobInThisYear = string(abi.encodePacked("25", month, day));

//         uint256 dobInThisYearTimestamp = SelfCircuitLibrary.dateToTimestamp(dobInThisYear);

//         uint256 currentTime = block.timestamp;
//         uint256 timeDifference;

//         if (currentTime > dobInThisYearTimestamp) {
//             timeDifference = currentTime - dobInThisYearTimestamp;
//         } else {
//             timeDifference = dobInThisYearTimestamp - currentTime;
//         }

//         return timeDifference <= claimableWindow;
//     }
// }
