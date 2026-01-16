import { motion } from "framer-motion";
import { Check, Loader2, AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RouteStep } from "@/types/deposit";
import { cn } from "@/lib/utils";

interface ProgressTrackerProps {
  steps: RouteStep[];
  onComplete: () => void;
}

const stepIcons = {
  swap: "🔄",
  bridge: "🌉",
  confirm: "✓",
  deposit: "📥",
};

export function ProgressTracker({ steps, onComplete }: ProgressTrackerProps) {
  const allComplete = steps.every((s) => s.status === "completed");
  const hasFailed = steps.some((s) => s.status === "failed");
  const activeStep = steps.find((s) => s.status === "active");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">
          {allComplete
            ? "Deposit Complete!"
            : hasFailed
            ? "Something went wrong"
            : "Processing your deposit"}
        </h2>
        <p className="text-muted-foreground">
          {allComplete
            ? "Your funds are ready on Hyperliquid"
            : hasFailed
            ? "Don't worry, your funds are safe"
            : "This usually takes 2-5 minutes"}
        </p>
      </div>

      {/* Progress steps */}
      <div className="glass-card p-6 space-y-1">
        {steps.map((step, index) => (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-secondary/30 transition-colors">
              {/* Status icon */}
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
                  step.status === "completed" && "bg-primary/20 text-primary",
                  step.status === "active" && "bg-primary/20 animate-pulse",
                  step.status === "pending" && "bg-secondary",
                  step.status === "failed" && "bg-destructive/20 text-destructive"
                )}
              >
                {step.status === "completed" ? (
                  <Check className="h-5 w-5" />
                ) : step.status === "active" ? (
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                ) : step.status === "failed" ? (
                  <AlertCircle className="h-5 w-5" />
                ) : (
                  <span className="text-lg">{stepIcons[step.type]}</span>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 pt-1">
                <div
                  className={cn(
                    "font-medium",
                    step.status === "completed" && "text-primary",
                    step.status === "pending" && "text-muted-foreground",
                    step.status === "failed" && "text-destructive"
                  )}
                >
                  {step.title}
                </div>
                <div className="text-sm text-muted-foreground">{step.description}</div>
                
                {step.status === "failed" && (
                  <Button variant="outline" size="sm" className="mt-2">
                    Retry
                  </Button>
                )}
              </div>

              {/* Status badge */}
              <div
                className={cn(
                  "px-2 py-1 rounded-full text-xs font-medium",
                  step.status === "completed" && "bg-primary/20 text-primary",
                  step.status === "active" && "bg-accent/20 text-accent",
                  step.status === "pending" && "bg-secondary text-muted-foreground",
                  step.status === "failed" && "bg-destructive/20 text-destructive"
                )}
              >
                {step.status === "completed"
                  ? "Done"
                  : step.status === "active"
                  ? "In progress"
                  : step.status === "failed"
                  ? "Failed"
                  : "Waiting"}
              </div>
            </div>

            {/* Connector line */}
            {index < steps.length - 1 && (
              <div className="flex items-center pl-9">
                <div
                  className={cn(
                    "w-0.5 h-4 transition-colors duration-300",
                    step.status === "completed" ? "bg-primary" : "bg-border"
                  )}
                />
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Active step highlight */}
      {activeStep && !allComplete && !hasFailed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card p-4 border-primary/30 bg-primary/5"
        >
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <div>
              <div className="font-medium text-primary">{activeStep.title}</div>
              <div className="text-sm text-muted-foreground">{activeStep.description}</div>
            </div>
          </div>
        </motion.div>
      )}

      {/* CTA when complete */}
      {allComplete && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Button variant="glow" size="lg" className="w-full" onClick={onComplete}>
            Continue
            <ArrowRight className="h-5 w-5" />
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}
