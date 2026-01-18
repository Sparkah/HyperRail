import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Gift, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const WORKER_URL = import.meta.env.DEV
  ? "http://localhost:8787"
  : "https://hyperrail-worker.timopro16.workers.dev";

type ClaimStatus = "loading" | "pending" | "ready" | "claiming" | "success" | "error" | "not_found" | "already_claimed";

interface GiftInfo {
  amount: string;
  senderAddress: string;
  status: string;
}

export default function ClaimPage() {
  const { claimId } = useParams<{ claimId: string }>();
  const [claimStatus, setClaimStatus] = useState<ClaimStatus>("loading");
  const [giftInfo, setGiftInfo] = useState<GiftInfo | null>(null);
  const [recipientAddress, setRecipientAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [secret, setSecret] = useState<string>("");

  // Get secret from hash fragment on mount (not sent to server)
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    setSecret(hash);
  }, []);

  // Fetch gift info when claimId and secret are available
  useEffect(() => {
    if (!claimId || !secret) {
      if (claimId && !secret) {
        // Wait a tick for hash to be read
        return;
      }
      setClaimStatus("not_found");
      return;
    }
    fetchGiftInfo();
  }, [claimId, secret]);

  // Auto-poll when pending
  useEffect(() => {
    if (claimStatus !== "pending") return;

    const interval = setInterval(fetchGiftInfo, 5000);
    return () => clearInterval(interval);
  }, [claimStatus]);

  const fetchGiftInfo = async () => {
    try {
      // Validate claimId format (should be 0x + 64 hex chars)
      if (!claimId || !/^0x[0-9a-fA-F]{64}$/.test(claimId)) {
        setClaimStatus("not_found");
        return;
      }

      // Validate secret format
      if (!secret || !/^0x[0-9a-fA-F]{64}$/.test(secret)) {
        setClaimStatus("not_found");
        return;
      }

      const response = await fetch(`${WORKER_URL}/api/gift/${claimId}`);
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          setClaimStatus("not_found");
        } else {
          setError(data.error || "Failed to fetch gift");
          setClaimStatus("error");
        }
        return;
      }

      // Store gift info regardless of status
      setGiftInfo({
        amount: data.amount,
        senderAddress: data.senderAddress,
        status: data.status,
      });

      // Handle different statuses
      if (data.status === "completed") {
        setClaimStatus("ready");
      } else if (data.status === "claimed") {
        setClaimStatus("already_claimed");
      } else if (data.status === "pending_bridge" || data.status === "creating_gift") {
        setClaimStatus("pending");
      } else if (data.status === "failed") {
        setError("This gift failed to process. Please contact the sender.");
        setClaimStatus("error");
      } else {
        setClaimStatus("ready"); // Default to ready for unknown statuses
      }
    } catch (err) {
      console.error("Failed to fetch gift:", err);
      setError("Failed to load gift information");
      setClaimStatus("error");
    }
  };

  const handleClaim = async () => {
    if (!secret || !recipientAddress) return;

    // Validate address format
    if (!/^0x[0-9a-fA-F]{40}$/.test(recipientAddress)) {
      setError("Invalid address format. Please enter a valid HyperEVM address.");
      return;
    }

    setClaimStatus("claiming");
    setError(null);

    try {
      const response = await fetch(`${WORKER_URL}/api/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimSecret: secret,
          walletAddress: recipientAddress,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Claim failed");
        setClaimStatus("ready");
        return;
      }

      setTxHash(data.txHash);
      setClaimStatus("success");
    } catch (err) {
      console.error("Claim failed:", err);
      setError("Failed to submit claim. Please try again.");
      setClaimStatus("ready");
    }
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
          {claimStatus === "loading" && (
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading gift...</p>
            </div>
          )}

          {/* Not found */}
          {claimStatus === "not_found" && (
            <div className="flex flex-col items-center space-y-4 text-center">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <h2 className="text-2xl font-bold">Gift Not Found</h2>
              <p className="text-muted-foreground">
                This gift link is invalid or has expired.
              </p>
            </div>
          )}

          {/* Already claimed */}
          {claimStatus === "already_claimed" && (
            <div className="flex flex-col items-center space-y-4 text-center">
              <CheckCircle2 className="h-12 w-12 text-primary" />
              <h2 className="text-2xl font-bold">Already Claimed</h2>
              <p className="text-muted-foreground">
                This gift has already been claimed.
              </p>
            </div>
          )}

          {/* Pending - gift being prepared */}
          {claimStatus === "pending" && giftInfo && (
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
                Waiting for bridge to complete...
              </div>
              <p className="text-xs text-muted-foreground">
                This page will update automatically
              </p>
            </div>
          )}

          {/* Error state */}
          {claimStatus === "error" && (
            <div className="flex flex-col items-center space-y-4 text-center">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <h2 className="text-2xl font-bold">Something went wrong</h2>
              <p className="text-muted-foreground">{error}</p>
              <Button variant="outline" onClick={fetchGiftInfo}>
                Try Again
              </Button>
            </div>
          )}

          {/* Ready to claim */}
          {(claimStatus === "ready" || claimStatus === "claiming") && giftInfo && (
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

              {/* Recipient input */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Your HyperEVM wallet address
                </label>
                <Input
                  placeholder="0x..."
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  className="font-mono"
                  disabled={claimStatus === "claiming"}
                />
                <p className="text-xs text-muted-foreground">
                  Enter the address where you want to receive the USDC
                </p>
              </div>

              {/* Error message */}
              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                  {error}
                </div>
              )}

              {/* Claim button */}
              <Button
                variant="glow"
                size="lg"
                className="w-full"
                onClick={handleClaim}
                disabled={!recipientAddress || claimStatus === "claiming"}
              >
                {claimStatus === "claiming" ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Claiming...
                  </>
                ) : (
                  "Claim USDC"
                )}
              </Button>
            </>
          )}

          {/* Success state */}
          {claimStatus === "success" && (
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
                <h2 className="text-2xl font-bold">Claimed!</h2>
                <p className="text-muted-foreground mt-1">
                  {giftInfo?.amount} USDC has been sent to your wallet
                </p>
              </div>

              {txHash && (
                <a
                  href={`https://purrsec.com/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  View transaction
                </a>
              )}

              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={() => window.open("https://app.hyperliquid.xyz", "_blank")}
              >
                Open Hyperliquid
              </Button>
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
