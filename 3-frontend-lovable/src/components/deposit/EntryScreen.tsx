import { motion } from "framer-motion";
import { ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChainSelector } from "./ChainSelector";
import { TokenSelector } from "./TokenSelector";
import { AmountInput } from "./AmountInput";
import { Chain, Token } from "@/types/deposit";

interface EntryScreenProps {
  selectedChain: Chain | null;
  selectedToken: Token | null;
  amount: string;
  onChainSelect: (chain: Chain) => void;
  onTokenSelect: (token: Token) => void;
  onAmountChange: (amount: string) => void;
  onContinue: () => void;
}

export function EntryScreen({
  selectedChain,
  selectedToken,
  amount,
  onChainSelect,
  onTokenSelect,
  onAmountChange,
  onContinue,
}: EntryScreenProps) {
  const isValid = selectedChain && selectedToken && parseFloat(amount) > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="text-center space-y-2">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20"
        >
          <Zap className="h-4 w-4 text-primary" />
          <span className="text-sm text-primary font-medium">Powered by LI.FI</span>
        </motion.div>
        <h1 className="text-3xl font-bold">
          Deposit to <span className="gradient-text">Hyperliquid</span>
        </h1>
        <p className="text-muted-foreground">
          Swap and bridge any token. Start trading in one step.
        </p>
      </div>

      {/* Form */}
      <div className="glass-card p-6 space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">From Chain</label>
          <ChainSelector selected={selectedChain} onSelect={onChainSelect} />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Token</label>
          <TokenSelector selected={selectedToken} onSelect={onTokenSelect} />
        </div>

        <AmountInput
          value={amount}
          onChange={onAmountChange}
          token={selectedToken}
        />

        {/* Destination indicator */}
        <div className="flex items-center gap-3 p-4 rounded-xl bg-secondary/50 border border-border/50">
          <div className="flex-1">
            <div className="text-sm text-muted-foreground">You will receive</div>
            <div className="font-semibold">USDC on Hyperliquid</div>
          </div>
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-lg">💵</span>
          </div>
        </div>
      </div>

      {/* CTA */}
      <Button
        variant="glow"
        size="lg"
        className="w-full"
        disabled={!isValid}
        onClick={onContinue}
      >
        Preview Route
        <ArrowRight className="h-5 w-5" />
      </Button>
    </motion.div>
  );
}
