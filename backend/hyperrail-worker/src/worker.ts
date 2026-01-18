import { handleCreateGift, handleGetGift, handleClaim } from './gift';
import { json } from './utils';
import { audit } from './logger';
import { privateKeyToAccount } from 'viem/accounts';
import type { Hex } from 'viem';

// =============================================================================
// Environment
// =============================================================================

export interface Env {
    // LI.FI integrator ID for cross-chain quotes
    LIFI_INTEGRATOR: string;
    // HyperEVM RPC endpoint (testnet or mainnet)
    HYPEREVM_RPC: string;
    // Deployed HelloGift contract address
    GIFT_CONTRACT: string;
    // Relayer wallet private key (set via: wrangler secret put RELAYER_PRIVATE_KEY)
    RELAYER_PRIVATE_KEY: string;
    // D1 database binding for gift metadata
    DB: D1Database;
}

// =============================================================================
// Request Types
// =============================================================================

// POST /api/quote - Get cross-chain swap quote from LI.FI
type QuoteRequest = {
    fromChain: number; // Source chain ID (e.g., 1 for Ethereum)
    fromToken: string; // Source token address
    fromAmount: string; // Amount in smallest unit (wei)
    toChain: number; // Destination chain ID (999 for HyperEVM)
    toToken: string; // Destination token address (USDC on HyperEVM)
    fromAddress: string; // Sender's wallet address (signs the tx)
    toAddress?: string; // Recipient address on destination chain (defaults to fromAddress)
};

// =============================================================================
// Router
// =============================================================================

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url);

        // Handle CORS Preflight (no logging for OPTIONS)
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                    'Access-Control-Max-Age': '86400',
                },
            });
        }

        // Start audit trail
        const ctx = audit.startRequest(request.method, url.pathname);

        let response: Response;

        try {
            // Config endpoint (exposes relayer address for frontend)
            if (url.pathname === '/api/config' && request.method === 'GET') {
                response = await handleConfig(env);
            }
            // LI.FI quote proxy
            else if (url.pathname === '/api/quote' && request.method === 'POST') {
                response = await handleQuote(request, env);
            }
            // LI.FI status proxy
            else if (url.pathname === '/api/status' && request.method === 'GET') {
                response = await handleStatus(url, env);
            }
            // Gift endpoints
            else if (url.pathname === '/api/gift' && request.method === 'POST') {
                response = await handleCreateGift(request, env, ctx);
            } else if (url.pathname.match(/^\/api\/gift\/(.+)$/) && request.method === 'GET') {
                const claimId = url.pathname.replace('/api/gift/', '');
                response = await handleGetGift(claimId, env, ctx);
            } else if (url.pathname === '/api/claim' && request.method === 'POST') {
                response = await handleClaim(request, env, ctx);
            } else {
                response = json({ error: 'Not Found' }, 404);
            }
        } catch (error: any) {
            response = json({ error: 'Internal Server Error' }, 500);
        }

        // End audit trail
        audit.endRequest(ctx, response.status);

        return response;
    },
};

// =============================================================================
// LI.FI Quote Endpoint
// =============================================================================

/**
 * Proxy LI.FI quote API for cross-chain swaps.
 * Frontend calls this to get swap routes and expected output.
 */
async function handleQuote(request: Request, env: Env): Promise<Response> {
    let body: QuoteRequest;

    try {
        body = await request.json();
    } catch {
        return json({ error: 'Invalid JSON body' }, 400);
    }

    const { fromChain, toChain, fromToken, toToken, fromAmount, fromAddress, toAddress } = body;

    if (!fromChain || !toChain || !fromToken || !toToken || !fromAmount || !fromAddress) {
        return json({ error: 'Missing required fields' }, 400);
    }

    const params = new URLSearchParams({
        fromChain: body.fromChain.toString(),
        toChain: body.toChain.toString(),
        fromToken: body.fromToken,
        toToken: body.toToken,
        fromAmount: body.fromAmount,
        fromAddress: body.fromAddress,
        toAddress: toAddress || fromAddress, // Use toAddress if provided, otherwise fromAddress
        integrator: env.LIFI_INTEGRATOR || 'HyperRail',
    });

    try {
        const lifiRes = await fetch(`https://li.quest/v1/quote?${params.toString()}`);
        const data = (await lifiRes.json()) as any;

        if (!lifiRes.ok) {
            return json({ error: 'LI.FI quote failed', detail: data }, 502);
        }

        return json({
            routeId: data.id,
            expectedOutput: data.estimate.toAmount,
            expectedOutputUSD: data.estimate.toAmountUSD,
            fees: {
                totalUSD: data.estimate.totalFeeUSD || '0',
                gasUSD: data.estimate.gasCosts?.[0]?.amountUSD || '0',
                bridgeUSD: data.estimate.feeCosts?.[0]?.amountUSD || '0',
            },
            etaSeconds: data.estimate.executionDuration,
            transactionRequest: data.transactionRequest,
            steps: data.action?.steps || [],
        });
    } catch (error: any) {
        return json({ error: 'Worker Internal Error', message: error.message }, 500);
    }
}

// =============================================================================
// LI.FI Status Endpoint
// =============================================================================

/**
 * Return public config (relayer address for LI.FI toAddress).
 */
async function handleConfig(env: Env): Promise<Response> {
    if (!env.RELAYER_PRIVATE_KEY) {
        return json({ error: 'Relayer not configured' }, 503);
    }

    const account = privateKeyToAccount(env.RELAYER_PRIVATE_KEY as Hex);

    return json({
        relayerAddress: account.address,
        giftContract: env.GIFT_CONTRACT,
        chainId: 999, // HyperEVM mainnet
    });
}

/**
 * Proxy LI.FI status API for transaction tracking.
 * Frontend polls this to get real-time transaction status.
 */
async function handleStatus(url: URL, env: Env): Promise<Response> {
    const txHash = url.searchParams.get('txHash');
    const fromChain = url.searchParams.get('fromChain');
    const toChain = url.searchParams.get('toChain');

    if (!txHash || !fromChain) {
        return json({ error: 'Missing required params: txHash, fromChain' }, 400);
    }

    const params = new URLSearchParams({
        txHash,
        fromChain,
        ...(toChain && { toChain }),
    });

    try {
        const lifiRes = await fetch(`https://li.quest/v1/status?${params.toString()}`);
        const data = (await lifiRes.json()) as any;

        if (!lifiRes.ok) {
            return json({ error: 'LI.FI status failed', detail: data }, 502);
        }

        return json({
            status: data.status, // NOT_FOUND, PENDING, DONE, FAILED
            substatus: data.substatus,
            substatusMessage: data.substatusMessage,
            tool: data.tool,
            sending: data.sending,
            receiving: data.receiving,
        });
    } catch (error: any) {
        return json({ error: 'Worker Internal Error', message: error.message }, 500);
    }
}
