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

// POST /api/quote - Get cross-chain swap quote from LI.FI
type QuoteRequest = {
    fromChain: number;      // Source chain ID (e.g., 1 for Ethereum)
    fromToken: string;      // Source token address
    fromAmount: string;     // Amount in smallest unit (wei)
    toChain: number;        // Destination chain ID (998 for HyperEVM)
    toToken: string;        // Destination token address (USDC on HyperEVM)
    fromAddress: string;    // Sender's wallet address
};

// POST /api/gift - Record gift metadata when sender creates a gift
type CreateGiftRequest = {
    claimId: string;        // keccak256(claimSecret) - stored on-chain as mapping key
    senderAddress: string;  // Gift creator's wallet address
    amount: string;         // USDC amount (human readable, e.g., "100.00")
};

// POST /api/claim - Submit claim transaction via relayer
type ClaimRequest = {
    claimSecret: string;    // Secret from URL, used to derive claimId on-chain
    walletAddress: string;  // Recipient's HyperCore wallet address
};

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url);

        // 1. Handle CORS Preflight
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

        // 2. Routing
        if (url.pathname === "/api/quote" && request.method === "POST") {
            return handleQuote(request, env);
        }

        if (url.pathname === "/api/gift" && request.method === "POST") {
            return handleCreateGift(request, env);
        }

        // GET /api/gift/:claimId
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
// Gift Endpoints
// =============================================================================

/**
 * Store gift metadata in D1 when sender creates a gift on-chain.
 * Called by frontend after successful createGift() contract call.
 */
async function handleCreateGift(request: Request, env: Env): Promise<Response> {
    let body: CreateGiftRequest;

    try {
        body = await request.json();
    } catch {
        return json({ error: "Invalid JSON body" }, 400);
    }

    const { claimId, senderAddress, amount } = body;

    if (!claimId || !senderAddress || !amount) {
        return json({ error: "Missing required fields: claimId, senderAddress, amount" }, 400);
    }

    try {
        await env.DB.prepare(
            "INSERT INTO gifts (claim_id, sender_address, amount) VALUES (?, ?, ?)"
        )
            .bind(claimId, senderAddress, amount)
            .run();

        return json({ success: true, claimId });
    } catch (error: any) {
        if (error.message?.includes("UNIQUE constraint")) {
            return json({ error: "Gift already exists" }, 409);
        }
        return json({ error: "Database error", message: error.message }, 500);
    }
}

/**
 * Fetch gift metadata for the claim page.
 * Returns sender address, amount, and creation time.
 */
async function handleGetGift(claimId: string, env: Env): Promise<Response> {
    try {
        const result = await env.DB.prepare(
            "SELECT claim_id, sender_address, amount, created_at FROM gifts WHERE claim_id = ?"
        )
            .bind(claimId)
            .first();

        if (!result) {
            return json({ error: "Gift not found" }, 404);
        }

        return json({
            claimId: result.claim_id,
            senderAddress: result.sender_address,
            amount: result.amount,
            createdAt: result.created_at,
        });
    } catch (error: any) {
        return json({ error: "Database error", message: error.message }, 500);
    }
}

/**
 * Submit claim transaction via relayer.
 * Recipient provides claimSecret + wallet, we pay gas and submit tx.
 */
async function handleClaim(request: Request, env: Env): Promise<Response> {
    let body: ClaimRequest;

    try {
        body = await request.json();
    } catch {
        return json({ error: "Invalid JSON body" }, 400);
    }

    const { claimSecret, walletAddress } = body;

    if (!claimSecret || !walletAddress) {
        return json({ error: "Missing required fields: claimSecret, walletAddress" }, 400);
    }

    // TODO: Implement relayer transaction submission with viem
    // 1. Create wallet client with env.RELAYER_PRIVATE_KEY
    // 2. Call contract.claim(claimSecret, walletAddress)
    // 3. Return tx hash

    return json({ error: "Claim endpoint not yet implemented" }, 501);
}

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

    const lifiUrl = `https://li.quest/v1/quote?${params.toString()}`;

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

// =============================================================================
// Helpers
// =============================================================================

/** JSON response with CORS headers */
function json(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data, null, 2), {
        status,
        headers: {
            "Content-Type": "application/json;charset=UTF-8",
            "Access-Control-Allow-Origin": "*",
        },
    });
}
