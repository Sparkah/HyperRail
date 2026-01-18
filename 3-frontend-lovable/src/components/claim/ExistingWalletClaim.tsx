import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ExistingWalletClaimProps {
  onBack: () => void;
  onAddressReady: (address: string) => void;
}

export function ExistingWalletClaim({ onBack, onAddressReady }: ExistingWalletClaimProps) {
  const [address, setAddress] = useState("");

  const isValidAddress = /^0x[0-9a-fA-F]{40}$/.test(address);

  const handleSubmit = () => {
    if (isValidAddress) {
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

      <div className="space-y-2">
        <label className="text-sm font-medium">
          Your Hyperliquid wallet address
        </label>
        <Input
          placeholder="0x..."
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="font-mono"
        />
        <p className="text-xs text-muted-foreground">
          Enter the address where you want to receive the USDC
        </p>
      </div>

      <Button
        variant="glow"
        size="lg"
        className="w-full"
        onClick={handleSubmit}
        disabled={!isValidAddress}
      >
        Claim USDC
      </Button>
    </motion.div>
  );
}
