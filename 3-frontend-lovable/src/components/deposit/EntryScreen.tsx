import { motion } from "framer-motion";
import { ArrowRight, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChainSelector } from "./ChainSelector";
import { TokenSelector } from "./TokenSelector";
import { AmountInput } from "./AmountInput";
import { Chain, Token } from "@/types/deposit";

interface EntryScreenProps {
  selectedSourceChain: Chain | null;
  selectedSourceToken: Token | null;
  selectedDestChain: Chain | null;
  selectedDestToken: Token | null;
  amount: string;
  onSourceChainSelect: (chain: Chain) => void;
  onSourceTokenSelect: (token: Token) => void;
  onDestChainSelect: (chain: Chain) => void;
  onDestTokenSelect: (token: Token) => void;
  onAmountChange: (amount: string) => void;
  onContinue: () => void;
}

export function EntryScreen({
  selectedSourceChain,
  selectedSourceToken,
  selectedDestChain,
  selectedDestToken,
  amount,
  onSourceChainSelect,
  onSourceTokenSelect,
  onDestChainSelect,
  onDestTokenSelect,
  onAmountChange,
  onContinue,
}: EntryScreenProps) {
  // Prevent same-chain transfers
  const isSameChain = selectedSourceChain?.id === selectedDestChain?.id && selectedSourceChain !== null;
  const isValid = selectedSourceChain && selectedSourceToken && selectedDestChain && selectedDestToken && parseFloat(amount) > 0 && !isSameChain;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Bridge to <span className="gradient-text">HyperRail</span></h1>
        <p className="text-muted-foreground">Select your route and amount.</p>
      </div>

      <div className="glass-card p-6 space-y-4">
        {/* From Section */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase text-muted-foreground">From</label>
          <div className="grid grid-cols-2 gap-2">
            <ChainSelector selected={selectedSourceChain} onSelect={onSourceChainSelect} />
            <TokenSelector selected={selectedSourceToken} onSelect={onSourceTokenSelect} />
          </div>
          <AmountInput value={amount} onChange={onAmountChange} token={selectedSourceToken} />
        </div>

        <div className="flex justify-center -my-2 relative z-10">
          <div className="bg-background border border-border p-1.5 rounded-full">
            <ArrowDown className="h-4 w-4 text-primary" />
          </div>
        </div>

        {/* To Section */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase text-muted-foreground">To</label>
          <div className="grid grid-cols-2 gap-2">
            <ChainSelector selected={selectedDestChain} onSelect={onDestChainSelect} />
            <TokenSelector selected={selectedDestToken} onSelect={onDestTokenSelect} />
          </div>
        </div>

        {isSameChain && (
          <p className="text-destructive text-xs text-center font-medium">Source and destination chains must be different.</p>
        )}
      </div>

      <Button
        variant="glow"
        size="lg"
        className="w-full"
        disabled={!isValid}
        onClick={onContinue}
      >
        Preview Route
        <ArrowRight className="h-5 w-5 ml-2\" />
      </Button>
    </motion.div>
  );
}