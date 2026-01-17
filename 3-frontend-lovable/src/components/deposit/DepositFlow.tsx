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
  ethereum: 1, arbitrum: 42161, polygon: 137, optimism: 10, base: 8453,
  hyperevm: 998, // Destination Chain ID
};

// Map token symbols to contract addresses for balance fetching
const TOKEN_ADDRESSES: Record<string, string> = {
  "USDT": "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", 
  "USDC": "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", 
};

const WORKER_URL = import.meta.env.DEV 
  ? "http://localhost:8787" 
  : "https://hyperrail-worker.timopro16.workers.dev";

// Locked Destination Constants
const DEST_CHAIN: Chain = { id: "hyperevm", name: "HyperEVM", icon: "⚡" };
const DEST_TOKEN: Token = { symbol: "USDC", name: "USD Coin", icon: "💵" };

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

  const [sourceChain, setSourceChain] = useState<Chain | null>(null);
  const [sourceToken, setSourceToken] = useState<Token | null>(null);
  const [route, setRoute] = useState<RouteInfo | null>(null);
  const [progressSteps, setProgressSteps] = useState<RouteStep[]>([]);

  // Fetch balance for the selected source
  const sourceChainId = sourceChain ? CHAIN_MAP[sourceChain.id] : undefined;
  const { data: balanceData } = useBalance({
    address: address,
    token: sourceToken ? (TOKEN_ADDRESSES[sourceToken.symbol] as `0x${string}`) : undefined,
    chainId: sourceChainId,
    query: { enabled: !!address && !!sourceToken && !!sourceChain }
  });

  const walletBalance = balanceData ? parseFloat(balanceData.formatted) : 0;

  const handleContinue = async () => {
    if (!sourceChain || !sourceToken || !amount) return;

    setIsLoading(true);
    setError(null);
    try {
      const rawAmount = (parseFloat(amount) * 1_000_000).toString();

      const response = await fetch(`${WORKER_URL}/api/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromChain: CHAIN_MAP[sourceChain.id],
          toChain: CHAIN_MAP[DEST_CHAIN.id], // Hardcoded to 998
          fromToken: sourceToken.symbol,
          toToken: DEST_TOKEN.symbol, // Hardcoded to USDC
          fromAmount: rawAmount,
          fromAddress: address || "0x975d106BA75Bcc52A72f20895cb475c4673E5c72",
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch quote");

      const receivedAmount = parseFloat(data.expectedOutput) / 1_000_000;
      setRoute({
        fromChain: sourceChain,
        fromToken: sourceToken,
        toChain: DEST_CHAIN,
        toToken: DEST_TOKEN,
        amount: parseFloat(amount).toFixed(2),
        estimatedOutput: receivedAmount.toFixed(2),
        estimatedTime: data.etaSeconds > 0 ? `~${Math.round(data.etaSeconds / 60)} min` : "~3 min",
        fees: {
          gas: `$${parseFloat(data.fees.gasUSD).toFixed(2)}`,
          bridge: `$${parseFloat(data.fees.bridgeUSD).toFixed(2)}`,
          total: `$${(parseFloat(amount) - receivedAmount).toFixed(2)}`,
        },
        steps: data.steps || defaultSteps,
      });

      setStep("preview");
    } catch (err: any) {
      console.error(err);
      setError("Unable to find a valid bridge route. Try a different chain or amount.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!isConnected) {
      if (openConnectModal) openConnectModal();
      return;
    }

    const inputAmount = parseFloat(amount);
    if (inputAmount > walletBalance) {
      setError(`Insufficient balance. You have ${walletBalance.toFixed(4)} ${sourceToken?.symbol}.`);
      setAmount("");
      setStep("entry");
      return;
    }

    setProgressSteps(defaultSteps.map((s, i) => ({ ...s, status: i === 0 ? "active" : "pending" })));
    setStep("progress");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
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
              amount={amount}
              balance={isConnected ? balanceData?.formatted || null : null}
              error={error}
              onSourceChainSelect={setSourceChain}
              onSourceTokenSelect={setSourceToken}
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
            <ProgressTracker key="progress" steps={progressSteps} onComplete={() => setStep("success")} />
          )}

          {step === "success" && (
            <SuccessScreen
              key="success"
              amount={route?.estimatedOutput || "0"}
              onOpenHyperliquid={() => window.open("https://app.hyperliquid.xyz", "_blank")}
              onDepositMore={() => { setStep("entry"); setAmount(""); setError(null); }}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}