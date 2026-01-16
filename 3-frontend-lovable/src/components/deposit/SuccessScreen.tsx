import { motion } from "framer-motion";
import { ExternalLink, Plus, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SuccessScreenProps {
  amount: string;
  onOpenHyperliquid: () => void;
  onDepositMore: () => void;
}

export function SuccessScreen({ amount, onOpenHyperliquid, onDepositMore }: SuccessScreenProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="space-y-8"
    >
      {/* Success animation */}
      <div className="flex flex-col items-center text-center space-y-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.2, duration: 0.5 }}
          className="relative"
        >
          <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center">
            <CheckCircle2 className="w-12 h-12 text-primary" />
          </div>
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="absolute -inset-4 rounded-full border-2 border-primary/30"
          />
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="absolute -inset-8 rounded-full border border-primary/20"
          />
        </motion.div>

        <div className="space-y-2">
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-bold"
          >
            You're ready to trade!
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-muted-foreground"
          >
            Your funds are now on Hyperliquid
          </motion.p>
        </div>

        {/* Amount card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card p-6 w-full max-w-sm glow-effect"
        >
          <div className="text-sm text-muted-foreground mb-1">Available to trade</div>
          <div className="text-4xl font-bold gradient-text">{amount} USDC</div>
          <div className="text-sm text-muted-foreground mt-1">on Hyperliquid</div>
        </motion.div>
      </div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="space-y-3"
      >
        <Button
          variant="glow"
          size="lg"
          className="w-full"
          onClick={onOpenHyperliquid}
        >
          Open Hyperliquid
          <ExternalLink className="h-5 w-5" />
        </Button>
        
        <Button
          variant="outline"
          size="lg"
          className="w-full"
          onClick={onDepositMore}
        >
          <Plus className="h-5 w-5" />
          Deposit More
        </Button>
      </motion.div>

      {/* Transaction link */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="text-center"
      >
        <Button variant="link" className="text-muted-foreground">
          View transaction details
          <ExternalLink className="h-4 w-4 ml-1" />
        </Button>
      </motion.div>
    </motion.div>
  );
}
