import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useAccount, useBalance } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { EntryScreen } from "./EntryScreen";
import { RouteConfirmation } from "./RouteConfirmation";
import { ProgressTracker } from "./ProgressTracker";
import { SuccessScreen } from "./SuccessScreen";
import { DepositStep, RouteInfo, RouteStep, Chain, Token } from "@/types/deposit";

const CHAIN_MAP: Record<string, number> = {
  ethereum: 1,
  arbitrum: 42161,
  polygon: 137,
  optimism: 10,
  base: 8453,
};

// Map token symbols to contract addresses for balance fetching
const TOKEN_ADDRESSES: Record<string, string> = {
  "USDT": "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", // Polygon Address Example
  "USDC": "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", // Polygon Address Example
};

const WORKER_URL = import.meta.env.DEV 
  ? "http://localhost:8787" 
  : "https://hyperrail-worker.timmarkin.workers.dev";

const defaultSteps: RouteStep[] = [
  { id: "1", type: "swap", title: "Swap Assets", description: "Preparing funds", status: "pending" },
  { id: "2", type: "bridge", title: "Cross-chain Bridge", description: "Transferring to destination", status: "pending" },
  { id: "3", type: "confirm", title: "Arrival Confirmation", description: "Verifying arrival", status: "pending" },
  { id: "4", type: "deposit", title: "Hyperliquid Deposit", description: "Finalizing", status: "pending" },
];

export function DepositFlow() {
  const { isConnected, address } = useAccount();
  const { openConnectModal } = useConnectModal();

  const [step, setStep] = useState<DepositStep>("entry");
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selection States
  const [sourceChain, setSourceChain] = useState<Chain | null>(null);
  const [sourceToken, setSourceToken] = useState<Token | null>(null);
  const [destChain, setDestChain] = useState<Chain | null>(null);
  const [destToken, setDestToken] = useState<Token | null>(null);

  const [route, setRoute] = useState<RouteInfo | null>(null);
  const [progressSteps, setProgressSteps] = useState<RouteStep[]>([]);

  // Fetch live balance once connected
  const { data: balanceData } = useBalance({
    address: address,
    token: sourceToken ? (TOKEN_ADDRESSES[sourceToken.symbol] as `0x${string}`) : undefined,
    chainId: sourceChain ? CHAIN_MAP[sourceChain.id] : undefined,
    query: { enabled: !!address && !!sourceToken && !!sourceChain }
  });

  const walletBalance = balanceData ? parseFloat(balanceData.formatted) : 0;

  /**
   * Fetches real quote from LI.FI via Cloudflare Worker
   */
  const handleContinue = async () => {
    if (!sourceChain || !destChain || !sourceToken || !destToken || !amount) return;

    setIsLoading(true);
    setError(null);
    try {
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
          fromAddress: address || "0x975d106BA75Bcc52A72f20895cb475c4673E5c72",
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
    } catch (err: any) {
      console.error("Quote Fetch Error:", err);
      setError("Unable to find a valid bridge route. Try a different chain or amount.");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Validates balance and triggers the actual bridge process
   */
  const handleConfirm = () => {
    // 1. If not connected, open the modal and wait (Stay on preview page)
    if (!isConnected) {
      if (openConnectModal) openConnectModal();
      return;
    }

    // 2. Strict Balance Check
    const inputAmount = parseFloat(amount);
    if (inputAmount > walletBalance) {
      setError(`Insufficient balance. You have ${walletBalance.toFixed(4)} ${sourceToken?.symbol}.`);
      setAmount(""); // "Drop" the input value as requested
      setStep("entry"); // Return to entry to fix the amount
      return;
    }

    // 3. User is connected and has enough balance - proceed to execution
    setProgressSteps(defaultSteps.map((s, i) => ({ ...s, status: i === 0 ? "active" : "pending" })));
    setStep("progress");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      {/* Wallet Address Display */}
      {isConnected && address && (
        <div className="mb-4 flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full text-xs font-mono text-primary animate-fade-in">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          {address.slice(0, 6)}...{address.slice(-4)}
        </div>
      )}

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
              balance={isConnected ? balanceData?.formatted || null : null}
              error={error}
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
              onBack={() => { setStep("entry"); setError(null); }}
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
                setError(null);
              }}
            />
          )}
        </AnimatePresence>

        {isLoading && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-md">
            <div className="glass-card p-10 flex flex-col items-center gap-6">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-primary/20 rounded-full" />
                <div className="absolute inset-0 w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
              <div className="text-center">
                <p className="font-bold text-xl mb-1">Finding Best Route</p>
                <p className="text-muted-foreground text-sm">Aggregating quotes from 30+ bridges...</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}