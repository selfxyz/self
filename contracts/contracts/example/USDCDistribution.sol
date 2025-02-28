// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {SelfVerificationRoot} from "../abstract/SelfVerificationRoot.sol";
import {ISelfVerificationRoot} from "../interfaces/ISelfVerificationRoot.sol";
import {IVcAndDiscloseCircuitVerifier} from "../interfaces/IVcAndDiscloseCircuitVerifier.sol";
import {IIdentityVerificationHubV1} from "../interfaces/IIdentityVerificationHubV1.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20, SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Formatter} from "../libraries/Formatter.sol";
import {CircuitAttributeHandler} from "../libraries/CircuitAttributeHandler.sol";
import {CircuitConstants} from "../constants/CircuitConstants.sol";

contract USDCDistribution is SelfVerificationRoot, Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;

    uint256 constant CLAIMABLE_AMOUNT = 100000000;

    mapping(uint256 => bool) internal _nullifiers;

    event USDCClaimed(address indexed claimer, uint256 amount);

    error RegisteredNullifier();

    constructor(
        address _identityVerificationHub, 
        uint256 _scope, 
        uint256 _attestationId,
        address _token,
        bool _olderThanEnabled,
        uint256 _olderThan,
        bool _forbiddenCountriesEnabled,
        uint256[4] memory _forbiddenCountriesListPacked,
        bool[3] memory _ofacEnabled
    )
        SelfVerificationRoot(
            _identityVerificationHub, 
            _scope, 
            _attestationId, 
            _olderThanEnabled,
            _olderThan,
            _forbiddenCountriesEnabled,
            _forbiddenCountriesListPacked,
            _ofacEnabled
        )
        Ownable(_msgSender())
    {
        usdc = IERC20(_token);
    }

    function verifySelfProof(
        IVcAndDiscloseCircuitVerifier.VcAndDiscloseProof memory proof
    )
        public
        override
    {
        if (_scope != proof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_SCOPE_INDEX]) {
            revert InvalidScope();
        }

        if (_attestationId != proof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_ATTESTATION_ID_INDEX]) {
            revert InvalidAttestationId();
        }

        if (_nullifiers[proof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_NULLIFIER_INDEX]]) {
            revert RegisteredNullifier();
        }

        IIdentityVerificationHubV1.VcAndDiscloseVerificationResult memory result = _identityVerificationHub.verifyVcAndDisclose(
            IIdentityVerificationHubV1.VcAndDiscloseHubProof({
                olderThanEnabled: _verificationConfig.olderThanEnabled,
                olderThan: _verificationConfig.olderThan,
                forbiddenCountriesEnabled: _verificationConfig.forbiddenCountriesEnabled,
                forbiddenCountriesListPacked: _verificationConfig.forbiddenCountriesListPacked,
                ofacEnabled: _verificationConfig.ofacEnabled,
                vcAndDiscloseProof: proof
            })
        );

        if (_isWithinBirthdayWindow(result.revealedDataPacked)) {
            _nullifiers[result.nullifier] = true;
            usdc.safeTransfer(address(uint160(result.userIdentifier)), CLAIMABLE_AMOUNT);
            emit USDCClaimed(address(uint160(result.userIdentifier)), CLAIMABLE_AMOUNT);
        } else {
            revert("Not eligible: Not within 5 days of birthday");
        }
    }

    function _isWithinBirthdayWindow(uint256[3] memory revealedDataPacked) internal view returns (bool) {
        bytes memory charcodes = Formatter.fieldElementsToBytes(revealedDataPacked);
        string memory dob = CircuitAttributeHandler.getDateOfBirth(charcodes);

        bytes memory dobBytes = bytes(dob);
        bytes memory dayBytes = new bytes(2);
        bytes memory monthBytes = new bytes(2);

        dayBytes[0] = dobBytes[0];
        dayBytes[1] = dobBytes[1];

        monthBytes[0] = dobBytes[3];
        monthBytes[1] = dobBytes[4];
        
        string memory day = string(dayBytes);
        string memory month = string(monthBytes);
        string memory dobInThisYear = string(abi.encodePacked("25", month, day));
        uint256 dobInThisYearTimestamp = Formatter.dateToUnixTimestamp(dobInThisYear);

        uint256 currentTime = block.timestamp;
        uint256 timeDifference;
        
        if (currentTime > dobInThisYearTimestamp) {
            timeDifference = currentTime - dobInThisYearTimestamp;
        } else {
            timeDifference = dobInThisYearTimestamp - currentTime;
        }

        uint256 fiveDaysInSeconds = 7 days;
        return timeDifference <= fiveDaysInSeconds;
    }

    function withdrawUSDC(address to, uint256 amount) external onlyOwner {
        usdc.safeTransfer(to, amount);
    }
}