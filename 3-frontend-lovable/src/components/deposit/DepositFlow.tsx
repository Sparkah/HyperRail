import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { EntryScreen } from "./EntryScreen";
import { RouteConfirmation } from "./RouteConfirmation";
import { ProgressTracker } from "./ProgressTracker";
import { SuccessScreen } from "./SuccessScreen";
import { DepositStep, RouteInfo, RouteStep, Chain, Token } from "@/types/deposit";

// Local Worker URL for testing
const API_URL = "http://localhost:8787";

// Chain Mapping (Chain Name -> LI.FI Chain ID)
const CHAIN_MAP: Record<string, number> = {
  "ethereum": 1,
  "arbitrum": 42161,
  "polygon": 137,
  "optimism": 10,
  "base": 8453,
};

// Token Mapping (Symbol -> Contract Address)
// Note: We use Polygon for source and Ethereum for destination as requested
const TOKEN_ADDRESSES: Record<string, string> = {
  "USDT": "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", // Polygon USDT
  "USDC": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // Ethereum USDC
};

const defaultSteps: RouteStep[] = [
  { id: "1", type: "swap", title: "Swap Assets", description: "Preparing funds", status: "pending" },
  { id: "2", type: "bridge", title: "Cross-chain Bridge", description: "Transferring to destination", status: "pending" },
  { id: "3", type: "confirm", title: "Arrival Confirmation", description: "Verifying arrival", status: "pending" },
  { id: "4", type: "deposit", title: "Hyperliquid Deposit", description: "Finalizing", status: "pending" },
];

export function DepositFlow() {
  const [step, setStep] = useState<DepositStep>("entry");
  const [amount, setAmount] = useState("");
  const [selectedChain, setSelectedChain] = useState<Chain | null>(null);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [route, setRoute] = useState<RouteInfo | null>(null);
  const [progressSteps, setProgressSteps] = useState<RouteStep[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleContinue = async () => {
    if (!selectedChain || !selectedToken || !amount) return;

    setIsLoading(true);
    try {
      // LI.FI/Worker expects amounts in base units (e.g., 6 decimals for USDT/USDC)
      const rawAmount = (parseFloat(amount) * 1_000_000).toString();

      const response = await fetch(`${API_URL}/api/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromChain: CHAIN_MAP[selectedChain.id] || 1,
          fromToken: TOKEN_ADDRESSES[selectedToken.symbol] || selectedToken.symbol,
          fromAmount: rawAmount,
          toChain: 1, // Target: Ethereum for bridge entry
          toToken: TOKEN_ADDRESSES["USDC"], // Target USDC
          fromAddress: "0x975d106BA75Bcc52A72f20895cb475c4673E5c72", // Your Rabby address
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Quote failed");

      setRoute({
        fromChain: selectedChain,
        fromToken: selectedToken,
        toChain: { id: "hyperliquid", name: "Hyperliquid", icon: "⚡" },
        toToken: { symbol: "USDC", name: "USD Coin", icon: "💵" },
        amount: amount,
        estimatedOutput: (parseFloat(data.expectedOutput) / 1_000_000).toFixed(2),
        estimatedTime: `~${Math.round(data.etaSeconds / 60)} min`,
        fees: {
          gas: `$${parseFloat(data.fees.gasUSD).toFixed(2)}`,
          bridge: `$${parseFloat(data.fees.bridgeUSD).toFixed(2)}`,
          total: `$${parseFloat(data.fees.totalUSD).toFixed(2)}`,
        },
        steps: defaultSteps,
      });

      setStep("preview");
    } catch (err) {
      console.error("Fetch error:", err);
      alert("Error: Check if local worker is running on port 8787");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = () => {
    setProgressSteps(defaultSteps.map((s, i) => ({ ...s, status: i === 0 ? "active" : "pending" })));
    setStep("progress");
  };

  // Simulate progress logic...
  useEffect(() => {
    if (step !== "progress") return;
    const activeIndex = progressSteps.findIndex((s) => s.status === "active");
    if (activeIndex === -1) return;
    const timer = setTimeout(() => {
      setProgressSteps((prev) => prev.map((s, i) => ({
        ...s,
        status: i <= activeIndex ? "completed" : i === activeIndex + 1 ? "active" : "pending",
      })));
    }, 2000);
    return () => clearTimeout(timer);
  }, [step, progressSteps]);

  useEffect(() => {
    if (step === "progress" && progressSteps.every((s) => s.status === "completed")) {
      setTimeout(() => setStep("success"), 500);
    }
  }, [progressSteps, step]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <AnimatePresence mode="wait">
          {step === "entry" && (
            <EntryScreen
              key="entry"
              selectedChain={selectedChain}
              selectedToken={selectedToken}
              amount={amount}
              onChainSelect={setSelectedChain}
              onTokenSelect={setSelectedToken}
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
          {step === "progress" && <ProgressTracker key="progress" steps={progressSteps} onComplete={() => setStep("success")} />}
          {step === "success" && <SuccessScreen key="success" amount={route?.estimatedOutput || "0"} onOpenHyperliquid={() => window.open("https://app.hyperliquid.xyz", "_blank")} onDepositMore={() => { setStep("entry"); setAmount(""); }} />}
        </AnimatePresence>
        {isLoading && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card p-6 rounded-xl animate-pulse">Calculating best route...</div>
          </div>
        )}
      </div>
    </div>
  );
}