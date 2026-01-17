// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {HyperRail} from "../src/HyperRail.sol";
import {ERC20Mock} from "./mocks/ERC20Mock.sol";

contract HyperRailTest is Test {
    HyperRail public gift;
    ERC20Mock public usdc;

    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    // The secret that goes in the URL
    bytes32 claimSecret = keccak256("my-secret-123");
    // The ID stored on-chain (hash of secret)
    bytes32 claimId = keccak256(abi.encodePacked(claimSecret));

    function setUp() public {
        usdc = new ERC20Mock("USDC", "USDC", 6);
        gift = new HyperRail(address(usdc));

        // Give Alice some USDC
        usdc.mint(alice, 1000e6);
    }

    function test_CreateGift() public {
        // Alice creates a $100 gift
        vm.startPrank(alice);
        usdc.approve(address(gift), 100e6);
        gift.createGift(claimId, 100e6);
        vm.stopPrank();

        // Gift exists
        assertEq(gift.gifts(claimId), 100e6);
        assertEq(usdc.balanceOf(address(gift)), 100e6);
    }

    function test_Claim() public {
        // Alice creates gift
        vm.startPrank(alice);
        usdc.approve(address(gift), 100e6);
        gift.createGift(claimId, 100e6);
        vm.stopPrank();

        // Bob claims using the SECRET (not the ID)
        gift.claim(claimSecret, bob);

        // Bob got the money
        assertEq(usdc.balanceOf(bob), 100e6);
        assertTrue(gift.claimed(claimId));
    }

    function test_FullFlow() public {
        console.log("=== SENDER SIDE ===");

        // 1. Generate secret (frontend does this)
        bytes32 secret = keccak256("random-secret-xyz");
        bytes32 id = keccak256(abi.encodePacked(secret));
        console.log("Secret (goes in URL):");
        console.logBytes32(secret);
        console.log("ClaimId (stored on-chain):");
        console.logBytes32(id);

        // 2. Alice creates gift
        vm.startPrank(alice);
        usdc.approve(address(gift), 50e6);
        gift.createGift(id, 50e6);
        vm.stopPrank();
        console.log("Gift created: 50 USDC");

        console.log("\n=== RECIPIENT SIDE ===");

        // 3. Bob has the secret from the URL
        // 4. Bob claims to his address
        gift.claim(secret, bob);
        console.log("Bob claimed to:", bob);
        console.log("Bob balance:", usdc.balanceOf(bob) / 1e6, "USDC");
    }
}
