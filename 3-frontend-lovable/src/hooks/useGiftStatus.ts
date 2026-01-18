import { useState, useEffect, useCallback } from "react";
import { RouteStep } from "@/types/deposit";

const WORKER_URL = import.meta.env.DEV
  ? "http://localhost:8787"
  : "https://hyperrail-worker.timopro16.workers.dev";

export type GiftStatus = "pending_bridge" | "creating_gift" | "completed" | "failed";

interface UseGiftStatusParams {
  claimId: string | null;
  enabled?: boolean;
  onComplete?: () => void;
}

interface UseGiftStatusReturn {
  status: GiftStatus;
  steps: RouteStep[];
  error: string | null;
}

const defaultSteps: RouteStep[] = [
  { id: "1", type: "swap", title: "Swap Submitted", description: "Transaction sent to network", status: "pending" },
  { id: "2", type: "bridge", title: "Cross-chain Bridge", description: "Transferring to HyperEVM", status: "pending" },
  { id: "3", type: "deposit", title: "Creating Gift", description: "Relayer creating gift on-chain", status: "pending" },
  { id: "4", type: "confirm", title: "Gift Ready", description: "Share the claim link!", status: "pending" },
];

export function useGiftStatus({
  claimId,
  enabled = true,
  onComplete,
}: UseGiftStatusParams): UseGiftStatusReturn {
  const [status, setStatus] = useState<GiftStatus>("pending_bridge");
  const [steps, setSteps] = useState<RouteStep[]>(defaultSteps);
  const [error, setError] = useState<string | null>(null);

  const updateSteps = useCallback((giftStatus: GiftStatus) => {
    let newSteps = [...defaultSteps];

    switch (giftStatus) {
      case "pending_bridge":
        // Swap done, waiting for bridge
        newSteps[0] = { ...newSteps[0], status: "completed" };
        newSteps[1] = { ...newSteps[1], status: "active", description: "Bridging USDC to HyperEVM..." };
        break;

      case "creating_gift":
        // Bridge done, creating gift
        newSteps[0] = { ...newSteps[0], status: "completed" };
        newSteps[1] = { ...newSteps[1], status: "completed" };
        newSteps[2] = { ...newSteps[2], status: "active", description: "Creating gift on-chain..." };
        break;

      case "completed":
        // All done!
        newSteps = newSteps.map((s) => ({ ...s, status: "completed" as const }));
        break;

      case "failed":
        // Find active step and mark failed
        const activeIndex = newSteps.findIndex((s) => s.status === "active");
        if (activeIndex >= 0) {
          newSteps[activeIndex] = { ...newSteps[activeIndex], status: "failed" };
        } else {
          newSteps[1] = { ...newSteps[1], status: "failed" }; // Default to bridge step
        }
        break;
    }

    setSteps(newSteps);
  }, []);

  useEffect(() => {
    if (!claimId || !enabled) return;

    let intervalId: NodeJS.Timeout;
    let isCancelled = false;

    const pollStatus = async () => {
      try {
        const response = await fetch(`${WORKER_URL}/api/gift/${claimId}`);
        const data = await response.json();

        if (isCancelled) return;

        if (!response.ok) {
          setError(data.error || "Failed to fetch gift status");
          return;
        }

        const newStatus = data.status as GiftStatus;
        setStatus(newStatus);
        updateSteps(newStatus);

        if (newStatus === "completed") {
          clearInterval(intervalId);
          onComplete?.();
        } else if (newStatus === "failed") {
          setError(data.error || "Gift creation failed");
          clearInterval(intervalId);
        }
      } catch (err) {
        console.error("Gift status poll error:", err);
        // Don't stop polling on transient errors
      }
    };

    // Start with swap completed state
    updateSteps("pending_bridge");
    setStatus("pending_bridge");

    // Poll immediately, then every 5 seconds
    pollStatus();
    intervalId = setInterval(pollStatus, 5000);

    return () => {
      isCancelled = true;
      clearInterval(intervalId);
    };
  }, [claimId, enabled, updateSteps, onComplete]);

  return { status, steps, error };
}
