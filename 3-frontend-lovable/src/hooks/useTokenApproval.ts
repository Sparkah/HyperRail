import { useState, useCallback } from "react";
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { erc20Abi, maxUint256 } from "viem";

export type ApprovalState = "idle" | "checking" | "needs-approval" | "approving" | "approved" | "error";

interface UseTokenApprovalParams {
  tokenAddress: `0x${string}` | undefined;
  spenderAddress: `0x${string}` | undefined;
  amount: bigint;
  userAddress: `0x${string}` | undefined;
  chainId: number | undefined;
  enabled?: boolean;
}

interface UseTokenApprovalReturn {
  state: ApprovalState;
  error: string | null;
  currentAllowance: bigint | undefined;
  needsApproval: boolean;
  approve: () => Promise<boolean>;
  reset: () => void;
}

// Native ETH address (doesn't need approval)
const NATIVE_ETH = "0x0000000000000000000000000000000000000000";

export function useTokenApproval({
  tokenAddress,
  spenderAddress,
  amount,
  userAddress,
  chainId,
  enabled = true,
}: UseTokenApprovalParams): UseTokenApprovalReturn {
  const [state, setState] = useState<ApprovalState>("idle");
  const [error, setError] = useState<string | null>(null);

  // Check if this is native ETH (no approval needed)
  const isNativeToken = tokenAddress?.toLowerCase() === NATIVE_ETH.toLowerCase();

  // Read current allowance
  const {
    data: currentAllowance,
    refetch: refetchAllowance,
    isLoading: isCheckingAllowance,
  } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "allowance",
    args: userAddress && spenderAddress ? [userAddress, spenderAddress] : undefined,
    chainId,
    query: {
      enabled: enabled && !!tokenAddress && !!spenderAddress && !!userAddress && !isNativeToken,
    },
  });

  // Write contract for approval
  const {
    data: approveTxHash,
    writeContractAsync,
    isPending: isWritePending,
    reset: resetWrite,
  } = useWriteContract();

  // Wait for approval transaction
  const { isLoading: isWaitingForTx, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: approveTxHash,
  });

  // Calculate if approval is needed
  const needsApproval = !isNativeToken && (currentAllowance === undefined || currentAllowance < amount);

  // Derive state from hook states
  const derivedState = (): ApprovalState => {
    if (isNativeToken) return "approved";
    if (isCheckingAllowance) return "checking";
    if (isWritePending || isWaitingForTx) return "approving";
    if (isTxSuccess || (currentAllowance !== undefined && currentAllowance >= amount)) return "approved";
    if (error) return "error";
    if (needsApproval) return "needs-approval";
    return "idle";
  };

  // Approve function
  const approve = useCallback(async (): Promise<boolean> => {
    if (!tokenAddress || !spenderAddress || !userAddress) {
      setError("Missing required addresses");
      return false;
    }

    if (isNativeToken) {
      return true; // No approval needed for native ETH
    }

    if (!needsApproval) {
      return true; // Already approved
    }

    try {
      setError(null);
      setState("approving");

      await writeContractAsync({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "approve",
        args: [spenderAddress, maxUint256], // Infinite approval - one time per token
        chainId,
      });

      // Refetch allowance after approval
      await refetchAllowance();
      setState("approved");
      return true;
    } catch (err: any) {
      console.error("Approval failed:", err);
      setError(err.shortMessage || err.message || "Approval failed");
      setState("error");
      return false;
    }
  }, [
    tokenAddress,
    spenderAddress,
    userAddress,
    amount,
    chainId,
    isNativeToken,
    needsApproval,
    writeContractAsync,
    refetchAllowance,
  ]);

  // Reset function
  const reset = useCallback(() => {
    setState("idle");
    setError(null);
    resetWrite();
  }, [resetWrite]);

  return {
    state: derivedState(),
    error,
    currentAllowance,
    needsApproval,
    approve,
    reset,
  };
}
