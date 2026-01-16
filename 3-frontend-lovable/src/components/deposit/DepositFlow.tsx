import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { OnboardingEntry } from "./OnboardingEntry";
import { RouteConfirmation } from "./RouteConfirmation";
import { ProgressTracker } from "./ProgressTracker";
import { SuccessScreen } from "./SuccessScreen";
import { DepositStep, RouteInfo, RouteStep } from "@/types/deposit";

const defaultSteps: RouteStep[] = [
  {
    id: "1",
    type: "swap",
    title: "Swap to USDC",
    description: "Converting to bridge-ready format",
    status: "pending",
  },
  {
    id: "2",
    type: "bridge",
    title: "Bridge to HyperEVM",
    description: "Cross-chain transfer via LI.FI",
    status: "pending",
  },
  {
    id: "3",
    type: "confirm",
    title: "Confirm arrival",
    description: "Verifying USDC on destination",
    status: "pending",
  },
  {
    id: "4",
    type: "deposit",
    title: "Deposit to Hyperliquid",
    description: "Funding your trading account",
    status: "pending",
  },
];

export function DepositFlow() {
  const [step, setStep] = useState<DepositStep>("entry");
  const [amount, setAmount] = useState("");
  const [route, setRoute] = useState<RouteInfo | null>(null);
  const [progressSteps, setProgressSteps] = useState<RouteStep[]>([]);

  // Calculate fees and output based on amount
  const calculateRoute = (inputAmount: string): RouteInfo => {
    const numericAmount = parseFloat(inputAmount.replace(/,/g, '')) || 0;
    const gasFee = numericAmount > 0 ? 2.50 : 0;
    const bridgeFee = numericAmount > 0 ? Math.max(0.50, numericAmount * 0.001) : 0;
    const totalFees = gasFee + bridgeFee;
    const receiveAmount = Math.max(0, numericAmount - totalFees);

    return {
      fromChain: { id: "auto", name: "Auto-detected", icon: "🔄" },
      fromToken: { symbol: "USD", name: "US Dollar", icon: "💵" },
      toChain: { id: "hyperliquid", name: "Hyperliquid", icon: "⚡" },
      toToken: { symbol: "USDC", name: "USD Coin", icon: "💵" },
      amount: numericAmount.toFixed(2),
      estimatedOutput: receiveAmount.toFixed(2),
      estimatedTime: "~3 min",
      fees: {
        gas: `$${gasFee.toFixed(2)}`,
        bridge: `$${bridgeFee.toFixed(2)}`,
        total: `$${totalFees.toFixed(2)}`,
      },
      steps: defaultSteps,
    };
  };

  const handleContinue = () => {
    const newRoute = calculateRoute(amount);
    setRoute(newRoute);
    setStep("preview");
  };

  const handleConfirm = () => {
    setProgressSteps(
      defaultSteps.map((s, i) => ({
        ...s,
        status: i === 0 ? "active" : "pending",
      }))
    );
    setStep("progress");
  };

  // Simulate progress
  useEffect(() => {
    if (step !== "progress") return;

    const activeIndex = progressSteps.findIndex((s) => s.status === "active");
    if (activeIndex === -1) return;

    const timer = setTimeout(() => {
      setProgressSteps((prev) =>
        prev.map((s, i) => ({
          ...s,
          status:
            i < activeIndex
              ? "completed"
              : i === activeIndex
              ? "completed"
              : i === activeIndex + 1
              ? "active"
              : "pending",
        }))
      );
    }, 2000);

    return () => clearTimeout(timer);
  }, [step, progressSteps]);

  // Check if all steps complete
  useEffect(() => {
    if (
      step === "progress" &&
      progressSteps.length > 0 &&
      progressSteps.every((s) => s.status === "completed")
    ) {
      setTimeout(() => setStep("success"), 500);
    }
  }, [progressSteps, step]);

  const handleReset = () => {
    setStep("entry");
    setAmount("");
    setRoute(null);
    setProgressSteps([]);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <AnimatePresence mode="wait">
          {step === "entry" && (
            <OnboardingEntry
              key="entry"
              amount={amount}
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
              onDepositMore={handleReset}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
