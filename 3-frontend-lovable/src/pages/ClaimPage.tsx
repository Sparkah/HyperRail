import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Gift, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ClaimMethodSelector,
  ExistingWalletClaim,
  GeneratedWalletClaim,
} from "@/components/claim";

const WORKER_URL = import.meta.env.DEV
  ? "http://localhost:8787"
  : "https://hyperrail-worker.timopro16.workers.dev";

type ClaimMethod = "existing" | "create" | null;
type ClaimFlowStatus =
  | "loading"
  | "pending"
  | "select_method"
  | "wallet_setup"
  | "claiming"
  | "success"
  | "error"
  | "not_found"
  | "already_claimed";

interface GiftInfo {
  amount: string;
  senderAddress: string;
  status: string;
}

export default function ClaimPage() {
  const { claimId } = useParams<{ claimId: string }>();
  const [flowStatus, setFlowStatus] = useState<ClaimFlowStatus>("loading");
  const [giftInfo, setGiftInfo] = useState<GiftInfo | null>(null);
  const [claimMethod, setClaimMethod] = useState<ClaimMethod>(null);
  const [error, setError] = useState<string | null>(null);
  const [claimTxHash, setClaimTxHash] = useState<string | null>(null);
  const [secret, setSecret] = useState<string>("");

  // Get secret from hash fragment on mount
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    setSecret(hash);
  }, []);

  // Fetch gift info when claimId and secret are available
  useEffect(() => {
    if (!claimId || !secret) {
      if (claimId && !secret) {
        return;
      }
      setFlowStatus("not_found");
      return;
    }
    fetchGiftInfo();
  }, [claimId, secret]);

  // Auto-poll when pending
  useEffect(() => {
    if (flowStatus !== "pending") return;

    const interval = setInterval(fetchGiftInfo, 5000);
    return () => clearInterval(interval);
  }, [flowStatus]);

  const fetchGiftInfo = async () => {
    try {
      if (!claimId || !/^0x[0-9a-fA-F]{64}$/.test(claimId)) {
        setFlowStatus("not_found");
        return;
      }

      if (!secret || !/^0x[0-9a-fA-F]{64}$/.test(secret)) {
        setFlowStatus("not_found");
        return;
      }

      const response = await fetch(`${WORKER_URL}/api/gift/${claimId}`);
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          setFlowStatus("not_found");
        } else {
          setError(data.error || "Failed to fetch gift");
          setFlowStatus("error");
        }
        return;
      }

      setGiftInfo({
        amount: data.amount,
        senderAddress: data.senderAddress,
        status: data.status,
      });

      if (data.status === "completed") {
        setFlowStatus("select_method");
      } else if (data.status === "claimed") {
        setFlowStatus("already_claimed");
      } else if (data.status === "pending_bridge" || data.status === "creating_gift") {
        setFlowStatus("pending");
      } else if (data.status === "failed") {
        setError("This gift failed to process. Please contact the sender.");
        setFlowStatus("error");
      } else {
        setFlowStatus("select_method");
      }
    } catch (err) {
      console.error("Failed to fetch gift:", err);
      setError("Failed to load gift information");
      setFlowStatus("error");
    }
  };

  const handleMethodSelect = (method: ClaimMethod) => {
    setClaimMethod(method);
    setFlowStatus("wallet_setup");
  };

  const handleAddressReady = useCallback(async (address: string) => {
    setFlowStatus("claiming");
    setError(null);

    try {
      const response = await fetch(`${WORKER_URL}/api/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimSecret: secret,
          walletAddress: address,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Claim failed");
        setFlowStatus("wallet_setup");
        return;
      }

      setClaimTxHash(data.txHash);
      setFlowStatus("success");
    } catch (err) {
      console.error("Claim failed:", err);
      setError("Failed to submit claim. Please try again.");
      setFlowStatus("wallet_setup");
    }
  }, [secret]);

  const handleBack = () => {
    setClaimMethod(null);
    setFlowStatus("select_method");
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8 space-y-6"
        >
          {/* Loading state */}
          {flowStatus === "loading" && (
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading gift...</p>
            </div>
          )}

          {/* Not found */}
          {flowStatus === "not_found" && (
            <div className="flex flex-col items-center space-y-4 text-center">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <h2 className="text-2xl font-bold">Gift Not Found</h2>
              <p className="text-muted-foreground">
                This gift link is invalid or has expired.
              </p>
            </div>
          )}

          {/* Already claimed */}
          {flowStatus === "already_claimed" && (
            <div className="flex flex-col items-center space-y-4 text-center">
              <CheckCircle2 className="h-12 w-12 text-primary" />
              <h2 className="text-2xl font-bold">Already Claimed</h2>
              <p className="text-muted-foreground">
                This gift has already been claimed.
              </p>
            </div>
          )}

          {/* Pending - gift being prepared */}
          {flowStatus === "pending" && giftInfo && (
            <div className="flex flex-col items-center space-y-6 text-center">
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
                <Gift className="w-10 h-10 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Gift incoming!</h2>
                <p className="text-muted-foreground mt-1">
                  {giftInfo.amount} USDC is being prepared
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Preparing your gift...
              </div>
              <p className="text-xs text-muted-foreground">
                This page will update automatically
              </p>
            </div>
          )}

          {/* Error state */}
          {flowStatus === "error" && (
            <div className="flex flex-col items-center space-y-4 text-center">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <h2 className="text-2xl font-bold">Something went wrong</h2>
              <p className="text-muted-foreground">{error}</p>
              <Button variant="outline" onClick={fetchGiftInfo}>
                Try Again
              </Button>
            </div>
          )}

          {/* Ready - Select claim method */}
          {flowStatus === "select_method" && giftInfo && (
            <>
              {/* Header */}
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
                  <Gift className="w-10 h-10 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">You've received a gift!</h2>
                  <p className="text-muted-foreground mt-1">
                    Someone sent you USDC on Hyperliquid
                  </p>
                </div>
              </div>

              {/* Amount */}
              <div className="text-center p-6 bg-secondary/30 rounded-xl">
                <div className="text-sm text-muted-foreground mb-1">Gift amount</div>
                <div className="text-4xl font-bold gradient-text">{giftInfo.amount} USDC</div>
              </div>

              {/* Method selector */}
              <ClaimMethodSelector onSelect={handleMethodSelect} />
            </>
          )}

          {/* Wallet setup - existing wallet */}
          {flowStatus === "wallet_setup" && claimMethod === "existing" && giftInfo && (
            <>
              {/* Amount reminder */}
              <div className="text-center p-4 bg-secondary/30 rounded-xl">
                <div className="text-sm text-muted-foreground mb-1">Claiming</div>
                <div className="text-2xl font-bold gradient-text">{giftInfo.amount} USDC</div>
              </div>

              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                  {error}
                </div>
              )}

              <ExistingWalletClaim onBack={handleBack} onAddressReady={handleAddressReady} />
            </>
          )}

          {/* Wallet setup - create new wallet */}
          {flowStatus === "wallet_setup" && claimMethod === "create" && giftInfo && (
            <>
              {/* Amount reminder */}
              <div className="text-center p-4 bg-secondary/30 rounded-xl">
                <div className="text-sm text-muted-foreground mb-1">Claiming</div>
                <div className="text-2xl font-bold gradient-text">{giftInfo.amount} USDC</div>
              </div>

              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                  {error}
                </div>
              )}

              <GeneratedWalletClaim onBack={handleBack} onAddressReady={handleAddressReady} />
            </>
          )}

          {/* Claiming in progress */}
          {flowStatus === "claiming" && (
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <div className="text-center">
                <h3 className="text-lg font-medium">Claiming your gift...</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Please wait while we process your claim
                </p>
              </div>
            </div>
          )}

          {/* Success state */}
          {flowStatus === "success" && (
            <div className="flex flex-col items-center space-y-6 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", duration: 0.5 }}
              >
                <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-primary" />
                </div>
              </motion.div>

              <div>
                <h2 className="text-2xl font-bold">Welcome to the free markets</h2>
                <p className="text-muted-foreground mt-1">
                  {giftInfo?.amount} USDC is now in your Hyperliquid account
                </p>
              </div>

              {claimTxHash && (
                <a
                  href={`https://purrsec.com/tx/${claimTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  View transaction
                </a>
              )}

              <div className="w-full space-y-2">
                <p className="text-sm text-muted-foreground text-center">What would you like to do?</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    className="p-4 rounded-xl border border-border bg-secondary/20 hover:bg-secondary/40 transition-colors text-left"
                    onClick={() => window.open("https://app.hyperliquid.xyz", "_blank")}
                  >
                    <div className="font-medium mb-1">Hyperliquid</div>
                    <div className="text-xs text-muted-foreground">You decide what to buy and sell</div>
                  </button>
                  <button
                    className="p-4 rounded-xl border border-border bg-secondary/20 hover:bg-secondary/40 transition-colors text-left"
                    onClick={() => window.open("https://trysuper.co", "_blank")}
                  >
                    <div className="font-medium mb-1">Super</div>
                    <div className="text-xs text-muted-foreground">Experts trade for you automatically</div>
                  </button>
                  <button
                    className="p-4 rounded-xl border border-border bg-secondary/20 hover:bg-secondary/40 transition-colors text-left"
                    onClick={() => window.open("https://app.valantis.xyz", "_blank")}
                  >
                    <div className="font-medium mb-1">Valantis</div>
                    <div className="text-xs text-muted-foreground">Your money grows while you wait</div>
                  </button>
                  <button
                    className="p-4 rounded-xl border border-border bg-secondary/20 hover:bg-secondary/40 transition-colors text-left"
                    onClick={() => window.open("https://pear.garden", "_blank")}
                  >
                    <div className="font-medium mb-1">Pear Protocol</div>
                    <div className="text-xs text-muted-foreground">Focus on asset relationships, not market trends</div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          Powered by HyperRail
        </p>
      </div>
    </div>
  );
}
