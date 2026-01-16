import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, ChevronDown, ChevronUp, Clock, Zap, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface OnboardingEntryProps {
  amount: string;
  onAmountChange: (amount: string) => void;
  onContinue: () => void;
}

export function OnboardingEntry({
  amount,
  onAmountChange,
  onContinue,
}: OnboardingEntryProps) {
  const [showFees, setShowFees] = useState(false);
  
  const numericAmount = parseFloat(amount.replace(/,/g, '')) || 0;
  const isValid = numericAmount > 0;
  
  // Auto-calculated values
  const gasFee = numericAmount > 0 ? 2.50 : 0;
  const bridgeFee = numericAmount > 0 ? Math.max(0.50, numericAmount * 0.001) : 0;
  const totalFees = gasFee + bridgeFee;
  const receiveAmount = Math.max(0, numericAmount - totalFees);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9.]/g, '');
    onAmountChange(value);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="text-center space-y-3">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-3xl font-bold"
        >
          Fund Your <span className="gradient-text">Trading Account</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-muted-foreground"
        >
          Deposit any amount. Start trading in minutes.
        </motion.p>
      </div>

      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.15 }}
        className="glass-card p-6 space-y-6"
      >
        {/* You Deposit */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-muted-foreground">You deposit</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-semibold text-muted-foreground">$</span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={handleInputChange}
              className="w-full bg-secondary/50 border border-border/50 rounded-xl pl-10 pr-4 py-4 text-3xl font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all placeholder:text-muted-foreground/40"
            />
          </div>
        </div>

        {/* Divider with arrow */}
        <div className="flex items-center justify-center">
          <div className="flex-1 h-px bg-border" />
          <div className="mx-4 w-10 h-10 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
            <ArrowRight className="h-4 w-4 text-primary rotate-90" />
          </div>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* You Receive */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-muted-foreground">You receive</label>
          <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-lg">💵</span>
              </div>
              <div>
                <div className="text-2xl font-bold gradient-text">
                  {isValid ? formatCurrency(receiveAmount) : '0.00'} USDC
                </div>
                <div className="text-xs text-muted-foreground">on Hyperliquid • Ready to trade</div>
              </div>
            </div>
          </div>
        </div>

        {/* Info Row */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>~3 min</span>
          </div>
          
          {/* Collapsible Fee Trigger */}
          <button
            onClick={() => setShowFees(!showFees)}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>Fees: ${isValid ? formatCurrency(totalFees) : '0.00'}</span>
            {showFees ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Expandable Fee Details */}
        <motion.div
          initial={false}
          animate={{ height: showFees ? 'auto' : 0, opacity: showFees ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div className="space-y-2 pt-2 border-t border-border/50">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Network gas</span>
              <span>${formatCurrency(gasFee)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Bridge fee</span>
              <span>${formatCurrency(bridgeFee)}</span>
            </div>
            <div className="flex justify-between text-sm font-medium pt-2 border-t border-border/30">
              <span>Total fees</span>
              <span className="text-primary">${formatCurrency(totalFees)}</span>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Trust Badges */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex items-center justify-center gap-6 text-xs text-muted-foreground"
      >
        <div className="flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-primary" />
          <span>Powered by LI.FI</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5 text-green-400" />
          <span>Secure routing</span>
        </div>
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <Button
          variant="glow"
          size="lg"
          className="w-full text-lg py-6"
          disabled={!isValid}
          onClick={onContinue}
        >
          Continue to Deposit
          <ArrowRight className="h-5 w-5" />
        </Button>
      </motion.div>

      {/* Fine Print */}
      <p className="text-center text-xs text-muted-foreground/60">
        By continuing, you agree to the best available route being selected automatically.
      </p>
    </motion.div>
  );
}
