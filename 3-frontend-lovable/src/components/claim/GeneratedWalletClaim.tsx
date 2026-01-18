import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Eye, EyeOff, Copy, Check, AlertTriangle, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Wallet } from "ethers";

interface GeneratedWalletClaimProps {
  onBack: () => void;
  onAddressReady: (address: string) => void;
}

export function GeneratedWalletClaim({ onBack, onAddressReady }: GeneratedWalletClaimProps) {
  const [showSeedPhrase, setShowSeedPhrase] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  // Generate wallet once on mount
  const wallet = useMemo(() => Wallet.createRandom(), []);
  const seedPhrase = wallet.mnemonic?.phrase || "";
  const address = wallet.address;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(seedPhrase);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleContinue = () => {
    if (confirmed) {
      onAddressReady(address);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-4"
    >
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="text-center mb-4">
        <h3 className="text-lg font-medium">Your Wallet</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Save your recovery phrase to access your funds
        </p>
      </div>

      {/* Warning banner */}
      <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-yellow-500">Important!</p>
          <p className="text-muted-foreground">
            Write down your recovery phrase and keep it safe. You'll need it to access your wallet on Hyperliquid.
          </p>
        </div>
      </div>

      {/* Wallet address */}
      <div className="p-3 bg-secondary/30 rounded-lg">
        <div className="text-xs text-muted-foreground mb-1">Your wallet address</div>
        <div className="font-mono text-sm break-all">{address}</div>
      </div>

      {/* Seed phrase section */}
      <div className="p-4 bg-secondary/30 rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            Recovery Phrase
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-8 px-2"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              <span className="ml-1 text-xs">{copied ? "Copied!" : "Copy"}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSeedPhrase(!showSeedPhrase)}
              className="h-8 px-2"
            >
              {showSeedPhrase ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
              <span className="ml-1 text-xs">{showSeedPhrase ? "Hide" : "Reveal"}</span>
            </Button>
          </div>
        </div>

        {showSeedPhrase ? (
          <div className="p-3 bg-background/50 rounded-lg border border-primary/20">
            <div className="grid grid-cols-3 gap-2">
              {seedPhrase.split(" ").map((word, i) => (
                <div key={i} className="flex items-center gap-1.5 text-sm">
                  <span className="text-muted-foreground text-xs w-4">{i + 1}.</span>
                  <span className="font-mono">{word}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div
            className="p-3 bg-background/50 rounded-lg border border-dashed border-muted-foreground/30 cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => setShowSeedPhrase(true)}
          >
            <div className="text-center text-sm text-muted-foreground py-4">
              Click "Reveal" to show your 12-word recovery phrase
            </div>
          </div>
        )}
      </div>

      {/* Confirmation checkbox */}
      <div className="flex items-start gap-3 p-3 bg-secondary/20 rounded-lg">
        <Checkbox
          id="confirm-saved"
          checked={confirmed}
          onCheckedChange={(checked) => setConfirmed(checked === true)}
          className="mt-0.5"
        />
        <label
          htmlFor="confirm-saved"
          className="text-sm cursor-pointer leading-relaxed"
        >
          I have saved my recovery phrase in a safe place. I understand that if I lose it, I will lose access to my funds.
        </label>
      </div>

      {/* Continue button */}
      <Button
        variant="glow"
        size="lg"
        className="w-full"
        onClick={handleContinue}
        disabled={!confirmed}
      >
        Continue & Claim
      </Button>

      {/* Info section */}
      <div className="p-4 bg-secondary/20 rounded-xl">
        <h4 className="text-sm font-medium mb-2">How to access your wallet</h4>
        <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
          <li>Install <a href="https://support.rabby.io/hc/en-us/articles/11477459275279-How-to-migrate-from-other-wallets-to-Rabby-Wallet" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Rabby</a> or another wallet app</li>
          <li>Import wallet using your recovery phrase</li>
          <li>Go to <span className="text-primary">app.hyperliquid.xyz</span></li>
          <li>Connect with your imported wallet</li>
        </ol>
      </div>
    </motion.div>
  );
}
