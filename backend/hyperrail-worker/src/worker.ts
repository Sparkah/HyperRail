export interface Env {
    LIFI_INTEGRATOR: string;
}

type QuoteRequest = {
    fromChain: number;
    fromToken: string;
    fromAmount: string;
    toChain: number;
    toToken: string;
    fromAddress: string;
};

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url);

        // 1. Handle CORS Preflight (Critical for Frontend)
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

        return json({ error: "Not Found" }, 404);
    },
};

async function handleQuote(request: Request, env: Env): Promise<Response> {
    let body: QuoteRequest;

    try {
        body = await request.json();
    } catch {
        return json({ error: "Invalid JSON body" }, 400);
    }

    const { fromChain, toChain, fromToken, toToken, fromAmount, fromAddress } = body;

    // Validation
    if (!fromChain || !toChain || !fromToken || !toToken || !fromAmount || !fromAddress) {
        return json({ error: "Missing required fields" }, 400);
    }

    const params = new URLSearchParams({
        fromChain: fromChain.toString(),
        toChain: toChain.toString(),
        fromToken,
        toToken,
        fromAmount,
        fromAddress,
        integrator: env.LIFI_INTEGRATOR || "HyperRail",
    });

    try {
        const lifiRes = await fetch(`https://li.quest/v1/quote?${params.toString()}`);
        const data = await lifiRes.json() as any;

        if (!lifiRes.ok) {
            return json({ error: "LI.FI quote failed", detail: data }, 502);
        }

        // Standardized response for your DepositFlow.tsx
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
            steps: data.action?.steps || []
        }, 200);

    } catch (error: any) {
        return json({ error: "Worker Internal Error", message: error.message }, 500);
    }
}

/**
 * Helper: JSON response with CORS headers
 */
function json(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data, null, 2), {
        status,
        headers: {
            "Content-Type": "application/json;charset=UTF-8",
            "Access-Control-Allow-Origin": "*", // Allows your React app to call this
        },
    });
}