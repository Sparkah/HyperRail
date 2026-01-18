import { useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Mail, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePrivy, useWallets } from "@privy-io/react-auth";

interface PrivyWalletClaimProps {
  onBack: () => void;
  onAddressReady: (address: string) => void;
}

export function PrivyWalletClaim({ onBack, onAddressReady }: PrivyWalletClaimProps) {
  const { login, ready, authenticated } = usePrivy();
  const { wallets } = useWallets();

  // Find embedded wallet
  const embeddedWallet = wallets.find((w) => w.walletClientType === "privy");
  const walletAddress = embeddedWallet?.address;

  // Auto-proceed when wallet is ready
  useEffect(() => {
    if (authenticated && walletAddress) {
      onAddressReady(walletAddress);
    }
  }, [authenticated, walletAddress, onAddressReady]);

  const handleLogin = () => {
    login();
  };

  if (!ready) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground mt-2">Loading...</p>
      </div>
    );
  }

  if (authenticated && !walletAddress) {
    // User is logged in but wallet not yet created/loaded
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground mt-2">Creating your wallet...</p>
      </div>
    );
  }

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
        <h3 className="text-lg font-medium">Create a wallet</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Sign up to create your Hyperliquid wallet instantly
        </p>
      </div>

      <div className="space-y-3">
        <Button
          variant="glow"
          size="lg"
          className="w-full"
          onClick={handleLogin}
        >
          <Mail className="w-5 h-5 mr-2" />
          Continue with Email
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          You can also sign up with Google or Apple
        </p>
      </div>

      <div className="mt-6 p-4 bg-secondary/20 rounded-xl">
        <h4 className="text-sm font-medium mb-2">What happens next?</h4>
        <ul className="text-xs text-muted-foreground space-y-1.5">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-primary flex-shrink-0" />
            <span>A secure wallet is created for you</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-primary flex-shrink-0" />
            <span>Your USDC is claimed to your new wallet</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-primary flex-shrink-0" />
            <span>Funds are bridged to Hyperliquid</span>
          </li>
        </ul>
      </div>
    </motion.div>
  );
}
