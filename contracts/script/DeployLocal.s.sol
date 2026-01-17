// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {HelloGift} from "../src/HelloGift.sol";
import {ERC20Mock} from "../test/mocks/ERC20Mock.sol";

contract DeployLocal is Script {
    function run() external {
        uint256 deployerKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;

        vm.startBroadcast(deployerKey);

        // Deploy mock USDC
        ERC20Mock usdc = new ERC20Mock("USD Coin", "USDC", 6);
        console.log("USDC deployed to:", address(usdc));

        // Deploy HelloGift
        HelloGift gift = new HelloGift(address(usdc));
        console.log("HelloGift deployed to:", address(gift));

        // Mint some USDC to the deployer for testing
        address deployer = vm.addr(deployerKey);
        usdc.mint(deployer, 10000e6); // 10,000 USDC
        console.log("Minted 10000 USDC to:", deployer);

        vm.stopBroadcast();

        // Output for easy copy-paste
        console.log("");
        console.log("=== COPY THESE ===");
        console.log("USDC_ADDRESS=", address(usdc));
        console.log("GIFT_ADDRESS=", address(gift));
        console.log("DEPLOYER=", deployer);
    }
}
