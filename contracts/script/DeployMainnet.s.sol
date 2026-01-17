// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {HyperRail} from "../src/HyperRail.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice Deploy HyperRail to HyperEVM mainnet
/// @dev Usage:
///   DRY RUN:  forge script script/DeployMainnet.s.sol --rpc-url https://rpc.hyperliquid.xyz/evm
///   DEPLOY:   forge script script/DeployMainnet.s.sol --rpc-url https://rpc.hyperliquid.xyz/evm --broadcast --private-key <KEY>
///   VERIFY:   forge verify-contract <ADDRESS> src/HyperRail.sol:HyperRail --rpc-url https://rpc.hyperliquid.xyz/evm --constructor-args $(cast abi-encode "constructor(address)" 0x...)
contract DeployMainnet is Script {
    // =============================================================================
    // MAINNET CONFIGURATION - VERIFY BEFORE DEPLOYING
    // =============================================================================

    // USDC on HyperEVM mainnet
    address constant USDC = 0xb88339CB7199b77E23DB6E890353E22632Ba630f;

    // Expected chain ID for HyperEVM mainnet
    uint256 constant EXPECTED_CHAIN_ID = 999;

    // =============================================================================
    // DEPLOYMENT
    // =============================================================================

    function run() external {
        // Safety checks
        _preflightChecks();

        vm.startBroadcast();

        HyperRail rail = new HyperRail(USDC);

        vm.stopBroadcast();

        // Post-deployment verification
        _verifyDeployment(rail);

        // Print summary
        _printSummary(rail);
    }

    function _preflightChecks() internal view {
        console.log("=== PREFLIGHT CHECKS ===");

        // Check chain ID
        require(block.chainid == EXPECTED_CHAIN_ID, "Wrong chain! Expected HyperEVM mainnet (999)");
        console.log("[OK] Chain ID:", block.chainid);

        // Check USDC is configured
        console.log("[OK] USDC configured:", USDC);

        // Verify USDC is a contract
        uint256 codeSize;
        assembly {
            codeSize := extcodesize(USDC)
        }
        require(codeSize > 0, "USDC address is not a contract!");
        console.log("[OK] USDC is a contract");

        // Try to call USDC to verify it's an ERC20
        try IERC20(USDC).totalSupply() returns (uint256 supply) {
            console.log("[OK] USDC totalSupply:", supply);
        } catch {
            revert("USDC does not implement ERC20!");
        }

        console.log("");
    }

    function _verifyDeployment(HyperRail rail) internal view {
        console.log("=== POST-DEPLOYMENT VERIFICATION ===");

        // Verify contract deployed
        uint256 codeSize;
        assembly {
            codeSize := extcodesize(rail)
        }
        require(codeSize > 0, "HyperRail deployment failed!");
        console.log("[OK] HyperRail deployed");

        // Verify USDC is set correctly
        require(address(rail.usdc()) == USDC, "USDC mismatch!");
        console.log("[OK] USDC set correctly");

        // Verify initial state
        require(rail.totalGiftedAmount() == 0, "Initial state incorrect!");
        console.log("[OK] Initial state correct");

        console.log("");
    }

    function _printSummary(HyperRail rail) internal view {
        console.log("========================================");
        console.log("  HYPERRAIL MAINNET DEPLOYMENT");
        console.log("========================================");
        console.log("");
        console.log("Network:     HyperEVM Mainnet");
        console.log("Chain ID:   ", block.chainid);
        console.log("");
        console.log("Contracts:");
        console.log("  USDC:      ", USDC);
        console.log("  HyperRail: ", address(rail));
        console.log("");
        console.log("========================================");
        console.log("  NEXT STEPS");
        console.log("========================================");
        console.log("");
        console.log("1. Verify contract on block explorer:");
        console.log("   forge verify-contract", address(rail), "src/HyperRail.sol:HyperRail \\");
        console.log("     --rpc-url https://rpc.hyperliquid.xyz/evm \\");
        console.log("     --constructor-args $(cast abi-encode 'constructor(address)'", USDC, ")");
        console.log("");
        console.log("2. Update Cloudflare environment variables:");
        console.log("   GIFT_CONTRACT=", address(rail));
        console.log("   HYPEREVM_RPC=https://rpc.hyperliquid.xyz/evm");
        console.log("");
        console.log("3. Fund relayer wallet with HYPE for gas");
        console.log("");
        console.log("4. Test with small amount before going live");
        console.log("========================================");
    }
}
