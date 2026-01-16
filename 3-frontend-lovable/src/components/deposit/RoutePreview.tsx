import { motion } from "framer-motion";
import { ArrowDown, ArrowLeft, Clock, Fuel, Shield, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RouteInfo } from "@/types/deposit";

interface RoutePreviewProps {
  route: RouteInfo;
  onBack: () => void;
  onConfirm: () => void;
}

export function RoutePreview({ route, onBack, onConfirm }: RoutePreviewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-xl font-bold">Review Route</h2>
          <p className="text-sm text-muted-foreground">Confirm your deposit details</p>
        </div>
      </div>

      {/* Route visualization */}
      <div className="glass-card p-6 space-y-4">
        {/* From */}
        <div className="flex items-center gap-4 p-4 rounded-xl bg-secondary/50">
          <div className="w-12 h-12 rounded-full bg-background flex items-center justify-center text-2xl">
            {route.fromToken.icon}
          </div>
          <div className="flex-1">
            <div className="text-sm text-muted-foreground">You send</div>
            <div className="text-xl font-bold">{route.amount} {route.fromToken.symbol}</div>
            <div className="text-sm text-muted-foreground">on {route.fromChain.name}</div>
          </div>
        </div>

        {/* Steps */}
        <div className="flex flex-col items-center py-2">
          {route.steps.map((step, index) => (
            <div key={step.id} className="flex items-center gap-3 w-full">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
                  <span className="text-xs font-medium text-primary">{index + 1}</span>
                </div>
                {index < route.steps.length - 1 && (
                  <div className="w-0.5 h-8 bg-border" />
                )}
              </div>
              <div className="flex-1 py-2">
                <div className="font-medium text-sm">{step.title}</div>
                <div className="text-xs text-muted-foreground">{step.description}</div>
              </div>
            </div>
          ))}
        </div>

        {/* To */}
        <div className="flex items-center gap-4 p-4 rounded-xl bg-primary/10 border border-primary/20">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-2xl">
            💵
          </div>
          <div className="flex-1">
            <div className="text-sm text-muted-foreground">You receive</div>
            <div className="text-xl font-bold gradient-text">{route.estimatedOutput} USDC</div>
            <div className="text-sm text-muted-foreground">on Hyperliquid (trade-ready)</div>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="text-sm">Estimated time</span>
          </div>
          <span className="font-medium">{route.estimatedTime}</span>
        </div>
        
        <div className="h-px bg-border" />
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Fuel className="h-4 w-4" />
            <span className="text-sm">Network fees</span>
          </div>
          <span className="font-medium">{route.fees.gas}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Shield className="h-4 w-4" />
            <span className="text-sm">Bridge fee</span>
          </div>
          <span className="font-medium">{route.fees.bridge}</span>
        </div>
        
        <div className="h-px bg-border" />
        
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Total fees</span>
          <span className="font-bold text-primary">{route.fees.total}</span>
        </div>
      </div>

      {/* CTA */}
      <Button
        variant="glow"
        size="lg"
        className="w-full"
        onClick={onConfirm}
      >
        Confirm Deposit
        <ArrowRight className="h-5 w-5" />
      </Button>
    </motion.div>
  );
}
