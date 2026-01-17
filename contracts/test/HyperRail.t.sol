// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {HyperRail} from "../src/HyperRail.sol";
import {ERC20Mock} from "./mocks/ERC20Mock.sol";

contract HyperRailTest is Test {
    HyperRail public rail;
    ERC20Mock public usdc;

    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    address charlie = makeAddr("charlie");

    // Test claim secret and derived claimId
    bytes32 claimSecret = keccak256("test-secret-123");
    bytes32 claimId = keccak256(abi.encodePacked(claimSecret));

    function setUp() public {
        // Deploy mock USDC with 6 decimals
        usdc = new ERC20Mock("USD Coin", "USDC", 6);

        // Deploy HyperRail
        rail = new HyperRail(address(usdc));

        // Fund test users
        usdc.mint(alice, 10_000e6); // 10,000 USDC
        usdc.mint(bob, 5_000e6); // 5,000 USDC
    }

    // ============ Deposit To Self Tests ============

    function test_DepositToSelf() public {
        vm.startPrank(alice);
        usdc.approve(address(rail), 100e6);
        rail.depositToSelf(100e6);
        vm.stopPrank();

        // Check USDC moved to contract
        assertEq(usdc.balanceOf(address(rail)), 100e6);
        assertEq(usdc.balanceOf(alice), 9_900e6);

        // Check simulated HyperCore balance
        assertEq(rail.hyperCoreBalances(alice), 100e6);
    }

    function test_DepositToSelf_MultipleTimes() public {
        vm.startPrank(alice);
        usdc.approve(address(rail), 500e6);

        rail.depositToSelf(100e6);
        rail.depositToSelf(200e6);
        rail.depositToSelf(150e6);

        vm.stopPrank();

        assertEq(rail.hyperCoreBalances(alice), 450e6);
    }

    function test_RevertWhen_DepositToSelf_ZeroAmount() public {
        vm.startPrank(alice);
        vm.expectRevert("zero amount");
        rail.depositToSelf(0);
        vm.stopPrank();
    }

    function test_RevertWhen_DepositToSelf_InsufficientBalance() public {
        vm.startPrank(alice);
        usdc.approve(address(rail), 100_000e6);
        vm.expectRevert(); // ERC20 insufficient balance
        rail.depositToSelf(100_000e6);
        vm.stopPrank();
    }

    // ============ Deposit To Address Tests ============

    function test_DepositToAddress() public {
        vm.startPrank(alice);
        usdc.approve(address(rail), 50e6);
        rail.depositToAddress(bob, 50e6);
        vm.stopPrank();

        // Alice's USDC decreased
        assertEq(usdc.balanceOf(alice), 9_950e6);

        // Bob's HyperCore balance increased (not Alice's)
        assertEq(rail.hyperCoreBalances(bob), 50e6);
        assertEq(rail.hyperCoreBalances(alice), 0);
    }

    function test_RevertWhen_DepositToAddress_InvalidRecipient() public {
        vm.startPrank(alice);
        usdc.approve(address(rail), 50e6);
        vm.expectRevert("invalid recipient");
        rail.depositToAddress(address(0), 50e6);
        vm.stopPrank();
    }

    // ============ Create Gift Tests ============

    function test_CreateGift() public {
        vm.startPrank(alice);
        usdc.approve(address(rail), 100e6);
        rail.createGift(claimId, 100e6, 0); // No expiry
        vm.stopPrank();

        // Check gift stored correctly
        (uint256 amount, address sender, uint256 expiry, bool claimed) = rail.gifts(claimId);

        assertEq(amount, 100e6);
        assertEq(sender, alice);
        assertEq(expiry, 0);
        assertFalse(claimed);

        // Check USDC moved to contract
        assertEq(usdc.balanceOf(address(rail)), 100e6);
    }

    function test_CreateGift_WithExpiry() public {
        uint256 futureExpiry = block.timestamp + 7 days;

        vm.startPrank(alice);
        usdc.approve(address(rail), 50e6);
        rail.createGift(claimId, 50e6, futureExpiry);
        vm.stopPrank();

        (, , uint256 expiry, ) = rail.gifts(claimId);
        assertEq(expiry, futureExpiry);
    }

    function test_RevertWhen_CreateGift_ZeroAmount() public {
        vm.startPrank(alice);
        vm.expectRevert("zero amount");
        rail.createGift(claimId, 0, 0);
        vm.stopPrank();
    }

    function test_RevertWhen_CreateGift_InvalidClaimId() public {
        vm.startPrank(alice);
        usdc.approve(address(rail), 100e6);
        vm.expectRevert("invalid claimId");
        rail.createGift(bytes32(0), 100e6, 0);
        vm.stopPrank();
    }

    function test_RevertWhen_CreateGift_AlreadyExists() public {
        vm.startPrank(alice);
        usdc.approve(address(rail), 200e6);

        rail.createGift(claimId, 100e6, 0);

        vm.expectRevert("gift exists");
        rail.createGift(claimId, 100e6, 0);

        vm.stopPrank();
    }

    function test_RevertWhen_CreateGift_ExpiryInPast() public {
        // Warp to a reasonable timestamp first (default is 0)
        vm.warp(1000);

        vm.startPrank(alice);
        usdc.approve(address(rail), 100e6);

        vm.expectRevert("invalid expiry");
        rail.createGift(claimId, 100e6, block.timestamp - 1);

        vm.stopPrank();
    }

    // ============ Claim Tests ============

    function test_Claim() public {
        // Alice creates gift
        vm.startPrank(alice);
        usdc.approve(address(rail), 100e6);
        rail.createGift(claimId, 100e6, 0);
        vm.stopPrank();

        // Bob claims to his wallet
        rail.claim(claimSecret, bob);

        // Check Bob has funds in HyperCore
        assertEq(rail.hyperCoreBalances(bob), 100e6);

        // Check gift is marked claimed
        (, , , bool claimed) = rail.gifts(claimId);
        assertTrue(claimed);
    }

    function test_Claim_ToAnyAddress() public {
        // Alice creates gift
        vm.startPrank(alice);
        usdc.approve(address(rail), 100e6);
        rail.createGift(claimId, 100e6, 0);
        vm.stopPrank();

        // Anyone can call claim, funds go to specified address
        vm.prank(charlie);
        rail.claim(claimSecret, bob);

        // Bob gets the funds, not Charlie
        assertEq(rail.hyperCoreBalances(bob), 100e6);
        assertEq(rail.hyperCoreBalances(charlie), 0);
    }

    function test_Claim_BeforeExpiry() public {
        uint256 expiry = block.timestamp + 1 days;

        vm.startPrank(alice);
        usdc.approve(address(rail), 100e6);
        rail.createGift(claimId, 100e6, expiry);
        vm.stopPrank();

        // Claim before expiry works
        rail.claim(claimSecret, bob);
        assertEq(rail.hyperCoreBalances(bob), 100e6);
    }

    function test_RevertWhen_Claim_GiftNotFound() public {
        bytes32 unknownSecret = keccak256("unknown");

        vm.expectRevert("gift not found");
        rail.claim(unknownSecret, bob);
    }

    function test_RevertWhen_Claim_AlreadyClaimed() public {
        vm.startPrank(alice);
        usdc.approve(address(rail), 100e6);
        rail.createGift(claimId, 100e6, 0);
        vm.stopPrank();

        // First claim succeeds
        rail.claim(claimSecret, bob);

        // Second claim fails
        vm.expectRevert("already claimed");
        rail.claim(claimSecret, charlie);
    }

    function test_RevertWhen_Claim_Expired() public {
        uint256 expiry = block.timestamp + 1 days;

        vm.startPrank(alice);
        usdc.approve(address(rail), 100e6);
        rail.createGift(claimId, 100e6, expiry);
        vm.stopPrank();

        // Fast forward past expiry
        vm.warp(expiry + 1);

        vm.expectRevert("expired");
        rail.claim(claimSecret, bob);
    }

    function test_RevertWhen_Claim_InvalidWallet() public {
        vm.startPrank(alice);
        usdc.approve(address(rail), 100e6);
        rail.createGift(claimId, 100e6, 0);
        vm.stopPrank();

        vm.expectRevert("invalid wallet");
        rail.claim(claimSecret, address(0));
    }

    // ============ Refund Tests ============

    function test_Refund() public {
        uint256 expiry = block.timestamp + 1 days;

        vm.startPrank(alice);
        usdc.approve(address(rail), 100e6);
        rail.createGift(claimId, 100e6, expiry);
        vm.stopPrank();

        uint256 aliceBalanceBefore = usdc.balanceOf(alice);

        // Fast forward past expiry
        vm.warp(expiry + 1);

        // Alice refunds
        vm.prank(alice);
        rail.refund(claimId);

        // Alice got USDC back
        assertEq(usdc.balanceOf(alice), aliceBalanceBefore + 100e6);

        // Gift marked as claimed (to prevent double-refund)
        (, , , bool claimed) = rail.gifts(claimId);
        assertTrue(claimed);
    }

    function test_RevertWhen_Refund_NotExpired() public {
        uint256 expiry = block.timestamp + 1 days;

        vm.startPrank(alice);
        usdc.approve(address(rail), 100e6);
        rail.createGift(claimId, 100e6, expiry);

        vm.expectRevert("not expired");
        rail.refund(claimId);

        vm.stopPrank();
    }

    function test_RevertWhen_Refund_NotSender() public {
        uint256 expiry = block.timestamp + 1 days;

        vm.startPrank(alice);
        usdc.approve(address(rail), 100e6);
        rail.createGift(claimId, 100e6, expiry);
        vm.stopPrank();

        vm.warp(expiry + 1);

        // Bob tries to refund Alice's gift
        vm.prank(bob);
        vm.expectRevert("not sender");
        rail.refund(claimId);
    }

    function test_RevertWhen_Refund_NoExpiry() public {
        // Create gift with no expiry
        vm.startPrank(alice);
        usdc.approve(address(rail), 100e6);
        rail.createGift(claimId, 100e6, 0);
        vm.stopPrank();

        // Can't refund a gift that never expires
        vm.prank(alice);
        vm.expectRevert("no expiry set");
        rail.refund(claimId);
    }

    function test_RevertWhen_Refund_AlreadyClaimed() public {
        uint256 expiry = block.timestamp + 1 days;

        vm.startPrank(alice);
        usdc.approve(address(rail), 100e6);
        rail.createGift(claimId, 100e6, expiry);
        vm.stopPrank();

        // Bob claims before expiry
        rail.claim(claimSecret, bob);

        vm.warp(expiry + 1);

        // Alice tries to refund after claim
        vm.prank(alice);
        vm.expectRevert("already claimed");
        rail.refund(claimId);
    }

    // ============ View Function Tests ============

    function test_GetGiftStatus_Claimable() public {
        vm.startPrank(alice);
        usdc.approve(address(rail), 100e6);
        rail.createGift(claimId, 100e6, 0);
        vm.stopPrank();

        (bool exists, bool claimable, uint256 amount) = rail.getGiftStatus(claimId);

        assertTrue(exists);
        assertTrue(claimable);
        assertEq(amount, 100e6);
    }

    function test_GetGiftStatus_Expired() public {
        uint256 expiry = block.timestamp + 1 days;

        vm.startPrank(alice);
        usdc.approve(address(rail), 100e6);
        rail.createGift(claimId, 100e6, expiry);
        vm.stopPrank();

        vm.warp(expiry + 1);

        (bool exists, bool claimable, ) = rail.getGiftStatus(claimId);

        assertTrue(exists);
        assertFalse(claimable); // Expired, not claimable
    }

    function test_GetGiftStatus_NotFound() public {
        bytes32 unknownId = keccak256("unknown");

        (bool exists, bool claimable, uint256 amount) = rail.getGiftStatus(unknownId);

        assertFalse(exists);
        assertFalse(claimable);
        assertEq(amount, 0);
    }

    function test_GetContractBalance() public {
        // Create two gifts
        bytes32 claimId2 = keccak256(abi.encodePacked(keccak256("secret-2")));

        vm.startPrank(alice);
        usdc.approve(address(rail), 250e6);
        rail.createGift(claimId, 100e6, 0);
        rail.createGift(claimId2, 150e6, 0);
        vm.stopPrank();

        // Contract balance should be sum of pending gifts
        assertEq(rail.getContractBalance(), 250e6);

        // Claim one gift
        rail.claim(claimSecret, bob);

        // Contract balance only includes unclaimed gift
        // Note: In simulated mode, USDC stays in contract even after "bridging"
        // In production with real bridge, this would decrease
        assertEq(rail.getContractBalance(), 250e6);
    }

    // ============ Multiple Gifts Tests ============

    function test_MultipleGifts_DifferentSecrets() public {
        bytes32 secret1 = keccak256("secret-1");
        bytes32 secret2 = keccak256("secret-2");
        bytes32 secret3 = keccak256("secret-3");

        bytes32 id1 = keccak256(abi.encodePacked(secret1));
        bytes32 id2 = keccak256(abi.encodePacked(secret2));
        bytes32 id3 = keccak256(abi.encodePacked(secret3));

        vm.startPrank(alice);
        usdc.approve(address(rail), 300e6);
        rail.createGift(id1, 100e6, 0);
        rail.createGift(id2, 100e6, 0);
        rail.createGift(id3, 100e6, 0);
        vm.stopPrank();

        // Claim in different order
        rail.claim(secret2, bob);
        rail.claim(secret1, charlie);

        assertEq(rail.hyperCoreBalances(bob), 100e6);
        assertEq(rail.hyperCoreBalances(charlie), 100e6);

        // Gift 3 still claimable
        (bool exists, bool claimable, ) = rail.getGiftStatus(id3);
        assertTrue(exists);
        assertTrue(claimable);
    }
}
