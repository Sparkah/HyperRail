// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title HyperRail
/// @notice Unified deposit and gifting contract for Hyperliquid
/// @dev Phase 4: depositToSelf, createGift, claim, refund (simulated HyperCore bridge)
contract HyperRail is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ Types ============

    struct Gift {
        uint256 amount;
        address sender;
        uint256 expiry; // 0 = never expires
        bool claimed;
    }

    // ============ State ============

    IERC20 public immutable usdc;

    /// @notice Gift storage: claimId => Gift
    /// @dev claimId = keccak256(claimSecret)
    mapping(bytes32 => Gift) public gifts;

    /// @notice Simulated HyperCore balances (replaced with real bridge later)
    /// @dev In production, this is removed and CoreWriterLib.bridgeToCore is used
    mapping(address => uint256) public hyperCoreBalances;

    // ============ Events ============

    event DepositedToCore(address indexed user, uint256 amount);
    event GiftCreated(
        bytes32 indexed claimId,
        address indexed sender,
        uint256 amount,
        uint256 expiry
    );
    event GiftClaimed(bytes32 indexed claimId, address indexed recipient, uint256 amount);
    event GiftRefunded(bytes32 indexed claimId, address indexed sender, uint256 amount);

    // ============ Constructor ============

    constructor(address _usdc) {
        require(_usdc != address(0), "invalid usdc");
        usdc = IERC20(_usdc);
    }

    // ============ Deposit Functions ============

    /// @notice Deposit USDC directly to your own HyperCore wallet
    /// @param amount Amount of USDC to deposit
    function depositToSelf(uint256 amount) external nonReentrant {
        require(amount > 0, "zero amount");

        usdc.safeTransferFrom(msg.sender, address(this), amount);

        // TODO: Replace with CoreWriterLib.bridgeToCore(address(usdc), msg.sender, amount)
        hyperCoreBalances[msg.sender] += amount;

        emit DepositedToCore(msg.sender, amount);
    }

    /// @notice Deposit USDC directly to someone else's HyperCore wallet
    /// @param recipient The recipient's address on HyperCore
    /// @param amount Amount of USDC to deposit
    function depositToAddress(address recipient, uint256 amount) external nonReentrant {
        require(amount > 0, "zero amount");
        require(recipient != address(0), "invalid recipient");

        usdc.safeTransferFrom(msg.sender, address(this), amount);

        // TODO: Replace with CoreWriterLib.bridgeToCore(address(usdc), recipient, amount)
        hyperCoreBalances[recipient] += amount;

        emit DepositedToCore(recipient, amount);
    }

    // ============ Gift Functions ============

    /// @notice Create a claimable gift
    /// @param claimId Hash of the claimSecret: keccak256(abi.encodePacked(claimSecret))
    /// @param amount Amount of USDC for the gift
    /// @param expiry Unix timestamp when gift expires (0 = never)
    function createGift(bytes32 claimId, uint256 amount, uint256 expiry) external nonReentrant {
        require(claimId != bytes32(0), "invalid claimId");
        require(amount > 0, "zero amount");
        require(gifts[claimId].amount == 0, "gift exists");
        require(expiry == 0 || expiry > block.timestamp, "invalid expiry");

        usdc.safeTransferFrom(msg.sender, address(this), amount);

        gifts[claimId] = Gift({
            amount: amount,
            sender: msg.sender,
            expiry: expiry,
            claimed: false
        });

        emit GiftCreated(claimId, msg.sender, amount, expiry);
    }

    /// @notice Claim a gift using the secret
    /// @param claimSecret The secret from the claim link
    /// @param walletAddress Where to send the funds on HyperCore
    function claim(bytes32 claimSecret, address walletAddress) external nonReentrant {
        require(walletAddress != address(0), "invalid wallet");

        bytes32 claimId = keccak256(abi.encodePacked(claimSecret));
        Gift storage gift = gifts[claimId];

        require(gift.amount > 0, "gift not found");
        require(!gift.claimed, "already claimed");
        require(gift.expiry == 0 || block.timestamp <= gift.expiry, "expired");

        gift.claimed = true;

        // TODO: Replace with CoreWriterLib.bridgeToCore(address(usdc), walletAddress, gift.amount)
        hyperCoreBalances[walletAddress] += gift.amount;

        emit GiftClaimed(claimId, walletAddress, gift.amount);
    }

    /// @notice Refund an expired gift to the sender
    /// @param claimId The gift identifier
    function refund(bytes32 claimId) external nonReentrant {
        Gift storage gift = gifts[claimId];

        require(gift.amount > 0, "gift not found");
        require(!gift.claimed, "already claimed");
        require(gift.sender == msg.sender, "not sender");
        require(gift.expiry > 0, "no expiry set");
        require(block.timestamp > gift.expiry, "not expired");

        gift.claimed = true; // Prevent double-refund

        // Return USDC to sender's EVM wallet (not HyperCore)
        usdc.safeTransfer(msg.sender, gift.amount);

        emit GiftRefunded(claimId, msg.sender, gift.amount);
    }

    // ============ View Functions ============

    /// @notice Check if a gift exists and is claimable
    /// @param claimId The gift identifier
    /// @return exists Whether the gift exists
    /// @return claimable Whether the gift can be claimed right now
    /// @return amount The gift amount
    function getGiftStatus(bytes32 claimId)
        external
        view
        returns (bool exists, bool claimable, uint256 amount)
    {
        Gift storage gift = gifts[claimId];
        exists = gift.amount > 0;
        claimable = exists && !gift.claimed && (gift.expiry == 0 || block.timestamp <= gift.expiry);
        amount = gift.amount;
    }

    /// @notice Get the contract's USDC balance (should equal sum of pending gifts)
    function getContractBalance() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }
}
