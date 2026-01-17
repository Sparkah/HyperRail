// src/lib/api.ts
const WORKER_URL = "https://hyperrail-worker.timopro16.workers.dev/";

export async function getLifiQuote(params: {
  fromChain: number;
  fromToken: string;
  fromAmount: string; // in base units (e.g. Wei)
  fromAddress: string;
}) {
  const response = await fetch(`${WORKER_URL}/api/quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...params,
      toChain: 1, // Example: Bridge to Ethereum (or your target chain)
      toToken: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", // Target Token
    }),
  });

  if (!response.ok) throw new Error("Failed to fetch quote");
  return response.json();
}