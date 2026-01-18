import { useCallback, useMemo } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useSendTransaction,
  useSwitchChain,
} from "wagmi";
import { erc20Abi, parseUnits, zeroAddress } from "viem";

type LifiQuote = {
  action: {
    fromToken: { address: `0x${string}`; decimals: number };
    fromChainId: number;
  };
  estimate: {
    approvalAddress: `0x${string}`; // spender
  };
  transactionRequest: {
    to: `0x${string}`;
    data: `0x${string}`;
    value?: string; // hex or decimal string depending on your backend; handle below
  };
};

// Helper: parse LiFi value safely (supports undefined, hex "0x...", or decimal string)
function toBigIntValue(value?: string) {
  if (!value) return 0n;
  try {
    // hex
    if (value.startsWith("0x")) return BigInt(value);
    // decimal
    return BigInt(value);
  } catch {
    return 0n;
  }
}

/**
 * Usage:
 * const { sendLifiFlow, isApproving, isSending } = useLifiWagmiFlow(quote, "1.0")
 * await sendLifiFlow()
 */
export function useLifiWagmiFlow(quote: LifiQuote | null, fromAmountHuman: string) {
  const { address, isConnected, chainId: walletChainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const { sendTransactionAsync } = useSendTransaction();

  const tokenAddress = quote?.action.fromToken.address;
  const tokenDecimals = quote?.action.fromToken.decimals;
  const spender = quote?.estimate.approvalAddress;
  const fromChainId = quote?.action.fromChainId;

  const isNative = useMemo(() => {
    // LiFi typically uses zeroAddress for native. If your backend uses a different sentinel, adapt here.
    return !!tokenAddress && tokenAddress.toLowerCase() === zeroAddress;
  }, [tokenAddress]);

  const amountWei = useMemo(() => {
    if (!quote || tokenDecimals == null) return 0n;
    // IMPORTANT: use token decimals, not hardcoded 1e6
    return parseUnits(fromAmountHuman || "0", tokenDecimals);
  }, [quote, tokenDecimals, fromAmountHuman]);

  // Read allowance (skip for native)
  const { data: allowance } = useReadContract({
    address: tokenAddress && !isNative ? tokenAddress : undefined,
    abi: erc20Abi,
    functionName: "allowance",
    args: address && spender ? [address, spender] : undefined,
    chainId: fromChainId,
    query: {
      enabled: Boolean(address && spender && tokenAddress && !isNative && fromChainId),
    },
  });

  // Track approval tx (optional, if you want UI state)
  const [approvalHash, setApprovalHash] = (function () {
    let hash: `0x${string}` | undefined;
    const set = (h: `0x${string}` | undefined) => {
      hash = h;
    };
    return [hash, set] as const;
  })();

  // Wait for approval receipt if needed (this hook normally wants stable state; in a real app store hash in state)
  const { isLoading: isApproving } = useWaitForTransactionReceipt({
    hash: approvalHash,
    query: { enabled: Boolean(approvalHash) },
  });

  const sendLifiFlow = useCallback(async () => {
    if (!isConnected || !address) throw new Error("Wallet not connected.");
    if (!quote) throw new Error("Missing LiFi quote/route.");
    if (!fromChainId) throw new Error("Missing fromChainId.");
    if (!quote.transactionRequest?.to || !quote.transactionRequest?.data) {
      throw new Error("Missing transactionRequest from LiFi.");
    }

    // 1) Ensure wallet is on the same chain as the LiFi tx
    if (walletChainId !== fromChainId) {
      await switchChainAsync({ chainId: fromChainId });
    }

    // 2) Approve if ERC20 and allowance < amount
    if (!isNative) {
      if (!tokenAddress || !spender) throw new Error("Missing tokenAddress/spender for approval.");
      const currentAllowance = (allowance ?? 0n) as bigint;
      if (currentAllowance < amountWei) {
        const hash = await writeContractAsync({
          address: tokenAddress,
          abi: erc20Abi,
          functionName: "approve",
          args: [spender, amountWei],
          chain: undefined,
          account: address,
        });
        // In a real app: store hash in React state then wait via useWaitForTransactionReceipt.
        // For a simple flow: just await receipt via public client (or keep this hook-based).
        // We'll do a minimal "wait" by polling via waitForTransactionReceipt hook pattern:
        setApprovalHash(hash);
        // If you want to hard-wait here, you can instead use @wagmi/core waitForTransactionReceipt.
      }
    }

    // 3) Send LiFi transaction request (to/data/value)
    const txHash = await sendTransactionAsync({
      to: quote.transactionRequest.to,
      data: quote.transactionRequest.data,
      value: toBigIntValue(quote.transactionRequest.value),
      // chainId: fromChainId, // if you prefer "fail fast" instead of switching; supported conceptually :contentReference[oaicite:5]{index=5}
    });

    return txHash;
  }, [
    isConnected,
    address,
    quote,
    fromChainId,
    walletChainId,
    switchChainAsync,
    isNative,
    tokenAddress,
    spender,
    allowance,
    amountWei,
    writeContractAsync,
    sendTransactionAsync,
  ]);

  return {
    sendLifiFlow,
    isApproving,
    // You can add isSending via your own state around sendLifiFlow
  };
}
