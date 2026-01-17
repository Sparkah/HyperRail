// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title HyperRail
/// @notice Simple gift contract for Hyperliquid - no expiry, direct USDC transfer
contract HyperRail {
    IERC20 public immutable usdc;

    mapping(bytes32 => uint256) public gifts;  // claimId => amount
    mapping(bytes32 => bool) public claimed;   // claimId => claimed?

    /// @notice Total USDC allocated to unclaimed gifts
    uint256 public totalGiftedAmount;

    event GiftCreated(bytes32 indexed claimId, address indexed sender, uint256 amount);
    event GiftClaimed(bytes32 indexed claimId, address indexed to, uint256 amount);

    constructor(address _usdc) {
        usdc = IERC20(_usdc);
    }

    /// @notice Create a gift (direct call - requires approval)
    function createGift(bytes32 claimId, uint256 amount) external {
        require(gifts[claimId] == 0, "exists");
        require(amount > 0, "zero");

        usdc.transferFrom(msg.sender, address(this), amount);
        gifts[claimId] = amount;
        totalGiftedAmount += amount;

        emit GiftCreated(claimId, msg.sender, amount);
    }

    /// @notice Create a gift from bridge (LI.FI integration)
    /// @dev Called after USDC is transferred to this contract via bridge
    /// @param claimId Hash of the claim secret
    /// @param amount Amount of USDC for the gift
    /// @param senderAddress Original sender's address (for tracking)
    function createGiftFromBridge(bytes32 claimId, uint256 amount, address senderAddress) external {
        require(gifts[claimId] == 0, "exists");
        require(amount > 0, "zero");

        // Check contract has enough unallocated USDC
        uint256 available = usdc.balanceOf(address(this)) - totalGiftedAmount;
        require(available >= amount, "insufficient deposit");

        gifts[claimId] = amount;
        totalGiftedAmount += amount;

        emit GiftCreated(claimId, senderAddress, amount);
    }

    /// @notice Claim a gift
    function claim(bytes32 claimSecret, address to) external {
        bytes32 claimId = keccak256(abi.encodePacked(claimSecret));

        require(gifts[claimId] > 0, "not found");
        require(!claimed[claimId], "already claimed");

        claimed[claimId] = true;
        uint256 amount = gifts[claimId];
        totalGiftedAmount -= amount;

        usdc.transfer(to, amount);

        emit GiftClaimed(claimId, to, amount);
    }
}
