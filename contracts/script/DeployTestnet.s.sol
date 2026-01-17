// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {HyperRail} from "../src/HyperRail.sol";

/// @notice Deploy HyperRail to HyperEVM testnet
/// @dev Usage: forge script script/DeployTestnet.s.sol --rpc-url https://rpc.hyperliquid-testnet.xyz/evm --broadcast --private-key <KEY>
contract DeployTestnet is Script {
    // USDC on HyperEVM testnet
    address constant USDC = 0x2B3370eE501B4a559b57D449569354196457D8Ab;

    function run() external {
        vm.startBroadcast();

        HyperRail rail = new HyperRail(USDC);

        console.log("=== Deployed to HyperEVM Testnet ===");
        console.log("USDC:", USDC);
        console.log("HyperRail:", address(rail));

        vm.stopBroadcast();
    }
}
