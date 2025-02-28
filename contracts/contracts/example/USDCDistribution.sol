// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {SelfVerificationRoot} from "../abstract/SelfVerificationRoot.sol";
import {ISelfVerificationRoot} from "../interfaces/ISelfVerificationRoot.sol";
import {IVcAndDiscloseCircuitVerifier} from "../interfaces/IVcAndDiscloseCircuitVerifier.sol";
import {IIdentityVerificationHubV1} from "../interfaces/IIdentityVerificationHubV1.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20, SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract USDCDistribution is SelfVerificationRoot, Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;

    uint256 constant CLAIMABLE_AMOUNT = 100000000;

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

        uint256[3] memory revealedDataPacked = result.revealedDataPacked;
        IIdentityVerificationHubV1.RevealedDataType[] memory types = new IIdentityVerificationHubV1.RevealedDataType[](1);
        types[0] = IIdentityVerificationHubV1.RevealedDataType.DATE_OF_BIRTH;

        IIdentityVerificationHubV1.ReadableRevealedData memory readableData = _identityVerificationHub.getReadableRevealedData(revealedDataPacked, types);
    }
}