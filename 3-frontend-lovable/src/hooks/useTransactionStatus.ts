import { useState, useEffect, useCallback } from "react";
import { RouteStep } from "@/types/deposit";

const WORKER_URL = import.meta.env.DEV
  ? "http://localhost:8787"
  : "https://hyperrail-worker.timopro16.workers.dev";

type TransactionStatus = "pending" | "processing" | "done" | "failed";

interface StatusResponse {
  status: string;
  substatus?: string;
  substatusMessage?: string;
  tool?: string;
  sending?: { txHash: string };
  receiving?: { txHash: string };
}

interface UseTransactionStatusParams {
  txHash: string | null;
  fromChainId: number | undefined;
  toChainId: number | undefined;
  enabled?: boolean;
  onComplete?: () => void;
}

interface UseTransactionStatusReturn {
  status: TransactionStatus;
  steps: RouteStep[];
  error: string | null;
}

const defaultSteps: RouteStep[] = [
  { id: "1", type: "swap", title: "Swap Assets", description: "Preparing funds", status: "pending" },
  { id: "2", type: "bridge", title: "Cross-chain Bridge", description: "Transferring to destination", status: "pending" },
  { id: "3", type: "confirm", title: "Arrival Confirmation", description: "Verifying arrival", status: "pending" },
  { id: "4", type: "deposit", title: "Hyperliquid Deposit", description: "Finalizing", status: "pending" },
];

export function useTransactionStatus({
  txHash,
  fromChainId,
  toChainId,
  enabled = true,
  onComplete,
}: UseTransactionStatusParams): UseTransactionStatusReturn {
  const [status, setStatus] = useState<TransactionStatus>("pending");
  const [steps, setSteps] = useState<RouteStep[]>(defaultSteps);
  const [error, setError] = useState<string | null>(null);

  const updateSteps = useCallback((lifiStatus: string, substatus?: string) => {
    // Map LI.FI status to our step statuses
    // LI.FI statuses: NOT_FOUND, PENDING, DONE, FAILED
    // Substatuses: WAIT_SOURCE_CONFIRMATIONS, WAIT_DESTINATION_TRANSACTION, BRIDGE_NOT_AVAILABLE, etc.

    let newSteps = [...defaultSteps];

    if (lifiStatus === "PENDING") {
      if (substatus === "WAIT_SOURCE_CONFIRMATIONS") {
        // Swap submitted, waiting for source chain confirmations
        newSteps[0] = { ...newSteps[0], status: "active", description: "Confirming on source chain..." };
      } else if (substatus === "WAIT_DESTINATION_TRANSACTION") {
        // Bridge in progress
        newSteps[0] = { ...newSteps[0], status: "completed" };
        newSteps[1] = { ...newSteps[1], status: "active", description: "Bridging to HyperEVM..." };
      } else {
        // Generic pending
        newSteps[0] = { ...newSteps[0], status: "active" };
      }
    } else if (lifiStatus === "DONE") {
      // All done
      newSteps = newSteps.map((s) => ({ ...s, status: "completed" as const }));
    } else if (lifiStatus === "FAILED") {
      // Find the active step and mark it failed
      const activeIndex = newSteps.findIndex((s) => s.status === "active");
      if (activeIndex >= 0) {
        newSteps[activeIndex] = { ...newSteps[activeIndex], status: "failed" };
      } else {
        newSteps[0] = { ...newSteps[0], status: "failed" };
      }
    } else if (lifiStatus === "NOT_FOUND") {
      // Transaction just submitted, waiting for indexing
      newSteps[0] = { ...newSteps[0], status: "active", description: "Transaction submitted..." };
    }

    setSteps(newSteps);
  }, []);

  useEffect(() => {
    if (!txHash || !fromChainId || !enabled) return;

    let intervalId: NodeJS.Timeout;
    let isCancelled = false;

    const pollStatus = async () => {
      try {
        const response = await fetch(
          `${WORKER_URL}/api/status?txHash=${txHash}&fromChain=${fromChainId}&toChain=${toChainId || 999}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch status");
        }

        const data: StatusResponse = await response.json();

        if (isCancelled) return;

        updateSteps(data.status, data.substatus);

        if (data.status === "DONE") {
          setStatus("done");
          clearInterval(intervalId);
          onComplete?.();
        } else if (data.status === "FAILED") {
          setStatus("failed");
          setError(data.substatusMessage || "Transaction failed");
          clearInterval(intervalId);
        } else {
          setStatus("processing");
        }
      } catch (err) {
        console.error("Status poll error:", err);
        // Don't stop polling on transient errors
      }
    };

    // Start with initial status
    updateSteps("NOT_FOUND");
    setStatus("processing");

    // Poll immediately, then every 5 seconds
    pollStatus();
    intervalId = setInterval(pollStatus, 5000);

    return () => {
      isCancelled = true;
      clearInterval(intervalId);
    };
  }, [txHash, fromChainId, toChainId, enabled, updateSteps, onComplete]);

  return { status, steps, error };
}
