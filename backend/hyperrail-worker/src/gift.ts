import { createWalletClient, createPublicClient, http, defineChain, type Hex, keccak256, toHex, erc20Abi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { json } from './utils';
import { audit, type RequestContext } from './logger';

// =============================================================================
// Types
// =============================================================================

// POST /api/gift - Create a gift intent (relayer will create on-chain)
export type CreateGiftRequest = {
	txHash: string;       // LI.FI swap transaction hash
	fromChain: number;    // Source chain ID
	amount: string;       // Expected USDC amount (human readable)
	senderAddress: string; // Original sender's wallet address
};

// Gift status in database
export type GiftStatus = 'pending_bridge' | 'creating_gift' | 'completed' | 'failed';

// POST /api/claim - Submit claim transaction via relayer
export type ClaimRequest = {
	claimSecret: string; // Secret from URL, used to derive claimId on-chain
	walletAddress: string; // Recipient's HyperCore wallet address
};

// =============================================================================
// Chain & Contract Config
// =============================================================================

// HyperEVM Testnet chain definition
const hyperEvmTestnet = defineChain({
	id: 998,
	name: 'HyperEVM Testnet',
	nativeCurrency: { name: 'HYPE', symbol: 'HYPE', decimals: 18 },
	rpcUrls: {
		default: { http: ['https://rpc.hyperliquid-testnet.xyz/evm'] },
	},
});

// HyperEVM Mainnet chain definition
const hyperEvmMainnet = defineChain({
	id: 999,
	name: 'HyperEVM',
	nativeCurrency: { name: 'HYPE', symbol: 'HYPE', decimals: 18 },
	rpcUrls: {
		default: { http: ['https://rpc.hyperliquid.xyz/evm'] },
	},
});

// Local Anvil chain for testing
const localAnvil = defineChain({
	id: 31337,
	name: 'Anvil Local',
	nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
	rpcUrls: {
		default: { http: ['http://localhost:8545'] },
	},
});

// Select chain based on RPC URL
function getChain(rpcUrl: string) {
	if (rpcUrl.includes('localhost') || rpcUrl.includes('127.0.0.1')) {
		return localAnvil;
	}
	if (rpcUrl.includes('testnet')) {
		return hyperEvmTestnet;
	}
	return hyperEvmMainnet;
}

// USDC addresses on HyperEVM
const USDC_ADDRESSES: Record<number, Hex> = {
	998: '0x' as Hex, // Testnet - TODO: add testnet USDC
	999: '0xb88339CB7199b77E23DB6E890353E22632Ba630f' as Hex, // Mainnet
};

// USDC system address for EVM → Core bridging (token index 0)
const USDC_SYSTEM_ADDRESS = '0x2000000000000000000000000000000000000000' as Hex;

// USDC token ID on HyperCore (for spotSend)
const USDC_TOKEN_ID = '0x6d1e7cde53ba9467b783cb7c530ce054';

// Hyperliquid API endpoints
const HL_API_MAINNET = 'https://api.hyperliquid.xyz';
const HL_API_TESTNET = 'https://api.hyperliquid-testnet.xyz';

// EIP-712 domain for Hyperliquid signing
const HL_SIGNING_DOMAIN = {
	name: 'HyperliquidSignTransaction',
	version: '1',
	chainId: 42161, // Arbitrum chain ID (used for signing)
	verifyingContract: '0x0000000000000000000000000000000000000000' as Hex,
};

// EIP-712 types for spotSend
const SPOT_SEND_TYPES = {
	'HyperliquidTransaction:SpotSend': [
		{ name: 'hyperliquidChain', type: 'string' },
		{ name: 'destination', type: 'string' },
		{ name: 'token', type: 'string' },
		{ name: 'amount', type: 'string' },
		{ name: 'time', type: 'uint64' },
	],
} as const;

// HyperRail contract ABI (v1 - no expiry)
const HyperRailABI = [
	{
		name: 'createGift',
		type: 'function',
		stateMutability: 'nonpayable',
		inputs: [
			{ name: 'claimId', type: 'bytes32' },
			{ name: 'amount', type: 'uint256' },
		],
		outputs: [],
	},
	{
		name: 'claim',
		type: 'function',
		stateMutability: 'nonpayable',
		inputs: [
			{ name: 'claimSecret', type: 'bytes32' },
			{ name: 'to', type: 'address' },
		],
		outputs: [],
	},
] as const;

// =============================================================================
// Env interface for gift module
// =============================================================================

export interface GiftEnv {
	HYPEREVM_RPC: string;
	GIFT_CONTRACT: string;
	RELAYER_PRIVATE_KEY: string;
	DB: D1Database;
}

// =============================================================================
// Handlers
// =============================================================================

/**
 * Create a gift intent. Stores in DB, returns claimSecret for claim URL.
 * Relayer will create the gift on-chain when bridge completes.
 *
 * DB Schema Required:
 * CREATE TABLE gifts (
 *   claim_id TEXT PRIMARY KEY,
 *   claim_secret TEXT NOT NULL,
 *   tx_hash TEXT NOT NULL,
 *   from_chain INTEGER NOT NULL,
 *   amount TEXT NOT NULL,
 *   sender_address TEXT NOT NULL,
 *   status TEXT DEFAULT 'pending_bridge',
 *   on_chain_tx_hash TEXT,
 *   created_at DATETIME DEFAULT CURRENT_TIMESTAMP
 * );
 */
export async function handleCreateGift(request: Request, env: GiftEnv, ctx: RequestContext): Promise<Response> {
	let body: CreateGiftRequest;

	try {
		body = await request.json();
	} catch {
		audit.validationFailed(ctx, 'Invalid JSON body');
		return json({ error: 'Invalid JSON body' }, 400);
	}

	const { txHash, fromChain, amount, senderAddress } = body;

	if (!txHash || !fromChain || !amount || !senderAddress) {
		audit.validationFailed(ctx, 'Missing required fields');
		return json({ error: 'Missing required fields: txHash, fromChain, amount, senderAddress' }, 400);
	}

	// Generate random claimSecret and derive claimId
	const randomBytes = crypto.getRandomValues(new Uint8Array(32));
	const claimSecret = toHex(randomBytes);
	const claimId = keccak256(claimSecret);

	audit.giftCreateStarted(ctx, claimId, senderAddress, amount);

	try {
		await env.DB.prepare(`
			INSERT INTO gifts (claim_id, claim_secret, tx_hash, from_chain, amount, sender_address, status)
			VALUES (?, ?, ?, ?, ?, ?, 'pending_bridge')
		`).bind(claimId, claimSecret, txHash, fromChain, amount, senderAddress).run();

		audit.giftCreateSuccess(ctx, claimId, amount);

		return json({
			claimId,
			claimSecret,
			status: 'pending_bridge' as GiftStatus,
		});
	} catch (error: any) {
		if (error.message?.includes('UNIQUE constraint')) {
			audit.giftCreateFailed(ctx, claimId, 'Gift already exists');
			return json({ error: 'Gift already exists' }, 409);
		}
		audit.dbError(ctx, error.message);
		return json({ error: 'Database error', message: error.message }, 500);
	}
}

/**
 * Fetch gift status. Also triggers gift creation if bridge is complete.
 */
export async function handleGetGift(claimId: string, env: GiftEnv, ctx: RequestContext): Promise<Response> {
	audit.giftFetchStarted(ctx, claimId);

	try {
		const result = await env.DB.prepare(`
			SELECT claim_id, claim_secret, tx_hash, from_chain, amount, sender_address, status, on_chain_tx_hash, created_at
			FROM gifts WHERE claim_id = ?
		`).bind(claimId).first();

		if (!result) {
			audit.giftFetchNotFound(ctx, claimId);
			return json({ error: 'Gift not found' }, 404);
		}

		const status = result.status as GiftStatus;

		// If pending_bridge, check if bridge is complete and create gift
		if (status === 'pending_bridge') {
			const bridgeStatus = await checkBridgeStatus(result.tx_hash as string, result.from_chain as number);

			if (bridgeStatus === 'DONE') {
				// Bridge complete! Create the gift on-chain
				const createResult = await createGiftOnChain(env, {
					claimId: result.claim_id as string,
					amount: result.amount as string,
					senderAddress: result.sender_address as string,
				}, ctx);

				if (createResult.success) {
					// Update DB with completed status
					await env.DB.prepare(`
						UPDATE gifts SET status = 'completed', on_chain_tx_hash = ? WHERE claim_id = ?
					`).bind(createResult.txHash, claimId).run();

					return json({
						claimId: result.claim_id,
						claimSecret: result.claim_secret,
						amount: result.amount,
						senderAddress: result.sender_address,
						status: 'completed' as GiftStatus,
						onChainTxHash: createResult.txHash,
						createdAt: result.created_at,
					});
				} else {
					// Gift creation failed
					await env.DB.prepare(`
						UPDATE gifts SET status = 'failed' WHERE claim_id = ?
					`).bind(claimId).run();

					return json({
						claimId: result.claim_id,
						claimSecret: result.claim_secret,
						amount: result.amount,
						status: 'failed' as GiftStatus,
						error: createResult.error,
						createdAt: result.created_at,
					});
				}
			} else if (bridgeStatus === 'FAILED') {
				await env.DB.prepare(`
					UPDATE gifts SET status = 'failed' WHERE claim_id = ?
				`).bind(claimId).run();

				return json({
					claimId: result.claim_id,
					status: 'failed' as GiftStatus,
					error: 'Bridge transfer failed',
				});
			}
		}

		audit.giftFetchSuccess(ctx, claimId, result.amount as string);
		return json({
			claimId: result.claim_id,
			claimSecret: result.claim_secret,
			amount: result.amount,
			senderAddress: result.sender_address,
			status: result.status,
			onChainTxHash: result.on_chain_tx_hash,
			createdAt: result.created_at,
		});
	} catch (error: any) {
		audit.dbError(ctx, error.message);
		return json({ error: 'Database error', message: error.message }, 500);
	}
}

/**
 * Submit claim transaction via relayer.
 * Flow:
 * 1. Claim from gift contract to relayer's EVM address
 * 2. Bridge USDC from EVM to Core (transfer to system address)
 * 3. spotSend USDC from relayer to recipient on Core
 */
export async function handleClaim(request: Request, env: GiftEnv, ctx: RequestContext): Promise<Response> {
	let body: ClaimRequest;

	try {
		body = await request.json();
	} catch {
		audit.validationFailed(ctx, 'Invalid JSON body');
		return json({ error: 'Invalid JSON body' }, 400);
	}

	const { claimSecret, walletAddress } = body;

	if (!claimSecret || !walletAddress) {
		audit.validationFailed(ctx, 'Missing required fields: claimSecret, walletAddress');
		return json({ error: 'Missing required fields: claimSecret, walletAddress' }, 400);
	}

	// Validate claimSecret is a valid bytes32 hex string
	if (!/^0x[0-9a-fA-F]{64}$/.test(claimSecret)) {
		audit.validationFailed(ctx, 'Invalid claimSecret format (expected bytes32)');
		return json({ error: 'Invalid claimSecret format (expected bytes32)' }, 400);
	}

	// Validate walletAddress is a valid address
	if (!/^0x[0-9a-fA-F]{40}$/.test(walletAddress)) {
		audit.validationFailed(ctx, 'Invalid walletAddress format');
		return json({ error: 'Invalid walletAddress format' }, 400);
	}

	// Check relayer is configured
	if (!env.RELAYER_PRIVATE_KEY || !env.GIFT_CONTRACT) {
		audit.validationFailed(ctx, 'Relayer not configured');
		return json({ error: 'Relayer not configured' }, 503);
	}

	// Derive claimId from claimSecret
	const claimId = keccak256(claimSecret as Hex);

	audit.claimStarted(ctx, walletAddress);

	const chain = getChain(env.HYPEREVM_RPC);
	const usdcAddress = USDC_ADDRESSES[chain.id];
	const isMainnet = chain.id === 999;
	const hlApiUrl = isMainnet ? HL_API_MAINNET : HL_API_TESTNET;
	const hlChain = isMainnet ? 'Mainnet' : 'Testnet';

	try {
		// Create wallet client with relayer key
		const account = privateKeyToAccount(env.RELAYER_PRIVATE_KEY as Hex);
		const walletClient = createWalletClient({
			account,
			chain,
			transport: http(env.HYPEREVM_RPC),
		});

		const publicClient = createPublicClient({
			chain,
			transport: http(env.HYPEREVM_RPC),
		});

		// Get gift amount from DB for the spotSend
		const giftResult = await env.DB.prepare(`
			SELECT amount FROM gifts WHERE claim_id = ?
		`).bind(claimId).first();

		if (!giftResult) {
			audit.claimFailed(ctx, 'Gift not found in database');
			return json({ error: 'Gift not found' }, 404);
		}

		const giftAmount = giftResult.amount as string;

		// =========================================================================
		// Step 1: Claim from gift contract to RELAYER's address (not recipient)
		// =========================================================================
		console.log(`[Claim] Step 1: Claiming gift to relayer address ${account.address}`);

		const claimTxHash = await walletClient.writeContract({
			address: env.GIFT_CONTRACT as Hex,
			abi: HyperRailABI,
			functionName: 'claim',
			args: [claimSecret as Hex, account.address], // Claim to relayer, not recipient
		});

		audit.claimTxSubmitted(ctx, claimTxHash, chain.name);

		const claimReceipt = await publicClient.waitForTransactionReceipt({ hash: claimTxHash });

		if (claimReceipt.status === 'reverted') {
			audit.claimFailed(ctx, 'Claim transaction reverted');
			return json({ error: 'Claim transaction reverted' }, 500);
		}

		console.log(`[Claim] Step 1 complete: ${claimTxHash}`);

		// =========================================================================
		// Step 2: Bridge USDC from EVM to Core (transfer to system address)
		// =========================================================================
		console.log(`[Claim] Step 2: Bridging ${giftAmount} USDC to Core`);

		const amountWei = BigInt(Math.floor(parseFloat(giftAmount) * 1_000_000));

		const bridgeTxHash = await walletClient.writeContract({
			address: usdcAddress,
			abi: erc20Abi,
			functionName: 'transfer',
			args: [USDC_SYSTEM_ADDRESS, amountWei],
		});

		const bridgeReceipt = await publicClient.waitForTransactionReceipt({ hash: bridgeTxHash });

		if (bridgeReceipt.status === 'reverted') {
			audit.claimFailed(ctx, 'Bridge transaction reverted');
			return json({ error: 'Bridge to Core failed' }, 500);
		}

		console.log(`[Claim] Step 2 complete: ${bridgeTxHash}`);

		// =========================================================================
		// Step 3: spotSend USDC from relayer to recipient on Core
		// =========================================================================
		console.log(`[Claim] Step 3: Sending ${giftAmount} USDC to ${walletAddress} on Core`);

		const timestamp = Date.now();
		const token = `USDC:${USDC_TOKEN_ID}`;

		// Sign the spotSend action using EIP-712
		const signature = await account.signTypedData({
			domain: HL_SIGNING_DOMAIN,
			types: SPOT_SEND_TYPES,
			primaryType: 'HyperliquidTransaction:SpotSend',
			message: {
				hyperliquidChain: hlChain,
				destination: walletAddress,
				token,
				amount: giftAmount,
				time: BigInt(timestamp),
			},
		});

		// Parse signature into r, s, v
		const r = signature.slice(0, 66) as Hex;
		const s = `0x${signature.slice(66, 130)}` as Hex;
		const v = parseInt(signature.slice(130, 132), 16);

		// Send spotSend request to Hyperliquid API
		const spotSendResponse = await fetch(`${hlApiUrl}/exchange`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				action: {
					type: 'spotSend',
					hyperliquidChain: hlChain,
					signatureChainId: '0xa4b1', // Arbitrum chain ID in hex
					destination: walletAddress,
					token,
					amount: giftAmount,
					time: timestamp,
				},
				nonce: timestamp,
				signature: { r, s, v },
			}),
		});

		const spotSendResult = await spotSendResponse.json() as any;

		if (!spotSendResponse.ok || spotSendResult.status === 'err') {
			console.error('[Claim] spotSend failed:', spotSendResult);
			audit.claimFailed(ctx, `spotSend failed: ${JSON.stringify(spotSendResult)}`);
			return json({ error: 'Core transfer failed', details: spotSendResult }, 500);
		}

		console.log(`[Claim] Step 3 complete:`, spotSendResult);

		// =========================================================================
		// Update DB with claimed status
		// =========================================================================
		await env.DB.prepare(`
			UPDATE gifts
			SET status = 'claimed', claim_tx_hash = ?, recipient_address = ?, claimed_at = CURRENT_TIMESTAMP
			WHERE claim_id = ?
		`).bind(claimTxHash, walletAddress, claimId).run();

		audit.claimSuccess(ctx, claimTxHash, walletAddress);

		return json({
			success: true,
			claimTxHash,
			bridgeTxHash,
			status: 'claimed',
		});
	} catch (error: any) {
		// Parse common errors
		if (error.message?.includes('not found') || error.message?.includes('gift not found')) {
			audit.claimFailed(ctx, 'Gift not found or already claimed');
			return json({ error: 'Gift not found or already claimed' }, 404);
		}
		if (error.message?.includes('already claimed')) {
			audit.claimFailed(ctx, 'Gift already claimed');
			return json({ error: 'Gift already claimed' }, 409);
		}
		if (error.message?.includes('insufficient funds')) {
			audit.claimFailed(ctx, 'Relayer out of gas funds');
			return json({ error: 'Relayer out of gas funds' }, 503);
		}

		audit.rpcError(ctx, error.message, chain.name);
		return json({ error: 'Claim failed', message: error.message }, 500);
	}
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check LI.FI bridge status
 */
