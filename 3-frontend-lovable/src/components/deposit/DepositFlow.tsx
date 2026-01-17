import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { EntryScreen } from "./EntryScreen";
import { RouteConfirmation } from "./RouteConfirmation";
import { ProgressTracker } from "./ProgressTracker";
import { SuccessScreen } from "./SuccessScreen";
import { DepositStep, RouteInfo, RouteStep, Chain, Token } from "@/types/deposit";

// LI.FI Chain ID Mapping
const CHAIN_MAP: Record<string, number> = {
  ethereum: 1,
  arbitrum: 42161,
  polygon: 137,
  optimism: 10,
  base: 8453,
};

const WORKER_URL = "http://localhost:8787";

const defaultSteps: RouteStep[] = [
  { id: "1", type: "swap", title: "Swap Assets", description: "Preparing funds", status: "pending" },
  { id: "2", type: "bridge", title: "Cross-chain Bridge", description: "Transferring to destination", status: "pending" },
  { id: "3", type: "confirm", title: "Arrival Confirmation", description: "Verifying arrival", status: "pending" },
  { id: "4", type: "deposit", title: "Hyperliquid Deposit", description: "Finalizing", status: "pending" },
];

export function DepositFlow() {
  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();

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

  /**
   * Fetches real quote from LI.FI via Cloudflare Worker
   */
  const handleContinue = async () => {
    if (!sourceChain || !destChain || !sourceToken || !destToken || !amount) return;

    setIsLoading(true);
    try {
      // Prepare raw amount (6 decimals for USDC/USDT)
      const rawAmount = (parseFloat(amount) * 1_000_000).toString();

      const response = await fetch(`${WORKER_URL}/api/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromChain: CHAIN_MAP[sourceChain.id],
          toChain: CHAIN_MAP[destChain.id],
          fromToken: sourceToken.symbol,
          toToken: destToken.symbol,
          fromAmount: rawAmount,
          fromAddress: "0x975d106BA75Bcc52A72f20895cb475c4673E5c72", // Placeholder for quote
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch quote");

      const receivedAmount = parseFloat(data.expectedOutput) / 1_000_000;
      const inputAmount = parseFloat(amount);
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
          total: `$${actualTotalFees.toFixed(2)}`,
        },
        steps: data.steps || defaultSteps,
      });

      setStep("preview");
    } catch (err) {
      console.error("Quote Fetch Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Triggers the Wallet Connection or proceeds to the bridge
   */
  const handleConfirm = () => {
    if (!isConnected) {
      if (openConnectModal) {
        openConnectModal();
      }
      return;
    }
    setStep("progress");
  };

  /**
   * Logic: Once the wallet is connected while on the preview screen, 
   * automatically proceed to the progress step.
   */
  useEffect(() => {
    if (isConnected && step === "preview") {
      setStep("progress");
      setProgressSteps(defaultSteps.map((s, i) => ({ ...s, status: i === 0 ? "active" : "pending" })));
    }
  }, [isConnected, step]);

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

          {step === "progress" && (
            <ProgressTracker
              key="progress"
              steps={progressSteps}
              onComplete={() => setStep("success")}
            />
          )}

          {step === "success" && (
            <SuccessScreen
              key="success"
              amount={route?.estimatedOutput || "0"}
              onOpenHyperliquid={() => window.open("https://app.hyperliquid.xyz", "_blank")}
              onDepositMore={() => {
                setStep("entry");
                setAmount("");
              }}
            />
          )}
        </AnimatePresence>

        {isLoading && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="glass-card p-8 flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="font-bold text-lg">Calculating best route...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}