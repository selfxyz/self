// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

// This is the contract to implement verifier router logic

contract OpenPassportVerifierRouterV1 is UUPSUpgradeable, OwnableUpgradeable {

    error LENGTH_MISMATCH();
    error NO_VERIFIER_SET();
    error VERIFIER_CALL_FAILED();
    error INVALID_SIGNATURE_TYPE();

    event ProveVerifierUpdated(uint256 typeId, address verifier);
    event DscVerifierUpdated(uint256 typeId, address verifier);

    mapping(uint256 => address) public signatureTypeToProveVerifiers;
    mapping(uint256 => address) public signatureTypeToDscVerifiers;

    function initialize() external initializer {
        __Ownable_init(msg.sender);
    }

    /// @dev UUPS: restrict upgrade auth to `onlyOwner`
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function updateProveVerifier(uint256 typeId, address verifier) external onlyOwner {
        signatureTypeToProveVerifiers[typeId] = verifier;
        emit ProveVerifierUpdated(typeId, verifier);
    }

    function updateDscVerifier(uint256 typeId, address verifier) external onlyOwner {
        signatureTypeToDscVerifiers[typeId] = verifier;
        emit DscVerifierUpdated(typeId, verifier);
    }

    function batchUpdateProveVerifiers(
        uint256[] calldata typeIds,
        address[] calldata verifiers
    ) external onlyOwner {
        if (typeIds.length != verifiers.length) {
            revert LENGTH_MISMATCH();
        }
        for (uint256 i = 0; i < typeIds.length; i++) {
            signatureTypeToProveVerifiers[typeIds[i]] = verifiers[i];
            emit ProveVerifierUpdated(typeIds[i], verifiers[i]);
        }
    }

    function batchUpdateDscVerifiers(
        uint256[] calldata typeIds,
        address[] calldata verifiers
    ) external onlyOwner {
        if (typeIds.length != verifiers.length) {
            revert LENGTH_MISMATCH();
        }
        for (uint256 i = 0; i < typeIds.length; i++) {
            signatureTypeToDscVerifiers[typeIds[i]] = verifiers[i];
            emit DscVerifierUpdated(typeIds[i], verifiers[i]);
        }
    }

    // For demonstration: A sample function that delegates calls
    function verifyProof(uint256 typeId, bytes calldata proof, uint256[] calldata pubSignals)
        external
        view
        returns (bool)
    {
        address verifier = signatureTypeToProveVerifiers[typeId];
        if (verifier == address(0)) {
            revert NO_VERIFIER_SET();
        }

        (bool success, bytes memory data) = verifier.staticcall(
            abi.encodeWithSignature("verifyProof(bytes,uint256[])", proof, pubSignals)
        );
        if (!success) {
            revert VERIFIER_CALL_FAILED();
        }
        return abi.decode(data, (bool));
    }
}