async function checkBridgeStatus(txHash: string, fromChain: number): Promise<'PENDING' | 'DONE' | 'FAILED' | 'NOT_FOUND'> {
	try {
		const params = new URLSearchParams({
			txHash,
			fromChain: fromChain.toString(),
		});

		const response = await fetch(`https://li.quest/v1/status?${params.toString()}`);
		const data = await response.json() as any;

		if (!response.ok) {
			console.error('LI.FI status error:', data);
			return 'NOT_FOUND';
		}

		return data.status || 'NOT_FOUND';
	} catch (error) {
		console.error('Bridge status check failed:', error);
		return 'NOT_FOUND';
	}
}

/**
 * Create gift on-chain via relayer (v1 - no expiry)
 */
async function createGiftOnChain(
	env: GiftEnv,
	gift: { claimId: string; amount: string; senderAddress: string },
	ctx: RequestContext
): Promise<{ success: true; txHash: string } | { success: false; error: string }> {
	if (!env.RELAYER_PRIVATE_KEY || !env.GIFT_CONTRACT) {
		return { success: false, error: 'Relayer not configured' };
	}

	const chain = getChain(env.HYPEREVM_RPC);
	const usdcAddress = USDC_ADDRESSES[chain.id];

	if (!usdcAddress || usdcAddress === '0x') {
		return { success: false, error: `USDC not configured for chain ${chain.id}` };
	}

	try {
		const account = privateKeyToAccount(env.RELAYER_PRIVATE_KEY as Hex);

		const walletClient = createWalletClient({
			account,
			chain,
			transport: http(env.HYPEREVM_RPC),
		});

		const publicClient = createPublicClient({
			chain,
			transport: http(env.HYPEREVM_RPC),
		});

		// Convert amount to smallest unit (6 decimals for USDC)
		const amountWei = BigInt(Math.floor(parseFloat(gift.amount) * 1_000_000));

		// Check relayer USDC balance
		const balance = await publicClient.readContract({
			address: usdcAddress,
			abi: erc20Abi,
			functionName: 'balanceOf',
			args: [account.address],
		});

		if (balance < amountWei) {
			return { success: false, error: `Insufficient USDC balance. Have: ${balance}, Need: ${amountWei}` };
		}

		// Check and set allowance if needed
		const allowance = await publicClient.readContract({
			address: usdcAddress,
			abi: erc20Abi,
			functionName: 'allowance',
			args: [account.address, env.GIFT_CONTRACT as Hex],
		});

		if (allowance < amountWei) {
			console.log('Approving USDC for gift contract...');
			const approveTx = await walletClient.writeContract({
				address: usdcAddress,
				abi: erc20Abi,
				functionName: 'approve',
				args: [env.GIFT_CONTRACT as Hex, amountWei * 10n], // Approve 10x to avoid future approvals
			});

			// Wait for approval to be mined
			await publicClient.waitForTransactionReceipt({ hash: approveTx });
			console.log('USDC approved:', approveTx);
		}

		// Create the gift on-chain (v1 - no expiry)
		console.log('Creating gift on-chain:', gift.claimId, amountWei);
		const txHash = await walletClient.writeContract({
			address: env.GIFT_CONTRACT as Hex,
			abi: HyperRailABI,
			functionName: 'createGift',
			args: [gift.claimId as Hex, amountWei],
		});

		console.log('Gift created on-chain:', txHash);
		return { success: true, txHash };
	} catch (error: any) {
		console.error('createGiftOnChain failed:', error);
		return { success: false, error: error.message || 'Unknown error' };
	}
}
