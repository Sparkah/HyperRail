import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Clock, Shield, Zap, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RouteInfo } from "@/types/deposit";

interface RouteConfirmationProps {
  route: RouteInfo;
  onBack: () => void;
  onConfirm: () => void;
  buttonText?: string;
  buttonDisabled?: boolean;
  buttonLoading?: boolean;
  error?: string | null;
}

const stepIcons: Record<string, React.ReactNode> = {
  swap: <span className="text-sm">🔄</span>,
  bridge: <span className="text-sm">🌉</span>,
  confirm: <span className="text-sm">✓</span>,
  deposit: <span className="text-sm">💵</span>,
};

export function RouteConfirmation({
  route,
  onBack,
  onConfirm,
  buttonText = "Confirm Deposit",
  buttonDisabled = false,
  buttonLoading = false,
  error,
}: RouteConfirmationProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-xl font-bold">Review Your Deposit</h2>
          <p className="text-sm text-muted-foreground">Confirm the route before proceeding</p>
        </div>
      </div>

      {/* Summary Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-5 space-y-4"
      >
        {/* Amount Summary */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-muted-foreground">Depositing</div>
            <div className="text-2xl font-bold">{route.amount} {route.fromToken.symbol}</div>
          </div>
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <ArrowRight className="h-4 w-4 text-primary" />
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Receiving</div>
            <div className="text-2xl font-bold gradient-text">{route.estimatedOutput} USDC</div>
          </div>
        </div>

        <div className="h-px bg-border" />

        {/* Key Stats */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
              <Clock className="h-3.5 w-3.5" />
            </div>
            <div className="font-semibold">{route.estimatedTime}</div>
            <div className="text-xs text-muted-foreground">Est. time</div>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
              <span className="text-sm">💰</span>
            </div>
            <div className="font-semibold">{route.fees.total}</div>
            <div className="text-xs text-muted-foreground">Total fees</div>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
              <Shield className="h-3.5 w-3.5" />
            </div>
            <div className="font-semibold text-green-400">Verified</div>
            <div className="text-xs text-muted-foreground">Route</div>
          </div>
        </div>
      </motion.div>

      {/* Route Steps */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass-card p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Route via LI.FI</span>
          <a 
            href="https://li.fi" 
            target="_blank" 
            rel="noopener noreferrer"
            className="ml-auto text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
          >
            Learn more <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        <div className="space-y-0">
          {route.steps.map((step, index) => (
            <div key={step.id} className="flex items-start gap-3">
              {/* Timeline */}
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center">
                  {stepIcons[step.type] || <span className="text-xs">{index + 1}</span>}
                </div>
                {index < route.steps.length - 1 && (
                  <div className="w-0.5 h-10 bg-border" />
                )}
              </div>
              
              {/* Content */}
              <div className="flex-1 pb-4">
                <div className="font-medium text-sm">{step.title}</div>
                <div className="text-xs text-muted-foreground">{step.description}</div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Destination */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex items-center gap-4 p-4 rounded-xl bg-primary/5 border border-primary/20"
      >
        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
          <span className="text-xl">⚡</span>
        </div>
        <div className="flex-1">
          <div className="font-semibold">Hyperliquid</div>
          <div className="text-sm text-muted-foreground">Your USDC will be ready to trade immediately</div>
        </div>
        <Check className="h-5 w-5 text-green-400" />
      </motion.div>

      {/* Error message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm"
        >
          {error}
        </motion.div>
      )}

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <Button
          variant="glow"
          size="lg"
          className="w-full text-lg py-6"
          onClick={onConfirm}
          disabled={buttonDisabled}
        >
          {buttonLoading && <Loader2 className="h-5 w-5 animate-spin mr-2" />}
          {buttonText}
          {!buttonLoading && <ArrowRight className="h-5 w-5 ml-2" />}
        </Button>
      </motion.div>

      <p className="text-center text-xs text-muted-foreground/60">
        {buttonText.includes("Approve")
          ? "You'll need to approve token spending before the swap"
          : "Transaction is irreversible once confirmed"}
      </p>
    </motion.div>
  );
}
