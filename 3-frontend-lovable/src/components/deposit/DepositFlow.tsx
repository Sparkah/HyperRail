import { useState, useMemo, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { useAccount, useBalance, useSendTransaction } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { parseUnits } from "viem";
import { EntryScreen } from "./EntryScreen";
import { RouteConfirmation } from "./RouteConfirmation";
import { ProgressTracker } from "./ProgressTracker";
import { SuccessScreen } from "./SuccessScreen";
import { DepositStep, RouteInfo, Chain, Token } from "@/types/deposit";
import { useTokenApproval } from "@/hooks/useTokenApproval";
import { useGiftStatus } from "@/hooks/useGiftStatus";
import { CHAINS, TOKENS, getTokenAddress, isNativeToken } from "@/constants/chains";

const WORKER_URL = import.meta.env.DEV
  ? "http://localhost:8787"
  : "https://hyperrail-worker.timopro16.workers.dev";

const DEST_CHAIN: Chain = { id: "hyperevm", name: CHAINS.hyperevm.name, icon: CHAINS.hyperevm.icon };
const DEST_TOKEN: Token = { symbol: "USDC", name: TOKENS.USDC.name, icon: TOKENS.USDC.icon };

export function DepositFlow() {
  const { isConnected, address } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { sendTransactionAsync } = useSendTransaction();

  const [step, setStep] = useState<DepositStep>("entry");
  const [amount, setAmount] = useState("");
  const [isQuoting, setIsQuoting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sourceChain, setSourceChain] = useState<Chain | null>(null);
  const [sourceToken, setSourceToken] = useState<Token | null>(null);

  const [route, setRoute] = useState<RouteInfo | null>(null);
  const [isSwapping, setIsSwapping] = useState(false);

  // Gift flow state
  const [relayerAddress, setRelayerAddress] = useState<string | null>(null);
  const [giftClaimId, setGiftClaimId] = useState<string | null>(null);
  const [giftClaimSecret, setGiftClaimSecret] = useState<string | null>(null);

  // Fetch relayer address on mount
  useEffect(() => {
    fetch(`${WORKER_URL}/api/config`)
      .then((r) => r.json())
      .then((data) => {
        if (data.relayerAddress) {
          setRelayerAddress(data.relayerAddress);
        }
      })
      .catch((err) => console.error("Failed to fetch config:", err));
  }, []);

  const sId = sourceChain ? CHAINS[sourceChain.id as keyof typeof CHAINS]?.id : undefined;
  const tokenAddr = (sourceToken && sId) ? getTokenAddress(sourceToken.symbol, sId) : undefined;
  // For native tokens (ETH), pass undefined to useBalance; for ERC20s, pass the address
  const balanceTokenArg = tokenAddr && !isNativeToken(tokenAddr) ? tokenAddr as `0x${string}` : undefined;

  const { data: balanceData } = useBalance({
    address: address,
    token: balanceTokenArg,
    chainId: sId,
    query: { enabled: !!address && !!sId && (!!tokenAddr || sourceToken?.symbol === "ETH") }
  });

  const walletBalance = balanceData ? parseFloat(balanceData.formatted) : 0;

  // Get token decimals from config
  const tokenDecimals = sourceToken ? TOKENS[sourceToken.symbol as keyof typeof TOKENS]?.decimals ?? 18 : 18;
  const rawAmount = useMemo(() => {
    if (!amount || isNaN(parseFloat(amount))) return 0n;
    try {
      return parseUnits(amount, tokenDecimals);
    } catch {
      return 0n;
    }
  }, [amount, tokenDecimals]);

  // Get spender address from route (LI.FI contract)
  const spenderAddress = route?.transactionRequest?.to as `0x${string}` | undefined;

  // Token approval hook
  const {
    state: approvalState,
    needsApproval,
    approve,
    error: approvalError,
    reset: resetApproval,
  } = useTokenApproval({
    tokenAddress: tokenAddr as `0x${string}`,
    spenderAddress,
    amount: rawAmount,
    userAddress: address,
    chainId: sId,
    enabled: step === "preview" && !!route,
  });

  // Poll gift status (handles bridge check + gift creation)
  const { steps: liveSteps } = useGiftStatus({
    claimId: giftClaimId,
    enabled: step === "progress" && !!giftClaimId,
    onComplete: () => setStep("success"),
  });

  const handleContinue = async () => {
    if (!sourceChain || !sourceToken || !amount) return;

    // Require wallet connection before fetching quote
    // (LI.FI bakes the address into the transaction calldata)
    if (!isConnected || !address) {
      openConnectModal?.();
      return;
    }

    setIsQuoting(true);
    setError(null);
    try {
      const decimals = TOKENS[sourceToken.symbol as keyof typeof TOKENS]?.decimals ?? 18;
      const quoteAmount = parseUnits(amount, decimals).toString();
      const fromChainId = CHAINS[sourceChain.id as keyof typeof CHAINS].id;
      const fromTokenAddr = getTokenAddress(sourceToken.symbol, fromChainId);
      const toTokenAddr = getTokenAddress("USDC", CHAINS.hyperevm.id);

      if (!fromTokenAddr || !toTokenAddr) {
        throw new Error("Token not available on selected chain");
      }

      if (!relayerAddress) {
        throw new Error("Relayer not configured. Please try again.");
      }

      const response = await fetch(`${WORKER_URL}/api/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromChain: fromChainId,
          toChain: CHAINS.hyperevm.id,
          fromToken: fromTokenAddr,
          toToken: toTokenAddr,
          fromAmount: quoteAmount,
          fromAddress: address,
          toAddress: relayerAddress, // USDC goes to relayer for gift creation
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch quote");

      const receivedAmount = parseFloat(data.expectedOutput) / 1_000_000;
      const gasUSD = parseFloat(data.fees?.gasUSD || "0");
      const bridgeUSD = parseFloat(data.fees?.bridgeUSD || "0");
      const totalFees = gasUSD + bridgeUSD;
      // Use appropriate precision: 6 decimals for ETH/WETH/WBTC, 2 for stablecoins
      const inputPrecision = ["ETH", "WETH", "WBTC"].includes(sourceToken.symbol) ? 6 : 2;
      setRoute({
        fromChain: sourceChain,
        fromToken: sourceToken,
        toChain: DEST_CHAIN,
        toToken: DEST_TOKEN,
        amount: parseFloat(amount).toFixed(inputPrecision),
        estimatedOutput: receivedAmount.toFixed(2),
        estimatedTime: data.etaSeconds > 0 ? `~${Math.round(data.etaSeconds / 60)} min` : "~3 min",
        fees: {
          gas: `$${gasUSD.toFixed(2)}`,
          bridge: `$${bridgeUSD.toFixed(2)}`,
          total: `$${totalFees.toFixed(2)}`,
        },
        transactionRequest: data.transactionRequest, // Captured for signing
        steps: data.steps || [],
      });

      setStep("preview");
    } catch (err: any) {
      console.error("Quote failed:", err);
      setError(err.message || "No valid route found. Try a different amount or chain.");
    } finally {
      setIsQuoting(false);
    }
  };

  const handleConfirm = async () => {
    if (!isConnected) { openConnectModal?.(); return; }

    if (!route?.transactionRequest) {
      setError("No transaction data available. Please try again.");
      return;
    }

    if (parseFloat(amount) > walletBalance) {
      setError(`Insufficient balance. You have ${walletBalance.toFixed(4)} ${sourceToken?.symbol}.`);
      return;
    }

    setError(null);

    // Step 1: Approve if needed
    if (needsApproval) {
      const approved = await approve();
      if (!approved) {
        setError(approvalError || "Approval failed. Please try again.");
        return;
      }
      // After approval succeeds, the button will update to "Confirm Deposit"
      // User needs to click again to execute the swap
      return;
    }

    // Step 2: Execute swap transaction
    setIsSwapping(true);
    try {
      const tx = await sendTransactionAsync({
        to: route.transactionRequest.to as `0x${string}`,
        data: route.transactionRequest.data as `0x${string}`,
        value: route.transactionRequest.value ? BigInt(route.transactionRequest.value) : 0n,
      });

      console.log("Transaction Hash:", tx);

      // Step 3: Create gift intent on backend
      const fromChainId = CHAINS[sourceChain!.id as keyof typeof CHAINS].id;
      const giftResponse = await fetch(`${WORKER_URL}/api/gift`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          txHash: tx,
          fromChain: fromChainId,
          amount: route.estimatedOutput, // Use expected output amount
          senderAddress: address,
        }),
      });

      const giftData = await giftResponse.json();
      if (!giftResponse.ok) {
        throw new Error(giftData.error || "Failed to create gift");
      }

      console.log("Gift created:", giftData);
      setGiftClaimId(giftData.claimId);
      setGiftClaimSecret(giftData.claimSecret);
      setStep("progress");
    } catch (err: any) {
      console.error("Swap/Gift failed:", err);
      setError(err.shortMessage || err.message || "Transaction rejected.");
      setIsSwapping(false);
    }
  };

  // Derive button text and state from approval status
  const getButtonConfig = () => {
    if (approvalState === "checking") {
      return { text: "Checking allowance...", disabled: true, loading: true };
    }
    if (approvalState === "approving") {
      return { text: `Approving ${sourceToken?.symbol}...`, disabled: true, loading: true };
    }
    if (isSwapping) {
      return { text: "Sending transaction...", disabled: true, loading: true };
    }
    if (needsApproval) {
      return { text: `Approve ${sourceToken?.symbol}`, disabled: false, loading: false };
    }
    return { text: "Confirm Deposit", disabled: false, loading: false };
  };

  const buttonConfig = getButtonConfig();

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
              isLoading={isQuoting}
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
              onBack={() => {
                setStep("entry");
                setError(null);
                resetApproval();
              }}
              onConfirm={handleConfirm}
              buttonText={buttonConfig.text}
              buttonDisabled={buttonConfig.disabled}
              buttonLoading={buttonConfig.loading}
              error={error || approvalError}
            />
          )}

          {step === "progress" && (
            <ProgressTracker key="progress" steps={liveSteps} onComplete={() => setStep("success")} />
          )}

          {step === "success" && (
            <SuccessScreen
              key="success"
              amount={route?.estimatedOutput || "0"}
              claimId={giftClaimId}
              claimSecret={giftClaimSecret}
              onOpenHyperliquid={() => window.open("https://app.hyperliquid.xyz", "_blank")}
              onCreateAnother={() => {
                setStep("entry");
                setAmount("");
                setError(null);
                setGiftClaimId(null);
                setGiftClaimSecret(null);
                setIsSwapping(false);
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
