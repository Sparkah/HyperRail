import { createWalletClient, http, defineChain, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { json } from './utils';
import { audit, type RequestContext } from './logger';

// =============================================================================
// Types
// =============================================================================

// POST /api/gift - Record gift metadata when sender creates a gift
export type CreateGiftRequest = {
	claimId: string; // keccak256(claimSecret) - stored on-chain as mapping key
	senderAddress: string; // Gift creator's wallet address
	amount: string; // USDC amount (human readable, e.g., "100.00")
};

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
	return hyperEvmTestnet;
}

// HelloGift contract ABI (only the functions we need)
const HelloGiftABI = [
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
 * Store gift metadata in D1 when sender creates a gift on-chain.
 * Called by frontend after successful createGift() contract call.
 */
export async function handleCreateGift(request: Request, env: GiftEnv, ctx: RequestContext): Promise<Response> {
	let body: CreateGiftRequest;

	try {
		body = await request.json();
	} catch {
		audit.validationFailed(ctx, 'Invalid JSON body');
		return json({ error: 'Invalid JSON body' }, 400);
	}

	const { claimId, senderAddress, amount } = body;

	if (!claimId || !senderAddress || !amount) {
		audit.validationFailed(ctx, 'Missing required fields: claimId, senderAddress, amount');
		return json({ error: 'Missing required fields: claimId, senderAddress, amount' }, 400);
	}

	audit.giftCreateStarted(ctx, claimId, senderAddress, amount);

	try {
		await env.DB.prepare('INSERT INTO gifts (claim_id, sender_address, amount) VALUES (?, ?, ?)')
			.bind(claimId, senderAddress, amount)
			.run();

		audit.giftCreateSuccess(ctx, claimId, amount);
		return json({ success: true, claimId });
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
 * Fetch gift metadata for the claim page.
 * Returns sender address, amount, and creation time.
 */
export async function handleGetGift(claimId: string, env: GiftEnv, ctx: RequestContext): Promise<Response> {
	audit.giftFetchStarted(ctx, claimId);

	try {
		const result = await env.DB.prepare('SELECT claim_id, sender_address, amount, created_at FROM gifts WHERE claim_id = ?')
			.bind(claimId)
			.first();

		if (!result) {
			audit.giftFetchNotFound(ctx, claimId);
			return json({ error: 'Gift not found' }, 404);
		}

		audit.giftFetchSuccess(ctx, claimId, result.amount as string);
		return json({
			claimId: result.claim_id,
			senderAddress: result.sender_address,
			amount: result.amount,
			createdAt: result.created_at,
		});
	} catch (error: any) {
		audit.dbError(ctx, error.message);
		return json({ error: 'Database error', message: error.message }, 500);
	}
}

/**
 * Submit claim transaction via relayer.
 * Recipient provides claimSecret + wallet, we pay gas and submit tx.
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

	audit.claimStarted(ctx, walletAddress);

	const chain = getChain(env.HYPEREVM_RPC);

	try {
		// Create wallet client with relayer key
		const account = privateKeyToAccount(env.RELAYER_PRIVATE_KEY as Hex);
		const client = createWalletClient({
			account,
			chain,
			transport: http(env.HYPEREVM_RPC),
		});

		// Submit claim transaction
		const txHash = await client.writeContract({
			address: env.GIFT_CONTRACT as Hex,
			abi: HelloGiftABI,
			functionName: 'claim',
			args: [claimSecret as Hex, walletAddress as Hex],
		});

		audit.claimTxSubmitted(ctx, txHash, chain.name);
		audit.claimSuccess(ctx, txHash, walletAddress);

		return json({ success: true, txHash });
	} catch (error: any) {
		// Parse common errors
		if (error.message?.includes('not found')) {
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
