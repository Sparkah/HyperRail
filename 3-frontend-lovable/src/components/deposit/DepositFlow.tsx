import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { EntryScreen } from "./EntryScreen";
import { RouteConfirmation } from "./RouteConfirmation";
import { ProgressTracker } from "./ProgressTracker";
import { SuccessScreen } from "./SuccessScreen";
import { DepositStep, RouteInfo, RouteStep, Chain, Token } from "@/types/deposit";

// Use your actual deployed Worker URL or localhost:8787 for local testing
const WORKER_URL = "http://localhost:8787";

export function DepositFlow() {
  const [step, setStep] = useState<DepositStep>("entry");
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Selection States
  const [sourceChain, setSourceChain] = useState<Chain | null>(null);
  const [sourceToken, setSourceToken] = useState<Token | null>(null);
  const [destChain, setDestChain] = useState<Chain | null>(null);
  const [destToken, setDestToken] = useState<Token | null>(null);

  const [route, setRoute] = useState<RouteInfo | null>(null);
  const [progressSteps, setProgressSteps] = useState<RouteStep[]>([]);

  const CHAIN_MAP: Record<string, number> = {
    "ethereum": 1,
    "arbitrum": 42161,
    "polygon": 137,
    "optimism": 10,
    "base": 8453,
  };

  /**
   * Fetches real quote from LI.FI via Cloudflare Worker
   */
  // Inside DepositFlow.tsx

  const handleContinue = async () => {
    if (!sourceChain || !destChain || !sourceToken || !destToken || !amount) return;

    setIsLoading(true);
    try {
      // 1. Prepare raw amount (assuming 6 decimals for USDT/USDC)
      const rawAmount = (parseFloat(amount) * 1_000_000).toString();

      const response = await fetch(`${WORKER_URL}/api/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromChain: CHAIN_MAP[sourceChain.id], // Use numeric IDs
          toChain: CHAIN_MAP[destChain.id],
          fromToken: sourceToken.symbol,
          toToken: destToken.symbol,
          fromAmount: rawAmount,
          fromAddress: "0x975d106BA75Bcc52A72f20895cb475c4673E5c72"
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch quote");

      // 2. Calculate the actual received amount in human units
      const receivedAmount = parseFloat(data.expectedOutput) / 1_000_000;
      const inputAmount = parseFloat(amount);

      // 3. Calculate Total Fees as the difference (Input - Output)
      // This ensures that if Input is $100 and Output is 99.19, fees will show $0.81
      const actualTotalFees = Math.max(0, inputAmount - receivedAmount);

      setRoute({
        fromChain: sourceChain,
        fromToken: sourceToken,
        toChain: destChain,
        toToken: destToken,
        amount: inputAmount.toFixed(2),
        estimatedOutput: receivedAmount.toFixed(2),
        estimatedTime: data.etaSeconds > 0 ? `~${Math.round(data.etaSeconds / 60)} min` : "~3 min",
        fees: {
          gas: `$${parseFloat(data.fees.gasUSD).toFixed(2)}`,
          bridge: `$${parseFloat(data.fees.bridgeUSD).toFixed(2)}`,
          // Use the calculated difference for the "Total Fees" display
          total: `$${actualTotalFees.toFixed(2)}`,
        },
        steps: data.steps || [],
      });

      setStep("preview");
    } catch (err) {
      console.error("Quote Fetch Error:", err);
      alert("Unable to fetch a real-time quote.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = () => {
    // Wallet connection logic will be triggered here in the next step
    setStep("progress");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <AnimatePresence mode="wait">
          {step === "entry" && (
            <EntryScreen
              key="entry"
              selectedSourceChain={sourceChain}
              selectedSourceToken={sourceToken}
              selectedDestChain={destChain}
              selectedDestToken={destToken}
              amount={amount}
              onSourceChainSelect={setSourceChain}
              onSourceTokenSelect={setSourceToken}
              onDestChainSelect={setDestChain}
              onDestTokenSelect={setDestToken}
              onAmountChange={setAmount}
              onContinue={handleContinue}
            />
          )}

          {step === "preview" && route && (
            <RouteConfirmation
              key="preview"
              route={route}
              onBack={() => setStep("entry")}
              onConfirm={handleConfirm}
            />
          )}

          {/* ... ProgressTracker and SuccessScreen remain unchanged ... */}
        </AnimatePresence>

        {isLoading && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="glass-card p-8 flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="font-bold text-lg">Fetching Best Route...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}