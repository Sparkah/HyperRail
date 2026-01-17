import { handleCreateGift, handleGetGift, handleClaim } from "./gift";
import { json } from "./utils";

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
    fromChain: number;      // Source chain ID (e.g., 1 for Ethereum)
    fromToken: string;      // Source token address
    fromAmount: string;     // Amount in smallest unit (wei)
    toChain: number;        // Destination chain ID (998 for HyperEVM)
    toToken: string;        // Destination token address (USDC on HyperEVM)
    fromAddress: string;    // Sender's wallet address
};

// =============================================================================
// Router
// =============================================================================

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url);

        // Handle CORS Preflight
        if (request.method === "OPTIONS") {
            return new Response(null, {
                status: 204,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type, Authorization",
                    "Access-Control-Max-Age": "86400",
                },
            });
        }

        // LI.FI quote proxy
        if (url.pathname === "/api/quote" && request.method === "POST") {
            return handleQuote(request, env);
        }

        // Gift endpoints
        if (url.pathname === "/api/gift" && request.method === "POST") {
            return handleCreateGift(request, env);
        }

        const giftMatch = url.pathname.match(/^\/api\/gift\/(.+)$/);
        if (giftMatch && request.method === "GET") {
            return handleGetGift(giftMatch[1], env);
        }

        if (url.pathname === "/api/claim" && request.method === "POST") {
            return handleClaim(request, env);
        }

        return json({ error: "Not Found" }, 404);
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
        return json({ error: "Invalid JSON body" }, 400);
    }

    const { fromChain, toChain, fromToken, toToken, fromAmount, fromAddress } = body;

    if (!fromChain || !toChain || !fromToken || !toToken || !fromAmount || !fromAddress) {
        return json({ error: "Missing required fields" }, 400);
    }

    const params = new URLSearchParams({
        fromChain: body.fromChain.toString(), // LI.FI expects "1", not "ethereum"
        toChain: body.toChain.toString(),     // LI.FI expects "42161", not "arbitrum"
        fromToken: body.fromToken,
        toToken: body.toToken,
        fromAmount: body.fromAmount,
        fromAddress: body.fromAddress,
        integrator: env.LIFI_INTEGRATOR || "HyperRail",
    });

    try {
        const lifiRes = await fetch(`https://li.quest/v1/quote?${params.toString()}`);
        const data = (await lifiRes.json()) as any;

        if (!lifiRes.ok) {
            return json({ error: "LI.FI quote failed", detail: data }, 502);
        }

        return json({
            routeId: data.id,
            expectedOutput: data.estimate.toAmount,
            expectedOutputUSD: data.estimate.toAmountUSD,
            fees: {
                totalUSD: data.estimate.totalFeeUSD || "0",
                gasUSD: data.estimate.gasCosts?.[0]?.amountUSD || "0",
                bridgeUSD: data.estimate.feeCosts?.[0]?.amountUSD || "0",
            },
            etaSeconds: data.estimate.executionDuration,
            transactionRequest: data.transactionRequest,
            steps: data.action?.steps || [],
        });
    } catch (error: any) {
        return json({ error: "Worker Internal Error", message: error.message }, 500);
    }
}
