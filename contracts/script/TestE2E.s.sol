// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {HelloGift} from "../src/HelloGift.sol";
import {ERC20Mock} from "../test/mocks/ERC20Mock.sol";

contract TestE2E is Script {
    // Deployed addresses from DeployLocal
    address constant USDC = 0x5FbDB2315678afecb367f032d93F642f64180aa3;
    address constant GIFT = 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512;

    // Anvil accounts
    uint256 constant ALICE_KEY = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
    uint256 constant BOB_KEY = 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d;

    function run() external {
        ERC20Mock usdc = ERC20Mock(USDC);
        HelloGift gift = HelloGift(GIFT);

        address alice = vm.addr(ALICE_KEY);
        address bob = vm.addr(BOB_KEY);

        console.log("=== E2E TEST ===");
        console.log("Alice:", alice);
        console.log("Bob:", bob);

        // Generate secret and claimId
        bytes32 claimSecret = keccak256("test-secret-123");
        bytes32 claimId = keccak256(abi.encodePacked(claimSecret));

        console.log("");
        console.log("claimSecret (goes in URL):");
        console.logBytes32(claimSecret);
        console.log("claimId (stored on-chain):");
        console.logBytes32(claimId);

        // Step 1: Alice creates gift
        console.log("");
        console.log("=== STEP 1: Alice creates gift ===");
        console.log("Alice USDC before:", usdc.balanceOf(alice) / 1e6);

        vm.startBroadcast(ALICE_KEY);
        usdc.approve(address(gift), 100e6);
        gift.createGift(claimId, 100e6);
        vm.stopBroadcast();

        console.log("Alice USDC after:", usdc.balanceOf(alice) / 1e6);
        console.log("Gift amount:", gift.gifts(claimId) / 1e6, "USDC");

        // Step 2: Bob claims (simulating relayer)
        console.log("");
        console.log("=== STEP 2: Bob claims via relayer ===");
        console.log("Bob USDC before:", usdc.balanceOf(bob) / 1e6);

        // Relayer (using Alice's key here, but in real scenario it's the relayer)
        vm.startBroadcast(ALICE_KEY);
        gift.claim(claimSecret, bob);
        vm.stopBroadcast();

        console.log("Bob USDC after:", usdc.balanceOf(bob) / 1e6);
        console.log("Gift claimed:", gift.claimed(claimId));

        console.log("");
        console.log("=== E2E TEST PASSED ===");
    }
}
