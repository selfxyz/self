// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { OApp, Origin, MessagingFee } from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import { OptionsBuilder } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";

/**
 * @title TestOAppSender
 * @notice Minimal OApp implementation for testing LayerZero V2 send functionality
 */
contract TestOAppSender is OApp {
    using OptionsBuilder for bytes;

    event MessageSent(uint32 dstEid, bytes32 receiver, bytes message);

    constructor(address _endpoint, address _delegate) OApp(_endpoint, _delegate) Ownable(_delegate) {}

    /**
     * @notice Quote the fee for sending a message
     */
    function quote(
        uint32 _dstEid,
        bytes memory _message,
        uint128 _gasLimit
    ) external view returns (MessagingFee memory) {
        bytes memory options = OptionsBuilder.newOptions().addExecutorLzReceiveOption(_gasLimit, 0);
        return _quote(_dstEid, _message, options, false);
    }

    /**
     * @notice Send a test message via LayerZero
     */
    function send(
        uint32 _dstEid,
        bytes memory _message,
        uint128 _gasLimit
    ) external payable {
        bytes memory options = OptionsBuilder.newOptions().addExecutorLzReceiveOption(_gasLimit, 0);

        MessagingFee memory fee = _quote(_dstEid, _message, options, false);

        _lzSend(_dstEid, _message, options, fee, msg.sender);

        emit MessageSent(_dstEid, peers[_dstEid], _message);
    }

    /**
     * @dev Required by OApp - handle incoming messages (we don't receive, just send)
     */
    function _lzReceive(
        Origin calldata,
        bytes32,
        bytes calldata,
        address,
        bytes calldata
    ) internal override {
        // This is a send-only OApp, so we don't process incoming messages
    }

    /**
     * @notice Allow contract to receive ETH
     */
    receive() external payable {}
}
