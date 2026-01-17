// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice Simplest possible gift contract - no expiry, no HyperCore bridge
contract HelloGift {
    IERC20 public immutable usdc;

    mapping(bytes32 => uint256) public gifts;  // claimId => amount
    mapping(bytes32 => bool) public claimed;   // claimId => claimed?

    event GiftCreated(bytes32 indexed claimId, uint256 amount);
    event GiftClaimed(bytes32 indexed claimId, address indexed to, uint256 amount);

    constructor(address _usdc) {
        usdc = IERC20(_usdc);
    }

    /// @notice Create a gift
    function createGift(bytes32 claimId, uint256 amount) external {
        require(gifts[claimId] == 0, "exists");
        require(amount > 0, "zero");

        usdc.transferFrom(msg.sender, address(this), amount);
        gifts[claimId] = amount;

        emit GiftCreated(claimId, amount);
    }

    /// @notice Claim a gift
    function claim(bytes32 claimSecret, address to) external {
        bytes32 claimId = keccak256(abi.encodePacked(claimSecret));

        require(gifts[claimId] > 0, "not found");
        require(!claimed[claimId], "already claimed");

        claimed[claimId] = true;
        uint256 amount = gifts[claimId];

        usdc.transfer(to, amount);

        emit GiftClaimed(claimId, to, amount);
    }
}
