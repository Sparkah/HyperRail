import { motion } from "framer-motion";
import { Gift, Copy, Plus, CheckCircle2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface SuccessScreenProps {
  amount: string;
  claimSecret?: string | null;
  onOpenHyperliquid: () => void;
  onCreateAnother: () => void;
}

export function SuccessScreen({ amount, claimSecret, onOpenHyperliquid, onCreateAnother }: SuccessScreenProps) {
  const [copied, setCopied] = useState(false);

  const claimUrl = claimSecret
    ? `${window.location.origin}/claim/${claimSecret}`
    : null;

  const handleCopy = async () => {
    if (!claimUrl) return;
    await navigator.clipboard.writeText(claimUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="space-y-8"
    >
      {/* Success animation */}
      <div className="flex flex-col items-center text-center space-y-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.2, duration: 0.5 }}
          className="relative"
        >
          <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center">
            <Gift className="w-12 h-12 text-primary" />
          </div>
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="absolute -inset-4 rounded-full border-2 border-primary/30"
          />
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="absolute -inset-8 rounded-full border border-primary/20"
          />
        </motion.div>

        <div className="space-y-2">
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-bold"
          >
            Gift Created!
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-muted-foreground"
          >
            Share the link below to let them claim
          </motion.p>
        </div>

        {/* Amount card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card p-6 w-full max-w-sm glow-effect"
        >
          <div className="text-sm text-muted-foreground mb-1">Gift amount</div>
          <div className="text-4xl font-bold gradient-text">{amount} USDC</div>
          <div className="text-sm text-muted-foreground mt-1">on Hyperliquid</div>
        </motion.div>

        {/* Claim link */}
        {claimUrl && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="w-full max-w-sm"
          >
            <div className="text-sm text-muted-foreground mb-2">Claim link</div>
            <div className="flex gap-2">
              <div className="flex-1 glass-card px-4 py-3 rounded-lg font-mono text-sm truncate">
                {claimUrl}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopy}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="space-y-3"
      >
        <Button
          variant="glow"
          size="lg"
          className="w-full"
          onClick={handleCopy}
          disabled={!claimUrl}
        >
          {copied ? (
            <>
              <Check className="h-5 w-5" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-5 w-5" />
              Copy Claim Link
            </>
          )}
        </Button>

        <Button
          variant="outline"
          size="lg"
          className="w-full"
          onClick={onCreateAnother}
        >
          <Plus className="h-5 w-5" />
          Create Another Gift
        </Button>
      </motion.div>

      {/* Footer note */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="text-center text-sm text-muted-foreground"
      >
        The recipient can claim this gift to their Hyperliquid wallet
      </motion.p>
    </motion.div>
  );
}
