import { motion } from "framer-motion";
import { ArrowRight, ArrowDown, Wallet, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChainSelector } from "./ChainSelector";
import { TokenSelector } from "./TokenSelector";
import { AmountInput } from "./AmountInput";
import { Chain, Token } from "@/types/deposit";

interface EntryScreenProps {
  selectedSourceChain: Chain | null;
  selectedSourceToken: Token | null;
  amount: string;
  balance: string | null;
  error: string | null;
  isLoading?: boolean;
  onSourceChainSelect: (chain: Chain) => void;
  onSourceTokenSelect: (token: Token) => void;
  onAmountChange: (amount: string) => void;
  onContinue: () => void;
}

export function EntryScreen({
  selectedSourceChain,
  selectedSourceToken,
  amount,
  balance,
  error,
  isLoading = false,
  onSourceChainSelect,
  onSourceTokenSelect,
  onAmountChange,
  onContinue,
}: EntryScreenProps) {
  const isValid = selectedSourceChain && selectedSourceToken && parseFloat(amount) > 0 && selectedSourceChain.id !== "hyperevm";

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Send a <span className="gradient-text">Gift</span></h1>
        <p className="text-muted-foreground">Choose your token and amount</p>
      </div>

      <div className="glass-card p-6 space-y-4">
        {/* FROM */}
        <div className="space-y-2">
          <div className="flex justify-between items-end">
            <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">From</label>
            {balance && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary/50 px-2 py-1 rounded-md">
                <Wallet className="h-3 w-3 text-primary" />
                <span>Balance: <span className="text-foreground font-medium">{parseFloat(balance).toFixed(4)}</span></span>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <ChainSelector selected={selectedSourceChain} onSelect={onSourceChainSelect} />
            <TokenSelector selected={selectedSourceToken} onSelect={onSourceTokenSelect} />
          </div>
          <AmountInput value={amount} onChange={onAmountChange} token={selectedSourceToken} />
          {error && <p className="text-destructive text-xs font-medium animate-shake">{error}</p>}
        </div>

        <div className="flex justify-center -my-2 relative z-10">
          <div className="bg-background border border-border p-1.5 rounded-full shadow-lg">
            <ArrowDown className="h-4 w-4 text-primary" />
          </div>
        </div>

        {/* STATIC TO */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">To (HyperEVM)</label>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-3 h-14 w-full bg-secondary/30 border border-border/50 rounded-xl px-4 cursor-not-allowed">
              <Zap className="h-5 w-5 text-primary" />
              <span className="font-medium text-sm">HyperEVM</span>
            </div>
            <div className="flex items-center gap-3 h-14 w-full bg-secondary/30 border border-border/50 rounded-xl px-4 cursor-not-allowed">
              <span className="text-xl">💵</span>
              <span className="font-medium text-sm">USDC</span>
            </div>
          </div>
        </div>
      </div>

      <Button variant="glow" size="lg" className="w-full h-14 text-lg font-semibold" disabled={!isValid || isLoading} onClick={onContinue}>
        {isLoading ? "Loading..." : "Bridge"} {!isLoading && <ArrowRight className="h-5 w-5 ml-2" />}
      </Button>
    </motion.div>
  );
}